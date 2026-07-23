"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Home as HomeIcon, Bell, Briefcase, Handshake,
  Megaphone, Building2, CircleDollarSign, SquarePlay, FileEdit, Zap, Users, UserSearch,
  Link, Pencil, Check, Loader2, X, SlidersHorizontal, PanelLeftClose, PanelLeftOpen,
  Heart, MessageCircle, Eye, GripVertical, Globe, Video, Play, Archive, FileText, Sparkles, Search, Copy,
  UploadCloud, Trash2, ClipboardCheck, Palette, BarChart3,
} from "lucide-react";
import {
  FaInstagram, FaTiktok, FaYoutube, FaLinkedin, FaXTwitter, FaThreads, FaFacebook, FaCalendar,
} from "react-icons/fa6";
import { BrkawayLogo } from "@/lib/BrkawayLogo";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { COUNTRIES, COUNTRY_BY_CODE } from "@/lib/countries";
import type { GenerateResponse, CreatorProfile, CreatorPost, Platform, PortfolioAbout, SocialLinks, ProfileOverrides, PortfolioSummary, CampaignCreatorSummary, CampaignGeo } from "@/lib/types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Strips accents and lowercases so search matches regardless of diacritics
// (e.g. "ursula" finds "Úrsula") or exact word order.
function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

type PageState = "empty" | "modal" | "loading" | "result";

const BASE_LOADING_STEPS = [
  "Importing public content...",
  "Ranking posts by engagement...",
  "Detecting content categories...",
  "Generating creator summary...",
  "Organizing portfolio...",
  "Finalizing portfolio...",
];

function buildLoadingSteps(igUrl: string, ttUrl: string, ytUrl: string): string[] {
  const connectSteps: string[] = [];
  if (igUrl) connectSteps.push("Connecting to Instagram...");
  if (ttUrl) connectSteps.push("Connecting to TikTok...");
  if (ytUrl) connectSteps.push("Connecting to YouTube...");
  return [...connectSteps, ...BASE_LOADING_STEPS];
}

// ─── Sidebar ────────────────────────────────────────────────────────────────

type MainView = "creators" | "portfolio" | "metrics";

const NAV_ITEMS: { icon: typeof HomeIcon; label: string; target?: MainView }[] = [
  { icon: HomeIcon, label: "Dashboard" },
  { icon: Bell, label: "Notifications" },
  { icon: MessageCircle, label: "Messages" },
  { icon: Briefcase, label: "Deliverables" },
  { icon: Handshake, label: "Collabs" },
  { icon: Megaphone, label: "Opportunities" },
  { icon: ClipboardCheck, label: "Tasks" },
  { icon: UserSearch, label: "External Creators", target: "creators" },
  { icon: Users, label: "Brands" },
  { icon: Palette, label: "Portfolio", target: "portfolio" },
  { icon: BarChart3, label: "Metrics", target: "metrics" },
  { icon: CircleDollarSign, label: "Invoicing" },
  { icon: SquarePlay, label: "Content Library" },
  { icon: Building2, label: "External Reviews" },
];

function Sidebar({
  activeTarget,
  onNavigate,
}: {
  activeTarget: MainView;
  onNavigate: (target: MainView) => void;
}) {
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
        {NAV_ITEMS.map(({ icon: Icon, label, target }) => {
          const isActive = !!target && target === activeTarget;
          return (
            <button
              key={label}
              onClick={target ? () => onNavigate(target) : undefined}
              className={`relative w-full flex items-center gap-3 pl-[22px] pr-3 h-9 text-sm font-medium transition-colors ${
                target ? "text-bk-text-primary" : "text-bk-text-secondary cursor-default"
              }`}
            >
              {isActive && (
                <span
                  className="absolute left-0 top-0 bottom-0 w-1 rounded-r-sm"
                  style={{ background: "var(--gradient-brand)" }}
                />
              )}
              <Icon size={15} className="flex-shrink-0" />
              {expanded && <span className="whitespace-nowrap">{label}</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

// ─── Profile Header ──────────────────────────────────────────────────────────

function PlatformBadge({ profile }: { profile: CreatorProfile }) {
  const href =
    profile.platform === "instagram"
      ? `https://instagram.com/${profile.username}`
      : profile.platform === "tiktok"
        ? `https://www.tiktok.com/@${profile.username}`
        : undefined;

  const icon =
    profile.platform === "instagram" ? (
      <FaInstagram size={14} className="text-[#E1306C]" />
    ) : profile.platform === "tiktok" ? (
      <FaTiktok size={14} className="text-bk-text-primary" />
    ) : null;

  if (!icon) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="w-7 h-7 rounded-lg border border-bk-border flex items-center justify-center hover:bg-bk-bg-light transition-colors"
    >
      {icon}
    </a>
  );
}

function ProfileHeader({
  profile,
  profiles,
  overrides,
  portfolioId,
  onEditClick,
}: {
  profile?: CreatorProfile;
  profiles: CreatorProfile[];
  overrides?: ProfileOverrides | null;
  portfolioId: string | null;
  onEditClick: () => void;
}) {
  const name = overrides?.displayName || profile?.displayName || "John Romero";
  const profilePicUrl = overrides?.profilePicUrl || profile?.profilePicUrl;
  const initial = name.charAt(0).toUpperCase();
  const [copied, setCopied] = useState(false);
  const publicPath = portfolioId ? `/portfolio/${portfolioId}` : null;
  const publicUrl = publicPath && typeof window !== "undefined" ? `${window.location.origin}${publicPath}` : "";

  const handleCopy = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-bk-bg border-b border-bk-border px-8 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            {profilePicUrl ? (
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-bk-border">
                <Image src={profilePicUrl} alt={name} width={56} height={56} className="object-cover" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-full bg-bk-purple-light flex items-center justify-center">
                <span className="text-bk-purple font-bold text-xl">{initial}</span>
              </div>
            )}
            <button
              onClick={onEditClick}
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-bk-bg border border-bk-border rounded-md px-1.5 py-0.5 text-[10px] font-medium text-bk-text-primary hover:bg-bk-bg-light transition-colors whitespace-nowrap"
            >
              Edit
            </button>
          </div>
          <div>
            <h1 className="font-bold text-bk-text-primary text-lg leading-tight">{name}</h1>
            {profiles.length > 0 && (
              <div className="flex items-center gap-1.5 mt-2">
                {profiles.map((p) => (
                  <PlatformBadge key={p.platform} profile={p} />
                ))}
              </div>
            )}
          </div>
        </div>
        {publicPath && (
          <div className="flex items-start gap-2 bg-bk-bg-light border border-bk-border rounded-xl px-4 py-3 min-w-[260px]">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-bk-text-primary">Public portfolio URL</p>
              <a
                href={publicPath}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-bk-purple hover:underline truncate block"
              >
                {publicUrl.replace(/^https?:\/\//, "")}
              </a>
            </div>
            <button
              onClick={handleCopy}
              title="Copy link"
              className="text-bk-text-muted hover:text-bk-text-primary transition-colors flex-shrink-0 mt-0.5"
            >
              {copied ? <Check size={13} className="text-bk-success" /> : <Copy size={13} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Edit Profile Modal ──────────────────────────────────────────────────────

function EditProfileModal({
  portfolioId,
  overrides,
  fallbackName,
  fallbackPicUrl,
  onClose,
  onSave,
}: {
  portfolioId: string | null;
  overrides: ProfileOverrides | null;
  fallbackName: string;
  fallbackPicUrl: string | null;
  onClose: () => void;
  onSave: (overrides: ProfileOverrides) => Promise<void>;
}) {
  const [displayName, setDisplayName] = useState(overrides?.displayName || fallbackName);
  const [profilePicUrl, setProfilePicUrl] = useState(overrides?.profilePicUrl || fallbackPicUrl || "");
  const [saving, setSaving] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ displayName: displayName || null, profilePicUrl: profilePicUrl || null });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handlePickFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !portfolioId) return;
    setUploadingPic(true);
    setUploadError(null);
    try {
      const signRes = await fetch("/api/portfolio/profile-picture/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolioId, filename: file.name }),
      });
      if (!signRes.ok) throw new Error("sign failed");
      const { path, token, publicUrl } = await signRes.json();

      const { error: uploadErr } = await getSupabaseBrowser()
        .storage.from("portfolio-uploads")
        .uploadToSignedUrl(path, token, file);
      if (uploadErr) throw uploadErr;

      setProfilePicUrl(publicUrl);
    } catch {
      setUploadError("Couldn't upload the photo. Please try again.");
    } finally {
      setUploadingPic(false);
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
            <label className="block text-sm font-medium text-bk-text-primary mb-1.5">Profile Picture</label>
            <div className="flex items-center gap-3">
              {profilePicUrl ? (
                <div className="w-12 h-12 rounded-full overflow-hidden border border-bk-border flex-shrink-0">
                  <Image src={profilePicUrl} alt="" width={48} height={48} className="object-cover w-full h-full" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-bk-border-light flex-shrink-0" />
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePickFile(e.target.files)}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPic || !portfolioId}
                className="flex items-center gap-1.5 border border-bk-border text-bk-text-primary font-medium px-3 py-2 rounded-xl text-sm hover:bg-bk-bg-light transition-colors disabled:opacity-50"
              >
                <UploadCloud size={14} /> {uploadingPic ? "Uploading..." : "Upload Photo"}
              </button>
            </div>
            {uploadError && <p className="text-xs text-red-600 mt-1.5">{uploadError}</p>}
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

function TabBar({
  activeTab,
  onTabChange,
  extra,
}: {
  activeTab: string;
  onTabChange: (tab: string) => void;
  extra?: React.ReactNode;
}) {
  return (
    <div className="bg-bk-bg border-b border-bk-border px-8">
      <div className="flex items-center justify-between gap-6">
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
        {extra}
      </div>
    </div>
  );
}

// ─── Right Panel ─────────────────────────────────────────────────────────────

function RightPanel({ result }: { result: GenerateResponse | null }) {
  const [dismissed, setDismissed] = useState(false);
  const igProfile = result?.profiles.find((p) => p.platform === "instagram");
  const ttProfile = result?.profiles.find((p) => p.platform === "tiktok");
  const hasResult = !!result && result.profiles.some((p) => p.recentPosts.length > 0);

  const steps = [
    { title: "Step 1: Add Videos/Photos", isComplete: hasResult, isActive: !hasResult },
    { title: "Step 2: Complete Your About Page", isComplete: hasResult, isActive: false },
    { title: "Step 3: You're All Ready To Go! 🎉", isComplete: hasResult, isActive: false },
  ];

  return (
    <aside className="w-[300px] flex-shrink-0 bg-bk-bg-light border-l border-bk-border p-5 space-y-4 overflow-y-auto">
      {/* Setup Checklist */}
      {!dismissed && (
        <div className="bg-bk-bg-light border border-bk-border rounded-xl p-4">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="font-bold text-bk-text-primary text-sm">Finish Setting Up Your Portfolio</h3>
              <p className="text-xs text-bk-text-muted mt-0.5">Follow the steps below to complete your portfolio.</p>
            </div>
            <button
              onClick={() => hasResult && setDismissed(true)}
              disabled={!hasResult}
              title={!hasResult ? "Please complete the required steps to close this checklist." : ""}
              className="text-bk-text-muted hover:text-bk-text-primary disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              <X size={14} />
            </button>
          </div>
          <div className="space-y-1">
            {steps.map((step, i) => (
              <div key={step.title} className="relative pl-8 pb-1">
                {i < steps.length - 1 && (
                  <span className="absolute left-[9px] top-5 bottom-0 w-0.5 bg-bk-purple" />
                )}
                <span
                  className={`absolute left-0 top-0 w-5 h-5 rounded-full flex items-center justify-center ${
                    step.isComplete || step.isActive ? "bg-bk-purple" : "bg-bk-border"
                  } ${step.isActive ? "ring-4 ring-bk-purple-light" : ""}`}
                >
                  {step.isComplete ? (
                    <Check size={10} className="text-white" strokeWidth={3} />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </span>
                <span className="text-xs font-semibold text-bk-text-primary">{step.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
      <div className="rounded-xl p-4 space-y-2" style={{ background: "var(--gradient-brand)" }}>
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-white fill-white" />
          <span className="text-white font-bold text-sm">Become Discoverable to Brands</span>
        </div>
        <p className="text-white/80 text-xs leading-relaxed">
          Want to stand out to brands? Completing your portfolio increases your discoverability and helps you get prioritized in brand searches.
        </p>
      </div>
    </aside>
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
              <FaInstagram size={16} className="text-bk-text-secondary" /> Instagram URL or Username
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
              <FaTiktok size={16} className="text-bk-text-secondary" /> TikTok URL or Username
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

function LoadingState({ completedSteps, steps }: { completedSteps: number; steps: string[] }) {
  const progress = Math.round((completedSteps / steps.length) * 100);

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
          {steps.map((step, i) => {
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
        {post.isVideo && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-11 h-11 rounded-full bg-black/45 backdrop-blur-sm flex items-center justify-center">
              <Play size={18} className="text-white fill-white ml-0.5" />
            </div>
          </div>
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
          {isIG ? (post.isVideo ? "Reel" : "Instagram") : "TikTok"}
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

function AddTikTokModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (url: string) => Promise<void>;
}) {
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!url.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(url.trim());
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-bk-bg rounded-2xl shadow-2xl w-[420px] p-8 space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-bk-text-primary flex items-center justify-center gap-2">
            <FaTiktok /> Add TikTok
          </h2>
          <p className="text-sm text-bk-text-secondary mt-1">
            Paste the TikTok URL or @username. This won&apos;t touch the existing Instagram profile.
          </p>
        </div>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="https://www.tiktok.com/@username"
          autoFocus
          className="w-full px-4 py-2.5 rounded-xl border border-bk-border text-sm focus:outline-none focus:ring-2 focus:ring-bk-purple/30 focus:border-bk-purple"
        />
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-2.5 border border-bk-border rounded-xl text-sm text-bk-text-secondary hover:bg-bk-bg-light transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !url.trim()}
            className="flex-1 py-2.5 bg-bk-purple text-white font-semibold rounded-xl text-sm hover:bg-bk-purple-dark transition-colors disabled:opacity-50"
          >
            {submitting ? "Adding..." : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PortfolioResult({
  result,
  editMode,
  onToggleEdit,
  onDeletePost,
  onReorder,
  onSaveSummary,
  onRegenerateClick,
  onSaveClick,
  onAddTikTok,
}: {
  result: GenerateResponse;
  editMode: boolean;
  onToggleEdit: () => void;
  onDeletePost: (postId: string) => void;
  onReorder: (newOrder: { post: CreatorPost; platform: Platform }[]) => void;
  onSaveSummary: (summary: string) => Promise<void>;
  onRegenerateClick: () => void;
  onSaveClick: () => Promise<void>;
  onAddTikTok: (url: string) => Promise<void>;
}) {
  const [filter, setFilter] = useState<"all" | "instagram" | "tiktok">("all");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("default");
  const [showAddTikTok, setShowAddTikTok] = useState(false);
  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState(result.aiAnalysis.summary);
  const [savingSummary, setSavingSummary] = useState(false);
  const [savingPortfolio, setSavingPortfolio] = useState(false);
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

  const handleSaveClick = async () => {
    setSavingPortfolio(true);
    try {
      await onSaveClick();
    } finally {
      setSavingPortfolio(false);
    }
  };

  const closeLightbox = () => setLightboxIndex(null);
  const showNextLightbox = () =>
    setLightboxIndex((i) => (i === null ? null : (i + 1) % filtered.length));
  const showPrevLightbox = () =>
    setLightboxIndex((i) => (i === null ? null : (i - 1 + filtered.length) % filtered.length));

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-8 space-y-6">
        <div className="flex justify-end gap-3">
          {!result.isSaved && (
            <button
              onClick={handleSaveClick}
              disabled={savingPortfolio}
              className="flex items-center gap-1.5 bg-bk-success text-white font-semibold px-4 py-2 rounded-xl text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Check size={15} /> {savingPortfolio ? "Saving..." : "Save"}
            </button>
          )}
          {!result.profiles.some((p) => p.platform === "tiktok") && (
            <button
              onClick={() => setShowAddTikTok(true)}
              className="flex items-center gap-1.5 border border-bk-border text-bk-text-primary font-medium px-4 py-2 rounded-xl text-sm hover:bg-bk-bg-light transition-colors"
            >
              <FaTiktok /> Add TikTok
            </button>
          )}
          <button
            onClick={onRegenerateClick}
            className="flex items-center gap-1.5 bg-bk-purple text-white font-semibold px-4 py-2 rounded-xl text-sm hover:bg-bk-purple-dark transition-colors"
          >
            <span>✦</span> Regenerate Portfolio by URL
          </button>
        </div>

        {showAddTikTok && (
          <AddTikTokModal
            onClose={() => setShowAddTikTok(false)}
            onSubmit={async (url) => {
              await onAddTikTok(url);
              setShowAddTikTok(false);
            }}
          />
        )}

        {/* AI Summary */}
        <div className="bg-bk-bg border border-bk-border rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-bk-purple-light rounded-md flex items-center justify-center">
                <span className="text-bk-purple text-xs font-bold">✦</span>
              </div>
              <span className="font-semibold text-bk-text-primary text-sm">Summary</span>
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
        <div className="relative aspect-square bg-black flex-shrink-0">
          {post.isVideo && post.videoUrl ? (
            <video
              key={post.id ?? post.videoUrl}
              src={post.videoUrl}
              poster={post.thumbnailUrl ?? undefined}
              controls
              autoPlay
              className="absolute inset-0 w-full h-full object-contain"
            />
          ) : (
            <>
              {post.thumbnailUrl ? (
                <Image src={post.thumbnailUrl} alt={post.caption.slice(0, 60) || "Post"} fill className="object-cover" />
              ) : (
                <div className="absolute inset-0 bg-bk-border-light" />
              )}
              {post.isVideo && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
                  <div className="w-14 h-14 rounded-full bg-black/45 backdrop-blur-sm flex items-center justify-center">
                    <Play size={22} className="text-white fill-white ml-0.5" />
                  </div>
                  {post.postUrl && (
                    <span className="text-white text-xs bg-black/45 backdrop-blur-sm px-2 py-1 rounded-full pointer-events-auto">
                      Preview unavailable — see original
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        <div className="p-4 space-y-2 overflow-y-auto">
          <span
            className={`inline-block px-2.5 py-0.5 rounded-full text-white text-xs font-semibold ${
              isIG ? "bg-gradient-to-r from-purple-500 to-pink-500" : "bg-black"
            }`}
          >
            {isIG ? (post.isVideo ? "Reel" : "Instagram") : "TikTok"}
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

const EMPTY_ABOUT: PortfolioAbout = {
  bio: "",
  hobbiesAndPassions: "",
  industries: [],
  contentTypes: [],
  pronouns: null,
  age: null,
  location: null,
  languages: "",
  nationality: [],
  contactEmail: null,
  socialLinks: {
    tiktok: "", instagram: "", youtube: "", kwai: "", linkedin: "",
    twitter: "", threads: "", facebook: "", website: "",
  },
  bookingLinks: { calendly: "" },
};

const AGE_RANGES = ["13-17", "18-24", "25-34", "35-44", "45-54", "55+"];

const SOCIAL_LINK_FIELDS: {
  key: keyof SocialLinks;
  label: string;
  icon: React.ReactNode;
  placeholder: string;
}[] = [
  { key: "tiktok", label: "TikTok URL", icon: <FaTiktok className="text-bk-text-primary" />, placeholder: "https://tiktok.com/@your-handle" },
  { key: "instagram", label: "Instagram URL", icon: <FaInstagram className="text-[#E1306C]" />, placeholder: "https://instagram.com/your-handle" },
  { key: "youtube", label: "Youtube URL", icon: <FaYoutube className="text-[#FF0000]" />, placeholder: "https://youtube.com/@your-handle" },
  { key: "kwai", label: "Kwai URL", icon: <Video size={14} className="text-orange-500" />, placeholder: "kwai.com/@your-handle" },
  { key: "linkedin", label: "LinkedIn URL", icon: <FaLinkedin className="text-[#0A66C2]" />, placeholder: "linkedin.com/in/your-handle" },
  { key: "twitter", label: "Twitter URL", icon: <FaXTwitter className="text-bk-text-primary" />, placeholder: "twitter.com/your-handle" },
  { key: "threads", label: "Threads URL", icon: <FaThreads className="text-bk-text-primary" />, placeholder: "threads.com/your-handle" },
  { key: "facebook", label: "Facebook URL", icon: <FaFacebook className="text-[#1877F2]" />, placeholder: "facebook.com/your-handle" },
  { key: "website", label: "Website URL", icon: <Globe size={14} className="text-bk-text-secondary" />, placeholder: "https://your-site.com" },
];

function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");

  const addTag = () => {
    const trimmed = draft.trim();
    if (trimmed && !value.includes(trimmed)) onChange([...value, trimmed]);
    setDraft("");
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 rounded-xl border border-bk-border focus-within:ring-2 focus-within:ring-bk-purple/30 focus-within:border-bk-purple transition-colors">
      {value.map((tag) => (
        <span key={tag} className="flex items-center gap-1 bg-bk-purple-light text-bk-purple text-xs font-medium rounded-full px-2.5 py-1">
          {tag}
          <button onClick={() => onChange(value.filter((t) => t !== tag))} className="hover:text-red-500">
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTag();
          }
        }}
        onBlur={addTag}
        placeholder={value.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[100px] text-sm text-bk-text-primary placeholder:text-bk-text-muted focus:outline-none bg-transparent"
      />
    </div>
  );
}

function AboutTab({
  about,
  onSave,
}: {
  about: PortfolioAbout | null;
  onSave: (about: PortfolioAbout) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PortfolioAbout>(EMPTY_ABOUT);
  const [saving, setSaving] = useState(false);

  const startEditing = () => {
    setDraft(about ?? EMPTY_ABOUT);
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const activeSocialLinks = SOCIAL_LINK_FIELDS.filter((f) => about?.socialLinks[f.key]);
  const hasBooking = !!about?.bookingLinks.calendly;

  if (!editing) {
    return (
      <div className="flex-1 overflow-y-auto p-8 space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-bk-text-primary">About me</h2>
          <button
            onClick={startEditing}
            className="flex items-center gap-1.5 border border-bk-border rounded-lg px-3 py-1.5 text-xs text-bk-text-secondary hover:bg-bk-bg-light transition-colors"
          >
            <Pencil size={12} /> Edit
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-bk-bg-light border border-bk-border rounded-xl p-5 space-y-4">
            <h3 className="font-bold text-bk-text-primary text-sm">Tell us about yourself!</h3>
            <div>
              <p className="text-xs font-semibold text-bk-text-muted uppercase tracking-wider mb-1">Bio</p>
              <p className="text-sm text-bk-text-secondary leading-relaxed whitespace-pre-wrap">
                {about?.bio || "No bio yet."}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-bk-text-muted uppercase tracking-wider mb-1">Hobbies and Passions</p>
              <p className="text-sm text-bk-text-secondary leading-relaxed whitespace-pre-wrap">
                {about?.hobbiesAndPassions || "Not set yet."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-bk-text-muted uppercase tracking-wider mb-1.5">Industries</p>
                <div className="flex flex-wrap gap-1.5">
                  {about?.industries.length ? about.industries.map((i) => (
                    <span key={i} className="px-2.5 py-1 bg-bk-purple-light text-bk-purple text-xs rounded-full font-medium">{i}</span>
                  )) : <span className="text-xs text-bk-text-muted">Not set</span>}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-bk-text-muted uppercase tracking-wider mb-1.5">Content Types</p>
                <div className="flex flex-wrap gap-1.5">
                  {about?.contentTypes.length ? about.contentTypes.map((c) => (
                    <span key={c} className="px-2.5 py-1 bg-bk-purple-light text-bk-purple text-xs rounded-full font-medium">{c}</span>
                  )) : <span className="text-xs text-bk-text-muted">Not set</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-bk-bg-light border border-bk-border rounded-xl p-5 space-y-4">
            <h3 className="font-bold text-bk-text-primary text-sm">Personal Info</h3>
            {[
              ["Pronouns", about?.pronouns],
              ["Age", about?.age],
              ["Location", about?.location],
              ["Languages", about?.languages],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs font-semibold text-bk-text-muted uppercase tracking-wider mb-1">{label}</p>
                <p className="text-sm text-bk-text-secondary">{value || "Not set"}</p>
              </div>
            ))}
            <div>
              <p className="text-xs font-semibold text-bk-text-muted uppercase tracking-wider mb-1.5">Nationality</p>
              <div className="flex flex-wrap gap-1.5">
                {about?.nationality.length ? about.nationality.map((n) => (
                  <span key={n} className="px-2.5 py-1 bg-bk-bg border border-bk-border text-bk-text-secondary text-xs rounded-full">{n}</span>
                )) : <span className="text-xs text-bk-text-muted">Not set</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-bk-bg-light border border-bk-border rounded-xl p-5 space-y-3">
            <h3 className="font-bold text-bk-text-primary text-sm">Social Links</h3>
            {activeSocialLinks.length === 0 && <p className="text-xs text-bk-text-muted">No social links yet.</p>}
            <div className="grid grid-cols-2 gap-3">
              {activeSocialLinks.map((f) => (
                <a
                  key={f.key}
                  href={about!.socialLinks[f.key]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-bk-purple hover:underline"
                >
                  <span className="flex-shrink-0">{f.icon}</span>
                  {f.label.replace(" URL", "")}
                </a>
              ))}
            </div>
          </div>

          <div className="bg-bk-bg-light border border-bk-border rounded-xl p-5 space-y-3">
            <h3 className="font-bold text-bk-text-primary text-sm">Booking Links</h3>
            {hasBooking ? (
              <a
                href={about!.bookingLinks.calendly}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-bk-purple hover:underline"
              >
                <FaCalendar className="text-[#006BFF]" /> Calendly
              </a>
            ) : (
              <p className="text-xs text-bk-text-muted">No booking links yet.</p>
            )}
          </div>
        </div>

        {about?.contactEmail && (
          <div className="bg-bk-bg-light border border-bk-border rounded-xl p-5">
            <h3 className="font-bold text-bk-text-primary text-sm mb-1">Contact Email</h3>
            <p className="text-sm text-bk-text-secondary">{about.contactEmail}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-bk-text-primary">Edit About me</h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Tell us about yourself */}
        <div className="bg-bk-bg-light border border-bk-border rounded-xl p-5 space-y-4">
          <h3 className="font-bold text-bk-text-primary text-sm">Tell us about yourself!</h3>
          <div>
            <label className="block text-sm font-medium text-bk-text-primary mb-1.5">Bio</label>
            <textarea
              value={draft.bio}
              onChange={(e) => setDraft({ ...draft, bio: e.target.value.slice(0, 500) })}
              rows={4}
              placeholder="Enter your bio"
              className="w-full px-4 py-2.5 rounded-xl border border-bk-border text-sm text-bk-text-primary placeholder:text-bk-text-muted focus:outline-none focus:ring-2 focus:ring-bk-purple/30 focus:border-bk-purple transition-colors"
            />
            <p className="text-xs text-bk-text-muted mt-1">{draft.bio.length} / 500 characters</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-bk-text-primary mb-1.5">Hobbies and Passions</label>
            <textarea
              value={draft.hobbiesAndPassions}
              onChange={(e) => setDraft({ ...draft, hobbiesAndPassions: e.target.value.slice(0, 500) })}
              rows={3}
              placeholder="Enter your hobbies and passions"
              className="w-full px-4 py-2.5 rounded-xl border border-bk-border text-sm text-bk-text-primary placeholder:text-bk-text-muted focus:outline-none focus:ring-2 focus:ring-bk-purple/30 focus:border-bk-purple transition-colors"
            />
            <p className="text-xs text-bk-text-muted mt-1">{draft.hobbiesAndPassions.length} / 500 characters</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-bk-text-primary mb-1.5">Industries</label>
            <TagInput
              value={draft.industries}
              onChange={(industries) => setDraft({ ...draft, industries })}
              placeholder="Add an industry"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-bk-text-primary mb-1.5">Content Types</label>
            <TagInput
              value={draft.contentTypes}
              onChange={(contentTypes) => setDraft({ ...draft, contentTypes })}
              placeholder="Add a content type"
            />
          </div>
        </div>

        {/* Personal Info */}
        <div className="bg-bk-bg-light border border-bk-border rounded-xl p-5 space-y-4">
          <h3 className="font-bold text-bk-text-primary text-sm">Personal Info</h3>
          <div>
            <label className="block text-sm font-medium text-bk-text-primary mb-1.5">Pronouns</label>
            <input
              value={draft.pronouns ?? ""}
              onChange={(e) => setDraft({ ...draft, pronouns: e.target.value || null })}
              placeholder="e.g. she/her"
              className="w-full px-4 py-2.5 rounded-xl border border-bk-border text-sm text-bk-text-primary placeholder:text-bk-text-muted focus:outline-none focus:ring-2 focus:ring-bk-purple/30 focus:border-bk-purple transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-bk-text-primary mb-1.5">Age</label>
            <select
              value={draft.age ?? ""}
              onChange={(e) => setDraft({ ...draft, age: e.target.value || null })}
              className="w-full px-4 py-2.5 rounded-xl border border-bk-border text-sm text-bk-text-primary focus:outline-none focus:ring-2 focus:ring-bk-purple/30 focus:border-bk-purple transition-colors"
            >
              <option value="">Select age range</option>
              {AGE_RANGES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-bk-text-primary mb-1.5">Location</label>
            <input
              value={draft.location ?? ""}
              onChange={(e) => setDraft({ ...draft, location: e.target.value || null })}
              placeholder="City, State/Province, Country"
              className="w-full px-4 py-2.5 rounded-xl border border-bk-border text-sm text-bk-text-primary placeholder:text-bk-text-muted focus:outline-none focus:ring-2 focus:ring-bk-purple/30 focus:border-bk-purple transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-bk-text-primary mb-1.5">Languages</label>
            <input
              value={draft.languages}
              onChange={(e) => setDraft({ ...draft, languages: e.target.value })}
              placeholder="e.g. English"
              className="w-full px-4 py-2.5 rounded-xl border border-bk-border text-sm text-bk-text-primary placeholder:text-bk-text-muted focus:outline-none focus:ring-2 focus:ring-bk-purple/30 focus:border-bk-purple transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-bk-text-primary mb-1.5">Nationality</label>
            <TagInput
              value={draft.nationality}
              onChange={(nationality) => setDraft({ ...draft, nationality })}
              placeholder="Add a nationality"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Social Links */}
        <div className="bg-bk-bg-light border border-bk-border rounded-xl p-5 space-y-3">
          <h3 className="font-bold text-bk-text-primary text-sm">Social Links</h3>
          <div className="grid grid-cols-2 gap-3">
            {SOCIAL_LINK_FIELDS.map((f) => (
              <div key={f.key}>
                <label className="flex items-center gap-1.5 text-xs font-medium text-bk-text-primary mb-1">
                  {f.icon} {f.label}
                </label>
                <input
                  value={draft.socialLinks[f.key]}
                  onChange={(e) => setDraft({ ...draft, socialLinks: { ...draft.socialLinks, [f.key]: e.target.value } })}
                  placeholder={f.placeholder}
                  className="w-full px-3 py-2 rounded-lg border border-bk-border text-sm text-bk-text-primary placeholder:text-bk-text-muted focus:outline-none focus:ring-2 focus:ring-bk-purple/30 focus:border-bk-purple transition-colors"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Booking Links + Contact */}
        <div className="space-y-4">
          <div className="bg-bk-bg-light border border-bk-border rounded-xl p-5 space-y-3">
            <h3 className="font-bold text-bk-text-primary text-sm">Booking Links</h3>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-bk-text-primary mb-1">
                <FaCalendar className="text-[#006BFF]" /> Calendly URL
              </label>
              <input
                value={draft.bookingLinks.calendly}
                onChange={(e) => setDraft({ ...draft, bookingLinks: { calendly: e.target.value } })}
                placeholder="Enter URL"
                className="w-full px-3 py-2 rounded-lg border border-bk-border text-sm text-bk-text-primary placeholder:text-bk-text-muted focus:outline-none focus:ring-2 focus:ring-bk-purple/30 focus:border-bk-purple transition-colors"
              />
            </div>
          </div>

          <div className="bg-bk-bg-light border border-bk-border rounded-xl p-5 space-y-3">
            <h3 className="font-bold text-bk-text-primary text-sm">Contact Email</h3>
            <input
              type="email"
              value={draft.contactEmail ?? ""}
              onChange={(e) => setDraft({ ...draft, contactEmail: e.target.value || null })}
              placeholder="you@example.com"
              className="w-full px-3 py-2 rounded-lg border border-bk-border text-sm text-bk-text-primary placeholder:text-bk-text-muted focus:outline-none focus:ring-2 focus:ring-bk-purple/30 focus:border-bk-purple transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-1 max-w-sm">
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
  );
}

// ─── Creators View ───────────────────────────────────────────────────────────

const CREATOR_TABS = [
  { label: "Roster", icon: Users },
  { label: "Community Applicants", icon: FileText },
  { label: "Archived", icon: Archive },
  { label: "Creators Portfolio AI", icon: Sparkles },
] as const;

type CreatorTabLabel = (typeof CREATOR_TABS)[number]["label"];

function CreatorsView({
  creators,
  loading,
  onSelect,
  onCreateNew,
}: {
  creators: PortfolioSummary[];
  loading: boolean;
  onSelect: (id: string) => void;
  onCreateNew: () => void;
}) {
  const [tab, setTab] = useState<CreatorTabLabel>("Creators Portfolio AI");
  const [search, setSearch] = useState("");

  const queryTokens = normalizeSearch(search).trim().split(/\s+/).filter(Boolean);
  const filteredCreators = queryTokens.length
    ? creators.filter((c) => {
        const haystack = normalizeSearch(`${c.displayName} ${c.username}`);
        return queryTokens.every((token) => haystack.includes(token));
      })
    : creators;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center gap-6 px-8 border-b border-bk-border flex-shrink-0">
        {CREATOR_TABS.map(({ label, icon: Icon }) => (
          <button
            key={label}
            onClick={() => setTab(label)}
            className={`flex items-center gap-2 py-4 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === label
                ? "border-bk-purple text-bk-text-primary"
                : "border-transparent text-bk-text-secondary hover:text-bk-text-primary"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {tab !== "Creators Portfolio AI" ? (
        <ComingSoonTab label={tab} />
      ) : (
        <div className="flex-1 overflow-y-auto p-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-bk-text-primary mb-1">Creators Portfolio AI</h2>
              <p className="text-sm text-bk-text-secondary">All portfolios generated so far. Click one to open it.</p>
            </div>
            <button
              onClick={onCreateNew}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-bk-purple text-white font-semibold rounded-xl text-sm hover:bg-bk-purple-dark transition-colors"
            >
              <span>✦</span> New Creator
            </button>
          </div>

          {creators.length > 0 && (
            <div className="relative mb-6 max-w-sm">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-bk-text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or username..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-bk-border text-sm text-bk-text-primary placeholder:text-bk-text-muted focus:outline-none focus:ring-2 focus:ring-bk-purple/30 focus:border-bk-purple transition-colors"
              />
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="text-bk-purple animate-spin" />
            </div>
          ) : creators.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 bg-bk-purple-light rounded-full flex items-center justify-center mb-4">
                <Users size={24} className="text-bk-purple" />
              </div>
              <h3 className="text-lg font-bold text-bk-text-primary mb-2">No creators yet</h3>
              <p className="text-sm text-bk-text-secondary max-w-sm">Generate your first portfolio to see it here.</p>
            </div>
          ) : filteredCreators.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-bk-text-secondary">No creators match &ldquo;{search}&rdquo;.</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {filteredCreators.map((creator) => (
                <button
                  key={creator.id}
                  onClick={() => onSelect(creator.id)}
                  className="flex flex-col items-center gap-3 bg-bk-bg border border-bk-border rounded-xl p-5 hover:shadow-md hover:border-bk-purple/30 transition-all text-center"
                >
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-bk-border-light flex-shrink-0 flex items-center justify-center">
                    {creator.profilePicUrl ? (
                      <Image
                        src={creator.profilePicUrl}
                        alt={creator.displayName}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-bk-text-muted text-xl font-semibold">
                        {creator.displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 w-full">
                    <p className="font-semibold text-bk-text-primary text-sm line-clamp-1">{creator.displayName}</p>
                    {creator.username && (
                      <p className="text-xs text-bk-text-muted line-clamp-1">@{creator.username}</p>
                    )}
                  </div>
                  {creator.platforms.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      {creator.platforms.includes("instagram") && (
                        <FaInstagram size={12} className="text-[#E1306C]" />
                      )}
                      {creator.platforms.includes("tiktok") && (
                        <FaTiktok size={12} className="text-bk-text-primary" />
                      )}
                    </div>
                  )}
                  {creator.generatedAt && (
                    <p className="text-[11px] text-bk-text-muted">
                      Generated {formatDateTime(creator.generatedAt)}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
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

// Instagram's public API doesn't expose per-post reach/views, so we approximate it from
// followers using industry-typical organic-reach ratios (reach as a % of followers drops
// as an account grows). Always surfaced to the user as "estimated", never as real data.
function estimatedInstagramReach(followersCount: number): number {
  if (!followersCount) return 0;
  const ratio = followersCount < 10_000 ? 0.35 : followersCount < 100_000 ? 0.2 : followersCount < 1_000_000 ? 0.1 : 0.05;
  return Math.round(followersCount * ratio);
}

function computeEngagement(
  post: CreatorPost,
  profile: CreatorProfile
): { rate: number; reach: number; isEstimated: boolean } {
  const interactions = post.likesCount + post.commentsCount;
  const isEstimated = !post.viewsCount || post.viewsCount <= 0;
  const reach = isEstimated ? estimatedInstagramReach(profile.followersCount) : (post.viewsCount as number);
  const rate = reach ? (interactions / reach) * 100 : 0;
  return { rate, reach, isEstimated };
}

// Best-effort heuristic only — the scraped data has no real sponsored/paid
// marker (confirmed by inspecting the raw API response directly), so this
// just checks the caption for common ad-disclosure phrases.
const AD_CAPTION_KEYWORDS = [
  "#ad", "#sponsored", "#sponsoredpost", "#publicidad", "#pauta", "#pautado",
  "paid partnership", "sponsored by", "en colaboracion con",
];

function isLikelyOrganic(caption: string): boolean {
  const normalized = normalizeSearch(caption || "");
  return !AD_CAPTION_KEYWORDS.some((kw) => normalized.includes(normalizeSearch(kw)));
}

function AudienceAnalyticsTab({ result }: { result: GenerateResponse }) {
  const platformStats = result.profiles
    .filter((profile) => profile.recentPosts.length > 0)
    .map((profile) => {
      const engagements = profile.recentPosts.map((post) => computeEngagement(post, profile));
      const avgRate = engagements.reduce((sum, e) => sum + e.rate, 0) / engagements.length;
      const avgReach = engagements.reduce((sum, e) => sum + e.reach, 0) / engagements.length;
      const isEstimated = engagements.some((e) => e.isEstimated);
      const topPosts = profile.recentPosts
        .map((post, i) => ({ post, ...engagements[i] }))
        .sort((a, b) => b.rate - a.rate)
        .slice(0, 3);
      return { profile, avgRate, avgReach, isEstimated, topPosts };
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
          Engagement rate (ER) calculated as interactions (likes + comments) over reach per video — use this to benchmark content performance for brand pitches and estimate campaign reach.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {platformStats.map(({ profile, avgRate, avgReach, isEstimated, topPosts }) => {
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold text-bk-text-muted uppercase tracking-wider mb-1">Avg. Engagement Rate</p>
                  <p className="text-2xl font-bold text-bk-purple">{avgRate.toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-bk-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                    Avg. Reach / Video
                    {isEstimated && <span className="text-[10px] font-normal text-bk-text-muted normal-case">(estimated)</span>}
                  </p>
                  <p className="text-2xl font-bold text-bk-text-primary">{fmt(Math.round(avgReach))}</p>
                </div>
              </div>
              {isEstimated && (
                <p className="text-[11px] text-bk-text-muted -mt-2">
                  Instagram doesn&apos;t expose real view/reach data publicly — reach is estimated from followers and shouldn&apos;t be quoted to brands as an exact number.
                </p>
              )}

              <div className="border-t border-bk-border-light pt-3 space-y-2">
                <p className="text-xs font-semibold text-bk-text-muted uppercase tracking-wider">Top Posts by ER</p>
                {topPosts.map(({ post, rate, reach, isEstimated: postEstimated }, i) => (
                  <div key={post.id ?? i} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-bk-text-secondary line-clamp-1">{post.caption || "—"}</span>
                    <span className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-bk-text-muted flex items-center gap-1">
                        <Eye size={12} /> {fmt(reach)}{postEstimated ? "~" : ""}
                      </span>
                      <span className="font-semibold text-bk-text-primary">{rate.toFixed(2)}%</span>
                    </span>
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

// ─── Metrics ─────────────────────────────────────────────────────────────────

function CountrySelect({
  value,
  onChange,
  allowAll = false,
  className = "",
}: {
  value: CampaignGeo | "";
  onChange: (code: string) => void;
  allowAll?: boolean;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabel = value === "" ? "All countries" : (COUNTRY_BY_CODE.get(value)?.name ?? value);

  const normalizedQuery = normalizeSearch(query);
  const filtered = normalizedQuery
    ? COUNTRIES.filter(
        (c) => normalizeSearch(c.name).includes(normalizedQuery) || c.code.toLowerCase().includes(normalizedQuery)
      ).slice(0, 8)
    : COUNTRIES.slice(0, 8);

  const handleSelect = (code: string) => {
    onChange(code);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <input
        value={open ? query : selectedLabel}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        placeholder="Search country..."
        className="w-full px-2.5 py-1.5 rounded-lg border border-bk-border text-sm text-bk-text-primary focus:outline-none focus:ring-2 focus:ring-bk-purple/30 focus:border-bk-purple"
      />
      {open && (
        <div className="absolute z-20 top-full left-0 mt-1 w-56 max-h-64 overflow-y-auto bg-bk-bg border border-bk-border rounded-xl shadow-lg py-1">
          {allowAll && (
            <button
              onClick={() => handleSelect("")}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-bk-bg-light transition-colors text-bk-text-primary"
            >
              All countries
            </button>
          )}
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-bk-text-muted">No matches</p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.code}
                onClick={() => handleSelect(c.code)}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-bk-bg-light transition-colors text-bk-text-primary"
              >
                {c.name} <span className="text-bk-text-muted">({c.code})</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function AddCreatorModal({
  savedCreators,
  existingIds,
  onConfirm,
  onClose,
}: {
  savedCreators: PortfolioSummary[];
  existingIds: Set<string>;
  onConfirm: (portfolioIds: string[], geo: CampaignGeo) => Promise<void>;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [geo, setGeo] = useState<CampaignGeo>("AR");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const normalizedSearch = normalizeSearch(search);
  const filtered = savedCreators.filter((c) => {
    if (existingIds.has(c.id)) return false;
    if (!normalizedSearch) return true;
    return (
      normalizeSearch(c.displayName).includes(normalizedSearch) ||
      normalizeSearch(c.username).includes(normalizedSearch)
    );
  });

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (selectedIds.size === 0) return;
    setSubmitting(true);
    try {
      await onConfirm(Array.from(selectedIds), geo);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-bk-bg rounded-2xl shadow-2xl w-[520px] max-h-[80vh] flex flex-col p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-bk-text-primary">Add Creator</h2>
          <button onClick={onClose} className="text-bk-text-muted hover:text-bk-text-primary"><X size={18} /></button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-bk-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search saved creators..."
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-bk-border text-sm focus:outline-none focus:ring-2 focus:ring-bk-purple/30 focus:border-bk-purple"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 bg-bk-bg-light rounded-xl px-3 py-2.5">
          <span className="text-xs font-medium text-bk-text-secondary">Tag new adds as:</span>
          <CountrySelect value={geo} onChange={setGeo} className="w-56" />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 -mx-2 px-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-bk-text-muted text-center py-8">
              {savedCreators.length === 0 ? "No saved creators yet." : "No results, or all matches are already in the campaign."}
            </p>
          ) : (
            filtered.map((c) => {
              const checked = selectedIds.has(c.id);
              return (
                <label
                  key={c.id}
                  className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-bk-bg-light transition-colors cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSelected(c.id)}
                    className="accent-bk-purple flex-shrink-0"
                  />
                  {c.profilePicUrl ? (
                    <Image src={c.profilePicUrl} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-bk-purple-light flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-bk-text-primary truncate">{c.displayName}</p>
                    <p className="text-xs text-bk-text-muted truncate">@{c.username}</p>
                  </div>
                </label>
              );
            })
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-2.5 border border-bk-border rounded-xl text-sm text-bk-text-secondary hover:bg-bk-bg-light transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting || selectedIds.size === 0}
            className="flex-1 py-2.5 bg-bk-purple text-white font-semibold rounded-xl text-sm hover:bg-bk-purple-dark transition-colors disabled:opacity-50"
          >
            {submitting
              ? "Adding..."
              : selectedIds.size === 0
                ? "Select creators"
                : `Add ${selectedIds.size} creator${selectedIds.size === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function MetricsLoadingState() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="bg-bk-bg border border-bk-border rounded-2xl px-10 py-8 text-center space-y-3">
        <Loader2 size={32} className="text-bk-purple animate-spin mx-auto" />
        <p className="text-sm font-semibold text-bk-text-primary">Generating your dashboard...</p>
        <p className="text-xs text-bk-text-muted">Pulling posts and computing reach across your roster.</p>
      </div>
    </div>
  );
}

function MetricsEmptyState({ onAddCreator }: { onAddCreator: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-bk-purple-light flex items-center justify-center mx-auto">
          <BarChart3 size={24} className="text-bk-purple" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-bk-text-primary">Build your campaign roster</h2>
          <p className="text-sm text-bk-text-secondary mt-1">
            Add the creators you&apos;re planning to work with. Once you do, you&apos;ll be able to filter by geo,
            platform, and content type, and see estimated reach and engagement across the whole roster.
          </p>
        </div>
        <button
          onClick={onAddCreator}
          className="inline-flex items-center gap-1.5 bg-bk-purple text-white font-semibold px-4 py-2.5 rounded-xl text-sm hover:bg-bk-purple-dark transition-colors"
        >
          <UserSearch size={14} /> Add Creator
        </button>
      </div>
    </div>
  );
}

function FiltersMenu({
  organicOnly,
  onOrganicOnlyChange,
  excludePinned,
  onExcludePinnedChange,
}: {
  organicOnly: boolean;
  onOrganicOnlyChange: (v: boolean) => void;
  excludePinned: boolean;
  onExcludePinnedChange: (v: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 border border-bk-border text-bk-text-primary font-medium px-3 py-2 rounded-xl text-sm hover:bg-bk-bg-light transition-colors"
      >
        <SlidersHorizontal size={14} /> Filters
      </button>
      {open && (
        <div className="absolute z-20 top-full left-0 mt-1 w-64 bg-bk-bg border border-bk-border rounded-xl shadow-lg p-3 space-y-1">
          <label className="flex items-center justify-between gap-2 px-1 py-2 text-sm text-bk-text-primary cursor-pointer select-none">
            <span>Organic content only</span>
            <input
              type="checkbox"
              checked={organicOnly}
              onChange={(e) => onOrganicOnlyChange(e.target.checked)}
              className="accent-bk-purple"
            />
          </label>
          <label className="flex items-center justify-between gap-2 px-1 py-2 text-sm text-bk-text-primary cursor-pointer select-none">
            <span>Exclude pinned posts</span>
            <input
              type="checkbox"
              checked={excludePinned}
              onChange={(e) => onExcludePinnedChange(e.target.checked)}
              className="accent-bk-purple"
            />
          </label>
        </div>
      )}
    </div>
  );
}

interface CreatorPlatformStat {
  portfolioId: string;
  displayName: string;
  username: string;
  profilePicUrl: string | null;
  platform: Platform;
  geo: CampaignGeo;
  avgReach: number;
  avgRate: number;
  isEstimated: boolean;
  postsAnalyzed: number;
}

function MetricsView() {
  const [roster, setRoster] = useState<CampaignCreatorSummary[]>([]);
  const [portfolioData, setPortfolioData] = useState<Record<string, GenerateResponse>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [postsToAnalyze, setPostsToAnalyze] = useState(10);
  const [organicOnly, setOrganicOnly] = useState(true);
  const [excludePinned, setExcludePinned] = useState(true);
  const [geoFilter, setGeoFilter] = useState<CampaignGeo | "">("");
  const [platformFilter, setPlatformFilter] = useState<"all" | Platform>("all");

  const [showAddCreator, setShowAddCreator] = useState(false);
  const [savedCreators, setSavedCreators] = useState<PortfolioSummary[]>([]);

  const loadRoster = () => {
    setLoading(true);
    fetch("/api/metrics/creators")
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(async (data) => {
        const entries: CampaignCreatorSummary[] = data.creators ?? [];
        setRoster(entries);
        const pairs = await Promise.all(
          entries.map(async (c) => {
            const res = await fetch(`/api/portfolio?id=${c.id}`);
            const full = await res.json();
            return [c.id, full] as const;
          })
        );
        setPortfolioData(Object.fromEntries(pairs));
      })
      .catch(() => setError("Couldn't load the campaign roster."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRoster();
  }, []);

  const openAddCreator = () => {
    setShowAddCreator(true);
    fetch("/api/portfolios")
      .then((res) => res.json())
      .then((data) => setSavedCreators(data.portfolios ?? []))
      .catch(() => {});
  };

  const handleConfirmAddCreators = async (portfolioIds: string[], geo: CampaignGeo) => {
    setShowAddCreator(false);
    setError(null);
    const results = await Promise.allSettled(
      portfolioIds.map((portfolioId) =>
        fetch("/api/metrics/creators", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ portfolioId, geo }),
        }).then((res) => {
          if (!res.ok) throw new Error();
        })
      )
    );
    if (results.some((r) => r.status === "rejected")) {
      setError("Couldn't add one or more creators. Please try again.");
    }
    loadRoster();
  };

  const handleRemove = async (portfolioId: string) => {
    const snapshot = roster;
    setRoster((prev) => prev.filter((c) => c.id !== portfolioId));
    try {
      const res = await fetch("/api/metrics/creators", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolioId }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setRoster(snapshot);
      setError("Couldn't remove the creator. Please try again.");
    }
  };

  const stats: CreatorPlatformStat[] = roster.flatMap((entry) => {
    const full = portfolioData[entry.id];
    if (!full) return [];
    return full.profiles
      .filter((p) => p.recentPosts.length > 0)
      .filter((p) => platformFilter === "all" || p.platform === platformFilter)
      .map((profile): CreatorPlatformStat => {
        const reelsOnly = platformFilter === "instagram";
        const pinnedFiltered = excludePinned ? profile.recentPosts.filter((p) => !p.isPinned) : profile.recentPosts;
        const basePosts = reelsOnly ? pinnedFiltered.filter((p) => p.isVideo) : pinnedFiltered;
        const candidatePosts = organicOnly ? basePosts.filter((p) => isLikelyOrganic(p.caption)) : basePosts;
        const analyzedPosts = candidatePosts.slice(0, postsToAnalyze);
        if (analyzedPosts.length === 0) {
          return {
            portfolioId: entry.id,
            displayName: entry.displayName,
            username: entry.username,
            profilePicUrl: entry.profilePicUrl,
            platform: profile.platform,
            geo: entry.geo,
            avgReach: 0,
            avgRate: 0,
            isEstimated: profile.platform === "instagram",
            postsAnalyzed: 0,
          };
        }
        const engagements = analyzedPosts.map((post) => computeEngagement(post, profile));
        const avgReach = engagements.reduce((s, e) => s + e.reach, 0) / engagements.length;
        const avgRate = engagements.reduce((s, e) => s + e.rate, 0) / engagements.length;
        const isEstimated = engagements.some((e) => e.isEstimated);
        return {
          portfolioId: entry.id,
          displayName: entry.displayName,
          username: entry.username,
          profilePicUrl: entry.profilePicUrl,
          platform: profile.platform,
          geo: entry.geo,
          avgReach,
          avgRate,
          isEstimated,
          postsAnalyzed: analyzedPosts.length,
        };
      });
  });

  const filteredStats = stats.filter((s) => geoFilter === "" || s.geo === geoFilter);
  const totalReach = filteredStats.reduce((s, x) => s + x.avgReach, 0);
  const distinctGeos = Array.from(new Set(filteredStats.map((s) => s.geo))).sort();
  const breakdown = distinctGeos.map((geo) => {
    const cellStats = filteredStats.filter((s) => s.geo === geo);
    return {
      geo,
      count: new Set(cellStats.map((s) => s.portfolioId)).size,
      reach: cellStats.reduce((s, x) => s + x.avgReach, 0),
    };
  });

  const handleExport = () => {
    const headers = ["Creator", "Username", "Platform", "Geo", "Avg Reach/Video", "Avg ER (%)", "Posts analyzed"];
    const rows = filteredStats.map((s) => [
      s.displayName,
      s.username,
      s.platform,
      COUNTRY_BY_CODE.get(s.geo)?.name ?? s.geo,
      Math.round(s.avgReach).toString(),
      s.avgRate.toFixed(2),
      s.postsAnalyzed.toString(),
    ]);
    rows.push(["", "", "", "Total Potential Reach", Math.round(totalReach).toString(), "", ""]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "brkaway-metrics.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="bg-bk-bg border-b border-bk-border px-8 py-5">
        <h1 className="text-xl font-bold text-bk-text-primary">Metrics</h1>
        <p className="text-sm text-bk-text-secondary mt-0.5">
          Estimate total campaign reach across your saved creators.
        </p>
      </div>

      {error && (
        <div className="mx-8 mt-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <X size={14} className="text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} className="text-red-400" /></button>
        </div>
      )}

      {loading ? (
        <MetricsLoadingState />
      ) : roster.length === 0 ? (
        <MetricsEmptyState onAddCreator={openAddCreator} />
      ) : (
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 bg-bk-bg border border-bk-border rounded-xl p-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-bk-text-secondary whitespace-nowrap">Posts to analyze</label>
            <input
              type="number"
              min={1}
              max={20}
              value={postsToAnalyze}
              onChange={(e) => setPostsToAnalyze(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
              className="w-16 px-2 py-1.5 rounded-lg border border-bk-border text-sm text-center focus:outline-none focus:ring-2 focus:ring-bk-purple/30 focus:border-bk-purple"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-bk-text-secondary whitespace-nowrap">Geo</label>
            <CountrySelect value={geoFilter} onChange={setGeoFilter} allowAll className="w-48" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-bk-text-secondary whitespace-nowrap">Platform</label>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value as "all" | Platform)}
              className="px-2.5 py-1.5 rounded-lg border border-bk-border text-sm text-bk-text-primary focus:outline-none focus:ring-2 focus:ring-bk-purple/30 focus:border-bk-purple"
            >
              <option value="all">All platforms</option>
              <option value="instagram">Instagram Reels</option>
              <option value="tiktok">TikTok</option>
              <option value="youtube">YouTube</option>
            </select>
          </div>
          <FiltersMenu
            organicOnly={organicOnly}
            onOrganicOnlyChange={setOrganicOnly}
            excludePinned={excludePinned}
            onExcludePinnedChange={setExcludePinned}
          />

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 border border-bk-border text-bk-text-primary font-medium px-3 py-2 rounded-xl text-sm hover:bg-bk-bg-light transition-colors"
            >
              <Archive size={14} /> Export
            </button>
            <button
              onClick={openAddCreator}
              className="flex items-center gap-1.5 bg-bk-purple text-white font-semibold px-3 py-2 rounded-xl text-sm hover:bg-bk-purple-dark transition-colors"
            >
              <UserSearch size={14} /> Add Creator
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-1 rounded-xl p-5 space-y-1" style={{ background: "var(--gradient-brand)" }}>
            <p className="text-xs font-semibold text-white/80 uppercase tracking-wider">Total Potential Reach</p>
            <p className="text-3xl font-bold text-white">{fmt(Math.round(totalReach))}</p>
            <p className="text-[11px] text-white/70">Sum of each creator&apos;s avg. reach per video</p>
          </div>
          <div className="col-span-2 bg-bk-bg border border-bk-border rounded-xl p-4">
            <p className="text-xs font-semibold text-bk-text-muted uppercase tracking-wider mb-3">Breakdown by Geo</p>
            {breakdown.length === 0 ? (
              <p className="text-sm text-bk-text-muted">No creators to break down yet.</p>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {breakdown.map((cell) => (
                  <div key={cell.geo} className="bg-bk-bg-light rounded-lg p-3">
                    <p className="text-[10px] font-semibold text-bk-text-muted uppercase">
                      {COUNTRY_BY_CODE.get(cell.geo)?.name ?? cell.geo}
                    </p>
                    <p className="text-lg font-bold text-bk-text-primary">{fmt(Math.round(cell.reach))}</p>
                    <p className="text-[11px] text-bk-text-muted">{cell.count} creator{cell.count === 1 ? "" : "s"}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Roster table */}
        <div className="bg-bk-bg border border-bk-border rounded-xl overflow-hidden">
          {filteredStats.length === 0 ? (
            <p className="text-sm text-bk-text-muted text-center py-12">
              No creators match the current Geo/Platform filters.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bk-border text-left text-xs font-semibold text-bk-text-muted uppercase tracking-wider">
                  <th className="px-4 py-3">Creator</th>
                  <th className="px-4 py-3">Geo</th>
                  <th className="px-4 py-3">Avg. Reach/Video</th>
                  <th className="px-4 py-3">Avg. ER</th>
                  <th className="px-4 py-3">Posts analyzed</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredStats.map((s) => (
                  <tr key={`${s.portfolioId}-${s.platform}`} className="border-b border-bk-border-light last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {s.profilePicUrl ? (
                          <Image src={s.profilePicUrl} alt="" width={28} height={28} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-bk-purple-light flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-bk-text-primary truncate">{s.displayName}</p>
                          <p className="text-xs text-bk-text-muted truncate">@{s.username} · {s.platform === "instagram" ? "Instagram" : "TikTok"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-bk-text-secondary">{COUNTRY_BY_CODE.get(s.geo)?.name ?? s.geo}</td>
                    <td className="px-4 py-3 font-semibold text-bk-text-primary">
                      {fmt(Math.round(s.avgReach))}{s.isEstimated ? "~" : ""}
                    </td>
                    <td className="px-4 py-3 font-semibold text-bk-purple">{s.avgRate.toFixed(2)}%</td>
                    <td className="px-4 py-3 text-bk-text-muted">{s.postsAnalyzed}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRemove(s.portfolioId)}
                        className="text-bk-text-muted hover:text-red-600 transition-colors"
                        title="Remove from campaign"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      )}

      {showAddCreator && (
        <AddCreatorModal
          savedCreators={savedCreators}
          existingIds={new Set(roster.map((c) => c.id))}
          onConfirm={handleConfirmAddCreators}
          onClose={() => setShowAddCreator(false)}
        />
      )}
    </div>
  );
}

// ─── Own Portfolio View ──────────────────────────────────────────────────────

// Matches the real Brkaway portfolio grid: media only, no likes/comments/views
// (those are meaningful for scraped social content, not for a creator's own uploads).
function PortfolioMediaCard({
  post,
  onOpen,
  onDelete,
  onEdit,
  dragProps,
}: {
  post: CreatorPost;
  onOpen: () => void;
  onDelete: () => void;
  onEdit: () => void;
  dragProps: React.HTMLAttributes<HTMLDivElement>;
}) {
  return (
    <div
      {...dragProps}
      className="relative aspect-[9/16] bg-bk-border-light rounded-xl overflow-hidden border border-bk-border hover:shadow-md transition-shadow group"
    >
      <button onClick={onOpen} className="absolute inset-0 w-full h-full text-left">
        {post.isVideo && post.videoUrl ? (
          <video
            src={post.videoUrl}
            className="absolute inset-0 w-full h-full object-cover"
            muted
            playsInline
            preload="metadata"
          />
        ) : post.thumbnailUrl ? (
          <Image
            src={post.thumbnailUrl}
            alt=""
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 bg-bk-border-light" />
        )}
        {post.isVideo && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-10 h-10 rounded-full bg-black/45 backdrop-blur-sm flex items-center justify-center">
              <Play size={16} className="text-white fill-white ml-0.5" />
            </div>
          </div>
        )}
      </button>

      <div className="absolute top-2 left-2 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center text-bk-text-secondary cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical size={16} />
      </div>
      <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit();
          }}
          className="w-8 h-8 rounded-full bg-bk-purple hover:bg-bk-purple-dark shadow flex items-center justify-center text-white transition-colors"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
          className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-700 shadow flex items-center justify-center text-white transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function PortfolioMediaLightbox({
  post,
  onClose,
  onNext,
  onPrev,
}: {
  post: CreatorPost;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}) {
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

      <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl w-[360px] aspect-[9/16]">
        {post.isVideo && post.videoUrl ? (
          <video
            key={post.id ?? post.videoUrl}
            src={post.videoUrl}
            controls
            autoPlay
            className="absolute inset-0 w-full h-full object-contain"
          />
        ) : post.thumbnailUrl ? (
          <Image src={post.thumbnailUrl} alt="" fill className="object-contain" />
        ) : (
          <div className="absolute inset-0 bg-bk-border-light" />
        )}
      </div>
    </div>
  );
}

// Renders one media-type section (Videos or Photos) with its own empty
// state, matching the real product's layout of separate labeled sections
// instead of one mixed grid.
function PortfolioTypeSection({
  title,
  emoji,
  emptyText,
  entries,
  hasAnyOfType,
  onOpen,
  onDelete,
  onEdit,
  onDragStart,
  onDrop,
  onDragEnd,
}: {
  title: string;
  emoji: string;
  emptyText: string;
  entries: { post: CreatorPost; globalIndex: number }[];
  hasAnyOfType: boolean;
  onOpen: (globalIndex: number) => void;
  onDelete: (postId: string) => void;
  onEdit: (postId: string) => void;
  onDragStart: (globalIndex: number) => void;
  onDrop: (globalIndex: number) => void;
  onDragEnd: () => void;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-bk-text-primary">{title}</h3>
      {!hasAnyOfType ? (
        <div className="border-2 border-dashed border-bk-border rounded-2xl bg-bk-bg p-10 text-center space-y-1">
          <h2 className="text-lg font-bold text-bk-text-primary">
            {title} {emoji}
          </h2>
          <p className="text-sm text-bk-text-secondary max-w-md mx-auto">{emptyText}</p>
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-bk-text-muted py-6 text-center">No results match your search.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {entries.map(({ post, globalIndex }) => (
            <PortfolioMediaCard
              key={post.id ?? globalIndex}
              post={post}
              onOpen={() => onOpen(globalIndex)}
              onDelete={() => post.id && onDelete(post.id)}
              onEdit={() => post.id && onEdit(post.id)}
              dragProps={{
                draggable: true,
                onDragStart: () => onDragStart(globalIndex),
                onDragOver: (e) => e.preventDefault(),
                onDrop: () => onDrop(globalIndex),
                onDragEnd: onDragEnd,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OwnPortfolioView() {
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [about, setAbout] = useState<PortfolioAbout | null>(null);
  const [profileOverrides, setProfileOverrides] = useState<ProfileOverrides | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Portfolio");
  const [showAiModal, setShowAiModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [resetting, setResetting] = useState(false);
  const [replaceTargetPostId, setReplaceTargetPostId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  const loadOwn = () => {
    setLoading(true);
    fetch("/api/portfolio/own")
      .then((res) => res.json())
      .then((data) => {
        setResult({
          id: data.id,
          isSaved: data.isSaved,
          profiles: data.profiles,
          aiAnalysis: data.aiAnalysis,
          generatedAt: data.generatedAt,
        });
        setAbout(data.about ?? null);
        setProfileOverrides(data.profileOverrides ?? null);
      })
      .catch(() => setError("Couldn't load your portfolio."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOwn();
  }, []);

  const allPosts = result?.profiles.flatMap((p) => p.recentPosts.map((post) => ({ post, platform: p.platform }))) ?? [];

  const matchesSearch = (post: CreatorPost) =>
    !searchQuery.trim() || normalizeSearch(post.caption || "").includes(normalizeSearch(searchQuery));

  const indexedPosts = allPosts.map((entry, globalIndex) => ({ ...entry, globalIndex }));
  const videoEntries = indexedPosts.filter((e) => e.post.isVideo);
  const photoEntries = indexedPosts.filter((e) => !e.post.isVideo);
  const filteredVideoEntries = videoEntries.filter((e) => matchesSearch(e.post));
  const filteredPhotoEntries = photoEntries.filter((e) => matchesSearch(e.post));

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !result) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const isVideo = file.type.startsWith("video/");
        const signRes = await fetch("/api/portfolio/own/upload/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, contentType: file.type }),
        });
        if (!signRes.ok) throw new Error("sign failed");
        const { path, token, publicUrl } = await signRes.json();

        const { error: uploadError } = await getSupabaseBrowser()
          .storage.from("portfolio-uploads")
          .uploadToSignedUrl(path, token, file);
        if (uploadError) throw uploadError;

        const completeRes = await fetch("/api/portfolio/own/upload/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicUrl, isVideo }),
        });
        if (!completeRes.ok) throw new Error("complete failed");
      }
      loadOwn();
    } catch {
      setError("Couldn't upload the file. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleEditPost = (postId: string) => {
    setReplaceTargetPostId(postId);
    replaceFileInputRef.current?.click();
  };

  const handleReplaceFile = async (files: FileList | null) => {
    const file = files?.[0];
    const postId = replaceTargetPostId;
    setReplaceTargetPostId(null);
    if (!file || !postId) return;

    setUploading(true);
    setError(null);
    try {
      const isVideo = file.type.startsWith("video/");
      const signRes = await fetch("/api/portfolio/own/upload/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      if (!signRes.ok) throw new Error("sign failed");
      const { path, token, publicUrl } = await signRes.json();

      const { error: uploadError } = await getSupabaseBrowser()
        .storage.from("portfolio-uploads")
        .uploadToSignedUrl(path, token, file);
      if (uploadError) throw uploadError;

      const replaceRes = await fetch("/api/portfolio/own/upload/replace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, publicUrl, isVideo }),
      });
      if (!replaceRes.ok) throw new Error("replace failed");
      loadOwn();
    } catch {
      setError("Couldn't replace the file. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateAi = async (ig: string, tt: string, yt: string) => {
    if (!result) return;
    setShowAiModal(false);
    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instagramUrl: ig,
          tiktokUrl: tt,
          youtubeUrl: yt || undefined,
          portfolioId: result.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error generating portfolio");
        setLoading(false);
        return;
      }
      loadOwn();
    } catch {
      setError("Connection error. Please try again.");
      setLoading(false);
    }
  };

  const handleSaveAbout = async (updated: PortfolioAbout) => {
    if (!result) return;
    const res = await fetch("/api/portfolio/about", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...updated, portfolioId: result.id }),
    });
    if (!res.ok) {
      setError("Couldn't save the information. Please try again.");
      throw new Error("save about failed");
    }
    setAbout(await res.json());
  };

  const handleSaveProfile = async (updated: ProfileOverrides) => {
    if (!result) return;
    const res = await fetch("/api/portfolio/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...updated, portfolioId: result.id }),
    });
    if (!res.ok) {
      setError("Couldn't save the profile. Please try again.");
      throw new Error("save profile failed");
    }
    setProfileOverrides(await res.json());
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
        setError("Couldn't delete the photo. Please try again.");
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
        setError("Couldn't save the new order. Please try again.");
      });
  };

  const handleDrop = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }
    const reordered = [...allPosts];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    setDragIndex(null);
    handleReorder(reordered);
  };

  const handleResetPortfolio = async () => {
    if (!window.confirm("This will permanently delete everything in your portfolio (uploads, AI-generated content, and About info) so you can start over. Continue?")) {
      return;
    }
    setResetting(true);
    try {
      const res = await fetch("/api/portfolio/own/reset", { method: "POST" });
      if (!res.ok) throw new Error();
      loadOwn();
    } catch {
      setError("Couldn't reset the portfolio. Please try again.");
    } finally {
      setResetting(false);
    }
  };

  if (loading && !result) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 size={28} className="text-bk-purple animate-spin" />
      </div>
    );
  }

  // Prefer a real scraped social profile (has a name/photo) over the manual
  // "Uploads" profile, which is just a bucket for directly-uploaded content.
  const firstProfile =
    result?.profiles.find((p) => p.platform === "instagram" || p.platform === "tiktok") ??
    result?.profiles[0];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ProfileHeader
        profile={firstProfile}
        profiles={result?.profiles ?? []}
        overrides={profileOverrides}
        portfolioId={result?.id ?? null}
        onEditClick={() => setEditingProfile(true)}
      />
      <TabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        extra={
          activeTab === "Portfolio" && allPosts.length > 0 ? (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-bk-text-muted" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search"
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-bk-border text-sm w-56 text-bk-text-primary placeholder:text-bk-text-muted focus:outline-none focus:ring-2 focus:ring-bk-purple/30 focus:border-bk-purple transition-colors"
                />
              </div>
              <button
                title="Filters (coming soon)"
                className="w-8 h-8 rounded-lg border border-bk-border flex items-center justify-center text-bk-text-secondary hover:bg-bk-bg-light transition-colors flex-shrink-0"
              >
                <SlidersHorizontal size={14} />
              </button>
            </div>
          ) : undefined
        }
      />

      {error && (
        <div className="mx-8 mt-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <X size={14} className="text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} className="text-red-400" /></button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          {activeTab === "Portfolio" && (
            <div className="flex-1 overflow-y-auto">
              <div className="p-8 space-y-6">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
                <input
                  ref={replaceFileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => handleReplaceFile(e.target.files)}
                />

                {allPosts.length === 0 ? (
                  <div className="border-2 border-dashed border-bk-border rounded-2xl bg-bk-bg p-10 space-y-4">
                    <div className="text-center space-y-1">
                      <h2 className="text-lg font-bold text-bk-text-primary">Portfolio 🎨</h2>
                      <p className="text-sm text-bk-text-secondary max-w-md mx-auto">
                        Your portfolio contains all of your work brands will see. Make sure you include a variety
                        of video &amp; photo examples that best highlight your skills as a creator.
                      </p>
                    </div>
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleFiles(e.dataTransfer.files);
                      }}
                      className="flex flex-col items-center gap-2 py-6"
                    >
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center gap-1.5 bg-bk-purple text-white font-semibold px-4 py-2.5 rounded-xl text-sm hover:bg-bk-purple-dark transition-colors disabled:opacity-50"
                      >
                        <UploadCloud size={15} /> {uploading ? "Uploading..." : "Upload Content"}
                      </button>
                      <p className="text-xs text-bk-text-muted">or drag and drop files here</p>
                      <button
                        onClick={() => setShowAiModal(true)}
                        className="flex items-center gap-1.5 bg-bk-purple text-white font-semibold px-4 py-2.5 rounded-xl text-sm hover:bg-bk-purple-dark transition-colors mt-1"
                      >
                        <span>✦</span> Create Portfolio AI
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-bold text-bk-text-primary mr-auto">Portfolio</h2>
                      <button
                        onClick={handleResetPortfolio}
                        disabled={resetting}
                        title="Delete everything and start over"
                        className="flex items-center gap-1.5 border border-bk-border text-red-600 font-medium px-3 py-2 rounded-xl text-sm hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={14} /> {resetting ? "Resetting..." : "Delete Portfolio"}
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center gap-1.5 border border-bk-border text-bk-text-primary font-medium px-3 py-2 rounded-xl text-sm hover:bg-bk-bg-light transition-colors disabled:opacity-50"
                      >
                        <UploadCloud size={14} /> {uploading ? "Uploading..." : "Upload Content"}
                      </button>
                      <button
                        onClick={() => setShowAiModal(true)}
                        className="flex items-center gap-1.5 bg-bk-purple text-white font-semibold px-3 py-2 rounded-xl text-sm hover:bg-bk-purple-dark transition-colors"
                      >
                        <span>✦</span> Regenerate Portfolio AI
                      </button>
                    </div>

                    <PortfolioTypeSection
                      title="Videos"
                      emoji="🎥"
                      emptyText="Your portfolio contains all of your work brands will see. Make sure you include a variety of video examples that best highlight your skills as a creator."
                      entries={filteredVideoEntries}
                      hasAnyOfType={videoEntries.length > 0}
                      onOpen={setLightboxIndex}
                      onDelete={handleDeletePost}
                      onEdit={handleEditPost}
                      onDragStart={setDragIndex}
                      onDrop={handleDrop}
                      onDragEnd={() => setDragIndex(null)}
                    />
                    <PortfolioTypeSection
                      title="Photos"
                      emoji="📷"
                      emptyText="Your portfolio contains all of your work brands will see. Make sure you include a variety of photo examples that best highlight your skills as a creator."
                      entries={filteredPhotoEntries}
                      hasAnyOfType={photoEntries.length > 0}
                      onOpen={setLightboxIndex}
                      onDelete={handleDeletePost}
                      onEdit={handleEditPost}
                      onDragStart={setDragIndex}
                      onDrop={handleDrop}
                      onDragEnd={() => setDragIndex(null)}
                    />
                  </>
                )}
              </div>
            </div>
          )}
          {activeTab === "About" && <AboutTab about={about} onSave={handleSaveAbout} />}
          {activeTab !== "Portfolio" && activeTab !== "About" && <ComingSoonTab label={activeTab} />}
        </div>

        <RightPanel result={result} />
      </div>

      {lightboxIndex !== null && allPosts[lightboxIndex] && (
        <PortfolioMediaLightbox
          post={allPosts[lightboxIndex].post}
          onClose={() => setLightboxIndex(null)}
          onNext={() => setLightboxIndex((i) => (i === null ? null : (i + 1) % allPosts.length))}
          onPrev={() => setLightboxIndex((i) => (i === null ? null : (i - 1 + allPosts.length) % allPosts.length))}
        />
      )}

      {showAiModal && <URLModal onClose={() => setShowAiModal(false)} onSubmit={handleGenerateAi} />}

      {editingProfile && (
        <EditProfileModal
          portfolioId={result?.id ?? null}
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

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Home() {
  const [mainView, setMainView] = useState<MainView>("creators");
  const [creatorsView, setCreatorsView] = useState<"list" | "detail">("list");
  const [pageState, setPageState] = useState<PageState>("empty");
  const [initializing, setInitializing] = useState(true);
  const [completedSteps, setCompletedSteps] = useState(0);
  const [loadingSteps, setLoadingSteps] = useState<string[]>(BASE_LOADING_STEPS);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [activePortfolioId, setActivePortfolioId] = useState<string | null>(null);
  const [modalTargetId, setModalTargetId] = useState<string | null>(null);
  const [creators, setCreators] = useState<PortfolioSummary[]>([]);
  const [loadingCreators, setLoadingCreators] = useState(false);
  const [about, setAbout] = useState<PortfolioAbout | null>(null);
  const [profileOverrides, setProfileOverrides] = useState<ProfileOverrides | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("Portfolio");
  const [editMode, setEditMode] = useState(false);
  const stepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/portfolio")
      .then((res) => res.json())
      .then((data) => {
        if (data?.profiles) {
          setResult({ id: data.id, isSaved: data.isSaved, profiles: data.profiles, aiAnalysis: data.aiAnalysis, generatedAt: data.generatedAt });
          setAbout(data.about ?? null);
          setProfileOverrides(data.profileOverrides ?? null);
          setActivePortfolioId(data.id);
          setPageState("result");
          setCreatorsView("detail");
        }
      })
      .catch(() => {})
      .finally(() => setInitializing(false));
  }, []);

  const loadCreators = () => {
    setLoadingCreators(true);
    fetch("/api/portfolios")
      .then((res) => res.json())
      .then((data) => setCreators(data.portfolios ?? []))
      .catch(() => {})
      .finally(() => setLoadingCreators(false));
  };

  useEffect(() => {
    if (creatorsView === "list") loadCreators();
  }, [creatorsView]);

  const handleBackToList = () => setCreatorsView("list");

  const handleNavigate = (target: MainView) => {
    setMainView(target);
    if (target === "creators") handleBackToList();
  };

  const handleSelectCreator = async (id: string) => {
    setInitializing(true);
    setCreatorsView("detail");
    try {
      const res = await fetch(`/api/portfolio?id=${id}`);
      const data = await res.json();
      if (data?.profiles) {
        setResult({ id: data.id, isSaved: data.isSaved, profiles: data.profiles, aiAnalysis: data.aiAnalysis, generatedAt: data.generatedAt });
        setAbout(data.about ?? null);
        setProfileOverrides(data.profileOverrides ?? null);
        setActivePortfolioId(data.id);
        setActiveTab("Portfolio");
        setPageState("result");
      }
    } catch {
      setError("Couldn't load that creator's portfolio. Please try again.");
    } finally {
      setInitializing(false);
    }
  };

  const startStepAnimation = (stepCount: number) => {
    setCompletedSteps(0);
    const DELAYS = [3000, 5000, 8000, 12000, 18000, 25000, 35000, 45000];
    let step = 0;
    const tick = () => {
      step++;
      setCompletedSteps(step);
      if (step < stepCount - 1) {
        stepIntervalRef.current = setTimeout(tick, DELAYS[step] ?? 5000);
      }
    };
    stepIntervalRef.current = setTimeout(tick, DELAYS[0]);
  };

  const stopStepAnimation = () => {
    if (stepIntervalRef.current) clearTimeout(stepIntervalRef.current);
  };

  const handleGenerate = async (igUrl: string, ttUrl: string, ytUrl: string) => {
    const steps = buildLoadingSteps(igUrl, ttUrl, ytUrl);
    setLoadingSteps(steps);
    setPageState("loading");
    setCreatorsView("detail");
    setError(null);
    setEditMode(false);
    startStepAnimation(steps.length);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instagramUrl: igUrl,
          tiktokUrl: ttUrl,
          youtubeUrl: ytUrl || undefined,
          portfolioId: modalTargetId ?? undefined,
        }),
      });
      const data = await res.json();
      stopStepAnimation();

      if (res.ok) {
        setCompletedSteps(steps.length);
        setTimeout(() => {
          setResult(data);
          setAbout(data.about ?? null);
          setProfileOverrides(data.profileOverrides ?? null);
          setActivePortfolioId(data.id);
          setActiveTab("Portfolio");
          setPageState("result");
        }, 800);
      } else {
        setError(data.error ?? "Error generating portfolio");
        setPageState("empty");
        setCreatorsView("list");
      }
    } catch {
      stopStepAnimation();
      setError("Connection error. Please try again.");
      setPageState("empty");
      setCreatorsView("list");
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
        setError("Couldn't delete the photo. Please try again.");
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
        setError("Couldn't save the new order. Please try again.");
      });
  };

  const handleSaveAbout = async (updated: PortfolioAbout) => {
    if (!activePortfolioId) return;
    const res = await fetch("/api/portfolio/about", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...updated, portfolioId: activePortfolioId }),
    });
    if (!res.ok) {
      setError("Couldn't save the information. Please try again.");
      throw new Error("save about failed");
    }
    const saved = await res.json();
    setAbout(saved);
  };

  const handleSaveProfile = async (updated: ProfileOverrides) => {
    if (!activePortfolioId) return;
    const res = await fetch("/api/portfolio/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...updated, portfolioId: activePortfolioId }),
    });
    if (!res.ok) {
      setError("Couldn't save the profile. Please try again.");
      throw new Error("save profile failed");
    }
    const saved = await res.json();
    setProfileOverrides(saved);
  };

  const handleSaveSummary = async (summary: string) => {
    if (!result || !activePortfolioId) return;
    const snapshot = result;
    setResult({ ...result, aiAnalysis: { ...result.aiAnalysis, summary } });

    const res = await fetch("/api/portfolio/ai-summary", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary, portfolioId: activePortfolioId }),
    });
    if (!res.ok) {
      setResult(snapshot);
      setError("Couldn't save the summary. Please try again.");
      throw new Error("save summary failed");
    }
  };

  const handleSaveCreator = async () => {
    if (!activePortfolioId) return;
    const res = await fetch("/api/portfolio/save", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ portfolioId: activePortfolioId }),
    });
    if (!res.ok) {
      setError("Couldn't save this creator. Please try again.");
      throw new Error("save portfolio failed");
    }
    const savedName = result?.profiles[0]?.displayName || "Profile";
    setResult(null);
    setAbout(null);
    setProfileOverrides(null);
    setActivePortfolioId(null);
    setPageState("empty");
    setCreatorsView("list");
    setSuccessMessage(`${savedName} saved to Creators Portfolio AI.`);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleAddTikTok = async (ttUrl: string) => {
    if (!result) return;
    setError(null);
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tiktokUrl: ttUrl, portfolioId: result.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Couldn't add TikTok. Please try again.");
      return;
    }
    setResult(data);
    setAbout(data.about ?? null);
    setProfileOverrides(data.profileOverrides ?? null);
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
  const showRightPanel = pageState !== "loading" && creatorsView === "detail";

  const openNewCreatorModal = () => {
    setModalTargetId(null);
    setPageState("modal");
  };

  return (
    <div className="flex h-screen bg-bk-bg-light overflow-hidden">
      <Sidebar activeTarget={mainView} onNavigate={handleNavigate} />

      {mainView === "portfolio" ? (
        <OwnPortfolioView />
      ) : mainView === "metrics" ? (
        <MetricsView />
      ) : creatorsView === "list" ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          {successMessage && (
            <div className="mx-8 mt-4 flex items-center gap-2 bg-bk-success-light border border-bk-success/20 rounded-xl px-4 py-3">
              <Check size={14} className="text-bk-success" />
              <p className="text-sm text-green-800">{successMessage}</p>
              <button onClick={() => setSuccessMessage(null)} className="ml-auto"><X size={14} className="text-green-700" /></button>
            </div>
          )}
          {error && (
            <div className="mx-8 mt-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <X size={14} className="text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
              <button onClick={() => setError(null)} className="ml-auto"><X size={14} className="text-red-400" /></button>
            </div>
          )}
          <CreatorsView
            creators={creators}
            loading={loadingCreators}
            onSelect={handleSelectCreator}
            onCreateNew={openNewCreatorModal}
          />
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          <button
            onClick={handleBackToList}
            className="flex items-center gap-1.5 text-sm text-bk-text-secondary hover:text-bk-text-primary px-8 pt-4 transition-colors w-fit"
          >
            ← Back to Creators
          </button>
          <ProfileHeader
            profile={firstProfile}
            profiles={result?.profiles ?? []}
            overrides={profileOverrides}
            portfolioId={activePortfolioId}
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
              {pageState === "loading" && <LoadingState completedSteps={completedSteps} steps={loadingSteps} />}
              {pageState === "result" && result && activeTab === "Portfolio" && (
                <PortfolioResult
                  result={result}
                  editMode={editMode}
                  onToggleEdit={() => setEditMode((v) => !v)}
                  onDeletePost={handleDeletePost}
                  onReorder={handleReorder}
                  onSaveSummary={handleSaveSummary}
                  onSaveClick={handleSaveCreator}
                  onAddTikTok={handleAddTikTok}
                  onRegenerateClick={() => {
                    setModalTargetId(activePortfolioId);
                    setPageState("modal");
                  }}
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
      )}

      {mainView === "creators" && pageState === "modal" && (
        <URLModal
          onClose={() => setPageState(result ? "result" : "empty")}
          onSubmit={handleGenerate}
          initialIgUrl={
            modalTargetId && result?.profiles.find((p) => p.platform === "instagram")?.username
              ? `https://instagram.com/${result!.profiles.find((p) => p.platform === "instagram")!.username}`
              : ""
          }
          initialTtUrl={
            modalTargetId && result?.profiles.find((p) => p.platform === "tiktok")?.username
              ? `https://www.tiktok.com/@${result!.profiles.find((p) => p.platform === "tiktok")!.username}`
              : ""
          }
        />
      )}

      {mainView === "creators" && editingProfile && (
        <EditProfileModal
          portfolioId={activePortfolioId}
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
