import { pgTable, text, serial, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const platformConnectionsTable = pgTable("platform_connections", {
  id: serial("id").primaryKey(),
  platform: text("platform").notNull().unique(),
  connected: boolean("connected").notNull().default(false),
  apiKey: text("api_key"),
  apiSecret: text("api_secret"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  username: text("username"),
  password: text("password"),
  instanceUrl: text("instance_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPlatformConnectionSchema = createInsertSchema(platformConnectionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlatformConnection = z.infer<typeof insertPlatformConnectionSchema>;
export type PlatformConnection = typeof platformConnectionsTable.$inferSelect;
