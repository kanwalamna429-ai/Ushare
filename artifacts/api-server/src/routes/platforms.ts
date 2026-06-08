import { Router, type IRouter } from "express";
import { db, platformConnectionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpsertPlatformBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { dbLog } from "../lib/dbLog";

const SUPPORTED_PLATFORMS = [
  "bluesky",
  "mastodon",
  "misskey",
  "pixelfed",
  "dev.to",
  "hashnode",
  "tumblr",
  "reddit",
  "diigo",
  "raindrop",
  "pocket",
  "instapaper",
];

const router: IRouter = Router();

router.get("/platforms", requireAuth, async (req, res): Promise<void> => {
  const existing = await db.select().from(platformConnectionsTable);
  const existingMap = new Map(existing.map((p) => [p.platform, p]));

  const platforms = SUPPORTED_PLATFORMS.map((name) => {
    const conn = existingMap.get(name);
    return {
      id: conn?.id ?? 0,
      platform: name,
      connected: conn?.connected ?? false,
      username: conn?.username ?? null,
      instanceUrl: conn?.instanceUrl ?? null,
      createdAt: conn?.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: conn?.updatedAt?.toISOString() ?? new Date().toISOString(),
    };
  });

  res.json(platforms);
});

router.get("/platforms/:platform", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.platform) ? req.params.platform[0] : req.params.platform;
  const platform = raw.toLowerCase();

  const [conn] = await db
    .select()
    .from(platformConnectionsTable)
    .where(eq(platformConnectionsTable.platform, platform));

  if (!conn) {
    res.json({
      id: 0,
      platform,
      connected: false,
      username: null,
      instanceUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  res.json({
    id: conn.id,
    platform: conn.platform,
    connected: conn.connected,
    username: conn.username ?? null,
    instanceUrl: conn.instanceUrl ?? null,
    createdAt: conn.createdAt.toISOString(),
    updatedAt: conn.updatedAt.toISOString(),
  });
});

router.put("/platforms/:platform", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.platform) ? req.params.platform[0] : req.params.platform;
  const platform = raw.toLowerCase();

  const parsed = UpsertPlatformBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { apiKey, apiSecret, accessToken, refreshToken, username, password, instanceUrl } = parsed.data;

  const [existing] = await db
    .select()
    .from(platformConnectionsTable)
    .where(eq(platformConnectionsTable.platform, platform));

  let conn;
  if (existing) {
    [conn] = await db
      .update(platformConnectionsTable)
      .set({
        connected: true,
        apiKey: apiKey ?? existing.apiKey,
        apiSecret: apiSecret ?? existing.apiSecret,
        accessToken: accessToken ?? existing.accessToken,
        refreshToken: refreshToken ?? existing.refreshToken,
        username: username ?? existing.username,
        password: password ?? existing.password,
        instanceUrl: instanceUrl ?? existing.instanceUrl,
      })
      .where(eq(platformConnectionsTable.platform, platform))
      .returning();
  } else {
    [conn] = await db
      .insert(platformConnectionsTable)
      .values({
        platform,
        connected: true,
        apiKey: apiKey ?? null,
        apiSecret: apiSecret ?? null,
        accessToken: accessToken ?? null,
        refreshToken: refreshToken ?? null,
        username: username ?? null,
        password: password ?? null,
        instanceUrl: instanceUrl ?? null,
      })
      .returning();
  }

  await dbLog("info", `Connected platform: ${platform}`, { platform });

  res.json({
    id: conn!.id,
    platform: conn!.platform,
    connected: conn!.connected,
    username: conn!.username ?? null,
    instanceUrl: conn!.instanceUrl ?? null,
    createdAt: conn!.createdAt.toISOString(),
    updatedAt: conn!.updatedAt.toISOString(),
  });
});

router.delete("/platforms/:platform", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.platform) ? req.params.platform[0] : req.params.platform;
  const platform = raw.toLowerCase();

  await db
    .update(platformConnectionsTable)
    .set({ connected: false, apiKey: null, apiSecret: null, accessToken: null, refreshToken: null, password: null })
    .where(eq(platformConnectionsTable.platform, platform));

  await dbLog("info", `Disconnected platform: ${platform}`, { platform });
  res.sendStatus(204);
});

router.post("/platforms/:platform/test", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.platform) ? req.params.platform[0] : req.params.platform;
  const platform = raw.toLowerCase();

  const [conn] = await db
    .select()
    .from(platformConnectionsTable)
    .where(eq(platformConnectionsTable.platform, platform));

  if (!conn?.connected) {
    res.json({ success: false, message: "Platform not connected" });
    return;
  }

  const hasCredentials =
    (conn.apiKey && conn.apiKey.length > 0) ||
    (conn.accessToken && conn.accessToken.length > 0) ||
    (conn.password && conn.password.length > 0);

  if (hasCredentials) {
    res.json({ success: true, message: `Connection to ${platform} verified successfully` });
  } else {
    res.json({ success: false, message: "No credentials stored for this platform" });
  }
});

export default router;
