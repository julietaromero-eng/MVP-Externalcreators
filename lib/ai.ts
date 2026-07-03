import OpenAI from "openai";
import type { CreatorProfile, AIAnalysis } from "./types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateCreatorAnalysis(
  profiles: CreatorProfile[]
): Promise<AIAnalysis> {
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
          "Sos un experto en marketing de influencers en Latinoamérica. Analizás creators para brand partnerships y respondés siempre en JSON válido.",
      },
      {
        role: "user",
        content: `Analizá este creator y respondé con este JSON exacto (en español, salvo primaryLanguage que va en inglés):
{
  "summary": "2-3 párrafos profesionales sobre el creator para que una marca lo evalúe",
  "contentPillars": ["máximo 4 pilares de contenido, ej: Moda, Viajes, Lifestyle"],
  "audience": "descripción corta de audiencia, ej: Mujeres 18-34",
  "primaryLanguage": "idioma en inglés, ej: Spanish",
  "tags": ["3-4 atributos, ej: Auténtico, Brand Safe, Alto Engagement"],
  "topics": ["5-8 temas recurrentes en su contenido"]
}

Datos del creator:
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
  };
}
