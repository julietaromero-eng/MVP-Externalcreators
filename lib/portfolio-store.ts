import { getSupabaseAdmin } from "./supabase";
import type {
  AIAnalysis,
  BookingLinks,
  CreatorPost,
  CreatorProfile,
  Platform,
  PortfolioAbout,
  PortfolioSummary,
  ProfileOverrides,
  ProfileStatus,
  SocialLinks,
} from "./types";

const EMPTY_SOCIAL_LINKS: SocialLinks = {
  tiktok: "",
  instagram: "",
  youtube: "",
  kwai: "",
  linkedin: "",
  twitter: "",
  threads: "",
  facebook: "",
  website: "",
};

const EMPTY_BOOKING_LINKS: BookingLinks = { calendly: "" };

async function createPortfolio(): Promise<string> {
  const supabase = getSupabaseAdmin();

  const { data: created, error } = await supabase
    .from("portfolios")
    .insert({})
    .select("id")
    .single();

  if (error) throw error;
  return created.id as string;
}

export async function listPortfolios(): Promise<PortfolioSummary[]> {
  const supabase = getSupabaseAdmin();

  const { data: portfolioRows, error: portfoliosError } = await supabase
    .from("portfolios")
    .select("id, display_name, profile_pic_url, generated_at")
    .not("generated_at", "is", null)
    .eq("is_saved", true)
    .order("generated_at", { ascending: false });
  if (portfoliosError) throw portfoliosError;
  if (!portfolioRows || portfolioRows.length === 0) return [];

  const portfolioIds = portfolioRows.map((row) => row.id as string);
  const { data: profileRows, error: profilesError } = await supabase
    .from("profiles")
    .select("portfolio_id, platform, username, display_name, profile_pic_url")
    .in("portfolio_id", portfolioIds);
  if (profilesError) throw profilesError;

  const profilesByPortfolio = new Map<string, Record<string, unknown>[]>();
  for (const row of profileRows ?? []) {
    const key = row.portfolio_id as string;
    if (!profilesByPortfolio.has(key)) profilesByPortfolio.set(key, []);
    profilesByPortfolio.get(key)!.push(row);
  }

  return portfolioRows.map((row) => {
    const profiles = profilesByPortfolio.get(row.id as string) ?? [];
    const primary = profiles.find((p) => p.platform === "instagram") ?? profiles[0];
    return {
      id: row.id as string,
      displayName:
        (row.display_name as string) ||
        (primary?.display_name as string) ||
        (primary?.username as string) ||
        "Untitled",
      username: (primary?.username as string) ?? "",
      profilePicUrl: (row.profile_pic_url as string) || (primary?.profile_pic_url as string) || null,
      platforms: profiles.map((p) => p.platform as Platform),
      generatedAt: (row.generated_at as string) ?? null,
    };
  });
}

function postRowToCreatorPost(row: Record<string, unknown>): CreatorPost {
  return {
    id: row.id as string,
    thumbnailUrl: (row.thumbnail_url as string) ?? null,
    postUrl: (row.post_url as string) ?? null,
    likesCount: (row.likes_count as number) ?? 0,
    commentsCount: (row.comments_count as number) ?? 0,
    viewsCount: (row.views_count as number) ?? undefined,
    isVideo: (row.is_video as boolean) ?? false,
    videoUrl: (row.video_url as string) ?? null,
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

function profileUrl(profile: CreatorProfile): string {
  if (profile.platform === "instagram") return `https://instagram.com/${profile.username}`;
  if (profile.platform === "tiktok") return `https://www.tiktok.com/@${profile.username}`;
  return "";
}

export async function saveGeneratedPortfolio(
  profiles: CreatorProfile[],
  aiAnalysis: AIAnalysis,
  existingPortfolioId?: string
): Promise<string> {
  const supabase = getSupabaseAdmin();
  const portfolioId = existingPortfolioId ?? (await createPortfolio());

  const { data: current } = await supabase
    .from("portfolios")
    .select("about_bio, about_hobbies, about_industries, about_content_types, about_languages, social_links")
    .eq("id", portfolioId)
    .single();

  const portfolioUpdates: Record<string, unknown> = { generated_at: new Date().toISOString() };
  if (!current?.about_bio) portfolioUpdates.about_bio = aiAnalysis.summary;
  if (!current?.about_hobbies) portfolioUpdates.about_hobbies = aiAnalysis.hobbiesAndPassions;
  if (!current?.about_industries?.length) portfolioUpdates.about_industries = aiAnalysis.contentPillars;
  if (!current?.about_content_types?.length) portfolioUpdates.about_content_types = aiAnalysis.topics;
  if (!current?.about_languages) portfolioUpdates.about_languages = aiAnalysis.primaryLanguage;

  const existingSocialLinks: SocialLinks = { ...EMPTY_SOCIAL_LINKS, ...(current?.social_links ?? {}) };
  const mergedSocialLinks = { ...existingSocialLinks };
  for (const profile of profiles) {
    if (profile.platform === "instagram" && !mergedSocialLinks.instagram) {
      mergedSocialLinks.instagram = profileUrl(profile);
    }
    if (profile.platform === "tiktok" && !mergedSocialLinks.tiktok) {
      mergedSocialLinks.tiktok = profileUrl(profile);
    }
  }
  portfolioUpdates.social_links = mergedSocialLinks;

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
        { onConflict: "portfolio_id,platform" }
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
          is_video: post.isVideo ?? false,
          video_url: post.videoUrl ?? null,
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
      hobbies_and_passions: aiAnalysis.hobbiesAndPassions,
    },
    { onConflict: "portfolio_id" }
  );
  if (aiError) throw aiError;

  return portfolioId;
}

export interface LoadedPortfolio {
  id: string;
  isSaved: boolean;
  profiles: CreatorProfile[];
  aiAnalysis: AIAnalysis;
  generatedAt: string;
  about: PortfolioAbout;
  profileOverrides: ProfileOverrides;
}

export async function loadPortfolio(portfolioId?: string): Promise<LoadedPortfolio | null> {
  const supabase = getSupabaseAdmin();

  // With no explicit id, only the current unsaved draft is eligible — once a
  // portfolio is saved it belongs to the Creators list, not the working tab.
  const { data: portfolio } = portfolioId
    ? await supabase.from("portfolios").select("*").eq("id", portfolioId).maybeSingle()
    : await supabase
        .from("portfolios")
        .select("*")
        .not("generated_at", "is", null)
        .eq("is_saved", false)
        .order("generated_at", { ascending: false })
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
    hobbiesAndPassions: (aiRow?.hobbies_and_passions as string) ?? "",
  };

  return {
    id: portfolio.id as string,
    isSaved: (portfolio.is_saved as boolean) ?? false,
    profiles,
    aiAnalysis,
    generatedAt: portfolio.generated_at as string,
    about: {
      bio: (portfolio.about_bio as string) ?? "",
      hobbiesAndPassions: (portfolio.about_hobbies as string) ?? "",
      industries: (portfolio.about_industries as string[]) ?? [],
      contentTypes: (portfolio.about_content_types as string[]) ?? [],
      pronouns: (portfolio.about_pronouns as string) ?? null,
      age: (portfolio.about_age as string) ?? null,
      location: (portfolio.about_location as string) ?? null,
      languages: (portfolio.about_languages as string) ?? "",
      nationality: (portfolio.about_nationality as string[]) ?? [],
      contactEmail: (portfolio.contact_email as string) ?? null,
      socialLinks: { ...EMPTY_SOCIAL_LINKS, ...(portfolio.social_links as Partial<SocialLinks>) },
      bookingLinks: { ...EMPTY_BOOKING_LINKS, ...(portfolio.booking_links as Partial<BookingLinks>) },
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

export async function saveAbout(portfolioId: string, about: PortfolioAbout): Promise<PortfolioAbout> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("portfolios")
    .update({
      about_bio: about.bio,
      about_hobbies: about.hobbiesAndPassions,
      about_industries: about.industries,
      about_content_types: about.contentTypes,
      about_pronouns: about.pronouns,
      about_age: about.age,
      about_location: about.location,
      about_languages: about.languages,
      about_nationality: about.nationality,
      contact_email: about.contactEmail,
      social_links: about.socialLinks,
      booking_links: about.bookingLinks,
    })
    .eq("id", portfolioId);

  if (error) throw error;
  return about;
}

export async function saveProfileOverrides(
  portfolioId: string,
  overrides: ProfileOverrides
): Promise<ProfileOverrides> {
  const supabase = getSupabaseAdmin();

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

export async function savePortfolio(portfolioId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("portfolios").update({ is_saved: true }).eq("id", portfolioId);
  if (error) throw error;
}

export async function saveAiSummary(portfolioId: string, summary: string): Promise<string> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("ai_analyses")
    .upsert({ portfolio_id: portfolioId, summary }, { onConflict: "portfolio_id" });

  if (error) throw error;
  return summary;
}
