import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { campaignsTable } from "./campaigns";

export const campaignUrlsTable = pgTable("campaign_urls", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaignsTable.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  status: text("status").notNull().default("pending"), // pending, extracting, extracted, generating, generated, scheduled, published, failed
  title: text("title"),
  description: text("description"),
  imageUrl: text("image_url"),
  canonicalUrl: text("canonical_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCampaignUrlSchema = createInsertSchema(campaignUrlsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCampaignUrl = z.infer<typeof insertCampaignUrlSchema>;
export type CampaignUrl = typeof campaignUrlsTable.$inferSelect;
