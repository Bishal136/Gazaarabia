"use client";

import { useRef, useState } from "react";
import { Upload, Trash2, PlayCircle, Link as LinkIcon, ExternalLink, Video } from "lucide-react";
import { uploadService } from "@/lib/services/uploadService";

interface VariantVideoUploaderProps {
  videoUrl: string;
  videoThumbnail?: string;
  onVideoChange: (url: string) => void;
  onVideoThumbnailChange?: (thumbnail: string) => void;
  onError: (message: string) => void;
  variantLabel?: string;
}

export const VariantVideoUploader = ({
  videoUrl,
  videoThumbnail,
  onVideoChange,
  onVideoThumbnailChange,
  onError,
  variantLabel = "Product",
}: VariantVideoUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<"upload" | "link">("upload");
  const [inputUrl, setInputUrl] = useState("");

  const MAX_VIDEO_SIZE = 1024 * 1024 * 1024; // 1GB

  // Helper to convert YouTube/Vimeo URLs to embeddable player URLs
  const getEmbedVideoUrl = (url: string) => {
    if (!url) return null;
    try {
      if (url.includes("youtube.com/watch?v=")) {
        const videoId = url.split("watch?v=")[1]?.split("&")[0];
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
      }
      if (url.includes("youtu.be/")) {
        const videoId = url.split("youtu.be/")[1]?.split("?")[0];
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
      }
      if (url.includes("youtube.com/embed/")) {
        return url;
      }
      if (url.includes("vimeo.com/")) {
        const videoId = url.split("vimeo.com/")[1]?.split("?")[0];
        return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
      }
    } catch {
      return null;
    }
    return null;
  };

  const isEmbeddable = !!getEmbedVideoUrl(videoUrl);
  const embedUrl = getEmbedVideoUrl(videoUrl);

  const handleFileChange = async (files: FileList | null) => {
    if (!files) return;
    const file = files[0];
    if (!file) return;

    if (file.size > MAX_VIDEO_SIZE) {
      onError("Video must be under 1GB");
      return;
    }

    try {
      setIsUploading(true);
      const url = await uploadService.uploadVideo(file, "variant-videos");
      onVideoChange(url);
    } catch (error: any) {
      onError(error?.message || "Video upload failed. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleApplyLink = () => {
    const trimmed = inputUrl.trim();
    if (!trimmed) {
      onError("Please enter a valid video URL");
      return;
    }
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://") && !trimmed.startsWith("/")) {
      onError("URL must start with http:// or https://");
      return;
    }
    onVideoChange(trimmed);
    setInputUrl("");
  };

  const handleRemove = () => {
    onVideoChange("");
    setInputUrl("");
    if (onVideoThumbnailChange) onVideoThumbnailChange("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-gray-700">
          {variantLabel} Video <span className="text-gray-500 font-normal">(Optional)</span>
        </label>
        {videoUrl && (
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
            {videoUrl.startsWith("/uploads") ? "Uploaded File (1GB Limit)" : "Video Link Active"}
          </span>
        )}
      </div>

      {videoUrl ? (
        <div className="space-y-3">
          <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-900 w-full max-w-md shadow-sm group">
            {isEmbeddable && embedUrl ? (
              <iframe
                src={embedUrl}
                className="w-full aspect-video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Video preview"
              />
            ) : (
              <video
                src={videoUrl}
                poster={videoThumbnail}
                className="w-full aspect-video object-cover"
                controls
              />
            )}
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition shadow-lg z-10"
              title="Delete video"
            >
              <Trash2 size={16} />
            </button>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 max-w-md bg-gray-50 p-2.5 rounded-lg border border-gray-200">
            <span className="truncate pr-2 font-mono">
              {videoUrl}
            </span>
            <button
              type="button"
              onClick={handleRemove}
              className="text-red-600 hover:text-red-700 font-medium shrink-0 ml-2"
            >
              Change Video
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 max-w-md">
          {/* Tab Selector */}
          <div className="inline-flex p-1 bg-gray-100 rounded-lg text-xs font-medium text-gray-600 border border-gray-200">
            <button
              type="button"
              onClick={() => setActiveTab("upload")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                activeTab === "upload"
                  ? "bg-white text-gray-900 shadow-sm font-semibold"
                  : "hover:text-gray-900"
              }`}
            >
              <Upload size={14} />
              Upload Video File
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("link")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                activeTab === "link"
                  ? "bg-white text-gray-900 shadow-sm font-semibold"
                  : "hover:text-gray-900"
              }`}
            >
              <LinkIcon size={14} />
              Video Link / URL
            </button>
          </div>

          {activeTab === "upload" ? (
            <div
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                isUploading
                  ? "bg-blue-50/50 border-blue-300 pointer-events-none"
                  : "border-gray-300 hover:border-blue-500 hover:bg-blue-50/30"
              }`}
            >
              <PlayCircle className="mx-auto mb-2 text-blue-500" size={36} />
              <p className="text-sm font-medium text-gray-800">
                Click or drag & drop video to upload
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Supported formats: MP4, WebM, MOV, OGG (Max 1GB)
              </p>
              {isUploading && (
                <div className="mt-3 flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-xs font-medium text-blue-600">
                    Uploading video... (up to 1GB allowed)
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 space-y-3">
              <label className="block text-xs font-medium text-gray-700">
                Paste Video Link (YouTube, Vimeo, CDN, or MP4 URL)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="absolute left-3 top-2.5 text-gray-400" size={16} />
                  <input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=... or direct MP4 link"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleApplyLink();
                      }
                    }}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyLink}
                  className="px-4 py-2 bg-[var(--brand-primary)] text-white text-sm font-medium rounded-lg hover:bg-[var(--brand-secondary)] transition shrink-0"
                >
                  Apply Link
                </button>
              </div>
              <p className="text-[11px] text-gray-500">
                You can paste YouTube video links, Vimeo URLs, or any direct HTTPS video URL.
              </p>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/ogg,video/x-matroska"
        onChange={(e) => handleFileChange(e.target.files)}
        className="hidden"
      />
    </div>
  );
};
