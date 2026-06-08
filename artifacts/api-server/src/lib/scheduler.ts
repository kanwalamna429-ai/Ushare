import cron from "node-cron";
import { db, scheduledPostsTable, campaignUrlsTable, platformConnectionsTable, settingsTable, campaignsTable } from "@workspace/db";
import { eq, and, lte, sql } from "drizzle-orm";
import { logger } from "./logger";
import { dbLog } from "./dbLog";

async function publishPost(post: typeof scheduledPostsTable.$inferSelect): Promise<{ success: boolean; message: string }> {
  const [platformConn] = await db
    .select()
    .from(platformConnectionsTable)
    .where(eq(platformConnectionsTable.platform, post.platform));

  if (!platformConn?.connected) {
    return { success: false, message: `Platform ${post.platform} is not connected` };
  }

  const [urlRow] = await db
    .select()
    .from(campaignUrlsTable)
    .where(eq(campaignUrlsTable.id, post.campaignUrlId));

  const title = post.title ?? urlRow?.title ?? urlRow?.url ?? "Untitled";
  const url = urlRow?.url ?? "";

  try {
    switch (post.platform) {
      case "bluesky":
        return await publishBluesky(platformConn, title, url);
      case "mastodon":
        return await publishMastodon(platformConn, title, url);
      case "misskey":
        return await publishMisskey(platformConn, title, url);
      case "pixelfed":
        return await publishPixelfed(platformConn, title, url);
      case "dev.to":
        return await publishDevTo(platformConn, title, url);
      case "hashnode":
        return await publishHashnode(platformConn, title, url);
      case "tumblr":
        return await publishTumblr(platformConn, title, url);
      case "reddit":
        return await publishReddit(platformConn, title, url);
      case "diigo":
        return await publishDiigo(platformConn, title, url);
      case "raindrop":
        return await publishRaindrop(platformConn, title, url);
      case "pocket":
        return await publishPocket(platformConn, title, url);
      case "instapaper":
        return await publishInstapaper(platformConn, title, url);
      default:
        return { success: false, message: `Unknown platform: ${post.platform}` };
    }
  } catch (err) {
    return { success: false, message: String(err) };
  }
}

async function publishBluesky(
  conn: typeof platformConnectionsTable.$inferSelect,
  text: string,
  url: string,
): Promise<{ success: boolean; message: string }> {
  if (!conn.accessToken || !conn.instanceUrl) {
    return { success: false, message: "Bluesky requires accessToken (app password) and instanceUrl (handle)" };
  }
  const pds = "https://bsky.social";
  const authRes = await fetch(`${pds}/xrpc/com.atproto.server.createSession`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: conn.instanceUrl, password: conn.accessToken }),
  });
  if (!authRes.ok) return { success: false, message: `Bluesky auth failed: ${await authRes.text()}` };
  const { accessJwt, did } = (await authRes.json()) as { accessJwt: string; did: string };

  const post = { $type: "app.bsky.feed.post", text: `${text}\n${url}`.slice(0, 300), createdAt: new Date().toISOString() };
  const postRes = await fetch(`${pds}/xrpc/com.atproto.repo.createRecord`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessJwt}` },
    body: JSON.stringify({ repo: did, collection: "app.bsky.feed.post", record: post }),
  });
  if (!postRes.ok) return { success: false, message: `Bluesky post failed: ${await postRes.text()}` };
  return { success: true, message: "Published to Bluesky" };
}

async function publishMastodon(
  conn: typeof platformConnectionsTable.$inferSelect,
  text: string,
  url: string,
): Promise<{ success: boolean; message: string }> {
  if (!conn.accessToken || !conn.instanceUrl) {
    return { success: false, message: "Mastodon requires accessToken and instanceUrl" };
  }
  const instance = conn.instanceUrl.replace(/\/$/, "");
  const status = `${text}\n${url}`.slice(0, 500);
  const res = await fetch(`${instance}/api/v1/statuses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${conn.accessToken}` },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) return { success: false, message: `Mastodon post failed: ${await res.text()}` };
  return { success: true, message: "Published to Mastodon" };
}

async function publishMisskey(
  conn: typeof platformConnectionsTable.$inferSelect,
  text: string,
  url: string,
): Promise<{ success: boolean; message: string }> {
  if (!conn.accessToken || !conn.instanceUrl) {
    return { success: false, message: "Misskey requires accessToken (API key) and instanceUrl" };
  }
  const instance = conn.instanceUrl.replace(/\/$/, "");
  const res = await fetch(`${instance}/api/notes/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ i: conn.accessToken, text: `${text}\n${url}`.slice(0, 3000) }),
  });
  if (!res.ok) return { success: false, message: `Misskey post failed: ${await res.text()}` };
  return { success: true, message: "Published to Misskey" };
}

async function publishPixelfed(
  conn: typeof platformConnectionsTable.$inferSelect,
  text: string,
  url: string,
): Promise<{ success: boolean; message: string }> {
  if (!conn.accessToken || !conn.instanceUrl) {
    return { success: false, message: "Pixelfed requires accessToken and instanceUrl" };
  }
  const instance = conn.instanceUrl.replace(/\/$/, "");
  const status = `${text}\n${url}`.slice(0, 2200);
  const res = await fetch(`${instance}/api/v1/statuses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${conn.accessToken}` },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) return { success: false, message: `Pixelfed post failed: ${await res.text()}` };
  return { success: true, message: "Published to Pixelfed" };
}

async function publishDevTo(
  conn: typeof platformConnectionsTable.$inferSelect,
  title: string,
  url: string,
): Promise<{ success: boolean; message: string }> {
  if (!conn.apiKey) {
    return { success: false, message: "Dev.to requires apiKey" };
  }
  const body_markdown = `Originally published at: ${url}`;
  const res = await fetch("https://dev.to/api/articles", {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": conn.apiKey },
    body: JSON.stringify({ article: { title, body_markdown, published: true, canonical_url: url } }),
  });
  if (!res.ok) return { success: false, message: `Dev.to post failed: ${await res.text()}` };
  return { success: true, message: "Published to Dev.to" };
}

async function publishHashnode(
  conn: typeof platformConnectionsTable.$inferSelect,
  title: string,
  url: string,
): Promise<{ success: boolean; message: string }> {
  if (!conn.accessToken || !conn.username) {
    return { success: false, message: "Hashnode requires accessToken and username (publication ID)" };
  }
  const query = `
    mutation PublishPost($input: PublishPostInput!) {
      publishPost(input: $input) { post { id url } }
    }
  `;
  const variables = {
    input: {
      title,
      contentMarkdown: `Originally published at: ${url}`,
      publicationId: conn.username,
      originalArticleURL: url,
    },
  };
  const res = await fetch("https://gql.hashnode.com", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: conn.accessToken },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) return { success: false, message: `Hashnode post failed: ${await res.text()}` };
  const json = (await res.json()) as { errors?: { message: string }[] };
  if (json.errors?.length) return { success: false, message: `Hashnode: ${json.errors[0]!.message}` };
  return { success: true, message: "Published to Hashnode" };
}

async function publishTumblr(
  conn: typeof platformConnectionsTable.$inferSelect,
  title: string,
  url: string,
): Promise<{ success: boolean; message: string }> {
  if (!conn.apiKey || !conn.accessToken || !conn.username) {
    return { success: false, message: "Tumblr requires apiKey (consumer key), accessToken (OAuth token), and username (blog name)" };
  }
  const res = await fetch(`https://api.tumblr.com/v2/blog/${conn.username}.tumblr.com/post`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${conn.accessToken}` },
    body: JSON.stringify({ type: "link", title, url, description: `Shared via Ushare: ${title}` }),
  });
  if (!res.ok) return { success: false, message: `Tumblr post failed: ${await res.text()}` };
  return { success: true, message: "Published to Tumblr" };
}

async function publishReddit(
  conn: typeof platformConnectionsTable.$inferSelect,
  title: string,
  url: string,
): Promise<{ success: boolean; message: string }> {
  if (!conn.accessToken || !conn.username) {
    return { success: false, message: "Reddit requires accessToken (OAuth token) and username (subreddit, e.g. r/programming)" };
  }
  const subreddit = conn.username.replace(/^r\//, "");
  const res = await fetch("https://oauth.reddit.com/api/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${conn.accessToken}`,
      "User-Agent": "Ushare/1.0",
    },
    body: new URLSearchParams({ kind: "link", sr: subreddit, title, url, resubmit: "true" }).toString(),
  });
  if (!res.ok) return { success: false, message: `Reddit post failed: ${await res.text()}` };
  return { success: true, message: `Published to r/${subreddit}` };
}

async function publishDiigo(
  conn: typeof platformConnectionsTable.$inferSelect,
  title: string,
  url: string,
): Promise<{ success: boolean; message: string }> {
  if (!conn.apiKey || !conn.username) {
    return { success: false, message: "Diigo requires apiKey and username" };
  }
  const res = await fetch("https://secure.diigo.com/api/v2/bookmarks", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ key: conn.apiKey, user: conn.username, title, url, shared: "yes" }).toString(),
  });
  if (!res.ok) return { success: false, message: `Diigo post failed: ${await res.text()}` };
  return { success: true, message: "Saved to Diigo" };
}

async function publishRaindrop(
  conn: typeof platformConnectionsTable.$inferSelect,
  title: string,
  url: string,
): Promise<{ success: boolean; message: string }> {
  if (!conn.accessToken) {
    return { success: false, message: "Raindrop.io requires accessToken" };
  }
  const res = await fetch("https://api.raindrop.io/rest/v1/raindrop", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${conn.accessToken}` },
    body: JSON.stringify({ link: url, title, pleaseParse: {} }),
  });
  if (!res.ok) return { success: false, message: `Raindrop post failed: ${await res.text()}` };
  return { success: true, message: "Saved to Raindrop.io" };
}

async function publishPocket(
  conn: typeof platformConnectionsTable.$inferSelect,
  title: string,
  url: string,
): Promise<{ success: boolean; message: string }> {
  if (!conn.apiKey || !conn.accessToken) {
    return { success: false, message: "Pocket requires apiKey (consumer key) and accessToken" };
  }
  const res = await fetch("https://getpocket.com/v3/add", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=UTF-8", "X-Accept": "application/json" },
    body: JSON.stringify({ consumer_key: conn.apiKey, access_token: conn.accessToken, url, title }),
  });
  if (!res.ok) return { success: false, message: `Pocket save failed: ${await res.text()}` };
  return { success: true, message: "Saved to Pocket" };
}

async function publishInstapaper(
  conn: typeof platformConnectionsTable.$inferSelect,
  title: string,
  url: string,
): Promise<{ success: boolean; message: string }> {
  if (!conn.username || !conn.apiKey) {
    return { success: false, message: "Instapaper requires username (email) and apiKey (password)" };
  }
  const res = await fetch("https://www.instapaper.com/api/add", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      username: conn.username,
      password: conn.apiKey,
      url,
      title,
      "Content-Type": "article",
    }).toString(),
  });
  if (res.status !== 201 && !res.ok) return { success: false, message: `Instapaper save failed: HTTP ${res.status}` };
  return { success: true, message: "Saved to Instapaper" };
}

async function runSchedulerTick(): Promise<void> {
  const [settings] = await db.select().from(settingsTable).limit(1);
  if (!settings?.schedulerEnabled) return;

  const now = new Date();

  const duePosts = await db
    .select()
    .from(scheduledPostsTable)
    .where(
      and(
        eq(scheduledPostsTable.status, "scheduled"),
        lte(scheduledPostsTable.scheduledAt, now),
      ),
    )
    .limit(20);

  for (const post of duePosts) {
    logger.info({ postId: post.id, platform: post.platform }, "Dispatching scheduled post");

    await db
      .update(scheduledPostsTable)
      .set({ status: "pending" })
      .where(eq(scheduledPostsTable.id, post.id));

    const result = await publishPost(post);

    if (result.success) {
      await db
        .update(scheduledPostsTable)
        .set({ status: "published", publishedAt: new Date() })
        .where(eq(scheduledPostsTable.id, post.id));

      await db
        .update(campaignUrlsTable)
        .set({ status: "published" })
        .where(eq(campaignUrlsTable.id, post.campaignUrlId));

      await dbLog("info", `Published post #${post.id} to ${post.platform}: ${result.message}`, {
        campaignId: post.campaignId,
        platform: post.platform,
      });
    } else {
      const maxRetries = settings.retryCount ?? 3;
      const newRetryCount = post.retryCount + 1;

      if (newRetryCount >= maxRetries) {
        await db
          .update(scheduledPostsTable)
          .set({ status: "failed", errorMessage: result.message, retryCount: newRetryCount })
          .where(eq(scheduledPostsTable.id, post.id));

        await dbLog("error", `Post #${post.id} to ${post.platform} failed permanently: ${result.message}`, {
          campaignId: post.campaignId,
          platform: post.platform,
          details: result.message,
        });
      } else {
        const retryDelay = Math.min(5 * 60 * 1000 * Math.pow(2, newRetryCount), 60 * 60 * 1000);
        const nextRetryAt = new Date(Date.now() + retryDelay);

        await db
          .update(scheduledPostsTable)
          .set({
            status: "scheduled",
            errorMessage: result.message,
            retryCount: newRetryCount,
            nextRetryAt,
            scheduledAt: nextRetryAt,
          })
          .where(eq(scheduledPostsTable.id, post.id));

        await dbLog("warn", `Post #${post.id} to ${post.platform} failed (retry ${newRetryCount}/${maxRetries}): ${result.message}`, {
          campaignId: post.campaignId,
          platform: post.platform,
        });
      }
    }
  }
}

export function startScheduler(): void {
  logger.info("Starting post scheduler (every minute)");
  cron.schedule("* * * * *", async () => {
    try {
      await runSchedulerTick();
    } catch (err) {
      logger.error({ err }, "Scheduler tick error");
    }
  });
}
