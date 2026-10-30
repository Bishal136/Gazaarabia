"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Search,
  MessageSquare,
  Send,
  Image as ImageIcon,
  Video,
  X,
  Play,
  Check,
  CheckCheck,
  Store,
  ExternalLink,
  ShieldCheck,
  Loader2,
  ChevronLeft,
  Tag,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { chatService, ChatMessage, ConversationItem, ProductContext } from "@/lib/services/chatService";
import { uploadService } from "@/lib/services/uploadService";
import ProductContextCard from "@/components/chat/ProductContextCard";
import MediaLightbox from "@/components/chat/MediaLightbox";
import { ChatImage, ChatVideoPlayer } from "@/components/chat/ChatMedia";

export default function CustomerMessagesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const token = session?.user?.token;

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [inputText, setInputText] = useState("");
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);

  // Attachments
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);

  // Lightbox
  const [activeMedia, setActiveMedia] = useState<{ type: "image" | "video"; url: string } | null>(null);

  const messageContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Isolated scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTo({
        top: messageContainerRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  }, []);

  // 1. Initial Load of Customer Conversations
  const loadConversations = useCallback(
    async (isInitial = false) => {
      if (!token) return;
      try {
        if (isInitial) setLoading(true);
        const data = await chatService.getConversations(token);
        setConversations(data);

        // Auto-select first conversation on desktop
        if (isInitial && data.length > 0 && !selectedConvId) {
          setSelectedConvId(data[0].id);
        }
      } catch (err) {
        console.error("Failed to load customer conversations:", err);
      } finally {
        if (isInitial) setLoading(false);
      }
    },
    [token, selectedConvId]
  );

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace(ROUTES.USER.LOGIN);
    } else if (token) {
      loadConversations(true);
    }
  }, [status, token, router, loadConversations]);

  // 2. Fetch Messages when Conversation changes
  useEffect(() => {
    if (!selectedConvId || !token) return;

    let isMounted = true;
    setLoadingMessages(true);

    async function fetchThread() {
      try {
        const msgs = await chatService.getMessages(selectedConvId!, token);
        if (!isMounted) return;
        setMessages(msgs);
        setTimeout(() => scrollToBottom(false), 30);

        setConversations((prev) =>
          prev.map((c) => (c.id === selectedConvId ? { ...c, unreadCount: 0 } : c))
        );
      } catch (err) {
        console.error("Failed to fetch messages for conversation:", err);
      } finally {
        if (isMounted) setLoadingMessages(false);
      }
    }

    fetchThread();

    return () => {
      isMounted = false;
    };
  }, [selectedConvId, token, scrollToBottom]);

  // 3. Real-time Polling for active conversation and list
  useEffect(() => {
    if (!token) return;

    const poll = async () => {
      try {
        const data = await chatService.getConversations(token);
        setConversations(data);

        if (selectedConvId) {
          const latestMsgs = await chatService.getMessages(selectedConvId, token);
          setMessages((prev) => {
            if (latestMsgs.length !== prev.length) {
              setTimeout(() => scrollToBottom(true), 30);
              return latestMsgs;
            }
            return latestMsgs;
          });
        }
      } catch (err) {
        // Continue quietly
      }
    };

    pollTimerRef.current = setInterval(poll, 2500);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [token, selectedConvId, scrollToBottom]);

  // Active Conversation
  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === selectedConvId) || null;
  }, [conversations, selectedConvId]);

  // Filtered Conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      const q = searchQuery.toLowerCase();
      return (
        c.seller?.shopName?.toLowerCase().includes(q) ||
        c.product?.title?.toLowerCase().includes(q) ||
        c.lastMessageText?.toLowerCase().includes(q)
      );
    });
  }, [conversations, searchQuery]);

  // Media Handlers
  const handleImagesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const validImages = files.filter((f) => f.type.startsWith("image/"));
    setSelectedImages((prev) => [...prev, ...validImages]);

    const newPreviews = validImages.map((f) => URL.createObjectURL(f));
    setImagePreviews((prev) => [...prev, ...newPreviews]);
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      alert("Please upload a valid video file (.mp4, .webm)");
      return;
    }

    setSelectedVideo(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const handleRemoveVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setSelectedVideo(null);
    setVideoPreview(null);
  };

  // Send Customer Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedConvId || !token || sending) return;

    const trimmed = inputText.trim();
    if (!trimmed && selectedImages.length === 0 && !selectedVideo) return;

    try {
      setSending(true);

      let uploadedImageUrls: string[] = [];
      let uploadedVideoUrl: string | null = null;

      if (selectedImages.length > 0) {
        uploadedImageUrls = await uploadService.uploadMultiple(selectedImages, "messages");
      }

      if (selectedVideo) {
        uploadedVideoUrl = await uploadService.uploadVideo(selectedVideo, "messages");
      }

      const tempId = Date.now();
      const optimisticMsg: ChatMessage = {
        id: tempId,
        conversationId: selectedConvId,
        senderId: session?.user?.id ? Number(session.user.id) : 0,
        receiverId: activeConversation?.sellerUserId || 0,
        senderRole: "customer",
        text: trimmed,
        mediaUrls: uploadedImageUrls.length > 0 ? uploadedImageUrls : imagePreviews,
        videoUrl: uploadedVideoUrl || videoPreview,
        isRead: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticMsg]);
      setInputText("");
      setSelectedImages([]);
      setImagePreviews([]);
      setSelectedVideo(null);
      setVideoPreview(null);
      setTimeout(() => scrollToBottom(true), 30);

      const realMsg = await chatService.sendMessage(
        selectedConvId,
        {
          text: trimmed,
          mediaUrls: uploadedImageUrls,
          videoUrl: uploadedVideoUrl,
        },
        token
      );

      setMessages((prev) => prev.map((m) => (m.id === tempId ? realMsg : m)));

      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConvId
            ? {
                ...c,
                lastMessageText: trimmed || "Shared an attachment",
                lastMessageAt: new Date().toISOString(),
              }
            : c
        )
      );
    } catch (err: any) {
      alert(err?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(dateStr).toLocaleDateString([], { month: "short", day: "numeric" });
  };

  if (loading && conversations.length === 0) {
    return (
      <div className="w-full min-h-[450px] bg-white rounded-2xl sm:rounded-3xl border border-stone-200/90 shadow-sm p-8 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-stone-700 mb-3" size={32} />
        <p className="text-sm text-stone-500 font-medium">Loading your conversations...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* 2-COLUMN SPLIT-SCREEN CHAT CONTAINER */}
      <div className="flex-1 min-h-0 bg-white rounded-2xl sm:rounded-3xl border border-stone-200/90 shadow-sm overflow-hidden flex flex-col md:flex-row relative">
        {/* LEFT COLUMN: CONVERSATION LIST (Sidebar) */}
        <div
          className={`w-full md:w-64 lg:w-72 shrink-0 border-r border-stone-200/80 flex flex-col h-full bg-stone-50/60 ${
            mobileThreadOpen ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Search Bar */}
          <div className="p-3.5 border-b border-gray-100 bg-white shrink-0">
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sellers or products..."
                className="w-full pl-8 pr-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#b08a78] focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 overscroll-contain">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-gray-400 flex flex-col items-center justify-center h-full">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 mb-2">
                  <MessageSquare size={22} />
                </div>
                <p className="text-xs sm:text-sm font-semibold text-gray-600">
                  No chat conversations yet
                </p>
                <p className="text-[11px] text-gray-400 mt-1 max-w-xs">
                  Click "Chat with Seller" on any product page to ask questions about sizes, fabrics, or delivery.
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === selectedConvId;
                const shopName = conv.seller?.shopName || "Seller Store";

                return (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setSelectedConvId(conv.id);
                      setMobileThreadOpen(true);
                    }}
                    className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors ${
                      isSelected
                        ? "bg-white border-l-4 border-l-[#b08a78] shadow-xs"
                        : "hover:bg-gray-50/80"
                    }`}
                  >
                    {/* Seller Icon */}
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-2xl bg-amber-50 text-[#b08a78] font-bold text-sm flex items-center justify-center border border-amber-200/60 shadow-2xs">
                        <Store size={18} />
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#b08a78] text-white font-bold text-[10px] rounded-full flex items-center justify-center border-2 border-white shadow-2xs">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <div className="flex items-center gap-1 min-w-0">
                          <h4
                            className={`text-xs sm:text-sm truncate ${
                              conv.unreadCount > 0
                                ? "font-black text-gray-900"
                                : "font-semibold text-gray-800"
                            }`}
                          >
                            {shopName}
                          </h4>
                          <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
                        </div>
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {formatRelativeTime(conv.lastMessageAt)}
                        </span>
                      </div>

                      <p
                        className={`text-xs truncate ${
                          conv.unreadCount > 0
                            ? "font-bold text-gray-900"
                            : "text-gray-500"
                        }`}
                      >
                        {conv.lastMessageText || "Started inquiry"}
                      </p>

                      {/* Product Tag */}
                      {conv.product?.title && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-[#b08a78] font-semibold truncate">
                          <Tag size={10} className="shrink-0" />
                          <span className="truncate">{conv.product.title}</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CHAT WINDOW */}
        <div
          className={`flex-1 min-w-0 flex flex-col h-full bg-white overflow-hidden ${
            !mobileThreadOpen ? "hidden md:flex" : "flex"
          }`}
        >
          {activeConversation ? (
            <>
              {/* CHAT HEADER */}
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-white shrink-0 shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => setMobileThreadOpen(false)}
                    className="md:hidden p-1.5 -ml-1 rounded-lg text-gray-600 hover:bg-gray-100 transition"
                    title="Back to conversations"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  <div className="w-9 h-9 rounded-2xl bg-amber-50 text-[#b08a78] font-bold text-sm flex items-center justify-center border border-amber-200/60 shadow-2xs shrink-0">
                    <Store size={17} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-sm text-gray-900 truncate">
                        {activeConversation.seller?.shopName || "Seller"}
                      </h3>
                      <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                    </div>
                    <p className="text-[11px] text-gray-400 truncate">
                      Verified Gazaarabia Seller &bull; Online
                    </p>
                  </div>
                </div>

                {activeConversation.product?.slug && (
                  <Link
                    href={`/products/${activeConversation.product.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-[#b08a78] hover:bg-[#b08a78] hover:text-white transition shadow-2xs shrink-0"
                  >
                    <ExternalLink size={13} />
                    <span className="hidden sm:inline">Product Page</span>
                  </Link>
                )}
              </div>

              {/* PINNED PRODUCT CARD */}
              {activeConversation.product && (
                <div className="p-3 bg-amber-50/50 border-b border-amber-100 shrink-0">
                  <ProductContextCard
                    product={activeConversation.product}
                    isPinned={true}
                  />
                </div>
              )}

              {/* MESSAGE THREAD */}
              <div
                ref={messageContainerRef}
                className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#fbfcfc] overscroll-contain"
              >
                {loadingMessages ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                    <Loader2 size={24} className="animate-spin text-[#b08a78]" />
                    <span className="text-xs">Loading chat...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
                    <MessageSquare size={32} className="text-gray-300 mb-2" />
                    <p className="text-xs sm:text-sm font-semibold text-gray-700">
                      No messages yet
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Type your question below to chat directly with {activeConversation.seller?.shopName}.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isCustomer = msg.senderRole === "customer";

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isCustomer ? "items-end" : "items-start"}`}
                      >
                        {/* Attached Product Card */}
                        {msg.productContext && (
                          <div className="mb-1.5 max-w-sm">
                            <ProductContextCard product={msg.productContext} />
                          </div>
                        )}

                        {/* Store Header above Seller Message */}
                        {!isCustomer && (
                          <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] font-bold text-gray-600">
                            <Store size={12} className="text-[#b08a78]" />
                            <span>{activeConversation.seller?.shopName || "Seller"}</span>
                            <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1 py-0.2 rounded border border-emerald-200/60 font-semibold">
                              Official Store
                            </span>
                          </div>
                        )}

                        <div
                          className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 shadow-2xs space-y-2 ${
                            isCustomer
                              ? "bg-[#b08a78] text-white rounded-tr-none"
                              : "bg-white text-gray-900 border border-gray-200/90 rounded-tl-none"
                          }`}
                        >
                          {/* Attached Photos (with prominent sizing for single/multiple) */}
                          {msg.mediaUrls && msg.mediaUrls.length > 0 && (
                            <div className="w-full">
                              {msg.mediaUrls.length === 1 ? (
                                <div className="w-full max-w-[340px]">
                                  <ChatImage
                                    url={msg.mediaUrls[0]}
                                    isSingle={true}
                                    alt="Chat photo"
                                    onClick={() => setActiveMedia({ type: "image", url: msg.mediaUrls![0] })}
                                  />
                                </div>
                              ) : (
                                <div className="grid grid-cols-2 gap-2 max-w-[340px]">
                                  {msg.mediaUrls.map((url, i) => (
                                    <ChatImage
                                      key={i}
                                      url={url}
                                      isSingle={false}
                                      alt={`Chat photo ${i + 1}`}
                                      onClick={() => setActiveMedia({ type: "image", url })}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Attached Video with responsive video player */}
                          {msg.videoUrl && (
                            <div className="w-full max-w-[340px]">
                              <ChatVideoPlayer url={msg.videoUrl} />
                            </div>
                          )}

                          {/* Text Message */}
                          {msg.text && (
                            <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                              {msg.text}
                            </p>
                          )}

                          {/* Timestamp & Read Receipt */}
                          <div
                            className={`flex items-center gap-1 justify-end text-[10px] ${
                              isCustomer ? "text-white/80" : "text-gray-400"
                            }`}
                          >
                            <span>{formatMessageTime(msg.createdAt)}</span>
                            {isCustomer && (
                              <span>
                                {msg.isRead ? (
                                  <CheckCheck size={12} className="text-sky-300" />
                                ) : (
                                  <Check size={12} className="text-white/70" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* PENDING ATTACHMENTS BAR */}
              {(imagePreviews.length > 0 || videoPreview) && (
                <div className="p-2.5 bg-amber-50/70 border-t border-amber-200/60 flex flex-wrap items-center gap-2 shrink-0">
                  {imagePreviews.map((src, i) => (
                    <div
                      key={i}
                      className="relative w-12 h-12 rounded-xl overflow-hidden border border-gray-200 bg-white"
                    >
                      <img src={src} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(i)}
                        className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 hover:bg-black"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}

                  {videoPreview && (
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-gray-200 bg-black flex items-center justify-center text-white">
                      <Play size={14} className="fill-white" />
                      <button
                        type="button"
                        onClick={handleRemoveVideo}
                        className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full p-0.5"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* BOTTOM REPLY BAR */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 bg-white border-t border-gray-100 flex items-end gap-2.5 shrink-0"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImagesSelect}
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  className="hidden"
                />
                <input
                  type="file"
                  ref={videoInputRef}
                  onChange={handleVideoSelect}
                  accept="video/mp4,video/webm"
                  className="hidden"
                />

                <div className="flex items-center gap-1 text-gray-500 pb-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sending}
                    className="p-2 rounded-xl hover:bg-amber-50 hover:text-[#b08a78] transition"
                    title="Attach images (.jpg, .png, .webp)"
                  >
                    <ImageIcon size={19} />
                  </button>
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    disabled={sending}
                    className="p-2 rounded-xl hover:bg-amber-50 hover:text-[#b08a78] transition"
                    title="Attach video (.mp4, .webm)"
                  >
                    <Video size={19} />
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    rows={1}
                    placeholder="Type your message... (Enter to send)"
                    disabled={sending}
                    className="w-full max-h-24 py-2 px-3 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#b08a78]/30 focus:border-[#b08a78] transition resize-none leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  disabled={
                    sending ||
                    (!inputText.trim() && selectedImages.length === 0 && !selectedVideo)
                  }
                  className="p-2.5 rounded-xl bg-[#b08a78] hover:bg-[#976f5d] text-white font-bold text-xs transition shadow-sm disabled:opacity-40 flex items-center gap-1.5 shrink-0 mb-0.5"
                >
                  {sending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-400">
              <div className="w-16 h-16 rounded-3xl bg-gray-50 flex items-center justify-center text-gray-300 mb-3 border border-gray-100">
                <MessageSquare size={32} />
              </div>
              <h3 className="font-bold text-base text-gray-800">
                Select a Store Chat
              </h3>
              <p className="text-xs text-gray-500 max-w-sm mt-1">
                Choose a conversation from the left to view messages and continue product inquiries with the seller.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      <MediaLightbox media={activeMedia} onClose={() => setActiveMedia(null)} />
    </div>
  );
}
