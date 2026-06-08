import { Router, type IRouter } from "express";
import { db, scheduledPostsTable, campaignUrlsTable } from "@workspace/db";
import { eq, and, sql, count } from "drizzle-orm";
import { ListPostsQueryParams, RetryPostParams } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function formatPost(p: typeof scheduledPostsTable.$inferSelect) {
  return {
    id: p.id,
    campaignId: p.campaignId,
    campaignUrlId: p.campaignUrlId,
    platform: p.platform,
    status: p.status,
    scheduledAt: p.scheduledAt?.toISOString() ?? null,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    errorMessage: p.errorMessage ?? null,
    retryCount: p.retryCount,
    url: p.url ?? null,
    title: p.title ?? null,
    createdAt: p.createdAt.toISOString(),
  };
}

router.get("/posts", requireAuth, async (req, res): Promise<void> => {
  const query = ListPostsQueryParams.safeParse(req.query);
  const page = query.success ? (query.data.page ?? 1) : 1;
  const limit = query.success ? (query.data.limit ?? 20) : 20;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (query.success && query.data.status) {
    conditions.push(eq(scheduledPostsTable.status, query.data.status));
  }
  if (query.success && query.data.platform) {
    conditions.push(eq(scheduledPostsTable.platform, query.data.platform));
  }
  if (query.success && query.data.campaignId) {
    conditions.push(eq(scheduledPostsTable.campaignId, query.data.campaignId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ total }] = await db
    .select({ total: count() })
    .from(scheduledPostsTable)
    .where(whereClause);

  const items = await db
    .select()
    .from(scheduledPostsTable)
    .where(whereClause)
    .orderBy(sql`${scheduledPostsTable.createdAt} desc`)
    .limit(limit)
    .offset(offset);

  res.json({ items: items.map(formatPost), total: Number(total), page, limit });
});

router.post("/posts/:id/retry", requireAuth, async (req, res): Promise<void> => {
  const params = RetryPostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [post] = await db
    .select()
    .from(scheduledPostsTable)
    .where(eq(scheduledPostsTable.id, params.data.id));

  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const [updated] = await db
    .update(scheduledPostsTable)
    .set({
      status: "scheduled",
      errorMessage: null,
      scheduledAt: new Date(),
      retryCount: post.retryCount + 1,
    })
    .where(eq(scheduledPostsTable.id, params.data.id))
    .returning();

  res.json(formatPost(updated!));
});

export default router;
