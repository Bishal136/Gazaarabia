"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  X,
  Minus,
  Send,
  Image as ImageIcon,
  Video,
  Check,
  CheckCheck,
  ShieldCheck,
  Loader2,
  Maximize2,
  Play,
  Paperclip,
  Store,
  ExternalLink,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { chatService, ChatMessage, ConversationItem, ProductContext } from "@/lib/services/chatService";
import { uploadService } from "@/lib/services/uploadService";
import ProductContextCard from "./ProductContextCard";
import MediaLightbox from "./MediaLightbox";
import { ChatImage, ChatVideoPlayer } from "./ChatMedia";

interface CustomerChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sellerId: number;
  sellerName: string;
  initialProduct?: ProductContext | null;
}

export default function CustomerChatDrawer({
  isOpen,
  onClose,
  sellerId,
  sellerName,
  initialProduct,
}: CustomerChatDrawerProps) {
  const { data: session } = useSession();
  const token = session?.user?.token;

  const [conversation, setConversation] = useState<ConversationItem | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);

  // Pending media attachments before send
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);

  // Lightbox
  const [activeMedia, setActiveMedia] = useState<{ type: "image" | "video"; url: string } | null>(null);

  // Product attached to this message
  const [attachedProduct, setAttachedProduct] = useState<ProductContext | null>(
    initialProduct || null
  );

  const messageContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTo({
        top: messageContainerRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  }, []);

  // Initialize or fetch conversation
  useEffect(() => {
    if (!isOpen || !sellerId || !token) return;

    let isMounted = true;
    setLoading(true);

    async function initChat() {
      try {
        const conv = await chatService.startConversation(sellerId, initialProduct?.id, token);
        if (!isMounted) return;
        setConversation(conv);

        const msgs = await chatService.getMessages(conv.id, token);
        if (!isMounted) return;
        setMessages(msgs);
        setTimeout(() => scrollToBottom(false), 100);
      } catch (err) {
        console.error("Failed to initialize customer chat:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initChat();

    return () => {
      isMounted = false;
    };
  }, [isOpen, sellerId, initialProduct?.id, token, scrollToBottom]);

  // Real-time polling while drawer is open
  useEffect(() => {
    if (!isOpen || isMinimized || !conversation?.id || !token) return;

    const fetchLatest = async () => {
      try {
        const latestMsgs = await chatService.getMessages(conversation.id, token);
        setMessages((prev) => {
          if (latestMsgs.length !== prev.length) {
            setTimeout(() => scrollToBottom(true), 50);
            return latestMsgs;
          }
          return latestMsgs;
        });
      } catch (err) {
        // Silently continue polling
      }
    };

    pollTimerRef.current = setInterval(fetchLatest, 2500);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isOpen, isMinimized, conversation?.id, token, scrollToBottom]);

  // Handle Image Selection
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

  // Handle Video Selection
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      alert("Please select a valid video file (.mp4, .webm)");
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

  // Send Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!conversation?.id || !token || sending) return;

    const trimmed = inputText.trim();
    if (!trimmed && selectedImages.length === 0 && !selectedVideo && !attachedProduct) {
      return;
    }

    try {
      setSending(true);

      let uploadedImageUrls: string[] = [];
      let uploadedVideoUrl: string | null = null;

      // Upload Images
      if (selectedImages.length > 0) {
        uploadedImageUrls = await uploadService.uploadMultiple(selectedImages, "messages");
      }

      // Upload Video
      if (selectedVideo) {
        uploadedVideoUrl = await uploadService.uploadVideo(selectedVideo, "messages");
      }

      // Optimistic message
      const tempId = Date.now();
      const optimisticMsg: ChatMessage = {
        id: tempId,
        conversationId: conversation.id,
        senderId: session?.user?.id ? Number(session.user.id) : 0,
        receiverId: conversation.sellerUserId || 0,
        senderRole: "customer",
        text: trimmed,
        mediaUrls: uploadedImageUrls.length > 0 ? uploadedImageUrls : imagePreviews,
        videoUrl: uploadedVideoUrl || videoPreview,
        productContext: attachedProduct,
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
      setAttachedProduct(null); // Detach after sending
      setTimeout(() => scrollToBottom(true), 50);

      // Call API
      const realMsg = await chatService.sendMessage(
        conversation.id,
        {
          text: trimmed,
          mediaUrls: uploadedImageUrls,
          videoUrl: uploadedVideoUrl,
          productContext: attachedProduct || undefined,
        },
        token
      );

      // Replace optimistic message with real message from server
      setMessages((prev) => prev.map((m) => (m.id === tempId ? realMsg : m)));
    } catch (err: any) {
      alert(err?.message || "Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className={`fixed z-50 transition-all duration-300 ${
          isMinimized
            ? "bottom-4 right-4 w-72 h-14"
            : "bottom-0 right-0 sm:bottom-4 sm:right-6 w-full sm:w-[420px] h-[85vh] sm:h-[580px]"
        }`}
      >
        <div className="w-full h-full bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-200/90 flex flex-col overflow-hidden">
          {/* HEADER */}
          <div className="bg-[#0a0808] text-white px-4 py-3.5 flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative w-9 h-9 rounded-full bg-[#b08a78] text-white flex items-center justify-center font-bold text-sm shrink-0 border border-white/20">
                <Store size={18} />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-[#0a0808]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-xs sm:text-sm truncate">
                    {conversation?.seller?.shopName || sellerName || "Store Support"}
                  </h3>
                  <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
                </div>
                <p className="text-[10px] text-gray-300 truncate">
                  Official Seller &bull; Usually replies in minutes
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0 text-gray-300">
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition"
                title={isMinimized ? "Expand Chat" : "Minimize Chat"}
              >
                <Minus size={16} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition"
                title="Close Chat"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* TOP PINNED PRODUCT CONTEXT */}
              {initialProduct && (
                <div className="p-2.5 bg-gray-50 border-b border-gray-100 shrink-0">
                  <ProductContextCard
                    product={initialProduct}
                    isPinned={true}
                    onSendAsMessage={
                      !attachedProduct ? () => setAttachedProduct(initialProduct) : undefined
                    }
                  />
                </div>
              )}

              {/* MESSAGES STREAM */}
              <div
                ref={messageContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#fbfcfc] overscroll-contain"
              >
                {loading ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                    <Loader2 size={24} className="animate-spin text-[#b08a78]" />
                    <span className="text-xs">Connecting to seller...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                    <div className="w-12 h-12 rounded-full bg-amber-50 text-[#b08a78] flex items-center justify-center mb-2">
                      <Store size={22} />
                    </div>
                    <h4 className="font-bold text-xs sm:text-sm text-gray-800 mb-1">
                      Start Chat with {sellerName}
                    </h4>
                    <p className="text-[11px] text-gray-500 max-w-xs">
                      Ask questions about sizes, fabrics, delivery times, or attach photos for custom inquiries.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderRole === "customer";

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                      >
                        {/* Attached Product Card in message bubble */}
                        {msg.productContext && (
                          <div className="mb-1 max-w-[280px] sm:max-w-[320px]">
                            <ProductContextCard product={msg.productContext} />
                          </div>
                        )}

                        <div
                          className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-3.5 py-2.5 shadow-2xs space-y-1.5 ${
                            isMe
                              ? "bg-[#b08a78] text-white rounded-tr-none"
                              : "bg-white text-gray-900 border border-gray-200/80 rounded-tl-none"
                          }`}
                        >
                          {/* Attached Media Photos */}
                          {msg.mediaUrls && msg.mediaUrls.length > 0 && (
                            <div className="w-full">
                              {msg.mediaUrls.length === 1 ? (
                                <div className="w-full max-w-[280px]">
                                  <ChatImage
                                    url={msg.mediaUrls[0]}
                                    isSingle={true}
                                    alt="Chat attachment"
                                    onClick={() => setActiveMedia({ type: "image", url: msg.mediaUrls![0] })}
                                  />
                                </div>
                              ) : (
                                <div className="grid grid-cols-2 gap-1.5 max-w-[280px]">
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
                            <div className="w-full max-w-[280px]">
                              <ChatVideoPlayer url={msg.videoUrl} />
                            </div>
                          )}

                          {/* Message Text */}
                          {msg.text && (
                            <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                              {msg.text}
                            </p>
                          )}

                          {/* Timestamp & Read Receipt */}
                          <div
                            className={`flex items-center gap-1 justify-end text-[10px] ${
                              isMe ? "text-white/80" : "text-gray-400"
                            }`}
                          >
                            <span>{formatMessageTime(msg.createdAt)}</span>
                            {isMe && (
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

              {/* PENDING ATTACHMENTS PREVIEW BAR */}
              {(imagePreviews.length > 0 || videoPreview || attachedProduct) && (
                <div className="p-2.5 bg-amber-50/70 border-t border-amber-200/60 flex flex-wrap items-center gap-2 max-h-32 overflow-y-auto">
                  {attachedProduct && (
                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-amber-200 text-xs font-semibold text-gray-800">
                      <span className="truncate max-w-[150px]">
                        Attached: {attachedProduct.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => setAttachedProduct(null)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  )}

                  {imagePreviews.map((src, i) => (
                    <div key={i} className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-200 bg-white">
                      <Image src={src} alt="Preview" fill sizes="48px" className="object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(i)}
                        className="absolute top-0 right-0 bg-black/60 text-white rounded-full p-0.5 hover:bg-black"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}

                  {videoPreview && (
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-200 bg-black flex items-center justify-center text-white">
                      <Play size={14} className="fill-white" />
                      <button
                        type="button"
                        onClick={handleRemoveVideo}
                        className="absolute top-0 right-0 bg-red-600 text-white rounded-full p-0.5"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* REPLY BAR */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 bg-white border-t border-gray-100 flex items-end gap-2 shrink-0"
              >
                {/* Hidden File Inputs */}
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
                    title="Attach images (.jpg, .png, .webp)"
                  >
                    <ImageIcon size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    disabled={sending}
                    className="p-2 rounded-xl hover:bg-gray-100 hover:text-gray-800 transition"
                    title="Attach short video (.mp4, .webm)"
                  >
                    <Video size={18} />
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
                    placeholder={`Message ${sellerName}...`}
                    disabled={sending}
                    className="w-full max-h-24 py-2 px-3 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#b08a78] focus:border-[#b08a78] transition resize-none leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  disabled={
                    sending ||
                    (!inputText.trim() &&
                      selectedImages.length === 0 &&
                      !selectedVideo &&
                      !attachedProduct)
                  }
                  className="p-2.5 rounded-xl bg-[#b08a78] hover:bg-[#976f5d] text-white disabled:opacity-40 transition shadow-xs shrink-0 mb-0.5"
                  title="Send Message"
                >
                  {sending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Lightbox */}
      <MediaLightbox media={activeMedia} onClose={() => setActiveMedia(null)} />
    </>
  );
}
