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
  User,
  Store,
  ExternalLink,
  ShieldCheck,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { chatService, ChatMessage, ConversationItem, ProductContext } from "@/lib/services/chatService";
import { uploadService } from "@/lib/services/uploadService";
import ProductContextCard from "@/components/chat/ProductContextCard";
import MediaLightbox from "@/components/chat/MediaLightbox";
import { ChatImage, ChatVideoPlayer } from "@/components/chat/ChatMedia";
import SellerLoader from "@/components/seller/SellerLoader";

export default function SellerMessagesPage() {
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
  const [filterTab, setFilterTab] = useState<"all" | "unread">("all");
  const [inputText, setInputText] = useState("");
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  // Media attachments
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

  // Isolated scroll to bottom that never scrolls page or parent containers
  const scrollToBottom = useCallback((smooth = true) => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTo({
        top: messageContainerRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  }, []);

  // 1. Initial Load of Conversations
  const loadConversations = useCallback(
    async (isInitial = false) => {
      if (!token) return;
      try {
        if (isInitial) setLoading(true);
        const data = await chatService.getConversations(token);
        setConversations(data);

        // Auto-select first conversation on desktop if none selected
        if (isInitial && data.length > 0 && !selectedConvId) {
          setSelectedConvId(data[0].id);
        }
      } catch (err) {
        console.error("Failed to load seller conversations:", err);
      } finally {
        if (isInitial) setLoading(false);
      }
    },
    [token, selectedConvId]
  );

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace(ROUTES.SELLER.LOGIN);
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

        // Clear unread count locally for this conversation
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

  // 3. Real-time Polling for active conversation and conversation list
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
        // Silently continue
      }
    };

    pollTimerRef.current = setInterval(poll, 2500);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [token, selectedConvId, scrollToBottom]);

  // Active Conversation Object
  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === selectedConvId) || null;
  }, [conversations, selectedConvId]);

  // Filtered Conversations List
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        c.customer?.name?.toLowerCase().includes(q) ||
        c.product?.title?.toLowerCase().includes(q) ||
        c.lastMessageText?.toLowerCase().includes(q);

      if (filterTab === "unread") {
        return matchesSearch && c.unreadCount > 0;
      }
      return matchesSearch;
    });
  }, [conversations, searchQuery, filterTab]);

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

  // Send Seller Reply
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
        receiverId: activeConversation?.customerId || 0,
        senderRole: "seller",
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

  if (loading) {
    return <SellerLoader />;
  }

  return (
    <div className="p-3 sm:p-5 max-w-7xl mx-auto pb-4">
      {/* 2-COLUMN SPLIT-SCREEN MESSAGING DASHBOARD */}
      <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[640px] h-[calc(100vh-120px)]">
        {/* LEFT COLUMN: CONVERSATION LIST (Sidebar) */}
        <div
          className={`w-full md:w-80 lg:w-96 shrink-0 border-r border-gray-100 flex flex-col h-full bg-[#fbfcfc] ${
            mobileChatOpen ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Search & Filter Tabs */}
          <div className="p-4 border-b border-gray-100 space-y-3 bg-white shrink-0">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customers or products..."
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#b08a78] focus:border-transparent transition"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFilterTab("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  filterTab === "all"
                    ? "bg-gray-900 text-white shadow-2xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                All ({conversations.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("unread")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  filterTab === "unread"
                    ? "bg-[#b08a78] text-white shadow-2xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <span>Unread</span>
                {conversations.filter((c) => c.unreadCount > 0).length > 0 && (
                  <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                    {conversations.filter((c) => c.unreadCount > 0).length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Conversation List Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 overscroll-contain">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-gray-400 flex flex-col items-center justify-center h-full">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 mb-2">
                  <MessageSquare size={22} />
                </div>
                <p className="text-xs sm:text-sm font-semibold text-gray-700">
                  No conversations found
                </p>
                <p className="text-[11px] text-gray-400 mt-1 max-w-xs">
                  When customers send inquiries on your products, they will appear here.
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === selectedConvId;
                const initial = (conv.customer?.name || "C").charAt(0).toUpperCase();

                return (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setSelectedConvId(conv.id);
                      setMobileChatOpen(true);
                    }}
                    className={`w-full text-left p-4 flex items-start gap-3 transition-all ${
                      isSelected
                        ? "bg-white border-l-4 border-l-[#b08a78] shadow-xs"
                        : "hover:bg-gray-50/80"
                    }`}
                  >
                    {/* Customer Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-2xl bg-amber-50 text-[#b08a78] font-bold text-sm flex items-center justify-center border border-amber-200/60 shadow-2xs">
                        {initial}
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-600 text-white font-bold text-[10px] rounded-full flex items-center justify-center border-2 border-white shadow-2xs">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4
                          className={`text-xs sm:text-sm truncate ${
                            conv.unreadCount > 0
                              ? "font-black text-gray-900"
                              : "font-semibold text-gray-800"
                          }`}
                        >
                          {conv.customer?.name || "Customer"}
                        </h4>
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
                        {conv.lastMessageText || "Started a conversation"}
                      </p>

                      {/* Product Tag */}
                      {conv.product?.title && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-[#b08a78] font-semibold truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#b08a78] shrink-0" />
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
            !mobileChatOpen ? "hidden md:flex" : "flex"
          }`}
        >
          {activeConversation ? (
            <>
              {/* CHAT HEADER */}
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0 shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    type="button"
                    onClick={() => setMobileChatOpen(false)}
                    className="md:hidden p-1.5 -ml-1 rounded-lg text-gray-600 hover:bg-gray-100 transition"
                    title="Back to conversations"
                  >
                    <ArrowLeft size={18} />
                  </button>

                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-[#b08a78] font-bold text-sm flex items-center justify-center border border-amber-200/60 shadow-2xs shrink-0">
                    {(activeConversation.customer?.name || "C").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-gray-900 truncate">
                        {activeConversation.customer?.name || "Customer"}
                      </h3>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 shrink-0">
                        Customer
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 truncate">
                      {activeConversation.customer?.email || "Buyer inquiry"}
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
                    <span className="hidden sm:inline">View Product</span>
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

              {/* MESSAGE THREAD CONTAINER */}
              <div
                ref={messageContainerRef}
                className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 bg-[#fbfcfc] overscroll-contain"
              >
                {loadingMessages ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                    <Loader2 size={24} className="animate-spin text-[#b08a78]" />
                    <span className="text-xs">Loading message history...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
                    <MessageSquare size={32} className="text-gray-300 mb-2" />
                    <p className="text-xs sm:text-sm font-semibold text-gray-700">
                      No messages in this chat yet
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Reply below to greet the customer and answer their product questions.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isSeller = msg.senderRole === "seller";

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isSeller ? "items-end" : "items-start"}`}
                      >
                        {/* Attached Product Context Card */}
                        {msg.productContext && (
                          <div className="mb-1 max-w-sm">
                            <ProductContextCard product={msg.productContext} />
                          </div>
                        )}

                        <div
                          className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-3 shadow-2xs space-y-2 ${
                            isSeller
                              ? "bg-[#b08a78] text-white rounded-tr-none"
                              : "bg-white text-gray-900 border border-gray-200/80 rounded-tl-none"
                          }`}
                        >
                          {/* Attached Photos with graceful fallback */}
                          {msg.mediaUrls && msg.mediaUrls.length > 0 && (
                            <div className="w-full">
                              {msg.mediaUrls.length === 1 ? (
                                <div className="w-full max-w-[340px]">
                                  <ChatImage
                                    url={msg.mediaUrls[0]}
                                    isSingle={true}
                                    alt="Chat attachment"
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
                                      alt={`Chat attachment ${i + 1}`}
                                      onClick={() => setActiveMedia({ type: "image", url })}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Attached Video with error handling */}
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
                              isSeller ? "text-white/80" : "text-gray-400"
                            }`}
                          >
                            <span>{formatMessageTime(msg.createdAt)}</span>
                            {isSeller && (
                              <span>
                                {msg.isRead ? (
                                  <CheckCheck size={13} className="text-sky-300" />
                                ) : (
                                  <Check size={13} className="text-white/70" />
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

              {/* PENDING ATTACHMENTS PREVIEW BAR */}
              {(imagePreviews.length > 0 || videoPreview) && (
                <div className="p-3 bg-amber-50/70 border-t border-amber-200/60 flex flex-wrap items-center gap-2.5 shrink-0">
                  <span className="text-[11px] font-bold text-amber-900 uppercase">
                    Ready to send:
                  </span>
                  {imagePreviews.map((src, i) => (
                    <div
                      key={i}
                      className="relative w-14 h-14 rounded-xl overflow-hidden border border-gray-200 bg-white"
                    >
                      <img src={src} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(i)}
                        className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 hover:bg-black"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}

                  {videoPreview && (
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-gray-200 bg-black flex items-center justify-center text-white">
                      <Play size={16} className="fill-white" />
                      <button
                        type="button"
                        onClick={handleRemoveVideo}
                        className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full p-0.5"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* BOTTOM REPLY BAR */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 sm:p-4 bg-white border-t border-gray-100 flex items-end gap-2.5 shrink-0"
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
                    className="p-2 rounded-xl hover:bg-gray-100 hover:text-gray-800 transition"
                    title="Attach customer photos (.jpg, .png, .webp)"
                  >
                    <ImageIcon size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    disabled={sending}
                    className="p-2 rounded-xl hover:bg-gray-100 hover:text-gray-800 transition"
                    title="Attach short product video (.mp4, .webm)"
                  >
                    <Video size={20} />
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
                    placeholder="Type a reply to customer... (Press Enter to send)"
                    disabled={sending}
                    className="w-full max-h-28 py-2.5 px-3.5 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#b08a78] focus:border-transparent transition resize-none leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  disabled={
                    sending ||
                    (!inputText.trim() && selectedImages.length === 0 && !selectedVideo)
                  }
                  className="px-4 sm:px-5 py-2.5 rounded-2xl bg-[#b08a78] hover:bg-[#976f5d] text-white font-bold text-xs sm:text-sm transition shadow-sm disabled:opacity-40 flex items-center gap-2 shrink-0 mb-0.5"
                >
                  {sending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Send size={15} />
                      <span className="hidden sm:inline">Send Reply</span>
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            /* Empty selection state */
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-400">
              <div className="w-16 h-16 rounded-3xl bg-gray-50 flex items-center justify-center text-gray-300 mb-3 border border-gray-100">
                <MessageSquare size={32} />
              </div>
              <h3 className="font-bold text-base text-gray-800">
                Select a Customer Conversation
              </h3>
              <p className="text-xs text-gray-500 max-w-sm mt-1">
                Choose a conversation from the left sidebar to view buyer inquiries, inspect attached products, and reply with photos or videos.
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
