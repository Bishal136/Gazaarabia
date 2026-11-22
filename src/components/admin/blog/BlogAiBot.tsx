"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Loader2,
  Wand2,
  ImageIcon,
  Send,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FileText,
  ArrowRight,
  Bot,
  User,
  Paperclip,
  CheckCheck,
  Settings2,
} from "lucide-react";
import {
  AVAILABLE_AI_MODELS,
  type GeneratedBlogArticle,
  type AiModelOption,
} from "@/lib/ai/blogTypes";

interface BlogCategoryOption {
  id: number | string;
  name: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  article?: GeneratedBlogArticle;
  isStreaming?: boolean;
}

export interface BlogAiBotProps {
  categories: BlogCategoryOption[];
  currentTitle?: string;
  onApplyTitle: (title: string) => void;
  onApplySlug: (slug: string) => void;
  onApplyCategory: (categoryId: string) => void;
  onApplyContent: (html: string) => void;
  onApplyImage: (imageUrl: string) => void;
  onApplyAll: (article: GeneratedBlogArticle) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const BlogAiBot: React.FC<BlogAiBotProps> = ({
  categories,
  currentTitle = "",
  onApplyTitle,
  onApplySlug,
  onApplyCategory,
  onApplyContent,
  onApplyImage,
  onApplyAll,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [selectedModel, setSelectedModel] = useState<string>("gemini-4-hydrogen");
  const [showModelPicker, setShowModelPicker] = useState<boolean>(false);
  const [autoGenerateImage, setAutoGenerateImage] = useState<boolean>(true);
  const [inputText, setInputText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>("");

  const [expandedContentIds, setExpandedContentIds] = useState<Record<string, boolean>>({});
  const [editingImagePromptId, setEditingImagePromptId] = useState<string | null>(null);
  const [customImagePrompt, setCustomImagePrompt] = useState<string>("");
  const [isRegeneratingImage, setIsRegeneratingImage] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const activeModel = AVAILABLE_AI_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_AI_MODELS[0];

  // Initial welcome message
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg-welcome",
      role: "assistant",
      content:
        "Assalamu Alaikum! I'm your Gazaarabia Editorial Copilot. Tell me what topic you want to write about (e.g. *how to support the people of Gaza*, *contemporary abaya styling*, or *Palestinian Tatreez motifs*), or attach a photograph to generate a story around it.",
      timestamp: "Just now",
    },
  ]);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    const userMessageId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMessageId,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setIsLoading(true);
    setLoadingStep(`Generating with ${activeModel.name}...`);

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/ai/blog-copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-article",
          data: {
            prompt: text,
            currentTitle,
            model: selectedModel,
            categoryOptions: categories.map((c) => ({ id: Number(c.id), name: c.name })),
            generateImage: autoGenerateImage,
            conversationHistory: historyPayload,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to generate blog draft.");
      }

      const botMessageId = `bot-${Date.now()}`;
      const botMsg: ChatMessage = {
        id: botMessageId,
        role: "assistant",
        content: data.botMessage || `I've created an editorial draft for "${data.article.title}". You can preview and apply the details below!`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        article: data.article,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: `Error: ${err.message || "Something went wrong while drafting."} Please try again or switch model.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
      setLoadingStep("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isLoading) return;

    setIsLoading(true);
    setLoadingStep("Uploading and analyzing photo with Vision...");

    const userMessageId = `user-photo-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMessageId,
      role: "user",
      content: `[Attached image: ${file.name}] Please inspect this photograph and write a tailored editorial blog about it.`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/upload?folder=blogs", { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error("Failed to upload local image.");
      const uploadData = await uploadRes.json();
      const imageUrl = uploadData.url;

      const res = await fetch("/api/ai/blog-copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "image-to-blog",
          data: {
            imageUrl,
            model: selectedModel,
            categoryOptions: categories.map((c) => ({ id: Number(c.id), name: c.name })),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Vision analysis failed.");
      }

      const article = {
        ...data.article,
        generatedImageUrl: imageUrl,
      };

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        content: data.botMessage || "I've analyzed the photo and crafted a complete story around it!",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        article,
      };

      setMessages((prev) => [...prev, botMsg]);
      onApplyImage(imageUrl);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `Vision error: ${err.message || "Failed to inspect image."}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
      setLoadingStep("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRegenerateCover = async (msgId: string, article: GeneratedBlogArticle) => {
    const promptToUse = customImagePrompt.trim() || article.suggestedImagePrompt || article.title;
    if (!promptToUse) return;

    setIsRegeneratingImage(true);
    try {
      const res = await fetch("/api/ai/blog-copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-image",
          data: {
            prompt: promptToUse,
            title: article.title,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to regenerate image.");
      }

      // Update in message history
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === msgId && m.article) {
            return {
              ...m,
              article: {
                ...m.article,
                generatedImageUrl: data.imageUrl,
              },
            };
          }
          return m;
        })
      );

      onApplyImage(data.imageUrl);
      setEditingImagePromptId(null);
    } catch (err: any) {
      alert(`Image regeneration error: ${err.message}`);
    } finally {
      setIsRegeneratingImage(false);
    }
  };

  const toggleContentPreview = (id: string) => {
    setExpandedContentIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (isCollapsed) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center">
            <Bot size={16} className="text-blue-400" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span>AI Blog Chatbot</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 font-mono">
                {activeModel.name}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Click to expand conversation</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer"
        >
          Open Chat
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full min-h-[480px]">
      {/* 1. Chat Header with Model Selector */}
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/90 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Bot size={16} className="text-blue-400" />
          </div>
          <div className="truncate">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-900">AI Editorial Copilot</h3>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Online" />
            </div>
            <p className="text-[10px] text-slate-500 truncate">Autonomous fashion & heritage drafter</p>
          </div>
        </div>

        {/* Model Selector Dropdown (Clean, Professional & Anti-AI-Slop) */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setShowModelPicker(!showModelPicker)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-800 shadow-2xs transition-all cursor-pointer"
            title="Select Reasoning Engine"
          >
            <Sparkles size={13} className="text-slate-600 shrink-0" />
            <span className="font-semibold text-slate-900 whitespace-nowrap">{activeModel.name}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 font-medium border border-slate-200/70">
              {activeModel.badge}
            </span>
            <ChevronDown size={13} className={`text-slate-400 transition-transform duration-150 ${showModelPicker ? "rotate-180" : ""}`} />
          </button>

          {showModelPicker && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-900/10 z-40 p-2 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between border-b border-slate-100 pb-2 mb-1">
                <span>Reasoning Engine</span>
                <span className="text-[10px] font-normal text-slate-400">Gemini 4 & Pro</span>
              </div>
              <div className="space-y-0.5 max-h-[320px] overflow-y-auto">
                {AVAILABLE_AI_MODELS.map((model) => {
                  const isSelected = selectedModel === model.id;
                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => {
                        setSelectedModel(model.id);
                        setShowModelPicker(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-between gap-2.5 ${
                        isSelected
                          ? "bg-slate-900 text-white shadow-xs"
                          : "hover:bg-slate-50 text-slate-800"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-semibold ${isSelected ? "text-white" : "text-slate-900"}`}>
                            {model.name}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-medium border ${
                              isSelected
                                ? "bg-slate-800 text-slate-200 border-slate-700"
                                : "bg-slate-100 text-slate-600 border-slate-200/80"
                            }`}
                          >
                            {model.badge}
                          </span>
                        </div>
                        <p
                          className={`text-[10px] leading-tight mt-0.5 truncate ${
                            isSelected ? "text-slate-300" : "text-slate-500"
                          }`}
                        >
                          {model.tagline}
                        </p>
                      </div>
                      {isSelected && (
                        <Check size={14} className="text-white shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer shrink-0"
            title="Minimize Chatbot"
          >
            <ChevronUp size={16} />
          </button>
        )}
      </div>

      {/* 2. Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/40 min-h-0">
        {messages.map((msg) => {
          const isUser = msg.role === "user";

          return (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
            >
              {/* Bot Avatar */}
              {!isUser && (
                <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Bot size={14} className="text-blue-400" />
                </div>
              )}

              {/* Message Content */}
              <div
                className={`max-w-[85%] rounded-2xl text-xs leading-relaxed space-y-3 ${
                  isUser
                    ? "bg-slate-900 text-white p-3.5 rounded-tr-xs shadow-xs"
                    : "bg-white text-slate-800 p-4 border border-slate-200/90 rounded-tl-xs shadow-xs"
                }`}
              >
                {/* Text Body */}
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* If Assistant Generated an Article Draft Card */}
                {msg.article && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-3 bg-slate-50/60 p-3 rounded-xl border">
                    {/* Header Action Bar */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 gap-2">
                      <span className="text-[11px] font-bold text-slate-900 flex items-center gap-1">
                        <Sparkles size={13} className="text-blue-600" /> Article Draft Ready
                      </span>
                      <button
                        type="button"
                        onClick={() => onApplyAll(msg.article!)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer shrink-0"
                        title="Transfer title, slug, category, content & image into form"
                      >
                        <span>Apply All to Form</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>

                    {/* Title */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Title</span>
                        <button
                          type="button"
                          onClick={() => onApplyTitle(msg.article!.title)}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                        >
                          Insert Title
                        </button>
                      </div>
                      <p className="text-xs font-bold text-slate-900 leading-snug">{msg.article.title}</p>
                    </div>

                    {/* Category & Slug Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      {msg.article.categoryName && (
                        <button
                          type="button"
                          onClick={() => {
                            if (msg.article?.categoryId) onApplyCategory(String(msg.article.categoryId));
                          }}
                          className="px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium transition cursor-pointer"
                          title="Click to apply category"
                        >
                          Category: {msg.article.categoryName}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onApplySlug(msg.article!.slug)}
                        className="px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 font-mono transition cursor-pointer truncate max-w-[210px]"
                        title="Click to apply slug"
                      >
                        /{msg.article.slug}
                      </button>
                    </div>

                    {/* Cover Image Preview */}
                    {msg.article.generatedImageUrl && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            16:9 Cover Photo
                          </span>
                          <button
                            type="button"
                            onClick={() => onApplyImage(msg.article!.generatedImageUrl!)}
                            className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                          >
                            Apply Cover
                          </button>
                        </div>
                        <div className="relative rounded-lg overflow-hidden border border-slate-200 aspect-video bg-slate-100">
                          <img
                            src={msg.article.generatedImageUrl}
                            alt="Cover Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    )}

                    {/* Image Regeneration Prompt Toggle */}
                    <div>
                      <button
                        type="button"
                        onClick={() =>
                          setEditingImagePromptId(editingImagePromptId === msg.id ? null : msg.id)
                        }
                        className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw size={11} className={isRegeneratingImage ? "animate-spin" : ""} />
                        <span>{editingImagePromptId === msg.id ? "Close Prompt Box" : "Tweak & Regenerate Cover Photo"}</span>
                      </button>

                      {editingImagePromptId === msg.id && (
                        <div className="mt-2 space-y-2 p-2.5 bg-white rounded-lg border border-slate-200">
                          <textarea
                            rows={2}
                            value={customImagePrompt}
                            onChange={(e) => setCustomImagePrompt(e.target.value)}
                            placeholder={msg.article.suggestedImagePrompt || "Describe visual elements..."}
                            className="no-focus-ring w-full text-xs p-2 rounded border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                            style={{ boxShadow: "none" }}
                          />
                          <button
                            type="button"
                            onClick={() => handleRegenerateCover(msg.id, msg.article!)}
                            disabled={isRegeneratingImage}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                          >
                            {isRegeneratingImage ? <Loader2 size={11} className="animate-spin" /> : <Wand2 size={11} />}
                            <span>{isRegeneratingImage ? "Rendering..." : "Render Image"}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Excerpt */}
                    {msg.article.excerpt && (
                      <div className="text-xs text-slate-600 italic border-l-2 border-blue-400 pl-2 bg-white/70 py-1 rounded-r">
                        "{msg.article.excerpt}"
                      </div>
                    )}

                    {/* Expandable Article Content */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => toggleContentPreview(msg.id)}
                          className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                        >
                          <FileText size={13} />
                          <span>Article HTML ({Math.round(msg.article.htmlContent.length / 5)} words)</span>
                          {expandedContentIds[msg.id] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>

                        <button
                          type="button"
                          onClick={() => onApplyContent(msg.article!.htmlContent)}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                        >
                          Insert into Editor
                        </button>
                      </div>

                      {expandedContentIds[msg.id] && (
                        <div
                          className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-700 max-h-48 overflow-y-auto prose prose-sm leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: msg.article.htmlContent }}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Timestamp */}
                <div
                  className={`text-[10px] mt-1 ${
                    isUser ? "text-slate-400 text-right" : "text-slate-400"
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>

              {/* User Avatar */}
              {isUser && (
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <User size={14} />
                </div>
              )}
            </div>
          );
        })}

        {/* Live Thinking / Typing Indicator */}
        {isLoading && (
          <div className="flex gap-2.5 justify-start">
            <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
              <Bot size={14} className="text-blue-400 animate-pulse" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-3.5 shadow-xs text-xs text-slate-600 flex items-center gap-2">
              <Loader2 size={13} className="animate-spin text-blue-600 shrink-0" />
              <span className="font-medium text-slate-700">{loadingStep || "AI is thinking..."}</span>
              <span className="flex gap-1 items-center ml-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Bottom Input Bar (Sleek ChatGPT / Gemini style floating pill) */}
      <div className="p-3 border-t border-slate-100 bg-white shrink-0 sticky bottom-0 z-10">
        {/* Modern Pill Input Bar */}
        <div className="relative rounded-2xl sm:rounded-full border border-slate-200 bg-slate-50/80 hover:bg-white hover:border-slate-300 focus-within:bg-white focus-within:border-slate-400 focus-within:shadow-sm transition-all duration-200 px-3 py-1.5 flex items-center gap-2">
          {/* Attachment Button for Image-to-Blog Vision */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer disabled:opacity-40 shrink-0"
            title="Attach a photo to write an article about it"
          >
            <Paperclip size={16} />
          </button>

          {/* Clean auto-expanding textarea (with no-focus-ring and zero shadow to prevent global CSS green square box) */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              if (textareaRef.current) {
                textareaRef.current.style.height = "auto";
                textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 110)}px`;
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={`Ask ${activeModel.name}...`}
            className="no-focus-ring flex-1 text-xs py-1 bg-transparent !border-none !outline-none !shadow-none focus:!ring-0 focus:!shadow-none focus:!outline-none resize-none text-slate-800 placeholder:text-slate-400 leading-relaxed max-h-28 overflow-y-auto"
            style={{
              outline: "none",
              boxShadow: "none",
              border: "none",
            }}
          />

          {/* Send Button */}
          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={isLoading || !inputText.trim()}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-150 shrink-0 ${
              inputText.trim() && !isLoading
                ? "bg-slate-900 text-white hover:bg-slate-800 active:scale-95 shadow-xs cursor-pointer"
                : "bg-slate-200 text-slate-400 cursor-not-allowed opacity-60"
            }`}
            title="Send message (Enter)"
          >
            <Send size={12} className={inputText.trim() ? "translate-x-0.5 text-white" : "text-slate-400"} />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={handlePhotoUpload}
          />
        </div>

        {/* Options Row below input */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-2 pt-1.5">
          <label className="flex items-center gap-1.5 cursor-pointer select-none hover:text-slate-600 transition">
            <input
              type="checkbox"
              checked={autoGenerateImage}
              onChange={(e) => setAutoGenerateImage(e.target.checked)}
              className="no-focus-ring w-3.5 h-3.5 rounded text-slate-900 focus:ring-slate-900 border-slate-300 cursor-pointer"
            />
            <span className="text-[11px] text-slate-500 font-medium">Auto-generate 16:9 cover photo</span>
          </label>

          <span className="text-slate-400 font-mono text-[10px]">
            Shift + Enter for new line
          </span>
        </div>
      </div>
    </div>
  );
};

export default BlogAiBot;
