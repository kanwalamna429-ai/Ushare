import { Router, type IRouter } from "express";
import { db, systemLogsTable } from "@workspace/db";
import { eq, and, sql, count } from "drizzle-orm";
import { ListLogsQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/logs", requireAuth, async (req, res): Promise<void> => {
  const query = ListLogsQueryParams.safeParse(req.query);
  const page = query.success ? (query.data.page ?? 1) : 1;
  const limit = query.success ? (query.data.limit ?? 50) : 50;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (query.success && query.data.level) {
    conditions.push(eq(systemLogsTable.level, query.data.level));
  }
  if (query.success && query.data.campaignId) {
    conditions.push(eq(systemLogsTable.campaignId, query.data.campaignId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ total }] = await db
    .select({ total: count() })
    .from(systemLogsTable)
    .where(whereClause);

  const items = await db
    .select()
    .from(systemLogsTable)
    .where(whereClause)
    .orderBy(sql`${systemLogsTable.createdAt} desc`)
    .limit(limit)
    .offset(offset);

  res.json({
    items: items.map((log) => ({
      id: log.id,
      level: log.level,
      message: log.message,
      campaignId: log.campaignId ?? null,
      platform: log.platform ?? null,
      details: log.details ?? null,
      createdAt: log.createdAt.toISOString(),
    })),
    total: Number(total),
    page,
    limit,
  });
});

export default router;
