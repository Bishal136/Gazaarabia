"use client";

import { useRef, useState } from "react";
import { Upload, Trash2, GripVertical, Star } from "lucide-react";
import { uploadService } from "@/lib/services/uploadService";

interface VariantImage {
  url: string;
  alt?: string;
}

interface VariantImagesUploaderProps {
  images: VariantImage[];
  onImagesChange: (images: VariantImage[]) => void;
  onError: (message: string) => void;
  variantLabel?: string;
}

export const VariantImagesUploader = ({
  images,
  onImagesChange,
  onError,
  variantLabel = "Variant",
}: VariantImagesUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Drag and drop reordering state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleFileChange = async (files: FileList | null) => {
    if (!files) return;

    try {
      setIsUploading(true);
      const fileArray = Array.from(files);
      const urls = await uploadService.uploadMultiple(fileArray, "variants");
      onImagesChange([
        ...images,
        ...urls.map((url: string) => ({ url, alt: "" })),
      ]);
    } catch (error) {
      onError("Variant image upload failed. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrag = (e: React.DragEvent) => {
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
    onImagesChange(images.filter((_, i) => i !== idx));
  };

  // Reorder handlers
  const handleImageDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/x-variant-image-index", String(index));
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

    const fromStr = e.dataTransfer.getData("application/x-variant-image-index");
    const fromIndex = fromStr !== "" ? parseInt(fromStr, 10) : draggedIndex;

    setDraggedIndex(null);
    setDragOverIndex(null);

    if (fromIndex === null || isNaN(fromIndex) || fromIndex === targetIndex) {
      return;
    }

    const reordered = [...images];
    const [movedItem] = reordered.splice(fromIndex, 1);
    reordered.splice(targetIndex, 0, movedItem);

    onImagesChange(reordered);
  };

  const handleImageDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleSetAsPrimary = (index: number) => {
    if (index === 0) return;
    const reordered = [...images];
    const [selected] = reordered.splice(index, 1);
    reordered.unshift(selected);
    onImagesChange(reordered);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-gray-700">
          Variant Images <span className="text-red-500">*</span> ({images.length})
        </label>
        {images.length > 1 && (
          <span className="text-[11px] text-gray-500">
            Drag to reorder
          </span>
        )}
      </div>

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
          dragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400 bg-gray-50"
        }`}
      >
        <Upload className="mx-auto mb-2 text-gray-400" size={24} />
        <p className="text-sm text-gray-600">
          Drag images or click to upload
        </p>
        {isUploading && (
          <div className="mt-2 flex items-center justify-center gap-1">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
            <span className="text-xs text-gray-600">Uploading...</span>
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

      {images.length > 0 && (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
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
                className={`group relative select-none cursor-grab active:cursor-grabbing transition-all ${
                  isDragging ? "opacity-30 scale-95" : ""
                } ${isDragOver ? "scale-105 z-10" : ""}`}
              >
                <div
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 bg-gray-100 transition-all ${
                    isDragOver
                      ? "border-blue-500 ring-2 ring-blue-500/40"
                      : idx === 0
                      ? "border-blue-500 shadow-2xs"
                      : "border-gray-200"
                  }`}
                >
                  <img
                    src={img.url}
                    alt={img.alt || `Image ${idx + 1}`}
                    className="w-full h-full object-cover pointer-events-none"
                  />

                  {idx === 0 && (
                    <div className="absolute top-1 left-1 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-2xs">
                      1st
                    </div>
                  )}

                  <div className="absolute top-1 right-1 bg-black/50 text-white p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical size={12} />
                  </div>

                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                    {idx !== 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetAsPrimary(idx);
                        }}
                        className="p-1 bg-blue-600 text-white rounded-full hover:bg-blue-700"
                        title="Make 1st"
                      >
                        <Star size={12} className="fill-white" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(idx);
                      }}
                      className="p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                      title="Remove"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
