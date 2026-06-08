import { Router, type IRouter } from "express";
import { db, settingsTable, supabaseConfigTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { UpdateSettingsBody, UpdateSupabaseConfigBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

async function getOrCreateSettings() {
  const [existing] = await db.select().from(settingsTable).limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(settingsTable)
    .values({ timezone: "UTC", defaultHashtags: "", retryCount: 3, schedulerEnabled: true })
    .returning();
  return created!;
}

async function getOrCreateSupabaseConfig() {
  const [existing] = await db.select().from(supabaseConfigTable).limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(supabaseConfigTable)
    .values({ projectUrl: null, anonKey: null, serviceRoleKey: null, jwtSecret: null })
    .returning();
  return created!;
}

router.get("/settings", requireAuth, async (req, res): Promise<void> => {
  const settings = await getOrCreateSettings();
  res.json({
    timezone: settings.timezone,
    defaultHashtags: settings.defaultHashtags,
    retryCount: settings.retryCount,
    schedulerEnabled: settings.schedulerEnabled,
  });
});

router.put("/settings", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const settings = await getOrCreateSettings();

  const updates: Partial<typeof settingsTable.$inferInsert> = {};
  if (parsed.data.timezone != null) updates.timezone = parsed.data.timezone;
  if (parsed.data.defaultHashtags != null) updates.defaultHashtags = parsed.data.defaultHashtags;
  if (parsed.data.retryCount != null) updates.retryCount = parsed.data.retryCount;
  if (parsed.data.schedulerEnabled != null) updates.schedulerEnabled = parsed.data.schedulerEnabled;

  const [updated] = await db
    .update(settingsTable)
    .set(updates)
    .where(sql`${settingsTable.id} = ${settings.id}`)
    .returning();

  res.json({
    timezone: updated!.timezone,
    defaultHashtags: updated!.defaultHashtags,
    retryCount: updated!.retryCount,
    schedulerEnabled: updated!.schedulerEnabled,
  });
});

router.get("/settings/supabase", requireAuth, async (req, res): Promise<void> => {
  const config = await getOrCreateSupabaseConfig();
  res.json({
    id: config.id,
    projectUrl: config.projectUrl ?? null,
    anonKey: config.anonKey ?? null,
    serviceRoleKey: config.serviceRoleKey ?? null,
    jwtSecret: config.jwtSecret ?? null,
    databaseUrl: process.env.DATABASE_URL
      ? process.env.DATABASE_URL.replace(/:\/\/[^:]+:[^@]+@/, "://<credentials>@")
      : null,
    createdAt: config.createdAt.toISOString(),
    updatedAt: config.updatedAt.toISOString(),
  });
});

router.put("/settings/supabase", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateSupabaseConfigBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const config = await getOrCreateSupabaseConfig();

  const updates: Partial<typeof supabaseConfigTable.$inferInsert> = {};
  if (parsed.data.projectUrl !== undefined) updates.projectUrl = parsed.data.projectUrl || null;
  if (parsed.data.anonKey !== undefined) updates.anonKey = parsed.data.anonKey || null;
  if (parsed.data.serviceRoleKey !== undefined) updates.serviceRoleKey = parsed.data.serviceRoleKey || null;
  if (parsed.data.jwtSecret !== undefined) updates.jwtSecret = parsed.data.jwtSecret || null;

  const [updated] = await db
    .update(supabaseConfigTable)
    .set(updates)
    .where(sql`${supabaseConfigTable.id} = ${config.id}`)
    .returning();

  res.json({
    id: updated!.id,
    projectUrl: updated!.projectUrl ?? null,
    anonKey: updated!.anonKey ?? null,
    serviceRoleKey: updated!.serviceRoleKey ?? null,
    jwtSecret: updated!.jwtSecret ?? null,
    databaseUrl: process.env.DATABASE_URL
      ? process.env.DATABASE_URL.replace(/:\/\/[^:]+:[^@]+@/, "://<credentials>@")
      : null,
    createdAt: updated!.createdAt.toISOString(),
    updatedAt: updated!.updatedAt.toISOString(),
  });
});

export default router;
