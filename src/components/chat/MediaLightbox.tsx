"use client";

import { useEffect } from "react";
import Image from "next/image";
import { X, Play } from "lucide-react";

interface MediaLightboxProps {
  media: { type: "image" | "video"; url: string } | null;
  onClose: () => void;
}

export default function MediaLightbox({ media, onClose }: MediaLightboxProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (media) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [media, onClose]);

  if (!media) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl max-h-[85vh] w-full h-full flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white transition rounded-full hover:bg-white/10"
          title="Close (Esc)"
        >
          <X size={26} />
        </button>

        {media.type === "video" ? (
          <div className="w-full max-w-3xl rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10">
            <video
              src={media.url}
              controls
              autoPlay
              className="w-full max-h-[75vh] object-contain"
            />
          </div>
        ) : (
          <div className="relative w-full h-full max-h-[78vh]">
            <Image
              src={media.url}
              alt="Enlarged media"
              fill
              sizes="(max-width: 1200px) 95vw, 1000px"
              className="object-contain rounded-xl"
            />
          </div>
        )}
      </div>
    </div>
  );
}
