/**
 * Product Video Helper Utilities
 *
 * Extracts, validates, and normalizes video URLs for product cards across
 * the homepage and product listing pages to enable hover-to-play preview functionality.
 */

/**
 * Checks if a URL points directly to an HTML5-compatible video file
 * or a local video upload path.
 */
export function isDirectVideoFile(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  const cleanUrl = url.trim().toLowerCase();

  // Known video file extensions
  if (/\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(cleanUrl)) {
    return true;
  }

  // Uploaded video paths in the application
  if (
    cleanUrl.includes("/uploads/videos/") ||
    cleanUrl.includes("/uploads/variant-videos/") ||
    cleanUrl.includes("/variant-videos/") ||
    cleanUrl.includes("/videos/")
  ) {
    return true;
  }

  return false;
}

/**
 * Converts external video URLs (YouTube, Vimeo) into autoplaying,
 * muted, looped, controls-free embed links suitable for card hover previews.
 */
export function getHoverEmbedVideoUrl(url?: string | null): string | null {
  if (!url || typeof url !== "string") return null;
  const cleanUrl = url.trim();

  try {
    // 1. YouTube Watch URLs (e.g., https://www.youtube.com/watch?v=VIDEO_ID)
    if (cleanUrl.includes("youtube.com/watch")) {
      const parsed = new URL(cleanUrl);
      const videoId = parsed.searchParams.get("v");
      if (videoId) {
        return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&playsinline=1&modestbranding=1&rel=0&showinfo=0&disablekb=1`;
      }
    }

    // 2. YouTube Short URLs (e.g., https://youtu.be/VIDEO_ID?si=...)
    if (cleanUrl.includes("youtu.be/")) {
      const match = cleanUrl.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
      const videoId = match ? match[1] : null;
      if (videoId) {
        return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&playsinline=1&modestbranding=1&rel=0&showinfo=0&disablekb=1`;
      }
    }

    // 3. YouTube Embed URLs (e.g., https://www.youtube.com/embed/VIDEO_ID)
    if (cleanUrl.includes("youtube.com/embed/")) {
      const match = cleanUrl.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
      const videoId = match ? match[1] : null;
      if (videoId) {
        return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&playsinline=1&modestbranding=1&rel=0&showinfo=0&disablekb=1`;
      }
    }

    // 4. Vimeo URLs (e.g., https://vimeo.com/VIDEO_ID)
    if (cleanUrl.includes("vimeo.com/")) {
      const match = cleanUrl.match(/vimeo\.com\/(\d+)/);
      const videoId = match ? match[1] : null;
      if (videoId) {
        return `https://player.vimeo.com/video/${videoId}?autoplay=1&muted=1&loop=1&controls=0&background=1`;
      }
    }
  } catch (err) {
    console.warn("Failed to parse embed video url:", url, err);
  }

  return null;
}

/**
 * Extracts a playable video URL from a product object.
 * Searches across:
 * 1. product.videoUrl (direct on product model)
 * 2. product.productvariant[].videoUrl (variants with attached video)
 * 3. product.productimage[].url (if any image entry is actually an MP4/video file)
 */
export function extractProductVideoUrl(product: any): string | null {
  if (!product || typeof product !== "object") return null;

  // 1. Direct videoUrl on product
  if (typeof product.videoUrl === "string" && product.videoUrl.trim() !== "") {
    return product.videoUrl.trim();
  }

  // 2. Check productvariant array
  if (Array.isArray(product.productvariant)) {
    for (const variant of product.productvariant) {
      if (typeof variant?.videoUrl === "string" && variant.videoUrl.trim() !== "") {
        return variant.videoUrl.trim();
      }
    }
  }

  // 3. Check productimage array for any uploaded video files
  if (Array.isArray(product.productimage)) {
    for (const img of product.productimage) {
      const u = typeof img === "string" ? img : img?.url;
      if (u && typeof u === "string" && isDirectVideoFile(u)) {
        return u.trim();
      }
    }
  }

  // 4. Fallback check for single 'video' property
  if (typeof product.video === "string" && product.video.trim() !== "") {
    return product.video.trim();
  }

  return null;
}
