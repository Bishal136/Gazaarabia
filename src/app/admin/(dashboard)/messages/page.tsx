"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Search,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Send,
  User,
  Store,
  ExternalLink,
  Loader2,
  ArrowLeft,
  X,
  Plus,
  RefreshCw,
  Phone,
  Mail,
  ChevronRight,
  Headphones,
  Tag,
  AlertTriangle,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { chatService, ChatMessage, ConversationItem, ProductContext } from "@/lib/services/chatService";
import ProductContextCard from "@/components/chat/ProductContextCard";
import MediaLightbox from "@/components/chat/MediaLightbox";
import { ChatImage, ChatVideoPlayer } from "@/components/chat/ChatMedia";

export default function AdminMessagesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const token = session?.user?.token;

  // SSR Hydration Mount Guard
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Conversations & Selected Thread
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [activeDetails, setActiveDetails] = useState<any | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [stats, setStats] = useState({
    totalAll: 0,
    totalFlagged: 0,
    totalSellerAdmin: 0,
    totalCustomerSeller: 0,
    totalUnreadAdmin: 0,
  });

  // Loading states
  const [loading, setLoading] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "disputes" | "seller" | "buyer">("all");

  // Pane & Layout Toggles
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);

  // Composer State
  const [composerMode, setComposerMode] = useState<"intervention" | "note">("intervention");
  const [composerText, setComposerText] = useState("");

  // Start Seller Chat Modal
  const [isStartChatModalOpen, setIsStartChatModalOpen] = useState(false);
  const [sellersList, setSellersList] = useState<any[]>([]);
  const [loadingSellers, setLoadingSellers] = useState(false);
  const [sellerSearch, setSellerSearch] = useState("");
  const [modalOpeningMessage, setModalOpeningMessage] = useState("");
  const [selectedSellerForModal, setSelectedSellerForModal] = useState<any | null>(null);

  // Lightbox
  const [activeMedia, setActiveMedia] = useState<{ type: "image" | "video"; url: string } | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const messageContainerRef = useRef<HTMLDivElement>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTo({
        top: messageContainerRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  }, []);

  // 1. Fetch Conversations with Stats
  const fetchConversations = useCallback(
    async (silent = false) => {
      if (!token) return;
      try {
        if (!silent) setLoading(true);

        const typeParam =
          activeFilter === "seller"
            ? "seller_admin"
            : activeFilter === "buyer"
            ? "customer_seller"
            : undefined;

        const statusParam = activeFilter === "disputes" ? "flagged" : undefined;

        const result = await chatService.getAdminConversations(
          {
            type: typeParam,
            status: statusParam,
            search: searchQuery,
            limit: 50,
          },
          token
        );

        setConversations(result.data || []);
        if (result.stats) setStats(result.stats);

        // Auto-select first thread if nothing is selected yet
        if (!selectedConvId && result.data && result.data.length > 0) {
          setSelectedConvId(result.data[0].id);
        }
      } catch (err) {
        console.error("Failed to load admin conversations:", err);
      } finally {
        if (!silent) setLoading(false);
        setRefreshing(false);
      }
    },
    [token, activeFilter, searchQuery, selectedConvId]
  );

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated" || session?.user?.role?.toLowerCase() !== "admin") {
      router.replace("/admin/login");
    } else if (token) {
      fetchConversations(false);
    }
  }, [status, token, session, router, fetchConversations]);

  // 2. Fetch Thread Messages and Full Dossier
  const fetchActiveThread = useCallback(
    async (convId: number, silent = false) => {
      if (!token || !convId) return;
      try {
        if (!silent) setLoadingThread(true);
        const details = await chatService.getAdminConversationDetails(convId, token);
        setActiveDetails(details.data);
        setMessages(details.data.messages || []);
        setTimeout(() => scrollToBottom(silent), 40);
      } catch (err) {
        console.error("Failed to fetch thread details:", err);
      } finally {
        if (!silent) setLoadingThread(false);
      }
    },
    [token, scrollToBottom]
  );

  useEffect(() => {
    if (selectedConvId) {
      fetchActiveThread(selectedConvId, false);
    }
  }, [selectedConvId, fetchActiveThread]);

  // 3. Real-Time Auto-Refresh Polling (every 3 seconds)
  useEffect(() => {
    if (!token) return;

    pollTimerRef.current = setInterval(() => {
      fetchConversations(true);
      if (selectedConvId) {
        fetchActiveThread(selectedConvId, true);
      }
    }, 3000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [token, selectedConvId, fetchConversations, fetchActiveThread]);

  // Handle Sending Message or Note
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedConvId || !token || sending) return;
    const text = composerText.trim();
    if (!text) return;

    try {
      setSending(true);
      if (composerMode === "intervention") {
        const msg = await chatService.sendAdminIntervention(selectedConvId, text, token);
        setMessages((prev) => [...prev, msg]);
        showToast("Official moderator notice posted");
      } else {
        const note = await chatService.addAdminNote(selectedConvId, text, token);
        const noteMsg: ChatMessage = {
          id: note.id,
          conversationId: selectedConvId,
          senderId: session?.user?.id ? Number(session.user.id) : 0,
          senderRole: "admin",
          isInternalAdminNote: true,
          text: note.note,
          mediaType: "system_notice",
          isRead: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, noteMsg]);
        if (activeDetails?.conversation) {
          activeDetails.conversation.adminNotes = [
            ...(activeDetails.conversation.adminNotes || []),
            note,
          ];
        }
        showToast("Internal staff note saved");
      }
      setComposerText("");
      setTimeout(() => scrollToBottom(true), 30);
      fetchConversations(true);
    } catch (err: any) {
      alert(err?.message || "Failed to submit admin action");
    } finally {
      setSending(false);
    }
  };

  // Flag/Unflag Action
  const handleToggleFlag = async () => {
    if (!selectedConvId || !token) return;
    const isCurrentlyFlagged = activeDetails?.conversation?.isFlagged;
    let reason = "";
    if (!isCurrentlyFlagged) {
      reason = prompt("Enter reason for flagging this conversation (optional):") || "Flagged for manual investigation";
    }

    try {
      await chatService.flagConversation(selectedConvId, !isCurrentlyFlagged, reason, token);
      if (activeDetails?.conversation) {
        activeDetails.conversation.isFlagged = !isCurrentlyFlagged;
        activeDetails.conversation.status = !isCurrentlyFlagged ? "flagged" : "active";
        activeDetails.conversation.flagReason = !isCurrentlyFlagged ? reason : null;
      }
      showToast(
        !isCurrentlyFlagged
          ? `Thread #${selectedConvId} flagged as dispute`
          : `Dispute flag cleared on Thread #${selectedConvId}`
      );
      fetchConversations(true);
    } catch (err: any) {
      alert(err?.message || "Failed to update flag");
    }
  };

  // Resolve/Re-open Action
  const handleToggleResolve = async () => {
    if (!selectedConvId || !token) return;
    const isResolved = activeDetails?.conversation?.status === "resolved";
    try {
      await chatService.resolveConversation(selectedConvId, !isResolved, token);
      if (activeDetails?.conversation) {
        activeDetails.conversation.status = !isResolved ? "resolved" : "active";
        if (!isResolved) activeDetails.conversation.isFlagged = false;
      }
      showToast(`Thread #${selectedConvId} marked ${!isResolved ? "Resolved" : "Open"}`);
      fetchConversations(true);
    } catch (err: any) {
      alert(err?.message || "Failed to update status");
    }
  };

  // Load Sellers for "Start Chat with Seller" modal
  const openStartSellerChatModal = async () => {
    setIsStartChatModalOpen(true);
    setSelectedSellerForModal(null);
    setModalOpeningMessage("");
    if (sellersList.length === 0) {
      try {
        setLoadingSellers(true);
        const res = await fetch("/api/seller?limit=50", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        setSellersList(json.sellers || []);
      } catch (err) {
        console.error("Failed to load sellers:", err);
      } finally {
        setLoadingSellers(false);
      }
    }
  };

  const handleStartChatWithSeller = async () => {
    if (!token || !selectedSellerForModal) return;
    try {
      setSending(true);
      const conv = await chatService.startAdminSellerChat(selectedSellerForModal.id, token);
      if (modalOpeningMessage.trim()) {
        await chatService.sendAdminIntervention(conv.id, modalOpeningMessage.trim(), token);
      }
      setIsStartChatModalOpen(false);
      setSelectedConvId(conv.id);
      setActiveFilter("seller");
      showToast(`Started thread with ${selectedSellerForModal.shopName || selectedSellerForModal.name}`);
      await fetchConversations(false);
    } catch (err: any) {
      alert(err?.message || "Failed to start seller chat");
    } finally {
      setSending(false);
    }
  };

  // Filtered sellers for modal
  const filteredSellers = useMemo(() => {
    if (!sellerSearch.trim()) return sellersList;
    const q = sellerSearch.toLowerCase();
    return sellersList.filter(
      (s) =>
        s.shopName?.toLowerCase().includes(q) ||
        s.name?.toLowerCase().includes(q) ||
        s.user?.email?.toLowerCase().includes(q)
    );
  }, [sellersList, sellerSearch]);

  const formatMessageTime = (dateStr: string) => {
    if (!mounted || !dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatRelativeTime = (dateStr?: string) => {
    if (!mounted || !dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(dateStr).toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const cleanLastMessagePreview = (text?: string) => {
    if (!text) return "New conversation started";
    return text
      .replace(/^🛡️\s*Moderator:\s*(Official\s+Moderator\s+Notice:|Moderator\s+Notice:|Official\s+Notice:|Resolution\s+Notice:)\s*/i, "🛡️ Moderator: ")
      .replace(/^(Official\s+Moderator\s+Notice:|Moderator\s+Notice:|Official\s+Notice:)\s*/i, "🛡️ Moderator: ");
  };

  const cleanModeratorNoticeBody = (text?: string) => {
    if (!text) return "";
    return text.replace(/^(Official\s+Moderator\s+Notice:|Moderator\s+Notice:|Official\s+Notice:|Resolution\s+Notice:)\s*/i, "");
  };

  const isSuspiciousText = (text?: string) => {
    if (!text) return false;
    return /(whatsapp|paypal|@|telegram|bank\s*transfer|off-platform|venmo|cashapp)/i.test(text);
  };

  // Filter tabs config
  const tabs = [
    { id: "all", label: "All", count: stats.totalAll },
    { id: "disputes", label: "Disputes", count: stats.totalFlagged },
    { id: "seller", label: "Seller Support", count: stats.totalSellerAdmin },
    { id: "buyer", label: "Buyer Inquiries", count: stats.totalCustomerSeller },
  ] as const;

  if (!mounted || (loading && conversations.length === 0)) {
    return (
      <div
        suppressHydrationWarning
        className="flex flex-col items-center justify-center h-full w-full gap-3 bg-[#f5f6fa]"
      >
        <Loader2 size={28} className="animate-spin text-[var(--brand-primary)]" />
        <p suppressHydrationWarning className="text-sm font-medium text-slate-600">
          Loading conversations...
        </p>
      </div>
    );
  }

  return (
    <div
      suppressHydrationWarning
      className="h-full w-full overflow-hidden flex flex-col bg-[#f5f6fa] text-[var(--text-primary)]"
    >
      {/* Top Header - Matches Gazaarabia AdminHeader.tsx */}
      <header className="bg-white border-b border-[var(--soft-gray)] px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-sm shrink-0 z-20">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">
              Live Chat &amp; Monitoring
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-[var(--brand-secondary)] border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-secondary)] animate-pulse" />
              Live
            </span>
          </div>
          <p className="text-sm text-[var(--text-muted)] mt-0.5 leading-tight hidden sm:block">
            Audit buyer-seller interactions, resolve disputes, and support sellers in real time.
          </p>
        </div>

        {/* Right: Filter Tabs, Refresh & Action CTA */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <nav
            className="inline-flex items-center p-1 bg-[#f1f5f9] rounded-xl border border-slate-200/80"
            aria-label="Conversation filters"
          >
            {tabs.map((tab) => {
              const active = activeFilter === tab.id;
              const isDispute = tab.id === "disputes";
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFilter(tab.id)}
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                    active
                      ? "bg-[#1E2A4A] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`tabular-nums text-[11px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
                      active
                        ? "bg-white/20 text-white"
                        : isDispute && tab.count > 0
                        ? "bg-rose-100 text-[#E82C3F]"
                        : "bg-slate-200/90 text-slate-700"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              fetchConversations(false);
              showToast("Queue synced");
            }}
            title="Refresh queue"
            className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition shadow-sm"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin text-[#E82C3F]" : ""} />
          </button>

          <button
            type="button"
            onClick={openStartSellerChatModal}
            className="h-9 px-4 inline-flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-secondary)] text-white text-sm font-medium shadow-sm transition"
          >
            <Plus size={16} />
            <span>New Seller Chat</span>
          </button>
        </div>
      </header>

      {/* Main Framed Card Workspace (Matches DashboardPage / OrdersPage Canvas) */}
      <div className="flex-1 min-h-0 p-3 sm:p-4 lg:p-5 overflow-hidden flex flex-col">
        <div className="flex-1 flex min-h-0 overflow-hidden bg-white rounded-2xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          {/* Pane 1: Conversation List (Using div to preserve body font family) */}
          <div
            className={`w-full md:w-80 lg:w-[320px] shrink-0 border-r border-slate-200 flex flex-col bg-white min-h-0 ${
              mobileChatOpen ? "hidden md:flex" : "flex"
            }`}
          >
            {/* Search Header */}
            <div className="p-3.5 border-b border-slate-200 bg-white shrink-0">
              <div className="relative">
                <Search size={15} className="text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search customers, stores, messages..."
                  className="no-focus-ring w-full h-9 pl-9 pr-3 text-sm bg-[#f8fafc] border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#1E2A4A] transition-colors"
                />
              </div>
            </div>

            {/* Thread List Items */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden divide-y divide-slate-100 overscroll-contain">
              {conversations.length === 0 ? (
                <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center h-full">
                  <MessageSquare size={26} className="text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No conversations found</p>
                  <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search term.</p>
                </div>
              ) : (
                conversations.map((conv) => {
                  const selected = conv.id === selectedConvId;
                  const isSellerAdmin = conv.type === "seller_admin";
                  const isFlagged = conv.isFlagged || conv.status === "flagged";
                  const isResolved = conv.status === "resolved";
                  const customerName = conv.customer?.name || "Customer";
                  const storeName = conv.seller?.shopName || conv.seller?.storeName || "Seller Store";
                  const notesCount = conv.adminNotes?.length || 0;

                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => {
                        setSelectedConvId(conv.id);
                        setMobileChatOpen(true);
                      }}
                      className={`w-full text-left p-3.5 transition-all relative block ${
                        selected
                          ? "bg-[#f8fafc] border-l-4 border-l-[#E82C3F]"
                          : "bg-white hover:bg-slate-50/80 border-l-4 border-l-transparent"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Channel Avatar */}
                          <div className="relative shrink-0">
                            {isSellerAdmin ? (
                              <div className="w-9 h-9 rounded-full bg-[#1E2A4A]/10 text-[#1E2A4A] font-semibold text-xs flex items-center justify-center border border-[#1E2A4A]/20">
                                <Headphones size={15} />
                              </div>
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-semibold text-xs flex items-center justify-center border border-slate-200">
                                {customerName.charAt(0).toUpperCase()}
                              </div>
                            )}

                            {/* Status Dot on Avatar */}
                            {isFlagged ? (
                              <span
                                className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#E82C3F] rounded-full border-2 border-white"
                                title="Dispute Flagged"
                              />
                            ) : isResolved ? (
                              <span
                                className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#009639] rounded-full border-2 border-white"
                                title="Resolved"
                              />
                            ) : null}
                          </div>

                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate leading-snug">
                              {isSellerAdmin ? storeName : customerName}
                            </p>
                            <p className="text-xs text-slate-500 flex items-center gap-1 truncate mt-0.5">
                              {isSellerAdmin ? (
                                <span className="text-[#1E2A4A] font-medium">Seller Support Channel</span>
                              ) : (
                                <>
                                  <Store size={12} className="text-slate-400 shrink-0" />
                                  <span className="truncate">{storeName}</span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        <span suppressHydrationWarning className="text-xs text-slate-400 shrink-0 tabular-nums">
                          {formatRelativeTime(conv.lastMessageAt)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 truncate mt-2 pl-12">
                        {cleanLastMessagePreview(conv.lastMessageText)}
                      </p>

                      {/* Status Tags */}
                      <div className="mt-2 pl-12 flex items-center gap-1.5 flex-wrap">
                        {isFlagged && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#E82C3F] bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#E82C3F]" />
                            Disputed
                          </span>
                        )}
                        {isResolved && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#009639] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#009639]" />
                            Resolved
                          </span>
                        )}
                        {!isFlagged && !isResolved && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                            Open
                          </span>
                        )}

                        {notesCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1E2A4A] bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            <Lock size={10} />
                            <span>{notesCount} {notesCount === 1 ? "note" : "notes"}</span>
                          </span>
                        )}

                        {conv.product?.title && (
                          <span className="text-[11px] text-slate-400 truncate max-w-[130px]">
                            • {conv.product.title}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Pane 2: Active Conversation Stream */}
          <div
            className={`flex-1 flex-col min-w-0 min-h-0 bg-white ${
              mobileChatOpen ? "flex" : "hidden md:flex"
            }`}
          >
            {activeDetails ? (
              <>
                {/* Thread Header */}
                <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3 bg-white shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => setMobileChatOpen(false)}
                      className="md:hidden h-9 w-9 inline-flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                      <ArrowLeft size={16} />
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-base font-bold text-slate-900 truncate">
                          {activeDetails.conversation.type === "seller_admin" ? (
                            <span>Seller Support / {activeDetails.seller?.shopName || "Seller Store"}</span>
                          ) : (
                            <span>
                              {activeDetails.customer?.name || "Customer"} &amp; {activeDetails.seller?.shopName || "Seller Store"}
                            </span>
                          )}
                        </h2>

                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                            activeDetails.conversation.isFlagged
                              ? "bg-rose-50 text-[#E82C3F] border-rose-200"
                              : activeDetails.conversation.status === "resolved"
                              ? "bg-emerald-50 text-[#009639] border-emerald-200"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              activeDetails.conversation.isFlagged
                                ? "bg-[#E82C3F]"
                                : activeDetails.conversation.status === "resolved"
                                ? "bg-[#009639]"
                                : "bg-slate-500"
                            }`}
                          />
                          <span>
                            {activeDetails.conversation.isFlagged
                              ? "Disputed"
                              : activeDetails.conversation.status === "resolved"
                              ? "Resolved"
                              : "Open"}
                          </span>
                        </span>
                      </div>

                      <p suppressHydrationWarning className="text-xs text-slate-500 mt-0.5 tabular-nums truncate">
                        Thread #{activeDetails.conversation.id} • Started{" "}
                        {new Date(activeDetails.conversation.createdAt).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                        {activeDetails.product?.title ? ` • ${activeDetails.product.title}` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Thread Action Buttons - Valid Tailwind v3 heights & widths */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleToggleFlag}
                      className={`h-9 px-3.5 inline-flex items-center gap-1.5 rounded-xl border text-xs font-semibold transition shadow-sm ${
                        activeDetails.conversation.isFlagged
                          ? "bg-rose-50 text-[#E82C3F] border-rose-200 hover:bg-rose-100"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <ShieldAlert size={14} className={activeDetails.conversation.isFlagged ? "text-[#E82C3F]" : "text-slate-500"} />
                      <span>{activeDetails.conversation.isFlagged ? "Clear Dispute" : "Flag Dispute"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleResolve}
                      className={`h-9 px-4 inline-flex items-center gap-1.5 rounded-xl text-xs font-semibold transition shadow-sm ${
                        activeDetails.conversation.status === "resolved"
                          ? "bg-[#1E2A4A] hover:bg-slate-800 text-white"
                          : "bg-[#009639] hover:bg-[#007a2e] text-white"
                      }`}
                    >
                      <CheckCircle2 size={14} />
                      <span>{activeDetails.conversation.status === "resolved" ? "Reopen" : "Resolve"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setInspectorOpen(!inspectorOpen)}
                      title="Toggle participant details"
                      className={`h-9 w-9 inline-flex items-center justify-center rounded-xl border transition shadow-sm ${
                        inspectorOpen
                          ? "border-[#1E2A4A]/30 bg-slate-100 text-[#1E2A4A]"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <User size={15} />
                    </button>
                  </div>
                </div>

                {/* AUTOMATED SUSPICIOUS SCAM WARNING BANNER */}
                {activeDetails.conversation.isFlagged && (
                  <div className="bg-rose-50 border-b border-rose-200 px-6 py-2.5 flex items-center justify-between gap-3 text-rose-950 shrink-0">
                    <div className="flex items-center gap-2 text-xs font-medium">
                      <AlertTriangle size={15} className="text-[#E82C3F] shrink-0" />
                      <span>
                        <strong>Policy Alert:</strong>{" "}
                        {activeDetails.conversation.flagReason || "Off-platform transaction or contact information detected."}
                      </span>
                    </div>
                    <button
                      onClick={handleToggleFlag}
                      className="text-xs font-semibold text-[#E82C3F] underline hover:text-rose-900 shrink-0"
                    >
                      Dismiss Flag
                    </button>
                  </div>
                )}

                {/* Messages Stream */}
                <div
                  ref={messageContainerRef}
                  className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 py-5 space-y-4 bg-[#f8fafc] overscroll-contain"
                >
                  {loadingThread ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                      <Loader2 size={24} className="animate-spin text-[#E82C3F]" />
                      <span className="text-sm font-medium text-slate-500">Loading thread history...</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
                      <MessageSquare size={34} className="text-slate-300 mb-2" />
                      <p className="text-sm font-semibold text-slate-700">No messages in this thread</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isInternal = msg.isInternalAdminNote;
                      const isModerator = msg.senderRole === "admin" && !isInternal;
                      const isCustomer = msg.senderRole === "customer";
                      const isSeller = msg.senderRole === "seller";

                      // 1. Admin Public Message / Official Moderator Notice (Right-Aligned like WhatsApp)
                      if (isModerator) {
                        return (
                          <div key={msg.id} className="flex flex-col items-end">
                            <div className="text-xs text-slate-500 mb-1 px-1 flex items-center justify-end gap-1.5">
                              <span className="font-semibold text-slate-800">Gazaarabia Admin</span>
                              <span className="text-slate-300">•</span>
                              <span suppressHydrationWarning className="text-xs text-slate-400 tabular-nums">
                                {formatMessageTime(msg.createdAt)}
                              </span>
                            </div>

                            <div className="flex items-end justify-end gap-2.5 max-w-[85%] sm:max-w-[70%]">
                              <div className="bg-white border border-rose-200/90 border-l-4 border-l-[#E82C3F] rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-rose-50 text-[#E82C3F]">
                                    <ShieldCheck size={13} />
                                  </span>
                                  <span className="text-xs font-bold text-slate-900">
                                    Official Moderator Notice
                                  </span>
                                  <span className="text-[11px] font-medium text-[#009639] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/70">
                                    Visible to buyer &amp; seller
                                  </span>
                                </div>
                                <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                                  {cleanModeratorNoticeBody(msg.text)}
                                </p>
                              </div>

                              <div className="w-8 h-8 rounded-full bg-[#E82C3F] text-white font-semibold text-xs flex items-center justify-center shrink-0 mb-0.5 shadow-sm">
                                <ShieldCheck size={14} />
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // 2. Admin Internal Staff Note (Right-Aligned like WhatsApp)
                      if (isInternal) {
                        return (
                          <div key={msg.id} className="flex flex-col items-end">
                            <div className="text-xs text-slate-500 mb-1 px-1 flex items-center justify-end gap-1.5">
                              <span className="font-semibold text-[#1E2A4A]">
                                {msg.metadata?.adminName || "Super Admin"}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span suppressHydrationWarning className="text-xs text-slate-400 tabular-nums">
                                {formatMessageTime(msg.createdAt)}
                              </span>
                            </div>

                            <div className="flex items-end justify-end gap-2.5 max-w-[85%] sm:max-w-[70%]">
                              <div className="bg-slate-100/90 border border-slate-200 border-l-4 border-l-[#1E2A4A] rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-[#1E2A4A] text-white">
                                    <Lock size={12} />
                                  </span>
                                  <span className="text-xs font-bold text-[#1E2A4A]">
                                    Internal Staff Note
                                  </span>
                                  <span className="text-[11px] font-medium text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                    Staff only
                                  </span>
                                </div>
                                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                                  {msg.text}
                                </p>
                              </div>

                              <div className="w-8 h-8 rounded-full bg-[#1E2A4A] text-white font-semibold text-xs flex items-center justify-center shrink-0 mb-0.5 shadow-sm">
                                <Lock size={13} />
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // 3. Regular Customer & Seller Messages (Both Left-Aligned like Incoming WhatsApp Messages)
                      const showPolicyFlagOnMsg =
                        isCustomer && (Boolean(msg.metadata?.isFlagged) || isSuspiciousText(msg.text));

                      return (
                        <div
                          key={msg.id}
                          className="flex flex-col items-start"
                        >
                          {/* Author Tag */}
                          <div className="text-xs text-slate-500 mb-1 px-1 flex items-center justify-start gap-1.5">
                            <span className="font-semibold text-slate-800">
                              {isSeller
                                ? activeDetails.seller?.shopName || "Seller Store"
                                : activeDetails.customer?.name || "Customer"}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                isSeller
                                  ? "bg-[#1E2A4A]/10 text-[#1E2A4A]"
                                  : "bg-slate-200/80 text-slate-700"
                              }`}
                            >
                              {isSeller ? "Seller" : "Customer"}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span suppressHydrationWarning className="text-xs text-slate-400 tabular-nums">
                              {formatMessageTime(msg.createdAt)}
                            </span>
                          </div>

                          {/* Product Card if attached */}
                          {msg.productContext && (
                            <div className="mb-2 ml-10 max-w-sm">
                              <ProductContextCard product={msg.productContext} />
                            </div>
                          )}

                          {/* Bubble and Avatar Layout (Left-Aligned) */}
                          <div className="flex items-end justify-start gap-2.5 max-w-[85%] sm:max-w-[70%]">
                            {isSeller ? (
                              <div className="w-8 h-8 rounded-full bg-[#1E2A4A] text-white font-semibold text-xs flex items-center justify-center shrink-0 mb-0.5 border border-slate-300 shadow-sm">
                                {(activeDetails.seller?.shopName || "S").charAt(0).toUpperCase()}
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-white text-slate-700 font-semibold text-xs flex items-center justify-center shrink-0 mb-0.5 border border-slate-200 shadow-sm">
                                {(activeDetails.customer?.name || "C").charAt(0).toUpperCase()}
                              </div>
                            )}

                            <div className="rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm space-y-2 min-w-0 bg-white text-slate-800 border border-slate-200/90">
                              {/* Attached Media */}
                              {msg.mediaUrls && msg.mediaUrls.length > 0 && (
                                <div className="w-full">
                                  {msg.mediaUrls.length === 1 ? (
                                    <div className="w-full max-w-[280px]">
                                      <ChatImage
                                        url={msg.mediaUrls[0]}
                                        isSingle={true}
                                        alt="Attachment"
                                        onClick={() => setActiveMedia({ type: "image", url: msg.mediaUrls![0] })}
                                      />
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-2 gap-2 max-w-[280px]">
                                      {msg.mediaUrls.map((url, i) => (
                                        <ChatImage
                                          key={i}
                                          url={url}
                                          isSingle={false}
                                          alt={`Attachment ${i + 1}`}
                                          onClick={() => setActiveMedia({ type: "image", url })}
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {msg.videoUrl && (
                                <div className="w-full max-w-[280px]">
                                  <ChatVideoPlayer url={msg.videoUrl} />
                                </div>
                              )}

                              {msg.text && (
                                <p className="text-sm whitespace-pre-wrap leading-relaxed break-words [overflow-wrap:anywhere]">
                                  {msg.text}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Off-platform / Policy Warning Pill only on suspicious messages */}
                          {showPolicyFlagOnMsg && (
                            <div className="mt-1.5 ml-10 inline-flex items-center gap-1.5 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1">
                              <AlertTriangle size={13} className="text-[#E82C3F] shrink-0" />
                              <span>
                                Policy Flag: {activeDetails.conversation.flagReason || "Off-platform contact or payment attempt detected"}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Docked Composer */}
                <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
                    <div className="inline-flex items-center rounded-xl bg-[#f1f5f9] p-1 border border-slate-200/80">
                      <button
                        type="button"
                        onClick={() => setComposerMode("intervention")}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                          composerMode === "intervention"
                            ? "bg-[#E82C3F] text-white shadow-sm"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <ShieldCheck size={14} className={composerMode === "intervention" ? "text-white" : "text-[#E82C3F]"} />
                        <span>Public Moderator Notice</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setComposerMode("note")}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                          composerMode === "note"
                            ? "bg-[#1E2A4A] text-white shadow-sm"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <Lock size={14} className={composerMode === "note" ? "text-white" : "text-[#1E2A4A]"} />
                        <span>Internal Staff Note</span>
                      </button>
                    </div>

                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          setComposerText(e.target.value);
                          setComposerMode("intervention");
                          e.target.value = "";
                        }
                      }}
                      aria-label="Quick preset notices"
                      className="no-focus-ring h-9 px-3 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-[#1E2A4A] shadow-sm"
                    >
                      <option value="">Insert preset notice...</option>
                      <option value="All payments must remain on the Gazaarabia platform for buyer protection. Direct bank transfers or off-platform payments are strictly prohibited.">
                        Safe Payment Policy
                      </option>
                      <option value="A support dispute has been logged for this transaction. Please provide delivery proof or confirm order fulfillment within 24 hours.">
                        Fulfillment Request
                      </option>
                      <option value="Platform Moderation has verified this issue and updated the resolution status. Thank you for your cooperation.">
                        Issue Resolved Notice
                      </option>
                    </select>
                  </div>

                  <form onSubmit={handleSendMessage} className="space-y-2.5">
                    <div className="relative">
                      <textarea
                        rows={2}
                        value={composerText}
                        onChange={(e) => setComposerText(e.target.value)}
                        placeholder={
                          composerMode === "intervention"
                            ? "Write an official platform notice (visible to both customer and seller)..."
                            : "Write a confidential staff note (visible only to platform administrators)..."
                        }
                        className="no-focus-ring w-full resize-none rounded-xl border border-slate-200 bg-[#f8fafc] px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#1E2A4A] transition-colors leading-relaxed"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-slate-500 flex items-center gap-1.5">
                        <span
                          className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                            composerMode === "intervention" ? "bg-[#E82C3F]" : "bg-[#1E2A4A]"
                          }`}
                        />
                        <span>
                          {composerMode === "intervention"
                            ? "Public Notice: Delivered to customer and seller with official moderation badge."
                            : "Internal Note: Visible only to platform administrators."}
                        </span>
                      </p>

                      <button
                        type="submit"
                        disabled={sending || !composerText.trim()}
                        className={`h-9 px-5 inline-flex items-center gap-2 rounded-xl text-xs font-semibold shadow-sm disabled:opacity-50 transition-all shrink-0 ${
                          composerMode === "intervention"
                            ? "bg-[#E82C3F] hover:bg-[#c92233] text-white"
                            : "bg-[#1E2A4A] hover:bg-slate-800 text-white"
                        }`}
                      >
                        {sending ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Send size={14} />
                        )}
                        <span>{composerMode === "intervention" ? "Post Notice" : "Save Note"}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-8">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-3 text-slate-400 border border-slate-200/80">
                  <MessageSquare size={32} className="text-slate-400" />
                </div>
                <h3 className="font-bold text-base text-slate-800">Select a Conversation</h3>
                <p className="text-sm text-slate-500 mt-1.5 max-w-sm leading-relaxed">
                  Choose a thread from the left queue to audit buyer-seller interactions, resolve disputes, or support sellers.
                </p>
              </div>
            )}
          </div>

          {/* Pane 3: Participant Details & Staff Notes (Using div to preserve body font family) */}
          {inspectorOpen && activeDetails && (
            <div className="hidden xl:flex w-72 2xl:w-80 shrink-0 border-l border-slate-200 flex-col bg-white min-h-0 overflow-y-auto overflow-x-hidden divide-y divide-slate-100">
              {/* Customer Section */}
              {activeDetails.customer && (
                <section className="p-5 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-700">Customer Profile</h3>
                    <span className="text-xs text-slate-400 tabular-nums">#{activeDetails.customer.id}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-800 font-bold text-sm flex items-center justify-center border border-slate-200 shrink-0">
                      {(activeDetails.customer.name || "C").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{activeDetails.customer.name}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{activeDetails.customer.email}</p>
                    </div>
                  </div>

                  {activeDetails.customer.phone && (
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 pt-0.5">
                      <Phone size={12} className="text-slate-400 shrink-0" />
                      <span>{activeDetails.customer.phone}</span>
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
                    <div className="bg-[#f8fafc] rounded-xl p-3 border border-slate-200/80">
                      <p className="text-xs text-slate-500 font-medium">Total orders</p>
                      <p className="text-base font-bold text-slate-900 tabular-nums mt-0.5">
                        {activeDetails.customer.ordersCount}
                      </p>
                    </div>
                    <div className="bg-[#f8fafc] rounded-xl p-3 border border-slate-200/80">
                      <p className="text-xs text-slate-500 font-medium">Total spent</p>
                      <p className="text-base font-bold text-[#009639] tabular-nums mt-0.5">
                        £{activeDetails.customer.totalSpent.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {/* Seller Store Section */}
              {activeDetails.seller && (
                <section className="p-5 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-700">Seller Store</h3>
                    <span className="text-xs text-slate-400 tabular-nums">#{activeDetails.seller.id}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {activeDetails.seller.shopName || activeDetails.seller.name}
                    </p>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#009639] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 capitalize shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#009639]" />
                      {activeDetails.seller.sellerStatus || "Active"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
                    <div className="bg-[#f8fafc] rounded-xl p-3 border border-slate-200/80">
                      <p className="text-xs text-slate-500 font-medium">Products</p>
                      <p className="text-base font-bold text-slate-900 tabular-nums mt-0.5">
                        {activeDetails.seller.totalProducts}
                      </p>
                    </div>
                    <div className="bg-[#f8fafc] rounded-xl p-3 border border-slate-200/80">
                      <p className="text-xs text-slate-500 font-medium">Store rating</p>
                      <p className="text-base font-bold text-slate-900 tabular-nums mt-0.5">
                        {activeDetails.seller.rating || "5.0"} <span className="text-xs font-normal text-slate-400">/ 5</span>
                      </p>
                    </div>
                  </div>

                  {activeDetails.seller.shopSlug && (
                    <Link
                      href={`/store/${activeDetails.seller.shopSlug}`}
                      target="_blank"
                      className="w-full py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <ExternalLink size={13} />
                      <span>View Storefront</span>
                    </Link>
                  )}
                </section>
              )}

              {/* Referenced Product Section */}
              {activeDetails.product && (
                <section className="p-5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-700">Inquiry Product</h3>
                    <Tag size={13} className="text-slate-400" />
                  </div>
                  <ProductContextCard product={activeDetails.product} isPinned={true} />
                </section>
              )}

              {/* Staff Notes Section - Zero Horizontal Overflow */}
              <section className="p-5 space-y-3 flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Lock size={13} className="text-[#1E2A4A]" />
                    <span>Internal Staff Notes</span>
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-xs font-bold text-[#1E2A4A] border border-slate-200">
                    {activeDetails.conversation.adminNotes?.length || 0}
                  </span>
                </div>

                {!activeDetails.conversation.adminNotes || activeDetails.conversation.adminNotes.length === 0 ? (
                  <p className="text-xs text-slate-400">No internal notes recorded yet.</p>
                ) : (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto overflow-x-hidden pr-0.5">
                    {activeDetails.conversation.adminNotes.map((note: any, i: number) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-[#f8fafc] border border-slate-200/90 border-l-[3px] border-l-[#1E2A4A] min-w-0"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[#1E2A4A] mb-1">
                          <span className="truncate">{note.adminName}</span>
                          <span suppressHydrationWarning className="tabular-nums text-[11px] text-slate-400 font-normal shrink-0">
                            {new Date(note.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                          {note.note}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>

      {/* New Seller Chat Modal */}
      {isStartChatModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store size={18} className="text-[#E82C3F]" />
                <h2 className="text-base font-bold text-slate-900">Start Seller Support Chat</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsStartChatModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-medium p-1 rounded-md"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Select Seller Store</label>
                <div className="relative mb-2">
                  <Search size={14} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={sellerSearch}
                    onChange={(e) => setSellerSearch(e.target.value)}
                    placeholder="Search by store name or email..."
                    className="no-focus-ring w-full h-9 pl-9 pr-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#1E2A4A]"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                  {loadingSellers ? (
                    <div className="p-4 text-center text-slate-400 text-xs flex items-center justify-center gap-1.5">
                      <Loader2 size={14} className="animate-spin text-[#E82C3F]" />
                      <span>Loading stores...</span>
                    </div>
                  ) : filteredSellers.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-xs">No stores found.</div>
                  ) : (
                    filteredSellers.map((s) => {
                      const isSelected = selectedSellerForModal?.id === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSelectedSellerForModal(s)}
                          className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between transition-colors ${
                            isSelected ? "bg-rose-50/70 font-bold text-[#E82C3F]" : "hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-sm">{s.shopName || s.name}</p>
                            <p className="text-xs text-slate-400 truncate">{s.user?.email || "Verified Seller"}</p>
                          </div>
                          {isSelected && <CheckCircle2 size={16} className="text-[#E82C3F] shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Opening Message (Optional)</label>
                <textarea
                  rows={3}
                  value={modalOpeningMessage}
                  onChange={(e) => setModalOpeningMessage(e.target.value)}
                  placeholder="Write a message to initialize this official support thread..."
                  className="no-focus-ring w-full p-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#1E2A4A] resize-none"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsStartChatModalOpen(false)}
                className="h-9 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedSellerForModal || sending}
                onClick={handleStartChatWithSeller}
                className="h-9 px-4 rounded-xl bg-[#E82C3F] hover:bg-[#c92233] text-white text-xs font-semibold disabled:opacity-50 transition-colors shadow-sm"
              >
                {sending ? "Starting..." : "Start Thread"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Minimal Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-[#1E2A4A] text-white text-xs font-semibold shadow-lg">
          {toastMessage}
        </div>
      )}

      {/* Media Lightbox */}
      {activeMedia && (
        <MediaLightbox media={activeMedia} onClose={() => setActiveMedia(null)} />
      )}
    </div>
  );
}
