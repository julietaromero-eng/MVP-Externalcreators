import { getSupabaseAdmin } from "./supabase";
import type {
  AIAnalysis,
  ContactLink,
  CreatorPost,
  CreatorProfile,
  Platform,
  PortfolioAbout,
  ProfileOverrides,
  ProfileStatus,
} from "./types";

async function getOrCreatePortfolioId(): Promise<string> {
  const supabase = getSupabaseAdmin();

  const { data: existing } = await supabase
    .from("portfolios")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing) return existing.id as string;

  const { data: created, error } = await supabase
    .from("portfolios")
    .insert({})
    .select("id")
    .single();

  if (error) throw error;
  return created.id as string;
}

function postRowToCreatorPost(row: Record<string, unknown>): CreatorPost {
  return {
    id: row.id as string,
    thumbnailUrl: (row.thumbnail_url as string) ?? null,
    postUrl: (row.post_url as string) ?? null,
    likesCount: (row.likes_count as number) ?? 0,
    commentsCount: (row.comments_count as number) ?? 0,
    viewsCount: (row.views_count as number) ?? undefined,
    caption: (row.caption as string) ?? "",
    sortOrder: (row.sort_order as number) ?? 0,
  };
}

function profileRowToCreatorProfile(
  row: Record<string, unknown>,
  posts: CreatorPost[]
): CreatorProfile {
  return {
    platform: row.platform as Platform,
    status: row.status as ProfileStatus,
    username: (row.username as string) ?? "",
    displayName: (row.display_name as string) ?? "",
    bio: (row.bio as string) ?? "",
    followersCount: (row.followers_count as number) ?? 0,
    followingCount: (row.following_count as number) ?? 0,
    postsCount: (row.posts_count as number) ?? 0,
    profilePicUrl: (row.profile_pic_url as string) ?? null,
    totalLikes: (row.total_likes as number) ?? undefined,
    recentPosts: posts,
  };
}

export async function saveGeneratedPortfolio(
  profiles: CreatorProfile[],
  aiAnalysis: AIAnalysis
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const portfolioId = await getOrCreatePortfolioId();

  const { data: currentPortfolio } = await supabase
    .from("portfolios")
    .select("about_bio")
    .eq("id", portfolioId)
    .single();

  const portfolioUpdates: Record<string, unknown> = { generated_at: new Date().toISOString() };
  if (!currentPortfolio?.about_bio) {
    portfolioUpdates.about_bio = aiAnalysis.summary;
  }

  await supabase.from("portfolios").update(portfolioUpdates).eq("id", portfolioId);

  for (const profile of profiles) {
    const { data: profileRow, error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          portfolio_id: portfolioId,
          platform: profile.platform,
          username: profile.username,
          display_name: profile.displayName,
          bio: profile.bio,
          followers_count: profile.followersCount,
          following_count: profile.followingCount,
          posts_count: profile.postsCount,
          profile_pic_url: profile.profilePicUrl,
          total_likes: profile.totalLikes ?? null,
          status: profile.status ?? "active",
        },
        { onConflict: "portfolio_id,platform,username" }
      )
      .select("id")
      .single();

    if (profileError) throw profileError;
    const profileId = profileRow.id as string;

    await supabase.from("posts").delete().eq("profile_id", profileId);

    if (profile.recentPosts.length > 0) {
      const { error: postsError } = await supabase.from("posts").insert(
        profile.recentPosts.map((post, index) => ({
          profile_id: profileId,
          thumbnail_url: post.thumbnailUrl,
          post_url: post.postUrl,
          caption: post.caption,
          likes_count: post.likesCount,
          comments_count: post.commentsCount,
          views_count: post.viewsCount ?? null,
          sort_order: index,
        }))
      );
      if (postsError) throw postsError;
    }
  }

  const { error: aiError } = await supabase.from("ai_analyses").upsert(
    {
      portfolio_id: portfolioId,
      summary: aiAnalysis.summary,
      content_pillars: aiAnalysis.contentPillars,
      audience: aiAnalysis.audience,
      primary_language: aiAnalysis.primaryLanguage,
      tags: aiAnalysis.tags,
      topics: aiAnalysis.topics,
    },
    { onConflict: "portfolio_id" }
  );
  if (aiError) throw aiError;
}

export interface LoadedPortfolio {
  profiles: CreatorProfile[];
  aiAnalysis: AIAnalysis;
  generatedAt: string;
  about: PortfolioAbout;
  profileOverrides: ProfileOverrides;
}

export async function loadPortfolio(): Promise<LoadedPortfolio | null> {
  const supabase = getSupabaseAdmin();

  const { data: portfolio } = await supabase
    .from("portfolios")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!portfolio || !portfolio.generated_at) return null;

  const { data: profileRows, error: profilesError } = await supabase
    .from("profiles")
    .select("*")
    .eq("portfolio_id", portfolio.id);
  if (profilesError) throw profilesError;

  const profiles: CreatorProfile[] = [];
  for (const profileRow of profileRows ?? []) {
    const { data: postRows, error: postsError } = await supabase
      .from("posts")
      .select("*")
      .eq("profile_id", profileRow.id)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true });
    if (postsError) throw postsError;

    profiles.push(
      profileRowToCreatorProfile(profileRow, (postRows ?? []).map(postRowToCreatorPost))
    );
  }

  const { data: aiRow } = await supabase
    .from("ai_analyses")
    .select("*")
    .eq("portfolio_id", portfolio.id)
    .maybeSingle();

  const aiAnalysis: AIAnalysis = {
    summary: (aiRow?.summary as string) ?? "",
    contentPillars: (aiRow?.content_pillars as string[]) ?? [],
    audience: (aiRow?.audience as string) ?? "",
    primaryLanguage: (aiRow?.primary_language as string) ?? "",
    tags: (aiRow?.tags as string[]) ?? [],
    topics: (aiRow?.topics as string[]) ?? [],
  };

  return {
    profiles,
    aiAnalysis,
    generatedAt: portfolio.generated_at as string,
    about: {
      bio: (portfolio.about_bio as string) ?? "",
      contactEmail: (portfolio.contact_email as string) ?? null,
      contactLinks: (portfolio.contact_links as ContactLink[]) ?? [],
    },
    profileOverrides: {
      displayName: (portfolio.display_name as string) ?? null,
      profilePicUrl: (portfolio.profile_pic_url as string) ?? null,
    },
  };
}

export interface PostOperation {
  id: string;
  sortOrder?: number;
  deletedAt?: string | null;
}

export async function applyPostOperations(operations: PostOperation[]): Promise<void> {
  const supabase = getSupabaseAdmin();

  await Promise.all(
    operations.map((op) => {
      const update: Record<string, unknown> = {};
      if (op.sortOrder !== undefined) update.sort_order = op.sortOrder;
      if (op.deletedAt !== undefined) update.deleted_at = op.deletedAt;
      return supabase.from("posts").update(update).eq("id", op.id);
    })
  );
}

export async function saveAbout(about: PortfolioAbout): Promise<PortfolioAbout> {
  const supabase = getSupabaseAdmin();
  const portfolioId = await getOrCreatePortfolioId();

  const { error } = await supabase
    .from("portfolios")
    .update({
      about_bio: about.bio,
      contact_email: about.contactEmail,
      contact_links: about.contactLinks,
    })
    .eq("id", portfolioId);

  if (error) throw error;
  return about;
}

export async function saveProfileOverrides(overrides: ProfileOverrides): Promise<ProfileOverrides> {
  const supabase = getSupabaseAdmin();
  const portfolioId = await getOrCreatePortfolioId();

  const { error } = await supabase
    .from("portfolios")
    .update({
      display_name: overrides.displayName,
      profile_pic_url: overrides.profilePicUrl,
    })
    .eq("id", portfolioId);

  if (error) throw error;
  return overrides;
}
