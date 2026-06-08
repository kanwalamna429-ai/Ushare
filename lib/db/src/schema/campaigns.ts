import { pgTable, text, serial, integer, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const campaignsTable = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("draft"), // draft, active, paused, completed
  platforms: text("platforms").array().notNull().default([]),
  scheduleType: text("schedule_type").notNull().default("frequency"), // frequency, custom
  frequency: text("frequency"), // e.g. "30min", "1h", "2h", "4h", "12h", "daily"
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  timezone: text("timezone").default("UTC"),
  totalUrls: integer("total_urls").notNull().default(0),
  processedUrls: integer("processed_urls").notNull().default(0),
  progressPct: real("progress_pct").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCampaignSchema = createInsertSchema(campaignsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaignsTable.$inferSelect;
