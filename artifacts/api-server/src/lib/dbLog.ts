import { db, systemLogsTable } from "@workspace/db";
import { logger } from "./logger";

export async function dbLog(
  level: "info" | "warn" | "error",
  message: string,
  opts?: { campaignId?: number; platform?: string; details?: string },
): Promise<void> {
  try {
    await db.insert(systemLogsTable).values({
      level,
      message,
      campaignId: opts?.campaignId ?? null,
      platform: opts?.platform ?? null,
      details: opts?.details ?? null,
    });
  } catch (err) {
    logger.error({ err }, "Failed to write system log to DB");
  }
}
