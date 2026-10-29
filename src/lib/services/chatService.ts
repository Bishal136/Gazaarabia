export interface ProductContext {
  id: number;
  title: string;
  slug: string;
  image: string;
  price: number;
}

export interface ChatMessage {
  id: number;
  conversationId: number;
  senderId: number;
  receiverId: number;
  senderRole: "customer" | "seller" | "admin";
  text?: string;
  mediaUrls?: string[];
  mediaType?: "text" | "image" | "video" | "mixed";
  videoUrl?: string | null;
  productContext?: ProductContext | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationItem {
  id: number;
  customerId: number;
  sellerId: number;
  sellerUserId?: number;
  productId?: number | null;
  lastMessageText: string;
  lastMessageAt: string;
  lastMessageSenderId?: number;
  unreadCount: number;
  unreadCountCustomer?: number;
  unreadCountSeller?: number;
  customer: {
    id: number;
    name: string;
    email: string;
  };
  seller: {
    id: number;
    shopName: string;
    storeName?: string;
    shopSlug?: string;
    logo?: string | null;
  };
  product?: ProductContext | null;
  createdAt: string;
  updatedAt: string;
}

export interface SendMessagePayload {
  text?: string;
  mediaUrls?: string[];
  videoUrl?: string | null;
  productContext?: ProductContext | null;
}

export const chatService = {
  /**
   * Fetch all conversations for logged-in user
   */
  async getConversations(token?: string): Promise<ConversationItem[]> {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch("/api/chat/conversations", {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message || "Failed to fetch conversations");
    }

    const json = await res.json();
    return json.data || [];
  },

  /**
   * Start or retrieve an existing conversation with a seller
   */
  async startConversation(sellerId: number, productId?: number, token?: string): Promise<ConversationItem> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch("/api/chat/conversations", {
      method: "POST",
      headers,
      body: JSON.stringify({ sellerId, productId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message || "Failed to start conversation");
    }

    const json = await res.json();
    return json.data;
  },

  /**
   * Fetch all messages in a conversation
   */
  async getMessages(conversationId: number, token?: string): Promise<ChatMessage[]> {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message || "Failed to fetch messages");
    }

    const json = await res.json();
    return json.data || [];
  },

  /**
   * Send a message
   */
  async sendMessage(conversationId: number, payload: SendMessagePayload, token?: string): Promise<ChatMessage> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message || "Failed to send message");
    }

    const json = await res.json();
    return json.data;
  },

  /**
   * Explicitly mark conversation as read
   */
  async markAsRead(conversationId: number, token?: string): Promise<void> {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    await fetch(`/api/chat/conversations/${conversationId}/read`, {
      method: "PATCH",
      headers,
    }).catch(() => {});
  },
};
