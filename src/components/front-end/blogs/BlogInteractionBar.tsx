"use client";

import React, { useState, useEffect } from "react";
import {
  Share2,
  Copy,
  Check,
  Bookmark,
  MessageCircle,
} from "lucide-react";
import { FaWhatsapp, FaTwitter, FaFacebookF } from "react-icons/fa";

interface BlogInteractionBarProps {
  title: string;
  url: string;
}

export function ReadingProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const currentProgress = (window.scrollY / totalHeight) * 100;
        setProgress(Math.min(100, Math.max(0, currentProgress)));
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className="fixed top-0 left-0 h-1 bg-gradient-to-r from-rose-600 via-amber-500 to-emerald-600 z-[110] transition-all duration-150"
      style={{ width: `${progress}%` }}
    />
  );
}

export function BlogShareButtons({ title, url }: BlogInteractionBarProps) {
  const [copied, setCopied] = useState(false);

  const encodedTitle = encodeURIComponent(title);
  const encodedUrl = encodeURIComponent(url);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-semibold tracking-widest uppercase text-slate-400 mr-1 hidden sm:inline-flex items-center gap-1">
        <Share2 size={12} /> Share
      </span>

      {/* WhatsApp */}
      <a
        href={`https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-8 h-8 rounded-full border border-slate-200 hover:border-emerald-600 hover:text-emerald-600 text-slate-600 bg-white flex items-center justify-center transition-all duration-200 shadow-2xs hover:scale-105"
        title="Share on WhatsApp"
        aria-label="Share on WhatsApp"
      >
        <FaWhatsapp size={13} />
      </a>

      {/* X / Twitter */}
      <a
        href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-8 h-8 rounded-full border border-slate-200 hover:border-slate-900 hover:text-slate-950 text-slate-600 bg-white flex items-center justify-center transition-all duration-200 shadow-2xs hover:scale-105"
        title="Share on X (Twitter)"
        aria-label="Share on X"
      >
        <FaTwitter size={12} />
      </a>

      {/* Facebook */}
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-8 h-8 rounded-full border border-slate-200 hover:border-blue-600 hover:text-blue-600 text-slate-600 bg-white flex items-center justify-center transition-all duration-200 shadow-2xs hover:scale-105"
        title="Share on Facebook"
        aria-label="Share on Facebook"
      >
        <FaFacebookF size={11} />
      </a>

      {/* Copy Link */}
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 hover:border-slate-800 text-slate-700 bg-white text-xs font-medium transition-all duration-200 cursor-pointer shadow-2xs"
        title="Copy article link"
      >
        {copied ? (
          <>
            <Check size={12} className="text-emerald-600" />
            <span className="text-emerald-700 font-semibold text-[11px]">Copied</span>
          </>
        ) : (
          <>
            <Copy size={12} className="text-slate-400" />
            <span className="text-[11px]">Copy Link</span>
          </>
        )}
      </button>
    </div>
  );
}
