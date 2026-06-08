import { Router, type IRouter } from "express";
import { db, campaignsTable, campaignUrlsTable } from "@workspace/db";
import { eq, sql, count, ilike, and } from "drizzle-orm";
import {
  CreateCampaignBody,
  UpdateCampaignBody,
  ListCampaignsQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { dbLog } from "../lib/dbLog";

const router: IRouter = Router();

function formatCampaign(c: typeof campaignsTable.$inferSelect) {
  return {
    id: c.id,
    name: c.name,
    description: c.description ?? null,
    status: c.status,
    platforms: c.platforms ?? [],
    scheduleType: c.scheduleType,
    frequency: c.frequency ?? null,
    scheduledAt: c.scheduledAt?.toISOString() ?? null,
    timezone: c.timezone ?? null,
    totalUrls: c.totalUrls,
    processedUrls: c.processedUrls,
    progressPct: c.progressPct,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

router.get("/campaigns", requireAuth, async (req, res): Promise<void> => {
  const query = ListCampaignsQueryParams.safeParse(req.query);
  const page = query.success ? (query.data.page ?? 1) : 1;
  const limit = query.success ? (query.data.limit ?? 20) : 20;
  const statusFilter = query.success ? query.data.status : undefined;
  const offset = (page - 1) * limit;

  const conditions = statusFilter ? [eq(campaignsTable.status, statusFilter)] : [];

  const [{ total }] = await db
    .select({ total: count() })
    .from(campaignsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const items = await db
    .select()
    .from(campaignsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${campaignsTable.createdAt} desc`)
    .limit(limit)
    .offset(offset);

  res.json({ items: items.map(formatCampaign), total: Number(total), page, limit });
});

router.post("/campaigns", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, description, platforms, scheduleType, frequency, scheduledAt, timezone } = parsed.data;

  const [campaign] = await db
    .insert(campaignsTable)
    .values({
      name,
      description: description ?? null,
      platforms: platforms ?? [],
      scheduleType: scheduleType ?? "frequency",
      frequency: frequency ?? null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      timezone: timezone ?? "UTC",
      status: "draft",
    })
    .returning();

  await dbLog("info", `Campaign created: ${name}`, { campaignId: campaign!.id });
  res.status(201).json(formatCampaign(campaign!));
});

router.get("/campaigns/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id));
  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  res.json(formatCampaign(campaign));
});

router.patch("/campaigns/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const parsed = UpdateCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Partial<typeof campaignsTable.$inferInsert> = {};
  if (parsed.data.name != null) updates.name = parsed.data.name;
  if (parsed.data.description != null) updates.description = parsed.data.description;
  if (parsed.data.platforms != null) updates.platforms = parsed.data.platforms;
  if (parsed.data.scheduleType != null) updates.scheduleType = parsed.data.scheduleType;
  if (parsed.data.frequency != null) updates.frequency = parsed.data.frequency;
  if (parsed.data.scheduledAt != null) updates.scheduledAt = new Date(parsed.data.scheduledAt);
  if (parsed.data.timezone != null) updates.timezone = parsed.data.timezone;
  if (parsed.data.status != null) updates.status = parsed.data.status;

  const [campaign] = await db
    .update(campaignsTable)
    .set(updates)
    .where(eq(campaignsTable.id, id))
    .returning();

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  res.json(formatCampaign(campaign));
});

router.delete("/campaigns/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [campaign] = await db.delete(campaignsTable).where(eq(campaignsTable.id, id)).returning();
  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/campaigns/:id/activate", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [campaign] = await db
    .update(campaignsTable)
    .set({ status: "active" })
    .where(eq(campaignsTable.id, id))
    .returning();

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  await dbLog("info", `Campaign activated: ${campaign.name}`, { campaignId: id });
  res.json(formatCampaign(campaign));
});

router.post("/campaigns/:id/pause", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [campaign] = await db
    .update(campaignsTable)
    .set({ status: "paused" })
    .where(eq(campaignsTable.id, id))
    .returning();

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  await dbLog("info", `Campaign paused: ${campaign.name}`, { campaignId: id });
  res.json(formatCampaign(campaign));
});

export default router;
