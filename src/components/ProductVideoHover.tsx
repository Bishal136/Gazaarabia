"use client";

import React, { useEffect, useRef, useState } from "react";
import { isDirectVideoFile, getHoverEmbedVideoUrl } from "@/lib/utils/productVideo";

interface ProductVideoHoverProps {
  /** Video URL from product or variant (can be MP4 file or YouTube/Vimeo link) */
  videoUrl?: string | null;
  /** Whether the parent product card is currently being hovered */
  isHovered: boolean;
  /** Optional custom CSS classes for the container */
  className?: string;
}

/**
 * ProductVideoHover
 *
 * Smoothly plays a product preview video when a user hovers over a product card.
 * Cleanly renders only the video itself without any "Video" or "PLAYING" text badges.
 *
 * Supports:
 * - Direct MP4 / WebM video files via HTML5 <video> (muted, looping, playsInline)
 * - YouTube and Vimeo URLs via autoplaying, muted embed iframes
 *
 * Features:
 * - Zero network overhead before hover (preload="none")
 * - Safe play() promise handling to prevent AbortError
 * - Fallback to hiding gracefully on media error
 * - pointer-events-none so clicking anywhere on the card opens the product details page
 */
export default function ProductVideoHover({
  videoUrl,
  isHovered,
  className = "",
}: ProductVideoHoverProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // If no video URL or an error occurred while loading, render nothing
  if (!videoUrl || hasError) {
    return null;
  }

  const isDirect = isDirectVideoFile(videoUrl);
  const embedUrl = !isDirect ? getHoverEmbedVideoUrl(videoUrl) : null;

  // Manage playback for direct HTML5 video
  useEffect(() => {
    if (!isDirect || !videoRef.current) return;

    if (isHovered) {
      // Begin playback on hover
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => {
            // Autoplay might be temporarily blocked or aborted if user rapidly leaves
            setIsPlaying(false);
          });
      }
    } else {
      // Pause and rewind to start when mouse leaves
      try {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      } catch {
        // Ignored
      }
      setIsPlaying(false);
    }
  }, [isHovered, isDirect]);

  return (
    <>
      {/* --- Direct HTML5 Video Player --- */}
      {isDirect && (
        <video
          ref={videoRef}
          src={videoUrl}
          muted
          loop
          playsInline
          preload="none"
          onError={() => setHasError(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 pointer-events-none ${
            isHovered && isPlaying
              ? "opacity-100 z-10"
              : "opacity-0 z-0"
          } ${className}`}
        />
      )}

      {/* --- YouTube / Vimeo Embedded Video Player --- */}
      {/* Only rendered into DOM during active hover to save network bandwidth */}
      {!isDirect && embedUrl && isHovered && (
        <div
          className={`absolute inset-0 w-full h-full overflow-hidden z-10 pointer-events-none bg-black transition-opacity duration-300 ${className}`}
        >
          <iframe
            src={embedUrl}
            className="w-full h-full scale-[1.35] pointer-events-none"
            allow="autoplay; encrypted-media; picture-in-picture"
            tabIndex={-1}
            title="Product Video Preview"
          />
        </div>
      )}
    </>
  );
}
