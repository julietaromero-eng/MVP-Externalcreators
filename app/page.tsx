"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  LayoutDashboard, Bell, MessageSquare, Package, Handshake,
  Compass, SquareCheck, Tag, Briefcase, Receipt, Zap,
  Link, Pencil, Check, Loader2, X, Search, SlidersHorizontal,
  Heart, MessageCircle, Eye, ChevronRight,
} from "lucide-react";
import type { GenerateResponse, CreatorProfile, CreatorPost } from "@/lib/types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

type PageState = "empty" | "modal" | "loading" | "result";

const LOADING_STEPS = [
  "Connecting to Instagram...",
  "Connecting to TikTok...",
  "Importing public content...",
  "Ranking posts by engagement...",
  "Detecting content categories...",
  "Generating creator summary...",
  "Organizing portfolio...",
  "Finalizing portfolio...",
];

// ─── Sidebar ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: Bell, label: "Notifications" },
  { icon: MessageSquare, label: "Messages" },
  { icon: Package, label: "Deliverables" },
  { icon: Handshake, label: "Collabs" },
  { icon: Compass, label: "Opportunities" },
  { icon: SquareCheck, label: "Tasks" },
  { icon: Tag, label: "Brands" },
  { icon: Briefcase, label: "Portfolio", active: true },
  { icon: Receipt, label: "Invoicing" },
];

function Sidebar() {
  return (
    <aside className="w-[220px] flex-shrink-0 bg-bk-bg-sidebar border-r border-bk-border flex flex-col h-full">
      <div className="flex items-center gap-2 px-5 py-5">
        <Zap size={20} className="text-bk-purple fill-bk-purple" />
        <span className="font-bold text-bk-text-primary text-lg">brkaway</span>
      </div>
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV_ITEMS.map(({ icon: Icon, label, active }) => (
          <button
            key={label}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              active
                ? "bg-bk-purple-light text-bk-purple font-semibold"
                : "text-bk-text-secondary hover:bg-bk-border-light"
            }`}
          >
            <Icon size={16} className={active ? "text-bk-purple" : "text-bk-text-secondary"} />
            {label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

// ─── Profile Header ──────────────────────────────────────────────────────────

function ProfileHeader({ profile }: { profile?: CreatorProfile }) {
  const name = profile?.displayName ?? "John Romero";
  const igHandle = profile?.platform === "instagram" ? `@${profile.username}` : "@johndoe";
  const ttHandle = profile?.platform === "tiktok" ? `@${profile.username}` : "@johntiktok";
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="bg-bk-bg border-b border-bk-border px-8 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            {profile?.profilePicUrl ? (
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-bk-border">
                <Image src={profile.profilePicUrl} alt={name} width={48} height={48} className="object-cover" unoptimized />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-bk-purple-light flex items-center justify-center">
                <span className="text-bk-purple font-bold text-lg">{initial}</span>
              </div>
            )}
          </div>
          <div>
            <h1 className="font-bold text-bk-text-primary text-lg leading-tight">{name}</h1>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs text-bk-text-muted">{igHandle}</span>
              <span className="text-bk-border">·</span>
              <span className="text-xs text-bk-text-muted">{ttHandle}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-bk-bg-light border border-bk-border rounded-lg px-3 py-1.5">
            <Link size={12} className="text-bk-text-muted" />
            <span className="text-xs text-bk-text-secondary">portfolio.brkaway.co/johndoe</span>
          </div>
          <button className="flex items-center gap-1.5 border border-bk-border rounded-lg px-3 py-1.5 text-xs text-bk-text-secondary hover:bg-bk-bg-light transition-colors">
            <Pencil size={12} />
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab Bar ─────────────────────────────────────────────────────────────────

const TABS = ["Portfolio", "About", "Pricing", "Testimonials", "Audience Analytics"];

function TabBar() {
  return (
    <div className="bg-bk-bg border-b border-bk-border px-8">
      <div className="flex items-center gap-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`py-3 text-sm border-b-2 transition-colors ${
              tab === "Portfolio"
                ? "border-bk-purple text-bk-purple font-semibold"
                : "border-transparent text-bk-text-secondary hover:text-bk-text-primary"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Right Panel ─────────────────────────────────────────────────────────────

function RightPanel({ result }: { result: GenerateResponse | null }) {
  const igProfile = result?.profiles.find((p) => p.platform === "instagram");
  const ttProfile = result?.profiles.find((p) => p.platform === "tiktok");
  const hasResult = !!result;

  return (
    <aside className="w-[300px] flex-shrink-0 bg-bk-bg-light border-l border-bk-border p-5 space-y-4 overflow-y-auto">
      {/* Setup Card */}
      <div className="bg-bk-bg border border-bk-border rounded-xl p-4 space-y-3">
        <div>
          <h3 className="font-bold text-bk-text-primary text-sm">Portfolio Setup</h3>
          <p className="text-xs text-bk-text-muted mt-0.5">
            {hasResult ? "All steps completed!" : "3 steps to get started"}
          </p>
        </div>
        <div className="h-1.5 bg-bk-border-light rounded-full overflow-hidden">
          <div
            className="h-full bg-bk-success rounded-full transition-all duration-700"
            style={{ width: hasResult ? "100%" : "0%" }}
          />
        </div>
        <div className="space-y-2.5">
          {["Add Videos/Photos", "Complete Your About Page", "You're All Ready To Go!"].map((step, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                  hasResult ? "bg-bk-success" : "border-2 border-bk-border"
                }`}
              >
                {hasResult && <Check size={11} className="text-white" strokeWidth={3} />}
              </div>
              <span className={`text-xs ${hasResult ? "text-bk-text-primary" : "text-bk-text-muted"}`}>
                {hasResult ? `Step ${i + 1}: ${step}` : ["Connect Instagram", "Connect TikTok", "Create your first portfolio"][i]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Imported Content (only when result) */}
      {hasResult && (
        <div className="bg-bk-bg border border-bk-border rounded-xl p-4 space-y-3">
          <h3 className="font-bold text-bk-text-primary text-sm">Imported Content</h3>
          <div className="space-y-2.5">
            {[
              { icon: "📸", label: "Instagram Posts", value: igProfile ? fmt(igProfile.postsCount) : "—" },
              { icon: "🎵", label: "TikTok Videos", value: ttProfile ? fmt(ttProfile.postsCount) : "—" },
              { icon: "❤️", label: "Instagram Followers", value: igProfile ? fmt(igProfile.followersCount) : "—" },
              { icon: "👍", label: "Avg. Likes", value: igProfile && igProfile.recentPosts.length > 0
                  ? fmt(Math.round(igProfile.recentPosts.reduce((s, p) => s + p.likesCount, 0) / igProfile.recentPosts.length))
                  : "—" },
            ].map(({ icon, label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{icon}</span>
                  <span className="text-xs text-bk-text-secondary">{label}</span>
                </div>
                <span className="text-sm font-bold text-bk-text-primary">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discoverable Card */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: "linear-gradient(180deg, #7C5CFC 0%, #A78BFA 100%)" }}>
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-white fill-white" />
          <span className="text-white font-bold text-sm">
            {hasResult ? "Discoverable to Brands" : "Get Discoverable"}
          </span>
        </div>
        <p className="text-white/80 text-xs leading-relaxed">
          {hasResult
            ? "Your portfolio is live! Brands can now find you based on your content and niche."
            : "Complete your portfolio setup to get discovered by brands in your niche."}
        </p>
        <button className="w-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold py-2 rounded-lg transition-colors">
          {hasResult ? "View Public Profile" : "Complete Setup"}
        </button>
      </div>
    </aside>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ onCreateByURL }: { onCreateByURL: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-16 px-8">
      <h2 className="text-2xl font-bold text-bk-text-primary mb-2 flex items-center gap-2">
        Portfolio <span>🔗</span>
      </h2>
      <p className="text-bk-text-secondary text-sm text-center max-w-sm mb-8">
        Your portfolio contains all of your work brands will see. Make sure you include a variety of video & photo examples that best highlight your skills as a creator.
      </p>
      <button className="flex items-center gap-2 border-2 border-bk-border bg-bk-bg text-bk-text-primary font-semibold px-6 py-3 rounded-xl text-sm hover:bg-bk-bg-light transition-colors mb-3">
        ↑ Upload Content
      </button>
      <p className="text-xs text-bk-text-muted mb-3">or drag and drop files here</p>
      <p className="text-xs text-bk-text-muted mb-3">or</p>
      <button
        onClick={onCreateByURL}
        className="flex items-center gap-2 bg-bk-purple text-white font-semibold px-6 py-3 rounded-xl text-sm hover:bg-bk-purple-dark transition-colors"
      >
        <span className="text-white">✦</span>
        Create Portfolio by URL
      </button>
      <p className="text-xs text-bk-text-muted mt-3">
        Paste your Instagram or TikTok URL and we&apos;ll build it automatically
      </p>
    </div>
  );
}

// ─── URL Modal ───────────────────────────────────────────────────────────────

function URLModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (ig: string, tt: string) => void;
}) {
  const [igUrl, setIgUrl] = useState("");
  const [ttUrl, setTtUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (igUrl || ttUrl) onSubmit(igUrl, ttUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-bk-bg rounded-2xl shadow-2xl w-[480px] p-8 space-y-6">
        {/* Icon */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 bg-bk-purple-light rounded-full flex items-center justify-center">
            <Link size={24} className="text-bk-purple" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-bk-text-primary">Create Portfolio by URL</h2>
            <p className="text-sm text-bk-text-secondary mt-1">
              Paste your social media profile URLs and we&apos;ll automatically import your best content.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-bk-text-primary mb-1.5">
              <span className="text-base">📷</span> Instagram Profile URL
            </label>
            <input
              type="url"
              value={igUrl}
              onChange={(e) => setIgUrl(e.target.value)}
              placeholder="https://instagram.com/johndoe"
              className="w-full px-4 py-2.5 rounded-xl border border-bk-border text-sm text-bk-text-primary placeholder:text-bk-text-muted focus:outline-none focus:ring-2 focus:ring-bk-purple/30 focus:border-bk-purple transition-colors"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-bk-text-primary mb-1.5">
              <span className="text-base">🎵</span> TikTok Profile URL
            </label>
            <input
              type="url"
              value={ttUrl}
              onChange={(e) => setTtUrl(e.target.value)}
              placeholder="https://tiktok.com/@johndoe"
              className="w-full px-4 py-2.5 rounded-xl border border-bk-border text-sm text-bk-text-primary placeholder:text-bk-text-muted focus:outline-none focus:ring-2 focus:ring-bk-purple/30 focus:border-bk-purple transition-colors"
            />
          </div>

          <div className="flex items-start gap-2 bg-bk-purple-light/50 border border-bk-purple/20 rounded-xl px-4 py-3">
            <span className="text-bk-purple mt-0.5">ℹ</span>
            <p className="text-xs text-bk-text-secondary">
              We&apos;ll import your recent posts, reels, and profile info. You can edit everything after.
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-bk-border rounded-xl text-sm text-bk-text-secondary hover:bg-bk-bg-light transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!igUrl && !ttUrl}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-bk-purple text-white font-semibold rounded-xl text-sm hover:bg-bk-purple-dark transition-colors disabled:opacity-50"
            >
              <span>✦</span> Generate Portfolio
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Loading State ───────────────────────────────────────────────────────────

function LoadingState({ completedSteps }: { completedSteps: number }) {
  const progress = Math.round((completedSteps / LOADING_STEPS.length) * 100);

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="bg-bk-bg border border-bk-border rounded-2xl p-10 w-full max-w-2xl space-y-6">
        <h2 className="text-2xl font-bold text-bk-text-primary">Generating your portfolio...</h2>

        <div className="h-1.5 bg-bk-border-light rounded-full overflow-hidden">
          <div
            className="h-full bg-bk-purple rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="space-y-4">
          {LOADING_STEPS.map((step, i) => {
            const done = i < completedSteps;
            const active = i === completedSteps;
            return (
              <div key={i} className="flex items-center gap-3">
                <div className="flex-shrink-0 w-6 h-6">
                  {done ? (
                    <div className="w-6 h-6 rounded-full bg-bk-success flex items-center justify-center">
                      <Check size={13} className="text-white" strokeWidth={3} />
                    </div>
                  ) : active ? (
                    <Loader2 size={22} className="text-bk-purple animate-spin" />
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-bk-border" />
                  )}
                </div>
                <div>
                  <span className={`text-sm ${done ? "text-bk-text-primary" : active ? "font-semibold text-bk-text-primary" : "text-bk-text-muted"}`}>
                    {step}
                  </span>
                  {done && <p className="text-xs text-bk-success font-medium">Connected</p>}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-bk-text-muted text-center">Estimated time: 20–60 seconds</p>
      </div>
    </div>
  );
}

// ─── Content Card ─────────────────────────────────────────────────────────────

function ContentCard({ post, platform }: { post: CreatorPost; platform: "instagram" | "tiktok" }) {
  const isIG = platform === "instagram";
  return (
    <a
      href={post.postUrl ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-bk-bg border border-bk-border rounded-xl overflow-hidden hover:shadow-md transition-shadow group"
    >
      <div className="relative aspect-square bg-bk-border-light">
        {post.thumbnailUrl ? (
          <Image
            src={post.thumbnailUrl}
            alt={post.caption.slice(0, 60) || "Post"}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 bg-bk-border-light" />
        )}
      </div>
      <div className="p-3 space-y-2">
        <span
          className={`inline-block px-2.5 py-0.5 rounded-full text-white text-xs font-semibold ${
            isIG ? "bg-gradient-to-r from-purple-500 to-pink-500" : "bg-black"
          }`}
        >
          {isIG ? "Instagram" : "TikTok"}
        </span>
        <p className="text-sm font-semibold text-bk-text-primary line-clamp-2 leading-snug">
          {post.caption || "—"}
        </p>
        <div className="flex items-center gap-3 text-bk-text-muted text-xs">
          <span className="flex items-center gap-1"><Heart size={12} /> {fmt(post.likesCount)}</span>
          <span className="flex items-center gap-1"><MessageCircle size={12} /> {fmt(post.commentsCount)}</span>
          {post.viewsCount !== undefined && post.viewsCount > 0 && (
            <span className="flex items-center gap-1"><Eye size={12} /> {fmt(post.viewsCount)}</span>
          )}
        </div>
      </div>
    </a>
  );
}

// ─── Portfolio Result ────────────────────────────────────────────────────────

function PortfolioResult({ result }: { result: GenerateResponse }) {
  const [filter, setFilter] = useState<"all" | "instagram" | "tiktok">("all");
  const [dismissed, setDismissed] = useState(false);

  const allPosts = result.profiles.flatMap((p) =>
    p.recentPosts.map((post) => ({ post, platform: p.platform }))
  );

  const igCount = result.profiles.find((p) => p.platform === "instagram")?.recentPosts.length ?? 0;
  const ttCount = result.profiles.find((p) => p.platform === "tiktok")?.recentPosts.length ?? 0;

  const filtered = allPosts.filter(({ platform }) => filter === "all" || platform === filter);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Success Banner */}
      {!dismissed && (
        <div className="flex items-center justify-between gap-3 bg-bk-success-light border-b border-bk-success/20 px-8 py-3">
          <div className="flex items-center gap-2">
            <Check size={16} className="text-bk-success" />
            <span className="text-sm text-green-800 font-medium">
              Portfolio successfully generated using public social information.
            </span>
          </div>
          <button onClick={() => setDismissed(true)}>
            <X size={16} className="text-green-700" />
          </button>
        </div>
      )}

      <div className="p-8 space-y-6">
        {/* AI Summary */}
        <div className="bg-bk-bg border border-bk-border rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-bk-purple-light rounded-md flex items-center justify-center">
                <span className="text-bk-purple text-xs font-bold">✦</span>
              </div>
              <span className="font-semibold text-bk-text-primary text-sm">AI Creator Summary</span>
            </div>
            <span className="text-xs text-bk-text-muted italic">Generated from public information</span>
          </div>

          <p className="text-sm text-bk-text-secondary leading-relaxed">{result.aiAnalysis.summary}</p>

          <div className="grid grid-cols-3 gap-4 pt-2 border-t border-bk-border-light">
            <div>
              <p className="text-xs font-semibold text-bk-text-muted uppercase tracking-wider mb-2">Content Pillars</p>
              <div className="flex flex-wrap gap-1.5">
                {result.aiAnalysis.contentPillars.map((p) => (
                  <span key={p} className="px-2.5 py-1 bg-bk-purple-light text-bk-purple text-xs rounded-full font-medium">{p}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-bk-text-muted uppercase tracking-wider mb-2">Audience</p>
              <span className="px-2.5 py-1 bg-bk-bg-light border border-bk-border text-bk-text-secondary text-xs rounded-full">
                {result.aiAnalysis.audience}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-bk-text-muted uppercase tracking-wider mb-2">Primary Language</p>
              <span className="px-2.5 py-1 bg-bk-bg-light border border-bk-border text-bk-text-secondary text-xs rounded-full">
                {result.aiAnalysis.primaryLanguage}
              </span>
            </div>
          </div>

          {result.aiAnalysis.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1 border-t border-bk-border-light">
              {result.aiAnalysis.tags.map((tag) => (
                <span key={tag} className="px-3 py-1 bg-bk-bg-light border border-bk-border text-bk-text-secondary text-xs rounded-full">{tag}</span>
              ))}
              {result.aiAnalysis.topics.map((topic) => (
                <span key={topic} className="px-3 py-1 bg-bk-bg-light border border-bk-border text-bk-text-muted text-xs rounded-full">{topic}</span>
              ))}
            </div>
          )}
        </div>

        {/* Content Grid */}
        <div>
          {/* Filters */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-bk-text-primary">{allPosts.length} items</span>
              <div className="flex items-center gap-1">
                {[
                  { key: "all", label: "All" },
                  { key: "instagram", label: `Instagram (${igCount})` },
                  { key: "tiktok", label: `TikTok (${ttCount})` },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key as typeof filter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      filter === key
                        ? "bg-bk-purple text-white"
                        : "border border-bk-border text-bk-text-secondary hover:bg-bk-bg-light"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 border border-bk-border rounded-lg px-3 py-1.5 text-xs text-bk-text-secondary hover:bg-bk-bg-light transition-colors">
                <Search size={12} /> Search
              </button>
              <button className="flex items-center gap-1.5 border border-bk-border rounded-lg px-3 py-1.5 text-xs text-bk-text-secondary hover:bg-bk-bg-light transition-colors">
                <SlidersHorizontal size={12} /> Sort
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {filtered.map(({ post, platform }, i) => (
              <ContentCard key={i} post={post} platform={platform} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Home() {
  const [pageState, setPageState] = useState<PageState>("empty");
  const [completedSteps, setCompletedSteps] = useState(0);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startStepAnimation = () => {
    setCompletedSteps(0);
    const DELAYS = [3000, 5000, 8000, 12000, 18000, 25000, 35000, 45000];
    let step = 0;
    const tick = () => {
      step++;
      setCompletedSteps(step);
      if (step < LOADING_STEPS.length - 1) {
        stepIntervalRef.current = setTimeout(tick, DELAYS[step] ?? 5000);
      }
    };
    stepIntervalRef.current = setTimeout(tick, DELAYS[0]);
  };

  const stopStepAnimation = () => {
    if (stepIntervalRef.current) clearTimeout(stepIntervalRef.current);
  };

  const handleGenerate = async (igUrl: string, ttUrl: string) => {
    setPageState("loading");
    setError(null);
    startStepAnimation();

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instagramUrl: igUrl, tiktokUrl: ttUrl }),
      });
      const data = await res.json();
      stopStepAnimation();

      if (res.ok) {
        setCompletedSteps(LOADING_STEPS.length);
        setTimeout(() => {
          setResult(data);
          setPageState("result");
        }, 800);
      } else {
        setError(data.error ?? "Error al generar el portfolio");
        setPageState("empty");
      }
    } catch {
      stopStepAnimation();
      setError("Error de conexión. Intentá de nuevo.");
      setPageState("empty");
    }
  };

  useEffect(() => () => stopStepAnimation(), []);

  const firstProfile = result?.profiles[0];
  const showRightPanel = pageState !== "loading";

  return (
    <div className="flex h-screen bg-bk-bg-light overflow-hidden">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <ProfileHeader profile={firstProfile} />
        <TabBar />

        {error && (
          <div className="mx-8 mt-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <X size={14} className="text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto"><X size={14} className="text-red-400" /></button>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          {/* Main content */}
          <div className="flex flex-1 overflow-hidden">
            {pageState === "empty" && <EmptyState onCreateByURL={() => setPageState("modal")} />}
            {pageState === "loading" && <LoadingState completedSteps={completedSteps} />}
            {pageState === "result" && result && <PortfolioResult result={result} />}
          </div>

          {/* Right panel */}
          {showRightPanel && <RightPanel result={result} />}
        </div>
      </div>

      {pageState === "modal" && (
        <URLModal
          onClose={() => setPageState("empty")}
          onSubmit={handleGenerate}
        />
      )}
    </div>
  );
}
