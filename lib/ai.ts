import OpenAI from "openai";
import type { CreatorProfile, AIAnalysis } from "./types";

export async function generateCreatorAnalysis(
  profiles: CreatorProfile[]
): Promise<AIAnalysis> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const profileData = profiles.map((p) => ({
    platform: p.platform,
    username: p.username,
    displayName: p.displayName,
    bio: p.bio,
    followersCount: p.followersCount,
    postsCount: p.postsCount,
    totalLikes: p.totalLikes,
    sampleCaptions: p.recentPosts
      .slice(0, 5)
      .map((post) => post.caption)
      .filter(Boolean),
  }));

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are an influencer marketing expert. You analyze creators for brand partnerships and always respond with valid JSON, written entirely in English regardless of the creator's own content language.",
      },
      {
        role: "user",
        content: `Analyze this creator and respond with this exact JSON (everything in English, including primaryLanguage which names the creator's own content language in English, e.g. "Spanish"):
{
  "summary": "2-3 professional paragraphs about the creator for a brand to evaluate",
  "contentPillars": ["up to 4 content pillars, e.g. Fashion, Travel, Lifestyle"],
  "audience": "short audience description, e.g. Women 18-34",
  "primaryLanguage": "the creator's own content language, in English, e.g. Spanish",
  "tags": ["3-4 attributes, e.g. Authentic, Brand Safe, High Engagement"],
  "topics": ["5-8 recurring topics in their content"],
  "hobbiesAndPassions": "1-2 sentences about interests/passions visible in their public content (e.g. sports, music, travel). Only infer from visible content — never fabricate personal facts that can't be deduced from the content."
}

Creator data:
${JSON.stringify(profileData, null, 2)}`,
      },
    ],
    max_tokens: 800,
  });

  const raw = JSON.parse(completion.choices[0].message.content ?? "{}");

  return {
    summary: raw.summary ?? "",
    contentPillars: raw.contentPillars ?? [],
    audience: raw.audience ?? "",
    primaryLanguage: raw.primaryLanguage ?? "",
    tags: raw.tags ?? [],
    topics: raw.topics ?? [],
    hobbiesAndPassions: raw.hobbiesAndPassions ?? "",
  };
}
