"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Box,
  Button,
  TextField,
  Typography,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import {
  Upload,
  Sparkles,
  Wand2,
  Loader2,
  ArrowLeft,
  ImageIcon,
  Trash2,
  RefreshCw,
} from "lucide-react";
import PopupAlert from "@/components/PopupAlert";
import AlertMessage from "@/components/AlertMessage";
import { blogService } from "@/lib/services/blogService";
import { blogCategoryService } from "@/lib/services/blogCategoryService";
import type { Category } from "@/lib/services/categoryService";
import { useSession } from "next-auth/react";
import { ROUTES } from "@/constants/routes";
import { generateSlug } from "@/lib/utils";
import RichTextEditor from "@/components/RichTextEditor";
import BlogAiBot from "@/components/admin/blog/BlogAiBot";
import type { GeneratedBlogArticle } from "@/lib/ai/blogTypes";

export default function AddOrEditBlogPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const alowedRoles = ["admin", "content_manager"];
  const userRole = session?.user?.role?.toLowerCase();

  const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const blogId = rawId ? Number(rawId) : undefined; // undefined when creating, defined when editing

  const [form, setForm] = useState({
    title: "",
    slug: "",
    content: "",
    image: "",
    categoryId: "",
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const [isSlugEdited, setIsSlugEdited] = useState(false);
  const [isOptimizingSlug, setIsOptimizingSlug] = useState(false);
  const [isGeneratingCoverImage, setIsGeneratingCoverImage] = useState(false);
  const [isAiBotCollapsed, setIsAiBotCollapsed] = useState(false);

  // Resizable Split Pane state (persisted in localStorage)
  const [leftWidth, setLeftWidth] = useState<number>(52);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("gazaarabia_blog_editor_split");
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed >= 30 && parsed <= 70) {
        setLeftWidth(parsed);
      }
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      const newPct = ((e.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(Math.max(newPct, 32), 70);
      setLeftWidth(clamped);
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        localStorage.setItem("gazaarabia_blog_editor_split", String(leftWidth));
      }
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isDragging, leftWidth]);

  const [alert, setAlert] = useState<{
    isOpen: boolean;
    type: "success" | "error" | "";
    message: string;
  }>({
    isOpen: false,
    type: "",
    message: "",
  });

  const [popup, setPopup] = useState<{
    isOpen: boolean;
    type: "success" | "error" | "warning" | "";
    message: string;
  }>({
    isOpen: false,
    type: "",
    message: "",
  });

  const fieldStyle = {
    "& .MuiOutlinedInput-root.Mui-focused fieldset": { borderColor: "#0f172a" },
    "& .MuiInputLabel-root.Mui-focused": { color: "#0f172a" },
  };

  // Redirect unauthorized users
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace(ROUTES.ADMIN.LOGIN);
    } else if (status === "authenticated" && !alowedRoles.includes(userRole || "")) {
      router.replace(ROUTES.UNAUTHORIZED);
    }
  }, [status, session, userRole, router]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data: any = await blogCategoryService.getAll(session?.user?.token as string);
        setCategories(Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []);
      } catch (err: any) {
        setAlert({
          isOpen: true,
          type: "error",
          message: err.message || "Failed to load categories.",
        });
      }
    };
    if (session?.user?.token) fetchCategories();
  }, [session?.user?.token]);

  // Fetch blog if editing
  useEffect(() => {
    if (!blogId || !session?.user?.token) return;
    const fetchBlog = async () => {
      try {
        const res: any = await blogService.getById(session?.user?.token as string, Number(blogId));
        const data = res?.data ?? null;
        if (data) {
          setForm({
            title: data.title || "",
            slug: data.slug || "",
            content: data.content || "",
            image: data.image || "",
            categoryId: data.categoryId ? String(data.categoryId) : "",
          });
          setPreviewImage(data.image || null);
          setIsSlugEdited(true);
        }
      } catch (err: any) {
        setAlert({
          isOpen: true,
          type: "error",
          message: err.message || "Failed to load blog details.",
        });
      }
    };
    fetchBlog();
  }, [blogId, session?.user?.token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    setForm((prev) => {
      const updated = { ...prev, [name]: value };

      // Auto slug sync while title is typed and slug hasn't been manually locked
      if (name === "title" && !isSlugEdited) {
        updated.slug = generateSlug(value);
      }

      return updated;
    });
  };

  const handleContentChange = (value: string) => {
    setForm((prev) => ({ ...prev, content: value }));
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  // Upload local image
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setPreviewImage(previewUrl);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload?folder=blogs", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Failed to upload image");

      const data = await res.json();
      setForm((prev) => ({ ...prev, image: data.url }));
      setPreviewImage(data.url);
      setAlert({ isOpen: true, type: "success", message: "Image uploaded successfully!" });
    } catch (err: any) {
      setAlert({ isOpen: true, type: "error", message: err.message || "Image upload failed." });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // 1-Click AI Slug Optimizer
  const handleOptimizeSlug = async () => {
    if (!form.title.trim()) return;
    setIsOptimizingSlug(true);
    try {
      const res = await fetch("/api/ai/blog-copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "optimize-seo",
          data: { title: form.title },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.slug) {
          setForm((prev) => ({ ...prev, slug: data.slug }));
          setIsSlugEdited(true);
          setAlert({ isOpen: true, type: "success", message: "URL slug optimized for Google SEO!" });
        }
      }
    } catch {
      // Fallback to local slugify
      setForm((prev) => ({ ...prev, slug: generateSlug(prev.title) }));
    } finally {
      setIsOptimizingSlug(false);
    }
  };

  // Generate AI Cover Image directly from form
  const handleGenerateAiCover = async () => {
    if (!form.title.trim()) {
      setAlert({ isOpen: true, type: "error", message: "Please enter a blog title first to generate a cover image." });
      return;
    }

    setIsGeneratingCoverImage(true);
    try {
      const res = await fetch("/api/ai/blog-copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-image",
          data: {
            title: form.title,
            prompt: `Editorial high-fashion 16:9 magazine cover photo for blog titled: "${form.title}"`,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to generate image");
      }

      setForm((prev) => ({ ...prev, image: data.imageUrl }));
      setPreviewImage(data.imageUrl);
      setAlert({ isOpen: true, type: "success", message: "AI cover photo generated and applied!" });
    } catch (err: any) {
      setAlert({ isOpen: true, type: "error", message: err.message || "AI image generation error." });
    } finally {
      setIsGeneratingCoverImage(false);
    }
  };

  // AI Copilot Bridge Handlers
  const handleApplyTitle = (title: string) => {
    setForm((prev) => ({
      ...prev,
      title,
      slug: !isSlugEdited ? generateSlug(title) : prev.slug,
    }));
  };

  const handleApplySlug = (slug: string) => {
    setIsSlugEdited(true);
    setForm((prev) => ({ ...prev, slug }));
  };

  const handleApplyCategory = (categoryId: string) => {
    setForm((prev) => ({ ...prev, categoryId }));
  };

  const handleApplyContent = (html: string) => {
    setForm((prev) => ({ ...prev, content: html }));
  };

  const handleApplyImage = (imageUrl: string) => {
    setForm((prev) => ({ ...prev, image: imageUrl }));
    setPreviewImage(imageUrl);
  };

  const handleApplyAll = (article: GeneratedBlogArticle) => {
    setForm((prev) => ({
      ...prev,
      title: article.title || prev.title,
      slug: article.slug || (!isSlugEdited ? generateSlug(article.title) : prev.slug),
      content: article.htmlContent || prev.content,
      categoryId: article.categoryId ? String(article.categoryId) : prev.categoryId,
      image: article.generatedImageUrl || prev.image,
    }));

    if (article.generatedImageUrl) {
      setPreviewImage(article.generatedImageUrl);
    }
    if (article.slug) {
      setIsSlugEdited(true);
    }

    setAlert({
      isOpen: true,
      type: "success",
      message: "AI draft applied to form! Review, edit, and publish when ready.",
    });
  };

  // Submit (Add / Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim() || !form.slug.trim() || !form.content.trim()) {
      setPopup({ isOpen: true, type: "warning", message: "Please fill in all required fields (Title, Slug, and Content)." });
      return;
    }
    if (!form.categoryId) {
      setPopup({ isOpen: true, type: "warning", message: "Please select a category." });
      return;
    }
    if (!form.image) {
      setPopup({ isOpen: true, type: "warning", message: "Please provide a featured blog image (upload or generate with AI)." });
      return;
    }

    // Slug validation
    if (form.slug.length < 3 || form.slug.length > 100) {
      return setAlert({
        isOpen: true,
        type: "error",
        message: "Slug must be between 3 and 100 characters.",
      });
    }

    if (!/^[a-z0-9-]+$/.test(form.slug)) {
      return setAlert({
        isOpen: true,
        type: "error",
        message: "Slug can only contain lowercase letters, numbers, and hyphens.",
      });
    }

    try {
      setLoading(true);
      const token = session?.user?.token as string;

      if (blogId) {
        await blogService.update(token, Number(blogId), {
          title: form.title,
          slug: form.slug,
          content: form.content,
          image: form.image,
          categoryId: Number(form.categoryId),
        });
        setAlert({ isOpen: true, type: "success", message: "Blog updated successfully!" });
      } else {
        await blogService.create(token, {
          title: form.title,
          slug: form.slug,
          content: form.content,
          image: form.image,
          categoryId: Number(form.categoryId),
        });
        setAlert({ isOpen: true, type: "success", message: "Blog published successfully!" });
      }

      setTimeout(() => router.push("/admin/blogs"), 1200);
    } catch (err: any) {
      setAlert({ isOpen: true, type: "error", message: err.message || "Failed to save blog." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/admin/blogs")}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
            title="Back to blogs list"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              {blogId ? "Edit Blog" : "Create New Blog"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Craft editorial modest fashion articles with integrated Gemini AI Copilot
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outlined"
            onClick={() => router.push("/admin/blogs")}
            sx={{
              textTransform: "none",
              borderRadius: "8px",
              fontWeight: 600,
              color: "#475569",
              borderColor: "#cbd5e1",
              "&:hover": { borderColor: "#94a3b8", backgroundColor: "#f8fafc" },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading}
            sx={{
              textTransform: "none",
              borderRadius: "8px",
              fontWeight: 600,
              boxShadow: "none",
              background: "var(--brand-primary, #e11d48)",
              "&:hover": { background: "#be123c", boxShadow: "none" },
            }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-white" />
                <span>Saving...</span>
              </span>
            ) : blogId ? (
              "Update Blog"
            ) : (
              "Publish Blog"
            )}
          </Button>
        </div>
      </div>

      {alert.isOpen && (alert.type === "success" || alert.type === "error") && (
        <AlertMessage
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert((p) => ({ ...p, isOpen: false }))}
        />
      )}

      {/* Resizable Split Workspace: Left = Form, Right = Fixed AI Bot */}
      <div
        ref={splitContainerRef}
        className="flex flex-col lg:flex-row items-start w-full relative gap-0"
      >
        {/* Left Section: Blog Editor Form */}
        <div
          style={{ width: isAiBotCollapsed ? "100%" : `${leftWidth}%` }}
          className={`w-full transition-[width] duration-75 space-y-6 min-w-[320px] ${
            !isAiBotCollapsed ? "lg:pr-3" : ""
          }`}
        >
          <form onSubmit={handleSubmit} className="bg-white p-5 sm:p-7 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="space-y-1 border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900">Article Details</h2>
              <p className="text-xs text-slate-500">Standard form inputs; all fields can be edited directly or auto-filled via AI Copilot.</p>
            </div>

            {/* Title Input */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Title <span className="text-red-500">*</span>
              </label>
              <TextField
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. Modern Luxury: The Evolution of the Embroidered Abaya"
                fullWidth
                sx={fieldStyle}
              />
            </div>

            {/* URL Slug with Optimize Button */}
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  URL Slug <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleOptimizeSlug}
                  disabled={isOptimizingSlug || !form.title.trim()}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 disabled:opacity-45 disabled:pointer-events-none transition-colors duration-150 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1 cursor-pointer"
                  title="Generate SEO-optimized URL slug"
                >
                  {isOptimizingSlug ? (
                    <Loader2 size={12} className="animate-spin text-blue-600" />
                  ) : (
                    <Wand2 size={12} className="text-slate-500" />
                  )}
                  <span>{isOptimizingSlug ? "Optimizing..." : "Optimize slug"}</span>
                </button>
              </div>
              <TextField
                name="slug"
                value={form.slug}
                onChange={(e) => {
                  setIsSlugEdited(true);
                  setForm((prev) => ({
                    ...prev,
                    slug: generateSlug(e.target.value),
                  }));
                }}
                fullWidth
                sx={fieldStyle}
                helperText="Public URL path: /blogs/journal/[slug]"
              />
            </div>

            {/* Category Dropdown */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Category <span className="text-red-500">*</span>
              </label>
              <FormControl fullWidth required sx={fieldStyle}>
                <Select
                  value={form.categoryId}
                  onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))}
                  displayEmpty
                >
                  <MenuItem value="" disabled>Select Category</MenuItem>
                  {categories.length > 0 ? (
                    categories.map((cat) => (
                      <MenuItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>No categories found</MenuItem>
                  )}
                </Select>
              </FormControl>
            </div>

            {/* TinyMCE Rich Text Editor */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Content Body <span className="text-red-500">*</span>
              </label>
              <RichTextEditor
                value={form.content}
                onChange={handleContentChange}
                minHeight={380}
                placeholder="Write your editorial article or let the AI Copilot draft it for you..."
              />
            </div>

            {/* Featured Blog Image with Dual-Action (Upload or AI Gen) */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  Featured Cover Photo <span className="text-red-500">*</span>
                </label>
                {previewImage && (
                  <button
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({ ...prev, image: "" }));
                      setPreviewImage(null);
                    }}
                    className="text-xs text-red-600 hover:text-red-800 inline-flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <Trash2 size={12} /> Remove Photo
                  </button>
                )}
              </div>

              {/* Image Preview Box */}
              <div
                onClick={handleUploadClick}
                className="relative border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center cursor-pointer transition"
                style={{ height: "220px" }}
              >
                {previewImage || form.image ? (
                  <img
                    src={previewImage || form.image}
                    alt="Blog Cover"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-4 space-y-2">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                      <ImageIcon size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-700">Click to upload photo from your device</p>
                      <p className="text-[11px] text-slate-400">PNG, JPG, or WEBP (Recommended 16:9 ratio)</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Dual Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleUploadClick}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition cursor-pointer"
                >
                  <Upload size={13} />
                  <span>Upload from Computer</span>
                </button>

                <button
                  type="button"
                  onClick={handleGenerateAiCover}
                  disabled={isGeneratingCoverImage || !form.title.trim()}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 disabled:opacity-45 disabled:pointer-events-none transition shadow-xs cursor-pointer"
                  title="Generate a photorealistic 16:9 editorial cover image based on title"
                >
                  {isGeneratingCoverImage ? (
                    <>
                      <Loader2 size={13} className="animate-spin text-blue-600" />
                      <span>Generating with Gemini...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} className="text-blue-600" />
                      <span>Generate AI Cover Photo</span>
                    </>
                  )}
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                hidden
                onChange={handleFileChange}
              />
            </div>
          </form>
        </div>

        {/* Draggable Resizer Divider Handle (Desktop Only) */}
        {!isAiBotCollapsed && (
          <div
            role="separator"
            aria-orientation="vertical"
            onMouseDown={handleMouseDown}
            onDoubleClick={() => {
              setLeftWidth(50);
              localStorage.setItem("gazaarabia_blog_editor_split", "50");
            }}
            className={`hidden lg:flex flex-col items-center justify-center cursor-col-resize select-none h-full self-stretch w-4 -mx-2 z-30 group py-4 transition-colors ${
              isDragging ? "bg-slate-300/40" : "hover:bg-slate-200/50"
            } rounded-full`}
            title="Drag to resize panels (Double-click to reset 50%)"
          >
            <div
              className={`w-1 h-16 rounded-full transition-all duration-150 ${
                isDragging
                  ? "bg-slate-900 w-1.5"
                  : "bg-slate-300 group-hover:bg-slate-600 group-hover:w-1.5"
              }`}
            />
          </div>
        )}

        {/* Right Section: AI Blog Copilot Bot (Position Fixed & Responsive Resizable Width) */}
        {!isAiBotCollapsed && (
          <div
            style={{ width: `${100 - leftWidth}%` }}
            className="w-full lg:sticky lg:top-0 lg:self-start lg:h-[calc(100vh-140px)] min-h-[480px] transition-[width] duration-75 z-20 flex flex-col min-w-[320px] lg:pl-3"
          >
            <BlogAiBot
              categories={categories}
              currentTitle={form.title}
              onApplyTitle={handleApplyTitle}
              onApplySlug={handleApplySlug}
              onApplyCategory={handleApplyCategory}
              onApplyContent={handleApplyContent}
              onApplyImage={handleApplyImage}
              onApplyAll={handleApplyAll}
              isCollapsed={isAiBotCollapsed}
              onToggleCollapse={() => setIsAiBotCollapsed(!isAiBotCollapsed)}
            />
          </div>
        )}
      </div>

      {popup.isOpen && popup.type && (
        <PopupAlert
          type={popup.type as any}
          message={popup.message}
          confirmText="OK"
          onConfirm={() => setPopup((p) => ({ ...p, isOpen: false }))}
          show={popup.isOpen}
        />
      )}
    </div>
  );
}
