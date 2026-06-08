import { Router, type IRouter } from "express";
import { db, campaignUrlsTable, campaignsTable, generatedContentTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import {
  AddUrlsToCampaignBody,
  AddUrlsToCampaignParams,
  RemoveCampaignUrlParams,
  ListCampaignUrlItemsParams,
  ExtractUrlContentParams,
  GeneratePostContentBody,
  GeneratePostContentParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { extractMetadata, isValidUrl } from "../lib/extractor";
import { generatePlatformContent } from "../lib/gemini";
import { dbLog } from "../lib/dbLog";

const router: IRouter = Router();

function formatUrl(u: typeof campaignUrlsTable.$inferSelect) {
  return {
    id: u.id,
    campaignId: u.campaignId,
    url: u.url,
    status: u.status,
    title: u.title ?? null,
    description: u.description ?? null,
    imageUrl: u.imageUrl ?? null,
    createdAt: u.createdAt.toISOString(),
  };
}

router.get("/campaigns/:id/urls", requireAuth, async (req, res): Promise<void> => {
  const params = ListCampaignUrlItemsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const items = await db
    .select()
    .from(campaignUrlsTable)
    .where(eq(campaignUrlsTable.campaignId, params.data.id))
    .orderBy(campaignUrlsTable.sortOrder, campaignUrlsTable.createdAt);

  res.json({ items: items.map(formatUrl), total: items.length, page: 1, limit: items.length });
});

router.post("/campaigns/:id/urls", requireAuth, async (req, res): Promise<void> => {
  const params = AddUrlsToCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = AddUrlsToCampaignBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const campaignId = params.data.id;
  const rawUrls = body.data.urls;

  // Get existing URLs for dedup
  const existing = await db
    .select({ url: campaignUrlsTable.url })
    .from(campaignUrlsTable)
    .where(eq(campaignUrlsTable.campaignId, campaignId));
  const existingSet = new Set(existing.map((e) => e.url));

  // Get current max sort order
  const [maxSort] = await db
    .select({ maxOrder: sql<number>`coalesce(max(${campaignUrlsTable.sortOrder}), 0)` })
    .from(campaignUrlsTable)
    .where(eq(campaignUrlsTable.campaignId, campaignId));
  let sortOrder = Number(maxSort?.maxOrder ?? 0) + 1;

  let added = 0;
  let duplicates = 0;
  let invalid = 0;
  const addedUrls: (typeof campaignUrlsTable.$inferSelect)[] = [];

  for (const rawUrl of rawUrls) {
    const url = rawUrl.trim();
    if (!url) continue;

    if (!isValidUrl(url)) {
      invalid++;
      continue;
    }

    if (existingSet.has(url)) {
      duplicates++;
      continue;
    }

    const [newUrl] = await db
      .insert(campaignUrlsTable)
      .values({ campaignId, url, status: "pending", sortOrder: sortOrder++ })
      .returning();

    existingSet.add(url);
    added++;
    addedUrls.push(newUrl!);
  }

  // Update campaign URL count
  const [urlCount] = await db
    .select({ total: sql<number>`count(*)` })
    .from(campaignUrlsTable)
    .where(eq(campaignUrlsTable.campaignId, campaignId));

  await db
    .update(campaignsTable)
    .set({ totalUrls: Number(urlCount?.total ?? 0) })
    .where(eq(campaignsTable.id, campaignId));

  await dbLog("info", `Added ${added} URLs to campaign ${campaignId} (${duplicates} dupes, ${invalid} invalid)`, {
    campaignId,
  });

  res.status(201).json({
    added,
    duplicates,
    invalid,
    urls: addedUrls.map(formatUrl),
  });
});

router.delete("/campaigns/:id/urls/:urlId", requireAuth, async (req, res): Promise<void> => {
  const params = RemoveCampaignUrlParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db
    .delete(campaignUrlsTable)
    .where(
      and(
        eq(campaignUrlsTable.id, params.data.urlId),
        eq(campaignUrlsTable.campaignId, params.data.id),
      ),
    );

  // Update campaign URL count
  const [urlCount] = await db
    .select({ total: sql<number>`count(*)` })
    .from(campaignUrlsTable)
    .where(eq(campaignUrlsTable.campaignId, params.data.id));

  await db
    .update(campaignsTable)
    .set({ totalUrls: Number(urlCount?.total ?? 0) })
    .where(eq(campaignsTable.id, params.data.id));

  res.sendStatus(204);
});

router.post("/campaigns/:id/urls/:urlId/extract", requireAuth, async (req, res): Promise<void> => {
  const params = ExtractUrlContentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [urlRow] = await db
    .select()
    .from(campaignUrlsTable)
    .where(
      and(
        eq(campaignUrlsTable.id, params.data.urlId),
        eq(campaignUrlsTable.campaignId, params.data.id),
      ),
    );

  if (!urlRow) {
    res.status(404).json({ error: "URL not found" });
    return;
  }

  await db
    .update(campaignUrlsTable)
    .set({ status: "extracting" })
    .where(eq(campaignUrlsTable.id, urlRow.id));

  const meta = await extractMetadata(urlRow.url);

  const [updated] = await db
    .update(campaignUrlsTable)
    .set({
      status: "extracted",
      title: meta.title,
      description: meta.description,
      imageUrl: meta.imageUrl,
      canonicalUrl: meta.canonicalUrl,
    })
    .where(eq(campaignUrlsTable.id, urlRow.id))
    .returning();

  res.json({
    id: updated!.id,
    campaignUrlId: updated!.id,
    title: updated!.title ?? "",
    description: updated!.description ?? null,
    imageUrl: updated!.imageUrl ?? null,
    canonicalUrl: updated!.canonicalUrl ?? null,
  });
});

router.post("/campaigns/:id/urls/:urlId/generate", requireAuth, async (req, res): Promise<void> => {
  const params = GeneratePostContentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = GeneratePostContentBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [urlRow] = await db
    .select()
    .from(campaignUrlsTable)
    .where(
      and(
        eq(campaignUrlsTable.id, params.data.urlId),
        eq(campaignUrlsTable.campaignId, params.data.id),
      ),
    );

  if (!urlRow) {
    res.status(404).json({ error: "URL not found" });
    return;
  }

  await db
    .update(campaignUrlsTable)
    .set({ status: "generating" })
    .where(eq(campaignUrlsTable.id, urlRow.id));

  const platforms = body.data.platforms;
  const results = [];

  for (const platform of platforms) {
    try {
      const { content, hashtags } = await generatePlatformContent(platform, {
        title: urlRow.title ?? urlRow.url,
        description: urlRow.description ?? null,
        imageUrl: urlRow.imageUrl ?? null,
        url: urlRow.url,
      });

      // Upsert generated content
      const existing = await db
        .select()
        .from(generatedContentTable)
        .where(
          and(
            eq(generatedContentTable.campaignUrlId, urlRow.id),
            eq(generatedContentTable.platform, platform),
          ),
        );

      let gen;
      if (existing.length > 0) {
        [gen] = await db
          .update(generatedContentTable)
          .set({ content, hashtags, imageUrl: urlRow.imageUrl ?? null })
          .where(eq(generatedContentTable.id, existing[0]!.id))
          .returning();
      } else {
        [gen] = await db
          .insert(generatedContentTable)
          .values({
            campaignUrlId: urlRow.id,
            platform,
            content,
            hashtags,
            imageUrl: urlRow.imageUrl ?? null,
          })
          .returning();
      }

      results.push({
        id: gen!.id,
        campaignUrlId: urlRow.id,
        platform,
        content: gen!.content,
        hashtags: gen!.hashtags ?? null,
        imageUrl: gen!.imageUrl ?? null,
      });
    } catch (err) {
      await dbLog("error", `AI generation failed for ${platform}: ${String(err)}`, {
        campaignId: params.data.id,
        platform,
      });
      results.push({
        id: 0,
        campaignUrlId: urlRow.id,
        platform,
        content: `Generation failed: ${String(err)}`,
        hashtags: null,
        imageUrl: null,
      });
    }
  }

  await db
    .update(campaignUrlsTable)
    .set({ status: "generated" })
    .where(eq(campaignUrlsTable.id, urlRow.id));

  res.json(results);
});

export default router;
