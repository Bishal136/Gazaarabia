"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import {
  Star,
  X,
  Upload,
  Image as ImageIcon,
  Video as VideoIcon,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { reviewService } from "@/lib/services/front-end/reviewService";
import { uploadService } from "@/lib/services/uploadService";

export interface ReviewModalProps {
  // Common product details
  productId: number;
  productTitle?: string;
  productImage?: string;
  variantDetails?: {
    colorName?: string | null;
    sizeName?: string | null;
    sku?: string | null;
  } | null;

  // Create Mode props
  orderItemId?: number;
  variantId?: number | null;

  // Edit Mode props
  isEdit?: boolean;
  reviewId?: number;
  initialRating?: number;
  initialComment?: string;
  initialImages?: string[];
  initialVideo?: string | null;

  // Auth & Controls
  token: string;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ImageItem {
  id: string;
  file?: File;
  previewUrl: string;
  uploadedUrl?: string;
}

const RATING_LABELS: Record<number, string> = {
  1: "1 - Poor",
  2: "2 - Fair",
  3: "3 - Good",
  4: "4 - Very Good",
  5: "5 - Excellent!",
};

export default function ReviewModal({
  productId,
  productTitle = "Product",
  productImage = "/placeholder.png",
  variantDetails,
  orderItemId,
  variantId = null,
  isEdit = false,
  reviewId,
  initialRating = 5,
  initialComment = "",
  initialImages = [],
  initialVideo = null,
  token,
  onClose,
  onSuccess,
}: ReviewModalProps) {
  const [rating, setRating] = useState<number>(initialRating || 5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>(initialComment || "");
  const [loading, setLoading] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Images state (existing + new)
  const [images, setImages] = useState<ImageItem[]>(() =>
    (initialImages || []).map((url, idx) => ({
      id: `existing-img-${idx}-${Date.now()}`,
      previewUrl: url,
      uploadedUrl: url,
    }))
  );

  // Video state (existing or new)
  const [video, setVideo] = useState<{
    file?: File;
    previewUrl?: string;
    uploadedUrl?: string;
  } | null>(() =>
    initialVideo
      ? {
          previewUrl: initialVideo,
          uploadedUrl: initialVideo,
        }
      : null
  );

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Handle Photo selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);

    const validFiles: ImageItem[] = [];
    for (const file of selectedFiles) {
      if (!file.type.startsWith("image/")) {
        setErrorMessage("Only image files (.jpg, .png, .webp) are allowed.");
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage(`Image ${file.name} is larger than 10MB.`);
        continue;
      }
      validFiles.push({
        id: `new-img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (images.length + validFiles.length > 6) {
      setErrorMessage("You can upload up to 6 photos in total.");
      return;
    }

    setImages((prev) => [...prev, ...validFiles]);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((item) => item.id !== id));
  };

  // Handle Video selection
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    const allowedTypes = ["video/mp4", "video/webm", "video/quicktime", "video/ogg"];
    if (!allowedTypes.includes(file.type)) {
      setErrorMessage("Only MP4, WEBM, or MOV videos are supported.");
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setErrorMessage("Review video must be under 100MB.");
      return;
    }

    setVideo({
      file,
      previewUrl: URL.createObjectURL(file),
    });
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const removeVideo = () => {
    setVideo(null);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (rating === 0) {
      setErrorMessage("Please select a rating between 1 and 5 stars.");
      return;
    }

    try {
      setLoading(true);

      // 1. Upload any new images
      const finalImageUrls: string[] = [];
      const newFilesToUpload: File[] = [];

      for (const item of images) {
        if (item.uploadedUrl) {
          finalImageUrls.push(item.uploadedUrl);
        } else if (item.file) {
          newFilesToUpload.push(item.file);
        }
      }

      if (newFilesToUpload.length > 0) {
        setUploadStatus(`Uploading ${newFilesToUpload.length} image(s)...`);
        const uploadedUrls = await uploadService.uploadMultiple(newFilesToUpload, "reviews");
        finalImageUrls.push(...uploadedUrls);
      }

      // 2. Upload video if new file present
      let finalVideoUrl: string | null = null;
      if (video) {
        if (video.uploadedUrl) {
          finalVideoUrl = video.uploadedUrl;
        } else if (video.file) {
          setUploadStatus("Uploading video preview...");
          finalVideoUrl = await uploadService.uploadVideo(video.file, "reviews");
        }
      }

      setUploadStatus(isEdit ? "Saving changes..." : "Publishing review...");

      // 3. Create or Update review
      if (isEdit && reviewId) {
        await reviewService.update(token, reviewId, {
          rating,
          comment: comment.trim(),
          images: finalImageUrls,
          video: finalVideoUrl,
        });
        setSuccessMessage("Review updated successfully!");
      } else {
        if (!orderItemId) {
          throw new Error("Missing order item reference.");
        }
        await reviewService.create(token, {
          orderItemId,
          productId,
          variantId: variantId || null,
          rating,
          comment: comment.trim(),
          images: finalImageUrls,
          video: finalVideoUrl,
        });
        setSuccessMessage("Review submitted successfully! Thank you for your feedback.");
      }

      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1200);
    } catch (err: any) {
      console.warn("Review submit warning:", err?.message);
      setErrorMessage(err?.message || "Failed to submit review. Please try again.");
    } finally {
      setLoading(false);
      setUploadStatus("");
    }
  };

  const activeRating = hoverRating || rating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-[#e8d5c8] my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100 bg-[#fbf9f8]">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#0a0808]">
              {isEdit ? "Edit Your Review" : "Write a Review"}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Share your genuine experience with other buyers
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          {/* Product Summary Header Card */}
          <div className="flex items-center gap-3.5 p-3 rounded-xl bg-gray-50/80 border border-gray-100">
            <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-white border border-gray-200 flex-shrink-0">
              <Image
                src={productImage || "/placeholder.png"}
                alt={productTitle}
                fill
                sizes="56px"
                className="object-contain p-1"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold text-[#0a0808] line-clamp-1">
                {productTitle}
              </h4>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                {variantDetails?.colorName && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white border border-gray-200 text-[11px]">
                    Color: {variantDetails.colorName}
                  </span>
                )}
                {variantDetails?.sizeName && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white border border-gray-200 text-[11px]">
                    Size: {variantDetails.sizeName}
                  </span>
                )}
                {variantDetails?.sku && (
                  <span className="text-[11px] text-gray-400 font-mono">
                    SKU: {variantDetails.sku}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Feedback alerts */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2.5">
              <CheckCircle2 size={18} className="flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 1. Star Rating Section */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Overall Rating <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="p-1 -m-1 focus:outline-none transition-transform hover:scale-110 active:scale-95"
                  >
                    <Star
                      size={28}
                      className={
                        star <= activeRating
                          ? "fill-amber-400 text-amber-400 drop-shadow-sm"
                          : "text-gray-200 fill-gray-100"
                      }
                    />
                  </button>
                ))}
              </div>
              <span className="text-xs sm:text-sm font-semibold text-[#b08a78] bg-[#e8d5c8]/30 px-3 py-1 rounded-full border border-[#e8d5c8]/80">
                {RATING_LABELS[activeRating] || "Select Rating"}
              </span>
            </div>
          </div>

          {/* 2. Review Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Review Comment
              </label>
              <span className="text-[11px] text-gray-400">
                {comment.length} / 1000 characters
              </span>
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 1000))}
              rows={4}
              placeholder="What did you like or dislike? How was the fabric quality, color accuracy, fit, and packaging? Your feedback helps others shop with confidence."
              className="w-full border border-gray-200 rounded-xl p-3.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#b08a78] focus:border-transparent transition resize-none placeholder:text-gray-400"
            />
          </div>

          {/* 3. Photo & Video Upload Section */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Add Photos & Short Video
              </label>
              <span className="text-[11px] text-gray-400">
                Max 6 photos &bull; 1 video
              </span>
            </div>

            {/* Upload Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={loading || images.length >= 6}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 hover:border-gray-300 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ImageIcon size={16} className="text-[#b08a78]" />
                <span>Upload Photos ({images.length}/6)</span>
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={handleImageSelect}
              />

              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                disabled={loading || !!video}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 hover:border-gray-300 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <VideoIcon size={16} className="text-[#b08a78]" />
                <span>{video ? "Video Attached (1/1)" : "Upload Short Video"}</span>
              </button>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                className="hidden"
                onChange={handleVideoSelect}
              />
            </div>

            {/* Image Previews Strip */}
            {images.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-medium text-gray-500">
                  Attached Photos ({images.length}):
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {images.map((img) => (
                    <div
                      key={img.id}
                      className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shadow-xs"
                    >
                      <Image
                        src={img.previewUrl}
                        alt="Preview"
                        fill
                        sizes="90px"
                        className="object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(img.id)}
                        disabled={loading}
                        className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition hover:bg-red-600"
                        title="Remove photo"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Video Preview */}
            {video && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-medium text-gray-500">
                  Attached Video:
                </span>
                <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-black/5 max-w-xs">
                  <video
                    src={video.previewUrl}
                    controls
                    className="w-full h-36 object-contain rounded-xl bg-black"
                  />
                  <button
                    type="button"
                    onClick={removeVideo}
                    disabled={loading}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-red-600 transition shadow-md"
                    title="Remove video"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-gray-600 hover:bg-gray-100 transition disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading || rating === 0}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#b08a78] hover:bg-[#976f5d] transition shadow-sm active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{uploadStatus || "Submitting..."}</span>
                </>
              ) : (
                <span>{isEdit ? "Update Review" : "Submit Review"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
