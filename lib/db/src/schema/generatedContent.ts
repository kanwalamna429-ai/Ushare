import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { campaignUrlsTable } from "./campaignUrls";

export const generatedContentTable = pgTable("generated_content", {
  id: serial("id").primaryKey(),
  campaignUrlId: integer("campaign_url_id").notNull().references(() => campaignUrlsTable.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(),
  content: text("content").notNull(),
  hashtags: text("hashtags"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertGeneratedContentSchema = createInsertSchema(generatedContentTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGeneratedContent = z.infer<typeof insertGeneratedContentSchema>;
export type GeneratedContent = typeof generatedContentTable.$inferSelect;
