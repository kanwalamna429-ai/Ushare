import { Router, type IRouter } from "express";
import { db, campaignsTable, scheduledPostsTable, platformConnectionsTable, systemLogsTable } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/dashboard/stats", requireAuth, async (req, res): Promise<void> => {
  const [campaignStats] = await db
    .select({
      totalCampaigns: count(),
      activeCampaigns: sql<number>`count(*) filter (where ${campaignsTable.status} = 'active')`,
    })
    .from(campaignsTable);

  const [postStats] = await db
    .select({
      scheduledPosts: sql<number>`count(*) filter (where ${scheduledPostsTable.status} = 'scheduled')`,
      publishedPosts: sql<number>`count(*) filter (where ${scheduledPostsTable.status} = 'published')`,
      failedPosts: sql<number>`count(*) filter (where ${scheduledPostsTable.status} = 'failed')`,
    })
    .from(scheduledPostsTable);

  const [platformStats] = await db
    .select({ connectedPlatforms: sql<number>`count(*) filter (where ${platformConnectionsTable.connected} = true)` })
    .from(platformConnectionsTable);

  const recentActivity = await db
    .select()
    .from(systemLogsTable)
    .orderBy(sql`${systemLogsTable.createdAt} desc`)
    .limit(10);

  res.json({
    totalCampaigns: Number(campaignStats?.totalCampaigns ?? 0),
    activeCampaigns: Number(campaignStats?.activeCampaigns ?? 0),
    scheduledPosts: Number(postStats?.scheduledPosts ?? 0),
    publishedPosts: Number(postStats?.publishedPosts ?? 0),
    failedPosts: Number(postStats?.failedPosts ?? 0),
    connectedPlatforms: Number(platformStats?.connectedPlatforms ?? 0),
    recentActivity: recentActivity.map((log) => ({
      id: log.id,
      type: log.level,
      message: log.message,
      platform: log.platform ?? null,
      createdAt: log.createdAt.toISOString(),
    })),
  });
});

export default router;
