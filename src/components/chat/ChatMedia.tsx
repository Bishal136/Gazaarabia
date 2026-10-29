"use client";

import { useState } from "react";
import { Play, Maximize2, VideoOff, ImageOff } from "lucide-react";

interface ChatImageProps {
  url: string;
  alt?: string;
  onClick?: () => void;
  isSingle?: boolean;
}

export function ChatImage({ url, alt = "Photo", onClick, isSingle = true }: ChatImageProps) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="w-28 h-28 rounded-2xl bg-stone-100 border border-stone-200 flex flex-col items-center justify-center text-stone-400 gap-1 p-2">
        <ImageOff size={18} />
        <span className="text-[10px] text-center font-medium">Image unavailable</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative block overflow-hidden bg-stone-100 border border-stone-200/80 hover:border-[#b08a78] transition-all shadow-xs cursor-pointer text-left ${
        isSingle
          ? "w-full rounded-2xl"
          : "w-24 h-24 sm:w-28 sm:h-28 rounded-xl shrink-0"
      }`}
    >
      <img
        src={url}
        alt={alt}
        onError={() => setError(true)}
        className={`block w-full object-cover group-hover:scale-105 transition-transform duration-300 ${
          isSingle
            ? "max-h-64 sm:max-h-72 object-cover rounded-2xl"
            : "h-full w-full object-cover"
        }`}
      />
      <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
        <div className="p-2 rounded-full bg-black/60 backdrop-blur-xs shadow-sm">
          <Maximize2 size={16} />
        </div>
      </div>
    </button>
  );
}

interface ChatVideoPlayerProps {
  url: string;
}

export function ChatVideoPlayer({ url }: ChatVideoPlayerProps) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-stone-500 text-xs flex items-center gap-3 max-w-sm shadow-2xs">
        <div className="w-9 h-9 rounded-xl bg-stone-200 flex items-center justify-center text-stone-500 shrink-0">
          <VideoOff size={16} />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-stone-800 text-xs">Video unavailable</p>
          <p className="text-[11px] text-stone-400 truncate">
            The video file could not be played
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl overflow-hidden bg-black w-full max-w-[340px] shadow-sm border border-black/10">
      <video
        src={url}
        controls
        preload="metadata"
        playsInline
        onError={() => setError(true)}
        className="w-full max-h-56 sm:max-h-64 object-contain bg-black"
      >
        <p className="p-2 text-xs text-white">Your browser does not support the video tag.</p>
      </video>
    </div>
  );
}
