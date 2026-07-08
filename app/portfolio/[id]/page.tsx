import Image from "next/image";
import { loadPortfolio } from "@/lib/portfolio-store";
import { BrkawayLogo } from "@/lib/BrkawayLogo";
import { PublicGrid, PlatformIcon } from "./PublicGrid";
import type { CreatorPost, Platform } from "@/lib/types";

export default async function PublicPortfolioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const portfolio = await loadPortfolio(id).catch(() => null);

  if (!portfolio) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bk-bg-light px-6">
        <div className="text-center">
          <BrkawayLogo size={28} color="#7f56d9" className="mx-auto mb-4" />
          <h1 className="text-xl font-bold text-bk-text-primary mb-2">Portfolio not found</h1>
          <p className="text-sm text-bk-text-secondary">This link may be incorrect or the portfolio was removed.</p>
        </div>
      </div>
    );
  }

  const { profiles, aiAnalysis, about } = portfolio;
  const firstProfile = profiles[0];
  const name = portfolio.profileOverrides.displayName || firstProfile?.displayName || "Creator";
  const profilePicUrl = portfolio.profileOverrides.profilePicUrl || firstProfile?.profilePicUrl;
  const initial = name.charAt(0).toUpperCase();

  const items: { post: CreatorPost; platform: Platform }[] = profiles.flatMap((p) =>
    p.recentPosts.map((post) => ({ post, platform: p.platform }))
  );

  return (
    <div className="min-h-screen bg-bk-bg-light">
      <header className="bg-bk-bg border-b border-bk-border px-6 py-4 flex items-center gap-2">
        <BrkawayLogo size={18} color="#7f56d9" />
        <span className="font-medium text-bk-text-primary text-lg">brkaway</span>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <div className="flex items-center gap-4">
          {profilePicUrl ? (
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-bk-border flex-shrink-0">
              <Image src={profilePicUrl} alt={name} width={64} height={64} className="object-cover" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-bk-purple-light flex items-center justify-center flex-shrink-0">
              <span className="text-bk-purple font-bold text-2xl">{initial}</span>
            </div>
          )}
          <div>
            <h1 className="font-bold text-bk-text-primary text-2xl leading-tight">{name}</h1>
            {profiles.length > 0 && (
              <div className="flex items-center gap-1.5 mt-2">
                {profiles.map((p) => (
                  <div
                    key={p.platform}
                    className="w-7 h-7 rounded-lg border border-bk-border flex items-center justify-center"
                  >
                    <PlatformIcon platform={p.platform} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {aiAnalysis.summary && (
          <div className="bg-bk-bg border border-bk-border rounded-xl p-6 space-y-4">
            <p className="text-sm text-bk-text-primary leading-relaxed">{aiAnalysis.summary}</p>
            {aiAnalysis.contentPillars.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-bk-text-muted uppercase tracking-wider mb-2">
                  Content Pillars
                </p>
                <div className="flex flex-wrap gap-2">
                  {aiAnalysis.contentPillars.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 bg-bk-purple-light text-bk-purple text-xs font-medium rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {about?.bio && (
          <div className="bg-bk-bg border border-bk-border rounded-xl p-6">
            <p className="text-xs font-semibold text-bk-text-muted uppercase tracking-wider mb-2">About</p>
            <p className="text-sm text-bk-text-secondary leading-relaxed">{about.bio}</p>
          </div>
        )}

        <div>
          <p className="text-sm font-semibold text-bk-text-primary mb-4">{items.length} items</p>
          <PublicGrid items={items} />
        </div>
      </div>
    </div>
  );
}
