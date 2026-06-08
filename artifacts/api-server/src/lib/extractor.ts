import * as cheerio from "cheerio";
import { logger } from "./logger";

export interface ExtractedMeta {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  canonicalUrl: string | null;
}

export async function extractMetadata(url: string): Promise<ExtractedMeta> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SocialPoster/1.0; +https://github.com/socialPoster)",
        "Accept": "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Priority 1: Open Graph
    const ogTitle = $('meta[property="og:title"]').attr("content");
    const ogDescription = $('meta[property="og:description"]').attr("content");
    const ogImage = $('meta[property="og:image"]').attr("content");
    const ogUrl = $('meta[property="og:url"]').attr("content");

    // Priority 2: Twitter Card
    const twitterTitle = $('meta[name="twitter:title"]').attr("content");
    const twitterDescription = $('meta[name="twitter:description"]').attr("content");
    const twitterImage = $('meta[name="twitter:image"]').attr("content");

    // Priority 3: Standard Meta
    const metaDescription = $('meta[name="description"]').attr("content");
    const canonicalUrl = $('link[rel="canonical"]').attr("href");

    // Priority 4: HTML fallback
    const htmlTitle = $("title").first().text().trim() || null;
    const h1Title = $("h1").first().text().trim() || null;

    const title = ogTitle ?? twitterTitle ?? htmlTitle ?? h1Title ?? null;
    const description = ogDescription ?? twitterDescription ?? metaDescription ?? null;
    const imageUrl = ogImage ?? twitterImage ?? null;
    const resolvedCanonical = ogUrl ?? canonicalUrl ?? url;

    return {
      title: title ? title.slice(0, 500) : null,
      description: description ? description.slice(0, 1000) : null,
      imageUrl: imageUrl ?? null,
      canonicalUrl: resolvedCanonical,
    };
  } catch (err) {
    logger.warn({ url, err }, "Failed to extract metadata from URL");
    return { title: null, description: null, imageUrl: null, canonicalUrl: url };
  }
}

export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
