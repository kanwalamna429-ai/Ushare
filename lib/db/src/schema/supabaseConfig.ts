import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const supabaseConfigTable = pgTable("supabase_config", {
  id: serial("id").primaryKey(),
  projectUrl: text("project_url"),
  anonKey: text("anon_key"),
  serviceRoleKey: text("service_role_key"),
  jwtSecret: text("jwt_secret"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type SupabaseConfig = typeof supabaseConfigTable.$inferSelect;
