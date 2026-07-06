"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  LayoutDashboard, Bell, MessageSquare, Briefcase, Handshake,
  Megaphone, Images, Building2, CircleDollarSign, SquarePlay, FileEdit, Zap,
  Link, Pencil, Check, Loader2, X, SlidersHorizontal, PanelLeftClose, PanelLeftOpen,
  Heart, MessageCircle, Eye, GripVertical, Plus,
} from "lucide-react";
import { FaInstagram, FaTiktok } from "react-icons/fa6";
import { BrkawayLogo } from "@/lib/BrkawayLogo";
import type { GenerateResponse, CreatorProfile, CreatorPost, Platform, PortfolioAbout, ContactLink, ProfileOverrides } from "@/lib/types";

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
  { icon: Briefcase, label: "Deliverables" },
  { icon: Handshake, label: "Collabs" },
  { icon: Megaphone, label: "Opportunities" },
  { icon: Images, label: "Portfolio", active: true },
  { icon: CircleDollarSign, label: "Invoicing" },
  { icon: SquarePlay, label: "Content Library" },
  { icon: Building2, label: "Brands" },
  { icon: FileEdit, label: "External Reviews" },
];

function Sidebar() {
  const [expanded, setExpanded] = useState(true);

  return (
    <aside
      className={`${expanded ? "w-[220px]" : "w-[64px]"} flex-shrink-0 bg-bk-bg border-r border-bk-border flex flex-col h-full transition-all duration-150`}
    >
      <div className="flex items-center justify-between gap-2 px-5 py-5">
        <div className={`flex items-center gap-2 overflow-hidden ${expanded ? "" : "opacity-0 w-0"}`}>
          <BrkawayLogo size={18} color="#7f56d9" className="flex-shrink-0" />
          <span className="font-medium text-bk-text-primary text-lg whitespace-nowrap">brkaway</span>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex-shrink-0 text-bk-text-muted hover:text-bk-text-primary transition-colors"
        >
          {expanded ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </button>
      </div>
      <nav className="flex-1 space-y-0.5">
        {NAV_ITEMS.map(({ icon: Icon, label, active }) => (
          <button
            key={label}
            className={`relative w-full flex items-center gap-3 pl-[22px] pr-3 h-9 text-sm font-medium transition-colors ${
              active ? "text-bk-text-primary" : "text-bk-text-secondary hover:text-bk-text-primary"
            }`}
          >
            {active && (
              <span
                className="absolute left-0 top-0 bottom-0 w-1 rounded-r-sm"
                style={{ background: "var(--gradient-brand)" }}
              />
            )}
            <Icon size={15} className="flex-shrink-0" />
            {expanded && <span className="whitespace-nowrap">{label}</span>}
          </button>
        ))}
      </nav>
    </aside>
  );
}

// ─── Profile Header ──────────────────────────────────────────────────────────

function ProfileHeader({
  profile,
  overrides,
  onEditClick,
}: {
  profile?: CreatorProfile;
  overrides?: ProfileOverrides | null;
  onEditClick: () => void;
}) {
  const name = overrides?.displayName || profile?.displayName || "John Romero";
  const profilePicUrl = overrides?.profilePicUrl || profile?.profilePicUrl;
  const igHandle = profile?.platform === "instagram" ? `@${profile.username}` : "@johndoe";
  const ttHandle = profile?.platform === "tiktok" ? `@${profile.username}` : "@johntiktok";
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="bg-bk-bg border-b border-bk-border px-8 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            {profilePicUrl ? (
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-bk-border">
                <Image src={profilePicUrl} alt={name} width={48} height={48} className="object-cover" />
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
          <button
            onClick={onEditClick}
            className="flex items-center gap-1.5 border border-bk-border rounded-lg px-3 py-1.5 text-xs text-bk-text-secondary hover:bg-bk-bg-light transition-colors"
          >
            <Pencil size={12} />
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Profile Modal ──────────────────────────────────────────────────────

function EditProfileModal({
  overrides,
  fallbackName,
  fallbackPicUrl,
  onClose,
  onSave,
}: {
  overrides: ProfileOverrides | null;
  fallbackName: string;
  fallbackPicUrl: string | null;
  onClose: () => void;
  onSave: (overrides: ProfileOverrides) => Promise<void>;
}) {
  const [displayName, setDisplayName] = useState(overrides?.displayName || fallbackName);
  const [profilePicUrl, setProfilePicUrl] = useState(overrides?.profilePicUrl || fallbackPicUrl || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ displayName: displayName || null, profilePicUrl: profilePicUrl || null });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-bk-bg rounded-2xl shadow-2xl w-[480px] p-8 space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-bk-text-primary">Edit Profile</h2>
          <p className="text-sm text-bk-text-secondary mt-1">
            Customize how your name and photo appear across your portfolio.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-bk-text-primary mb-1.5">Display Name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-2.5 rounded-xl border border-bk-border text-sm text-bk-text-primary placeholder:text-bk-text-muted focus:outline-none focus:ring-2 focus:ring-bk-purple/30 focus:border-bk-purple transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-bk-text-primary mb-1.5">Profile Picture URL</label>
            <input
              value={profilePicUrl}
              onChange={(e) => setProfilePicUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2.5 rounded-xl border border-bk-border text-sm text-bk-text-primary placeholder:text-bk-text-muted focus:outline-none focus:ring-2 focus:ring-bk-purple/30 focus:border-bk-purple transition-colors"
            />
            <p className="text-xs text-bk-text-muted mt-1.5">Paste a link to an image. File uploads aren&apos;t supported yet.</p>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-bk-border rounded-xl text-sm text-bk-text-secondary hover:bg-bk-bg-light transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 bg-bk-purple text-white font-semibold rounded-xl text-sm hover:bg-bk-purple-dark transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab Bar ─────────────────────────────────────────────────────────────────

const TABS = ["Portfolio", "About", "Pricing", "Testimonials", "Audience Analytics"];

function TabBar({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: string) => void }) {
  return (
    <div className="bg-bk-bg border-b border-bk-border px-8">
      <div className="flex items-center gap-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`py-3 text-sm border-b-2 transition-colors ${
              tab === activeTab
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
      <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--gradient-brand)" }}>
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
  initialIgUrl = "",
  initialTtUrl = "",
}: {
  onClose: () => void;
  onSubmit: (ig: string, tt: string, yt: string) => void;
  initialIgUrl?: string;
  initialTtUrl?: string;
}) {
  const [igUrl, setIgUrl] = useState(initialIgUrl);
  const [ttUrl, setTtUrl] = useState(initialTtUrl);
  const isRegenerating = !!(initialIgUrl || initialTtUrl);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (igUrl || ttUrl) onSubmit(igUrl, ttUrl, "");
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
            <h2 className="text-xl font-bold text-bk-text-primary">
              {isRegenerating ? "Regenerate Portfolio by URL" : "Create Portfolio by URL"}
            </h2>
            <p className="text-sm text-bk-text-secondary mt-1">
              {isRegenerating
                ? "Update your profile URLs or add a new platform, then refresh your portfolio."
                : "Paste your social media profile URLs and we’ll automatically import your best content."}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-bk-text-primary mb-1.5">
              <FaInstagram size={16} className="text-bk-text-secondary" /> Instagram Profile URL or Username
            </label>
            <input
              type="text"
              value={igUrl}
              onChange={(e) => setIgUrl(e.target.value)}
              placeholder="https://instagram.com/johndoe or @johndoe"
              className="w-full px-4 py-2.5 rounded-xl border border-bk-border text-sm text-bk-text-primary placeholder:text-bk-text-muted focus:outline-none focus:ring-2 focus:ring-bk-purple/30 focus:border-bk-purple transition-colors"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-bk-text-primary mb-1.5">
              <FaTiktok size={16} className="text-bk-text-secondary" /> TikTok Profile URL or Username
            </label>
            <input
              type="text"
              value={ttUrl}
              onChange={(e) => setTtUrl(e.target.value)}
              placeholder="https://tiktok.com/@johndoe or @johndoe"
              className="w-full px-4 py-2.5 rounded-xl border border-bk-border text-sm text-bk-text-primary placeholder:text-bk-text-muted focus:outline-none focus:ring-2 focus:ring-bk-purple/30 focus:border-bk-purple transition-colors"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-bk-text-primary mb-1.5">
              <span className="text-base">▶️</span> YouTube Profile URL
              <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide bg-bk-bg-light border border-bk-border text-bk-text-muted px-2 py-0.5 rounded-full">
                Coming Soon
              </span>
            </label>
            <input
              type="url"
              disabled
              placeholder="https://youtube.com/@johndoe"
              className="w-full px-4 py-2.5 rounded-xl border border-bk-border text-sm text-bk-text-muted placeholder:text-bk-text-muted bg-bk-bg-light cursor-not-allowed"
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
              <span>✦</span> {isRegenerating ? "Regenerate Portfolio" : "Generate Portfolio"}
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

function ContentCard({
  post,
  platform,
  editMode,
  onDelete,
  onOpen,
  dragProps,
}: {
  post: CreatorPost;
  platform: Platform;
  editMode?: boolean;
  onDelete?: () => void;
  onOpen?: () => void;
  dragProps?: React.HTMLAttributes<HTMLDivElement>;
}) {
  const isIG = platform === "instagram";
  const className = "bg-bk-bg border border-bk-border rounded-xl overflow-hidden hover:shadow-md transition-shadow group";

  const content = (
    <>
      <div className="relative aspect-square bg-bk-border-light">
        {post.thumbnailUrl ? (
          <Image
            src={post.thumbnailUrl}
            alt={post.caption.slice(0, 60) || "Post"}
            fill
            draggable={false}
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 bg-bk-border-light" />
        )}
        {editMode && (
          <>
            <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white cursor-grab">
              <GripVertical size={14} />
            </div>
            {onDelete && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete();
                }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 hover:bg-red-500 flex items-center justify-center text-white transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </>
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
    </>
  );

  if (editMode) {
    return (
      <div className={className} {...dragProps}>
        {content}
      </div>
    );
  }

  return (
    <div onClick={onOpen} className={`${className} cursor-pointer`}>
      {content}
    </div>
  );
}

// ─── Portfolio Result ────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { key: "default", label: "Default order" },
  { key: "engagement_desc", label: "Most engaged first" },
  { key: "engagement_asc", label: "Least engaged first" },
  { key: "comments_asc", label: "Fewest comments first" },
  { key: "comments_desc", label: "Most comments first" },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]["key"];

function sortPosts<T extends { post: CreatorPost }>(items: T[], sortBy: SortKey): T[] {
  if (sortBy === "default") return items;
  const sorted = [...items];
  sorted.sort((a, b) => {
    switch (sortBy) {
      case "engagement_desc":
        return (b.post.likesCount + b.post.commentsCount) - (a.post.likesCount + a.post.commentsCount);
      case "engagement_asc":
        return (a.post.likesCount + a.post.commentsCount) - (b.post.likesCount + b.post.commentsCount);
      case "comments_asc":
        return a.post.commentsCount - b.post.commentsCount;
      case "comments_desc":
        return b.post.commentsCount - a.post.commentsCount;
      default:
        return 0;
    }
  });
  return sorted;
}

function PortfolioResult({
  result,
  editMode,
  onToggleEdit,
  onDeletePost,
  onReorder,
  onSaveSummary,
  onRegenerateClick,
}: {
  result: GenerateResponse;
  editMode: boolean;
  onToggleEdit: () => void;
  onDeletePost: (postId: string) => void;
  onReorder: (newOrder: { post: CreatorPost; platform: Platform }[]) => void;
  onSaveSummary: (summary: string) => Promise<void>;
  onRegenerateClick: () => void;
}) {
  const [filter, setFilter] = useState<"all" | "instagram" | "tiktok">("all");
  const [dismissed, setDismissed] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("default");
  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState(result.aiAnalysis.summary);
  const [savingSummary, setSavingSummary] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const allPosts = result.profiles.flatMap((p) =>
    p.recentPosts.map((post) => ({ post, platform: p.platform }))
  );

  const igCount = result.profiles.find((p) => p.platform === "instagram")?.recentPosts.length ?? 0;
  const ttCount = result.profiles.find((p) => p.platform === "tiktok")?.recentPosts.length ?? 0;

  const filtered = sortPosts(
    allPosts.filter(({ platform }) => filter === "all" || platform === filter),
    sortBy
  );

  const handleDrop = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }
    const reordered = [...filtered];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    setDragIndex(null);
    onReorder(reordered);
  };

  const startEditingSummary = () => {
    setSummaryDraft(result.aiAnalysis.summary);
    setEditingSummary(true);
  };

  const handleSaveSummaryClick = async () => {
    setSavingSummary(true);
    try {
      await onSaveSummary(summaryDraft);
      setEditingSummary(false);
    } finally {
      setSavingSummary(false);
    }
  };

  const closeLightbox = () => setLightboxIndex(null);
  const showNextLightbox = () =>
    setLightboxIndex((i) => (i === null ? null : (i + 1) % filtered.length));
  const showPrevLightbox = () =>
    setLightboxIndex((i) => (i === null ? null : (i - 1 + filtered.length) % filtered.length));

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
        <div className="flex justify-end">
          <button
            onClick={onRegenerateClick}
            className="flex items-center gap-1.5 bg-bk-purple text-white font-semibold px-4 py-2 rounded-xl text-sm hover:bg-bk-purple-dark transition-colors"
          >
            <span>✦</span> Regenerate Portfolio by URL
          </button>
        </div>

        {/* AI Summary */}
        <div className="bg-bk-bg border border-bk-border rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-bk-purple-light rounded-md flex items-center justify-center">
                <span className="text-bk-purple text-xs font-bold">✦</span>
              </div>
              <span className="font-semibold text-bk-text-primary text-sm">AI Creator Summary</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-bk-text-muted italic">Generated from public information</span>
              {!editingSummary && (
                <button
                  onClick={startEditingSummary}
                  className="flex items-center gap-1 text-xs text-bk-text-secondary hover:text-bk-text-primary transition-colors"
                >
                  <Pencil size={12} /> Edit
                </button>
              )}
            </div>
          </div>

          {editingSummary ? (
            <div className="space-y-3">
              <textarea
                value={summaryDraft}
                onChange={(e) => setSummaryDraft(e.target.value)}
                rows={5}
                className="w-full px-4 py-2.5 rounded-xl border border-bk-border text-sm text-bk-text-primary leading-relaxed focus:outline-none focus:ring-2 focus:ring-bk-purple/30 focus:border-bk-purple transition-colors"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingSummary(false)}
                  className="px-4 py-2 border border-bk-border rounded-xl text-xs font-medium text-bk-text-secondary hover:bg-bk-bg-light transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSummaryClick}
                  disabled={savingSummary}
                  className="px-4 py-2 bg-bk-purple text-white rounded-xl text-xs font-medium hover:bg-bk-purple-dark transition-colors disabled:opacity-50"
                >
                  {savingSummary ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-bk-text-secondary leading-relaxed">{result.aiAnalysis.summary}</p>
          )}

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
              <p className="text-sm text-bk-text-secondary leading-relaxed">{result.aiAnalysis.audience}</p>
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
              <button
                onClick={onToggleEdit}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  editMode
                    ? "bg-bk-purple text-white"
                    : "border border-bk-border text-bk-text-secondary hover:bg-bk-bg-light"
                }`}
              >
                <Pencil size={12} /> {editMode ? "Done Editing" : "Edit Portfolio"}
              </button>
              <div className="relative flex items-center gap-1.5 border border-bk-border rounded-lg px-3 py-1.5 text-xs text-bk-text-secondary hover:bg-bk-bg-light transition-colors">
                <SlidersHorizontal size={12} />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortKey)}
                  disabled={editMode}
                  className="bg-transparent focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {SORT_OPTIONS.map(({ key, label }) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {editMode && (
            <p className="text-xs text-bk-text-muted mb-3">Drag a card to reorder it, or click the ✕ to remove it from your portfolio.</p>
          )}

          <div className="grid grid-cols-3 gap-4">
            {filtered.map(({ post, platform }, i) => (
              <ContentCard
                key={post.id ?? `${platform}-${i}`}
                post={post}
                platform={platform}
                editMode={editMode}
                onDelete={post.id ? () => onDeletePost(post.id!) : undefined}
                onOpen={editMode ? undefined : () => setLightboxIndex(i)}
                dragProps={
                  editMode
                    ? {
                        draggable: true,
                        onDragStart: () => setDragIndex(i),
                        onDragOver: (e) => e.preventDefault(),
                        onDrop: () => handleDrop(i),
                        onDragEnd: () => setDragIndex(null),
                      }
                    : undefined
                }
              />
            ))}
          </div>
        </div>
      </div>

      {lightboxIndex !== null && filtered[lightboxIndex] && (
        <PostLightbox
          post={filtered[lightboxIndex].post}
          platform={filtered[lightboxIndex].platform}
          onClose={closeLightbox}
          onNext={showNextLightbox}
          onPrev={showPrevLightbox}
        />
      )}
    </div>
  );
}

// ─── Post Lightbox ───────────────────────────────────────────────────────────

function PostLightbox({
  post,
  platform,
  onClose,
  onNext,
  onPrev,
}: {
  post: CreatorPost;
  platform: Platform;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  const isIG = platform === "instagram";

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNext();
      if (e.key === "ArrowLeft") onPrev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, onNext, onPrev]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />

      <button
        onClick={onClose}
        className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
      >
        <X size={18} />
      </button>

      <button
        onClick={onPrev}
        className="absolute left-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
        aria-label="Previous"
      >
        ‹
      </button>
      <button
        onClick={onNext}
        className="absolute right-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
        aria-label="Next"
      >
        ›
      </button>

      <div className="relative bg-bk-bg rounded-2xl overflow-hidden shadow-2xl w-[420px] max-h-[85vh] flex flex-col">
        <div className="relative aspect-square bg-bk-border-light flex-shrink-0">
          {post.thumbnailUrl ? (
            <Image src={post.thumbnailUrl} alt={post.caption.slice(0, 60) || "Post"} fill className="object-cover" />
          ) : (
            <div className="absolute inset-0 bg-bk-border-light" />
          )}
        </div>
        <div className="p-4 space-y-2 overflow-y-auto">
          <span
            className={`inline-block px-2.5 py-0.5 rounded-full text-white text-xs font-semibold ${
              isIG ? "bg-gradient-to-r from-purple-500 to-pink-500" : "bg-black"
            }`}
          >
            {isIG ? "Instagram" : "TikTok"}
          </span>
          <p className="text-sm text-bk-text-primary leading-relaxed">{post.caption || "—"}</p>
          <div className="flex items-center gap-3 text-bk-text-muted text-xs pt-1">
            <span className="flex items-center gap-1"><Heart size={12} /> {fmt(post.likesCount)}</span>
            <span className="flex items-center gap-1"><MessageCircle size={12} /> {fmt(post.commentsCount)}</span>
            {post.viewsCount !== undefined && post.viewsCount > 0 && (
              <span className="flex items-center gap-1"><Eye size={12} /> {fmt(post.viewsCount)}</span>
            )}
          </div>
          {post.postUrl && (
            <a
              href={post.postUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs text-bk-purple hover:underline pt-1"
            >
              View original post ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── About Tab ───────────────────────────────────────────────────────────────

function AboutTab({
  about,
  onSave,
}: {
  about: PortfolioAbout | null;
  onSave: (about: PortfolioAbout) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [links, setLinks] = useState<ContactLink[]>([]);
  const [saving, setSaving] = useState(false);

  const startEditing = () => {
    setBio(about?.bio ?? "");
    setEmail(about?.contactEmail ?? "");
    setLinks(about?.contactLinks ?? []);
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ bio, contactEmail: email || null, contactLinks: links.filter((l) => l.label && l.url) });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl bg-bk-bg border border-bk-border rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-bk-text-primary text-lg">About</h2>
            <button
              onClick={startEditing}
              className="flex items-center gap-1.5 border border-bk-border rounded-lg px-3 py-1.5 text-xs text-bk-text-secondary hover:bg-bk-bg-light transition-colors"
            >
              <Pencil size={12} /> Edit
            </button>
          </div>
          <p className="text-sm text-bk-text-secondary leading-relaxed whitespace-pre-wrap">
            {about?.bio || "No bio yet. Click Edit to add one."}
          </p>
          <div className="border-t border-bk-border-light pt-4 space-y-2">
            <p className="text-xs font-semibold text-bk-text-muted uppercase tracking-wider">Contact</p>
            {about?.contactEmail && <p className="text-sm text-bk-text-secondary">{about.contactEmail}</p>}
            {(about?.contactLinks ?? []).map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-bk-purple hover:underline"
              >
                <Link size={12} /> {link.label}
              </a>
            ))}
            {!about?.contactEmail && (about?.contactLinks?.length ?? 0) === 0 && (
              <p className="text-sm text-bk-text-muted">No contact info yet.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-2xl bg-bk-bg border border-bk-border rounded-xl p-6 space-y-5">
        <h2 className="font-bold text-bk-text-primary text-lg">Edit About</h2>
        <div>
          <label className="block text-sm font-medium text-bk-text-primary mb-1.5">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={5}
            className="w-full px-4 py-2.5 rounded-xl border border-bk-border text-sm text-bk-text-primary focus:outline-none focus:ring-2 focus:ring-bk-purple/30 focus:border-bk-purple transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-bk-text-primary mb-1.5">Contact Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-4 py-2.5 rounded-xl border border-bk-border text-sm text-bk-text-primary focus:outline-none focus:ring-2 focus:ring-bk-purple/30 focus:border-bk-purple transition-colors"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-bk-text-primary">Contact Links</label>
          {links.map((link, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={link.label}
                onChange={(e) => setLinks(links.map((l, j) => (j === i ? { ...l, label: e.target.value } : l)))}
                placeholder="Label"
                className="w-1/3 px-3 py-2 rounded-lg border border-bk-border text-sm text-bk-text-primary"
              />
              <input
                value={link.url}
                onChange={(e) => setLinks(links.map((l, j) => (j === i ? { ...l, url: e.target.value } : l)))}
                placeholder="https://..."
                className="flex-1 px-3 py-2 rounded-lg border border-bk-border text-sm text-bk-text-primary"
              />
              <button onClick={() => setLinks(links.filter((_, j) => j !== i))} className="px-2 text-bk-text-muted hover:text-red-500">
                <X size={14} />
              </button>
            </div>
          ))}
          <button
            onClick={() => setLinks([...links, { label: "", url: "" }])}
            className="flex items-center gap-1.5 text-xs text-bk-purple font-medium"
          >
            <Plus size={12} /> Add link
          </button>
        </div>
        <div className="flex gap-3 pt-1">
          <button
            onClick={() => setEditing(false)}
            className="flex-1 py-2.5 border border-bk-border rounded-xl text-sm text-bk-text-secondary hover:bg-bk-bg-light transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 bg-bk-purple text-white font-semibold rounded-xl text-sm hover:bg-bk-purple-dark transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Coming Soon Tab ─────────────────────────────────────────────────────────

function ComingSoonTab({ label }: { label: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="w-14 h-14 bg-bk-purple-light rounded-full flex items-center justify-center mb-4">
        <Zap size={24} className="text-bk-purple" />
      </div>
      <h2 className="text-xl font-bold text-bk-text-primary mb-2">{label}</h2>
      <p className="text-sm text-bk-text-secondary max-w-sm">
        {`${label} is coming soon. We're working on bringing this to your portfolio.`}
      </p>
    </div>
  );
}

// ─── Audience Analytics Tab ──────────────────────────────────────────────────

function engagementRate(post: CreatorPost, followersCount: number): number {
  if (!followersCount) return 0;
  return ((post.likesCount + post.commentsCount) / followersCount) * 100;
}

function AudienceAnalyticsTab({ result }: { result: GenerateResponse }) {
  const platformStats = result.profiles
    .filter((profile) => profile.recentPosts.length > 0)
    .map((profile) => {
      const rates = profile.recentPosts.map((post) => engagementRate(post, profile.followersCount));
      const avgRate = rates.reduce((sum, r) => sum + r, 0) / rates.length;
      const topPosts = profile.recentPosts
        .map((post, i) => ({ post, rate: rates[i] }))
        .sort((a, b) => b.rate - a.rate)
        .slice(0, 3);
      return { profile, avgRate, topPosts };
    });

  if (platformStats.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-16 px-8 text-center">
        <div className="w-14 h-14 bg-bk-purple-light rounded-full flex items-center justify-center mb-4">
          <Zap size={24} className="text-bk-purple" />
        </div>
        <h2 className="text-xl font-bold text-bk-text-primary mb-2">Audience Analytics</h2>
        <p className="text-sm text-bk-text-secondary max-w-sm">
          Not enough post data yet to calculate engagement metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-bk-text-primary mb-1">Audience Analytics</h2>
        <p className="text-sm text-bk-text-secondary">
          Engagement rate (ER) calculated from likes + comments relative to followers — use this to benchmark content performance for brand pitches.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {platformStats.map(({ profile, avgRate, topPosts }) => {
          const isIG = profile.platform === "instagram";
          return (
            <div key={profile.platform} className="bg-bk-bg border border-bk-border rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-white text-xs font-semibold ${
                    isIG ? "bg-gradient-to-r from-purple-500 to-pink-500" : "bg-black"
                  }`}
                >
                  {isIG ? "Instagram" : "TikTok"}
                </span>
                <span className="text-xs text-bk-text-muted">{fmt(profile.followersCount)} followers</span>
              </div>

              <div>
                <p className="text-xs font-semibold text-bk-text-muted uppercase tracking-wider mb-1">Avg. Engagement Rate</p>
                <p className="text-2xl font-bold text-bk-purple">{avgRate.toFixed(2)}%</p>
              </div>

              <div className="border-t border-bk-border-light pt-3 space-y-2">
                <p className="text-xs font-semibold text-bk-text-muted uppercase tracking-wider">Top Posts by ER</p>
                {topPosts.map(({ post, rate }, i) => (
                  <div key={post.id ?? i} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-bk-text-secondary line-clamp-1">{post.caption || "—"}</span>
                    <span className="font-semibold text-bk-text-primary flex-shrink-0">{rate.toFixed(2)}%</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Home() {
  const [pageState, setPageState] = useState<PageState>("empty");
  const [initializing, setInitializing] = useState(true);
  const [completedSteps, setCompletedSteps] = useState(0);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [about, setAbout] = useState<PortfolioAbout | null>(null);
  const [profileOverrides, setProfileOverrides] = useState<ProfileOverrides | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("Portfolio");
  const [editMode, setEditMode] = useState(false);
  const stepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/portfolio")
      .then((res) => res.json())
      .then((data) => {
        if (data?.profiles) {
          setResult({ profiles: data.profiles, aiAnalysis: data.aiAnalysis, generatedAt: data.generatedAt });
          setAbout(data.about ?? null);
          setProfileOverrides(data.profileOverrides ?? null);
          setPageState("result");
        }
      })
      .catch(() => {})
      .finally(() => setInitializing(false));
  }, []);

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

  const handleGenerate = async (igUrl: string, ttUrl: string, ytUrl: string) => {
    setPageState("loading");
    setError(null);
    setEditMode(false);
    startStepAnimation();

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instagramUrl: igUrl, tiktokUrl: ttUrl, youtubeUrl: ytUrl || undefined }),
      });
      const data = await res.json();
      stopStepAnimation();

      if (res.ok) {
        setCompletedSteps(LOADING_STEPS.length);
        setTimeout(() => {
          setResult(data);
          setAbout(data.about ?? null);
          setProfileOverrides(data.profileOverrides ?? null);
          setActiveTab("Portfolio");
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

  const handleDeletePost = (postId: string) => {
    if (!result) return;
    const snapshot = result;
    setResult({
      ...result,
      profiles: result.profiles.map((p) => ({
        ...p,
        recentPosts: p.recentPosts.filter((post) => post.id !== postId),
      })),
    });

    fetch("/api/portfolio/posts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operations: [{ id: postId, deletedAt: new Date().toISOString() }] }),
    })
      .then((res) => { if (!res.ok) throw new Error(); })
      .catch(() => {
        setResult(snapshot);
        setError("No se pudo eliminar la foto. Intentá de nuevo.");
      });
  };

  const handleReorder = (newOrder: { post: CreatorPost; platform: Platform }[]) => {
    if (!result) return;
    const snapshot = result;

    const byPlatform = new Map<Platform, CreatorPost[]>();
    for (const { post, platform } of newOrder) {
      if (!byPlatform.has(platform)) byPlatform.set(platform, []);
      byPlatform.get(platform)!.push(post);
    }

    const operations: { id: string; sortOrder: number }[] = [];
    const updatedProfiles = result.profiles.map((profile) => {
      const posts = byPlatform.get(profile.platform);
      if (!posts) return profile;
      const withOrder = posts.map((post, i) => {
        if (post.id) operations.push({ id: post.id, sortOrder: i });
        return { ...post, sortOrder: i };
      });
      return { ...profile, recentPosts: withOrder };
    });

    setResult({ ...result, profiles: updatedProfiles });

    if (operations.length === 0) return;
    fetch("/api/portfolio/posts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operations }),
    })
      .then((res) => { if (!res.ok) throw new Error(); })
      .catch(() => {
        setResult(snapshot);
        setError("No se pudo guardar el nuevo orden. Intentá de nuevo.");
      });
  };

  const handleSaveAbout = async (updated: PortfolioAbout) => {
    const res = await fetch("/api/portfolio/about", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    if (!res.ok) {
      setError("No se pudo guardar la información. Intentá de nuevo.");
      throw new Error("save about failed");
    }
    const saved = await res.json();
    setAbout(saved);
  };

  const handleSaveProfile = async (updated: ProfileOverrides) => {
    const res = await fetch("/api/portfolio/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    if (!res.ok) {
      setError("No se pudo guardar el perfil. Intentá de nuevo.");
      throw new Error("save profile failed");
    }
    const saved = await res.json();
    setProfileOverrides(saved);
  };

  const handleSaveSummary = async (summary: string) => {
    if (!result) return;
    const snapshot = result;
    setResult({ ...result, aiAnalysis: { ...result.aiAnalysis, summary } });

    const res = await fetch("/api/portfolio/ai-summary", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary }),
    });
    if (!res.ok) {
      setResult(snapshot);
      setError("No se pudo guardar el resumen. Intentá de nuevo.");
      throw new Error("save summary failed");
    }
  };

  useEffect(() => () => stopStepAnimation(), []);

  if (initializing) {
    return (
      <div className="flex h-screen items-center justify-center bg-bk-bg-light">
        <Loader2 size={28} className="text-bk-purple animate-spin" />
      </div>
    );
  }

  const firstProfile = result?.profiles[0];
  const showRightPanel = pageState !== "loading";

  return (
    <div className="flex h-screen bg-bk-bg-light overflow-hidden">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <ProfileHeader
          profile={firstProfile}
          overrides={profileOverrides}
          onEditClick={() => setEditingProfile(true)}
        />
        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

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
            {pageState === "result" && result && activeTab === "Portfolio" && (
              <PortfolioResult
                result={result}
                editMode={editMode}
                onToggleEdit={() => setEditMode((v) => !v)}
                onDeletePost={handleDeletePost}
                onReorder={handleReorder}
                onSaveSummary={handleSaveSummary}
                onRegenerateClick={() => setPageState("modal")}
              />
            )}
            {pageState === "result" && result && activeTab === "About" && (
              <AboutTab about={about} onSave={handleSaveAbout} />
            )}
            {pageState === "result" && result && activeTab === "Audience Analytics" && (
              <AudienceAnalyticsTab result={result} />
            )}
            {pageState === "result" &&
              result &&
              !["Portfolio", "About", "Audience Analytics"].includes(activeTab) && (
                <ComingSoonTab label={activeTab} />
              )}
          </div>

          {/* Right panel */}
          {showRightPanel && <RightPanel result={result} />}
        </div>
      </div>

      {pageState === "modal" && (
        <URLModal
          onClose={() => setPageState(result ? "result" : "empty")}
          onSubmit={handleGenerate}
          initialIgUrl={
            result?.profiles.find((p) => p.platform === "instagram")?.username
              ? `https://instagram.com/${result.profiles.find((p) => p.platform === "instagram")!.username}`
              : ""
          }
          initialTtUrl={
            result?.profiles.find((p) => p.platform === "tiktok")?.username
              ? `https://www.tiktok.com/@${result.profiles.find((p) => p.platform === "tiktok")!.username}`
              : ""
          }
        />
      )}

      {editingProfile && (
        <EditProfileModal
          overrides={profileOverrides}
          fallbackName={firstProfile?.displayName ?? ""}
          fallbackPicUrl={firstProfile?.profilePicUrl ?? null}
          onClose={() => setEditingProfile(false)}
          onSave={handleSaveProfile}
        />
      )}
    </div>
  );
}
