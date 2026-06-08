import { GoogleGenAI } from "@google/genai";
import { logger } from "./logger";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  logger.warn("GEMINI_API_KEY not set — AI content generation will be unavailable");
}

export const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export interface ContentMetadata {
  title: string;
  description: string | null;
  imageUrl: string | null;
  url: string;
}

const PLATFORM_PROMPTS: Record<string, (meta: ContentMetadata) => string> = {
  bluesky: (meta) => `Generate an engaging Bluesky post for this article:
Title: ${meta.title}
URL: ${meta.url}
Description: ${meta.description ?? ""}

Requirements:
- Max 300 characters (Bluesky limit)
- Engaging social caption that hooks the reader
- Include 2-3 relevant hashtags at the end
- Include the URL
- Do NOT use emojis

Return JSON: { "content": "...", "hashtags": "#tag1 #tag2 #tag3" }`,

  mastodon: (meta) => `Generate an informative Mastodon post for this article:
Title: ${meta.title}
URL: ${meta.url}
Description: ${meta.description ?? ""}

Requirements:
- Max 500 characters
- Informative short-form post
- Include 3-4 relevant hashtags
- Include the URL
- Do NOT use emojis

Return JSON: { "content": "...", "hashtags": "#tag1 #tag2 #tag3" }`,

  misskey: (meta) => `Generate an engaging Misskey post for this article:
Title: ${meta.title}
URL: ${meta.url}
Description: ${meta.description ?? ""}

Requirements:
- Max 3000 characters but keep it concise (under 400 characters ideal)
- Engaging social post
- Include 2-3 relevant hashtags
- Include the URL
- Do NOT use emojis

Return JSON: { "content": "...", "hashtags": "#tag1 #tag2 #tag3" }`,

  pixelfed: (meta) => `Generate an image-focused caption for Pixelfed for this article:
Title: ${meta.title}
URL: ${meta.url}
Description: ${meta.description ?? ""}

Requirements:
- Image-focused caption (the image is the primary content)
- Under 2200 characters
- Include the title and URL
- Do NOT use emojis

Return JSON: { "content": "...", "hashtags": "#tag1 #tag2" }`,

  "dev.to": (meta) => `Generate a blog-style article summary for Dev.to for this article:
Title: ${meta.title}
URL: ${meta.url}
Description: ${meta.description ?? ""}

Requirements:
- 300-500 words
- Article summary with key takeaways
- Include a call-to-action to read the full article
- Include the source URL
- Do NOT use emojis

Return JSON: { "content": "...", "hashtags": "#webdev #programming #tech" }`,

  hashnode: (meta) => `Generate a blog-style summary for Hashnode for this article:
Title: ${meta.title}
URL: ${meta.url}
Description: ${meta.description ?? ""}

Requirements:
- 300-500 words
- Blog-style summary with key points
- Include a call-to-action to read the full article
- Include the source URL
- Do NOT use emojis

Return JSON: { "content": "...", "hashtags": "#webdev #programming #tech" }`,

  tumblr: (meta) => `Generate a Tumblr post for this article:
Title: ${meta.title}
URL: ${meta.url}
Description: ${meta.description ?? ""}

Requirements:
- Engaging short-form caption, 100-200 words
- Creative and blog-friendly tone
- Include 3-5 relevant tags
- Include the URL
- Do NOT use emojis

Return JSON: { "content": "...", "hashtags": "#tag1 #tag2 #tag3" }`,

  reddit: (meta) => `Generate a Reddit post title and body for this article:
Title: ${meta.title}
URL: ${meta.url}
Description: ${meta.description ?? ""}

Requirements:
- Compelling post title (under 300 characters)
- Optional short body text (1-3 sentences) providing context
- Neutral, informative tone suitable for general subreddits
- Include the URL
- Do NOT use emojis

Return JSON: { "content": "...", "hashtags": "" }`,

  diigo: (meta) => `Generate a Diigo bookmark annotation for this article:
Title: ${meta.title}
URL: ${meta.url}
Description: ${meta.description ?? ""}

Requirements:
- 1-3 sentence annotation describing why this resource is valuable
- Professional, research-oriented tone
- Include 3-5 relevant tags
- Do NOT use emojis

Return JSON: { "content": "...", "hashtags": "#tag1 #tag2 #tag3" }`,

  raindrop: (meta) => `Generate a Raindrop.io bookmark note for this article:
Title: ${meta.title}
URL: ${meta.url}
Description: ${meta.description ?? ""}

Requirements:
- 1-2 sentence note describing what this bookmark is about
- Clear and concise
- Include 3-5 relevant tags
- Do NOT use emojis

Return JSON: { "content": "...", "hashtags": "#tag1 #tag2 #tag3" }`,

  pocket: (meta) => `Generate a Pocket save annotation for this article:
Title: ${meta.title}
URL: ${meta.url}
Description: ${meta.description ?? ""}

Requirements:
- 1-2 sentence note on why this article is worth reading
- Concise and personal in tone
- Include 3-5 relevant tags
- Do NOT use emojis

Return JSON: { "content": "...", "hashtags": "#tag1 #tag2 #tag3" }`,

  instapaper: (meta) => `Generate an Instapaper highlight/note for this article:
Title: ${meta.title}
URL: ${meta.url}
Description: ${meta.description ?? ""}

Requirements:
- 1-2 sentence note capturing the key takeaway of this article
- Thoughtful, reader-focused tone
- Include 3-5 relevant tags
- Do NOT use emojis

Return JSON: { "content": "...", "hashtags": "#tag1 #tag2 #tag3" }`,
};

export async function generatePlatformContent(
  platform: string,
  meta: ContentMetadata,
): Promise<{ content: string; hashtags: string | null }> {
  if (!ai) {
    throw new Error("Gemini API key not configured");
  }

  const promptFn = PLATFORM_PROMPTS[platform.toLowerCase()];
  if (!promptFn) {
    throw new Error(`No prompt template for platform: ${platform}`);
  }

  const prompt = promptFn(meta);

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      maxOutputTokens: 8192,
    },
  });

  const text = response.text ?? "{}";
  try {
    const parsed = JSON.parse(text);
    return {
      content: parsed.content ?? "",
      hashtags: parsed.hashtags ?? null,
    };
  } catch {
    logger.warn({ platform, text }, "Failed to parse Gemini JSON response");
    return { content: text, hashtags: null };
  }
}
