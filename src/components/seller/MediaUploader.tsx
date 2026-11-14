"use client";

import { useState, useRef } from "react";
import { Upload, Trash2, GripVertical, Star } from "lucide-react";
import { uploadService } from "@/lib/services/uploadService";

interface MediaImage {
  url: string;
  alt: string;
  colorId?: string;
  primary?: boolean;
}

interface MediaUploaderProps {
  images: MediaImage[];
  onImagesChange: (images: MediaImage[]) => void;
  onError: (message: string) => void;
  maxImages?: number;
}

export const MediaUploader = ({
  images,
  onImagesChange,
  onError,
  maxImages = 10,
}: MediaUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Drag and Drop reordering state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleFileChange = async (files: FileList | null) => {
    if (!files) return;
    if (images.length + files.length > maxImages) {
      onError(`Maximum ${maxImages} images allowed`);
      return;
    }

    try {
      setIsUploading(true);
      const fileArray = Array.from(files);
      const urls = await uploadService.uploadMultiple(fileArray, "products");
      const newImages = [
        ...images,
        ...urls.map((url: string, i: number) => ({
          url,
          alt: "",
          colorId: "",
          primary: images.length === 0 && i === 0,
        })),
      ];
      onImagesChange(newImages);
    } catch (error) {
      onError("Image upload failed. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    // Only respond to desktop file drag events
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileChange(e.dataTransfer.files);
  };

  const handleRemove = (idx: number) => {
    const remaining = images.filter((_, i) => i !== idx);
    const updated = remaining.map((img, i) => ({
      ...img,
      primary: i === 0,
    }));
    onImagesChange(updated);
  };

  // --------------------------------------------------------------------------
  // Drag-and-Drop Image Reordering Handlers
  // --------------------------------------------------------------------------
  const handleImageDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/x-product-image-index", String(index));
  };

  const handleImageDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleImageDragLeave = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragOverIndex === index) {
      setDragOverIndex(null);
    }
  };

  const handleImageDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    const fromStr = e.dataTransfer.getData("application/x-product-image-index");
    const fromIndex = fromStr !== "" ? parseInt(fromStr, 10) : draggedIndex;

    setDraggedIndex(null);
    setDragOverIndex(null);

    if (fromIndex === null || isNaN(fromIndex) || fromIndex === targetIndex) {
      return;
    }

    const reordered = [...images];
    const [movedItem] = reordered.splice(fromIndex, 1);
    reordered.splice(targetIndex, 0, movedItem);

    // Reassign primary flag: first image (index 0) is the Cover
    const updated = reordered.map((img, i) => ({
      ...img,
      primary: i === 0,
    }));

    onImagesChange(updated);
  };

  const handleImageDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleSetAsCover = (index: number) => {
    if (index === 0) return;
    const reordered = [...images];
    const [selected] = reordered.splice(index, 1);
    reordered.unshift(selected);
    const updated = reordered.map((img, i) => ({
      ...img,
      primary: i === 0,
    }));
    onImagesChange(updated);
  };

  return (
    <div className="space-y-4">
      {/* Upload Box */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
          dragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400 bg-gray-50"
        } ${isUploading ? "opacity-50" : ""}`}
      >
        <Upload className="mx-auto mb-2 text-gray-400" size={32} />
        <p className="font-medium text-gray-700">
          Drag images here or click to upload
        </p>
        <p className="text-sm text-gray-500 mt-1">
          PNG, JPG, WEBP up to 10MB • Max {maxImages} images
        </p>
        <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs text-amber-800 font-medium">
          <span>📐 Recommended: 3:4 Portrait (e.g. 1200×1600px). Uploads are automatically auto-oriented and formatted to 3:4 portrait.</span>
        </div>
        {isUploading && (
          <div className="mt-3 flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span className="text-sm text-gray-600">Uploading...</span>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
        onChange={(e) => handleFileChange(e.target.files)}
        className="hidden"
      />

      {/* Uploaded Images List with Drag-and-Drop Reordering */}
      {images.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500 px-1">
            <span className="inline-flex items-center gap-1.5 font-medium text-gray-700">
              <GripVertical size={14} className="text-gray-400" />
              <span>Drag and drop images to change order (the 1st image is Cover)</span>
            </span>
            <span className="font-semibold text-gray-600">
              {images.length}/{maxImages} images
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {images.map((img, idx) => {
              const isDragging = draggedIndex === idx;
              const isDragOver = dragOverIndex === idx && draggedIndex !== idx;

              return (
                <div
                  key={`${img.url}-${idx}`}
                  draggable
                  onDragStart={(e) => handleImageDragStart(e, idx)}
                  onDragOver={(e) => handleImageDragOver(e, idx)}
                  onDragLeave={(e) => handleImageDragLeave(e, idx)}
                  onDrop={(e) => handleImageDrop(e, idx)}
                  onDragEnd={handleImageDragEnd}
                  className={`group relative select-none cursor-grab active:cursor-grabbing transition-all duration-200 ${
                    isDragging ? "opacity-30 scale-95" : ""
                  } ${isDragOver ? "scale-105 z-10" : ""}`}
                >
                  <div
                    className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 bg-[#f8f5f0] shadow-2xs transition-all ${
                      isDragOver
                        ? "border-blue-500 ring-4 ring-blue-500/30 shadow-md"
                        : idx === 0
                        ? "border-blue-500 shadow-xs"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    style={{ aspectRatio: "3/4" }}
                  >
                    <img
                      src={img.url}
                      alt={img.alt || `Product ${idx + 1}`}
                      className="w-full h-full object-cover object-top pointer-events-none"
                    />

                    {/* Cover badge */}
                    {idx === 0 && (
                      <div className="absolute top-2 left-2 bg-blue-600 text-white text-[11px] font-bold px-2 py-0.5 rounded shadow-xs tracking-wide">
                        Cover
                      </div>
                    )}

                    {/* Drag Grip Handle Indicator */}
                    <div className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs">
                      <GripVertical size={14} />
                    </div>

                    {/* Hover Actions Overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                      {idx !== 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetAsCover(idx);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-medium transition shadow-xs"
                          title="Set as Cover Image"
                        >
                          <Star size={12} className="fill-white" />
                          <span>Set Cover</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(idx);
                        }}
                        className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition shadow-xs"
                        title="Delete image"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Label */}
                  <p
                    className={`text-xs mt-1 text-center font-medium ${
                      idx === 0 ? "text-blue-600 font-semibold" : "text-gray-600"
                    }`}
                  >
                    {idx === 0 ? "Cover" : `Image ${idx + 1}`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
