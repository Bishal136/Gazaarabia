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
  ShieldAlert,
  Headphones,
  Plus,
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
  const [startingAdminChat, setStartingAdminChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Dual-channel Tab: "buyer" (Customer-Seller) vs "admin" (Seller-Admin Support)
  const [channelTab, setChannelTab] = useState<"buyer" | "admin">("buyer");
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
        const data = await chatService.getConversations(token, "all");
        setConversations(data);

        // Auto-select first conversation matching the current channel tab if none selected
        if (isInitial && data.length > 0 && !selectedConvId) {
          const matching = data.find((c) =>
            channelTab === "admin" ? c.type === "seller_admin" : c.type !== "seller_admin"
          );
          if (matching) setSelectedConvId(matching.id);
          else setSelectedConvId(data[0].id);
        }
      } catch (err) {
        console.error("Failed to load seller conversations:", err);
      } finally {
        if (isInitial) setLoading(false);
      }
    },
    [token, selectedConvId, channelTab]
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
        const data = await chatService.getConversations(token, "all");
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

  // Start direct chat with Admin Support
  const handleStartAdminSupport = async () => {
    if (!token || startingAdminChat) return;
    try {
      setStartingAdminChat(true);
      const conv = await chatService.startAdminSupportConversation(token);
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === conv.id);
        return exists ? prev : [conv, ...prev];
      });
      setSelectedConvId(conv.id);
      setChannelTab("admin");
      setMobileChatOpen(true);
    } catch (err: any) {
      alert(err?.message || "Failed to initiate Admin Support chat");
    } finally {
      setStartingAdminChat(false);
    }
  };

  // Active Conversation Object
  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === selectedConvId) || null;
  }, [conversations, selectedConvId]);

  // Filtered Conversations List by Channel Tab (Buyer vs Admin) and search
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      const isSellerAdmin = c.type === "seller_admin";
      if (channelTab === "admin" && !isSellerAdmin) return false;
      if (channelTab === "buyer" && isSellerAdmin) return false;

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
  }, [conversations, channelTab, searchQuery, filterTab]);

  // Count unread for channels
  const unreadCounts = useMemo(() => {
    let buyerUnread = 0;
    let adminUnread = 0;
    conversations.forEach((c) => {
      if (c.unreadCount > 0) {
        if (c.type === "seller_admin") adminUnread += c.unreadCount;
        else buyerUnread += c.unreadCount;
      }
    });
    return { buyerUnread, adminUnread };
  }, [conversations]);

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
    <div className="p-3 sm:p-5 max-w-7xl mx-auto pb-4 space-y-3">
      {/* SAFE TRADING POLICY BANNER */}
      <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs text-amber-900 shadow-2xs">
        <div className="flex items-center gap-2 font-medium">
          <ShieldAlert size={16} className="text-amber-600 shrink-0" />
          <span>
            <strong>Gazaarabia Safe Trading Policy:</strong> Sharing personal phone numbers, WhatsApp, or soliciting payments outside the platform is strictly prohibited. All conversations are monitored by platform administrators.
          </span>
        </div>
      </div>

      {/* 2-COLUMN SPLIT-SCREEN MESSAGING DASHBOARD */}
      <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[640px] h-[calc(100vh-160px)]">
        {/* LEFT COLUMN: CONVERSATION LIST (Sidebar) */}
        <div
          className={`w-full md:w-80 lg:w-96 shrink-0 border-r border-gray-100 flex flex-col h-full bg-[#fbfcfc] ${
            mobileChatOpen ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Channel Tabs: Buyer Inquiries vs Admin Support */}
          <div className="p-3 border-b border-gray-100 bg-white space-y-2.5 shrink-0">
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-100 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setChannelTab("buyer");
                  const firstBuyer = conversations.find((c) => c.type !== "seller_admin");
                  if (firstBuyer) setSelectedConvId(firstBuyer.id);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  channelTab === "buyer"
                    ? "bg-white text-gray-900 shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <User size={14} />
                <span>Buyer Inquiries</span>
                {unreadCounts.buyerUnread > 0 && (
                  <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-black flex items-center justify-center">
                    {unreadCounts.buyerUnread}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setChannelTab("admin");
                  const firstAdmin = conversations.find((c) => c.type === "seller_admin");
                  if (firstAdmin) setSelectedConvId(firstAdmin.id);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  channelTab === "admin"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Headphones size={14} />
                <span>Admin Support</span>
                {unreadCounts.adminUnread > 0 && (
                  <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                    {unreadCounts.adminUnread}
                  </span>
                )}
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  channelTab === "admin"
                    ? "Search admin support notices..."
                    : "Search customers or products..."
                }
                className="w-full pl-9 pr-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#b08a78] focus:border-transparent transition"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFilterTab("all")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  filterTab === "all"
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                All ({filteredConversations.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("unread")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  filterTab === "unread"
                    ? "bg-[#b08a78] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <span>Unread</span>
                {filteredConversations.filter((c) => c.unreadCount > 0).length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                    {filteredConversations.filter((c) => c.unreadCount > 0).length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Conversation List Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 overscroll-contain">
            {channelTab === "admin" && filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-gray-400 flex flex-col items-center justify-center h-full space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200">
                  <Headphones size={24} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-gray-800">No Support Thread Yet</h4>
                  <p className="text-[11px] text-gray-400 mt-1 max-w-xs">
                    Need help with payouts, store policies, or disputes? Connect directly with Gazaarabia Admin Support.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleStartAdminSupport}
                  disabled={startingAdminChat}
                  className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {startingAdminChat ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Plus size={14} />
                  )}
                  <span>Connect with Admin Support</span>
                </button>
              </div>
            ) : filteredConversations.length === 0 ? (
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
                const isSellerAdmin = conv.type === "seller_admin";
                const initial = isSellerAdmin
                  ? "A"
                  : (conv.customer?.name || "C").charAt(0).toUpperCase();

                return (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setSelectedConvId(conv.id);
                      setMobileChatOpen(true);
                    }}
                    className={`w-full text-left p-3.5 flex items-start gap-3 transition-all ${
                      isSelected
                        ? "bg-white border-l-4 border-l-[#b08a78] shadow-xs"
                        : "hover:bg-gray-50/80"
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {isSellerAdmin ? (
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 font-black text-xs flex items-center justify-center border border-indigo-200 shadow-2xs">
                          <Headphones size={18} />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 text-[#b08a78] font-bold text-xs flex items-center justify-center border border-amber-200/60 shadow-2xs">
                          {initial}
                        </div>
                      )}

                      {conv.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-600 text-white font-bold text-[9px] rounded-full flex items-center justify-center border-2 border-white shadow-2xs">
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
                          {isSellerAdmin
                            ? "Platform Admin Support"
                            : conv.customer?.name || "Customer"}
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

                      {/* Badges / Product Tag */}
                      {conv.product?.title && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-[#b08a78] font-semibold truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#b08a78] shrink-0" />
                          <span className="truncate">{conv.product.title}</span>
                        </div>
                      )}
                      {isSellerAdmin && (
                        <div className="mt-1">
                          <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                            Official Support
                          </span>
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
                  <button
                    type="button"
                    onClick={() => setMobileChatOpen(false)}
                    className="md:hidden p-1.5 -ml-1 rounded-lg text-gray-600 hover:bg-gray-100 transition"
                    title="Back to conversations"
                  >
                    <ArrowLeft size={18} />
                  </button>

                  {activeConversation.type === "seller_admin" ? (
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 font-black text-xs flex items-center justify-center border border-indigo-200 shadow-2xs shrink-0">
                      <Headphones size={20} />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 text-[#b08a78] font-bold text-sm flex items-center justify-center border border-amber-200/60 shadow-2xs shrink-0">
                      {(activeConversation.customer?.name || "C").charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-gray-900 truncate">
                        {activeConversation.type === "seller_admin"
                          ? "Gazaarabia Platform Admin Support"
                          : activeConversation.customer?.name || "Customer"}
                      </h3>
                      {activeConversation.type === "seller_admin" ? (
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200 shrink-0">
                          Platform Admin
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 shrink-0">
                          Customer
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 truncate">
                      {activeConversation.type === "seller_admin"
                        ? "Store Policies, Payouts & Technical Inquiries"
                        : activeConversation.customer?.email || "Buyer inquiry"}
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
                      {activeConversation.type === "seller_admin"
                        ? "Type below to ask Platform Admin Support for assistance."
                        : "Reply below to greet the customer and answer their product questions."}
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isSeller = msg.senderRole === "seller";
                    const isAdmin = msg.senderRole === "admin" || Boolean(msg.metadata?.isOfficialIntervention);

                    // Render Official Moderator Intervention Notice
                    if (isAdmin && activeConversation.type !== "seller_admin") {
                      return (
                        <div key={msg.id} className="w-full flex justify-center my-3">
                          <div className="max-w-xl w-full bg-amber-50 border-2 border-amber-300/80 rounded-2xl p-4 shadow-sm text-amber-950">
                            <div className="flex items-center justify-between text-xs font-black text-amber-900 mb-1.5">
                              <span className="flex items-center gap-1.5">
                                <ShieldCheck size={16} className="text-amber-600" />
                                🛡️ OFFICIAL PLATFORM MODERATOR NOTICE
                              </span>
                              <span className="text-[10px] text-amber-700">
                                {formatMessageTime(msg.createdAt)}
                              </span>
                            </div>
                            <p className="text-xs text-amber-950 whitespace-pre-wrap font-medium leading-relaxed">
                              {msg.text}
                            </p>
                            <div className="text-[10px] text-amber-800 text-right mt-1 font-bold">
                              Issued by Gazaarabia Platform Moderation
                            </div>
                          </div>
                        </div>
                      );
                    }

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
                              : isAdmin
                              ? "bg-indigo-50 text-indigo-950 border border-indigo-200 rounded-tl-none"
                              : "bg-white text-gray-900 border border-gray-200/80 rounded-tl-none"
                          }`}
                        >
                          {/* Admin Header if in seller_admin thread */}
                          {isAdmin && (
                            <div className="flex items-center gap-1 text-[10px] text-indigo-700 font-bold mb-1">
                              <ShieldCheck size={12} />
                              <span>Platform Admin Support</span>
                            </div>
                          )}

                          {/* Attached Photos */}
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
                                <div className="grid grid-cols-2 gap-1.5 max-w-[340px]">
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

                          {/* Attached Video */}
                          {msg.videoUrl && (
                            <div className="w-full max-w-[340px]">
                              <ChatVideoPlayer url={msg.videoUrl} />
                            </div>
                          )}

                          {/* Message Text */}
                          {msg.text && (
                            <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                              {msg.text}
                            </p>
                          )}

                          {/* Timestamp and Read Status */}
                          <div
                            className={`flex items-center gap-1 justify-end text-[10px] ${
                              isSeller ? "text-white/80" : "text-gray-400"
                            }`}
                          >
                            <span>{formatMessageTime(msg.createdAt)}</span>
                            {isSeller && (
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

              {/* MEDIA PREVIEW STRIP (BEFORE SENDING) */}
              {(imagePreviews.length > 0 || videoPreview) && (
                <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center gap-3 overflow-x-auto shrink-0">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200 shrink-0">
                      <Image
                        src={preview}
                        alt="Preview"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/70 text-white rounded-full flex items-center justify-center hover:bg-black transition"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}

                  {videoPreview && (
                    <div className="relative w-20 h-16 rounded-xl overflow-hidden border border-gray-200 bg-black flex items-center justify-center shrink-0">
                      <video src={videoPreview} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center text-white">
                        <Play size={16} fill="white" />
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveVideo}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/70 text-white rounded-full flex items-center justify-center hover:bg-black transition"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* MESSAGE COMPOSER INPUT */}
              <div className="p-3 sm:p-4 border-t border-gray-100 bg-white shrink-0">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  {/* Hidden File Inputs */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImagesSelect}
                    accept="image/*"
                    multiple
                    className="hidden"
                  />
                  <input
                    type="file"
                    ref={videoInputRef}
                    onChange={handleVideoSelect}
                    accept="video/*"
                    className="hidden"
                  />

                  {/* Attachment Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 text-gray-500 hover:text-[#b08a78] hover:bg-amber-50 rounded-xl transition"
                      title="Attach Photos"
                    >
                      <ImageIcon size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      className="p-2 text-gray-500 hover:text-[#b08a78] hover:bg-amber-50 rounded-xl transition"
                      title="Attach Video"
                    >
                      <Video size={18} />
                    </button>
                  </div>

                  {/* Text Input */}
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      activeConversation.type === "seller_admin"
                        ? "Ask Gazaarabia Admin Support..."
                        : "Type your reply to customer..."
                    }
                    className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#b08a78] focus:border-transparent transition"
                  />

                  {/* Send Button */}
                  <button
                    type="submit"
                    disabled={
                      sending ||
                      (!inputText.trim() && selectedImages.length === 0 && !selectedVideo)
                    }
                    className="p-2.5 bg-[#b08a78] hover:bg-[#967262] text-white rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs shrink-0"
                  >
                    {sending ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Send size={18} />
                    )}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 p-8">
              <MessageSquare size={36} className="text-gray-300 mb-2" />
              <h4 className="font-bold text-sm text-gray-700">Select a Conversation</h4>
              <p className="text-xs text-gray-400 mt-1 max-w-sm">
                Choose a customer inquiry or connect with Gazaarabia Admin Support from the sidebar.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* LIGHTBOX FOR FULL VIEW MEDIA */}
      {activeMedia && (
        <MediaLightbox
          media={activeMedia}
          onClose={() => setActiveMedia(null)}
        />
      )}
    </div>
  );
}
