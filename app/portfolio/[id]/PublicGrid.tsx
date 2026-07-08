"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Heart, MessageCircle, Eye, Play, X } from "lucide-react";
import { FaInstagram, FaTiktok } from "react-icons/fa6";
import type { CreatorPost, Platform } from "@/lib/types";

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

type Item = { post: CreatorPost; platform: Platform };

export function PublicGrid({ items }: { items: Item[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const active = lightboxIndex !== null ? items[lightboxIndex] : null;

  const close = () => setLightboxIndex(null);
  const next = () => setLightboxIndex((i) => (i === null ? null : (i + 1) % items.length));
  const prev = () => setLightboxIndex((i) => (i === null ? null : (i - 1 + items.length) % items.length));

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightboxIndex, items.length]);

  if (items.length === 0) {
    return <p className="text-sm text-bk-text-secondary py-10 text-center">No content yet.</p>;
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {items.map(({ post, platform }, i) => {
          const isIG = platform === "instagram";
          return (
            <button
              key={post.id ?? i}
              onClick={() => setLightboxIndex(i)}
              className="text-left bg-bk-bg border border-bk-border rounded-xl overflow-hidden hover:shadow-md transition-shadow group"
            >
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
            </button>
          );
        })}
      </div>

      {active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80" onClick={close} />

          <button
            onClick={close}
            className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X size={18} />
          </button>
          <button
            onClick={prev}
            className="absolute left-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            aria-label="Previous"
          >
            ‹
          </button>
          <button
            onClick={next}
            className="absolute right-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            aria-label="Next"
          >
            ›
          </button>

          <div className="relative bg-bk-bg rounded-2xl overflow-hidden shadow-2xl w-[420px] max-h-[85vh] flex flex-col">
            <div className="relative aspect-square bg-black flex-shrink-0">
              {active.post.isVideo && active.post.videoUrl ? (
                <video
                  src={active.post.videoUrl}
                  poster={active.post.thumbnailUrl ?? undefined}
                  controls
                  autoPlay
                  className="absolute inset-0 w-full h-full object-contain"
                />
              ) : (
                <>
                  {active.post.thumbnailUrl ? (
                    <Image
                      src={active.post.thumbnailUrl}
                      alt={active.post.caption.slice(0, 60) || "Post"}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-bk-border-light" />
                  )}
                </>
              )}
            </div>
            <div className="p-4 space-y-2 overflow-y-auto">
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-white text-xs font-semibold ${
                  active.platform === "instagram" ? "bg-gradient-to-r from-purple-500 to-pink-500" : "bg-black"
                }`}
              >
                {active.platform === "instagram" ? (active.post.isVideo ? "Reel" : "Instagram") : "TikTok"}
              </span>
              <p className="text-sm text-bk-text-primary leading-relaxed">{active.post.caption || "—"}</p>
              <div className="flex items-center gap-3 text-bk-text-muted text-xs pt-1">
                <span className="flex items-center gap-1"><Heart size={12} /> {fmt(active.post.likesCount)}</span>
                <span className="flex items-center gap-1"><MessageCircle size={12} /> {fmt(active.post.commentsCount)}</span>
                {active.post.viewsCount !== undefined && active.post.viewsCount > 0 && (
                  <span className="flex items-center gap-1"><Eye size={12} /> {fmt(active.post.viewsCount)}</span>
                )}
              </div>
              {active.post.postUrl && (
                <a
                  href={active.post.postUrl}
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
      )}
    </>
  );
}

export function PlatformIcon({ platform }: { platform: Platform }) {
  if (platform === "instagram") return <FaInstagram size={14} className="text-[#E1306C]" />;
  if (platform === "tiktok") return <FaTiktok size={14} className="text-bk-text-primary" />;
  return null;
}
