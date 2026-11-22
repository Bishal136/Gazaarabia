export interface ProductContext {
  id: number;
  title: string;
  slug: string;
  image: string;
  price: number;
}

export interface OrderContext {
  id: number;
  orderNumber: string;
  totalAmount: number;
  orderStatus: string;
}

export interface AdminNote {
  id: number;
  adminId: number;
  adminName: string;
  note: string;
  createdAt: string;
}

export interface ChatMessage {
  id: number;
  conversationId: number;
  senderId: number;
  receiverId?: number;
  senderRole: "customer" | "seller" | "admin" | "system";
  isInternalAdminNote?: boolean;
  text?: string;
  mediaUrls?: string[];
  mediaType?: "text" | "image" | "video" | "mixed" | "system_notice";
  videoUrl?: string | null;
  productContext?: ProductContext | null;
  orderContext?: OrderContext | null;
  metadata?: {
    isOfficialIntervention?: boolean;
    systemAction?: string;
  } | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationItem {
  id: number;
  type?: "customer_seller" | "seller_admin" | "customer_admin";
  customerId?: number;
  sellerId?: number;
  sellerUserId?: number;
  adminId?: number | null;
  productId?: number | null;
  orderId?: number | null;
  lastMessageText: string;
  lastMessageAt: string;
  lastMessageSenderId?: number;
  lastMessageSenderRole?: "customer" | "seller" | "admin" | "system";
  unreadCount: number;
  unreadCountCustomer?: number;
  unreadCountSeller?: number;
  unreadCountAdmin?: number;
  status?: "active" | "flagged" | "resolved" | "archived";
  isFlagged?: boolean;
  flagReason?: string | null;
  adminNotes?: AdminNote[];
  customer?: {
    id: number;
    name: string;
    email: string;
    image?: string;
    phone?: string;
    ordersCount?: number;
    totalSpent?: number;
    createdAt?: string;
  };
  seller?: {
    id: number;
    shopName: string;
    storeName?: string;
    shopSlug?: string;
    logo?: string | null;
    rating?: number;
    totalProducts?: number;
    sellerStatus?: string;
  };
  product?: ProductContext | null;
  order?: OrderContext | null;
  createdAt: string;
  updatedAt: string;
}

export interface SendMessagePayload {
  text?: string;
  mediaUrls?: string[];
  videoUrl?: string | null;
  productContext?: ProductContext | null;
  orderContext?: OrderContext | null;
  isInternalAdminNote?: boolean;
  metadata?: {
    isOfficialIntervention?: boolean;
    systemAction?: string;
  };
}

export const chatService = {
  /**
   * Fetch all conversations for logged-in user (customer, seller)
   */
  async getConversations(
    token?: string,
    type?: "customer_seller" | "seller_admin" | "all"
  ): Promise<ConversationItem[]> {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const query = new URLSearchParams();
    if (type && type !== "all") query.append("type", type);

    const res = await fetch(`/api/chat/conversations${query.toString() ? `?${query.toString()}` : ""}`, {
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
   * Start or retrieve an existing conversation with a seller (from customer)
   */
  async startConversation(
    sellerId: number,
    productId?: number,
    token?: string
  ): Promise<ConversationItem> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch("/api/chat/conversations", {
      method: "POST",
      headers,
      body: JSON.stringify({ sellerId, productId, type: "customer_seller" }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message || "Failed to start conversation");
    }

    const json = await res.json();
    return json.data;
  },

  /**
   * Start or retrieve direct support conversation with platform admin (from seller)
   */
  async startAdminSupportConversation(token?: string): Promise<ConversationItem> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch("/api/chat/conversations", {
      method: "POST",
      headers,
      body: JSON.stringify({ type: "seller_admin" }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message || "Failed to start admin support conversation");
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
  async sendMessage(
    conversationId: number,
    payload: SendMessagePayload,
    token?: string
  ): Promise<ChatMessage> {
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

  // -------------------------------------------------------------------------
  // ADMIN-SPECIFIC METHODS
  // -------------------------------------------------------------------------

  /**
   * Admin: Fetch all platform conversations with rich filters & pagination
   */
  async getAdminConversations(
    params: {
      type?: string;
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {},
    token?: string
  ): Promise<{ data: ConversationItem[]; total: number; page: number; limit: number; stats: any }> {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const q = new URLSearchParams();
    if (params.type) q.append("type", params.type);
    if (params.status) q.append("status", params.status);
    if (params.search) q.append("search", params.search);
    if (params.page) q.append("page", String(params.page));
    if (params.limit) q.append("limit", String(params.limit));

    const res = await fetch(`/api/admin/chat/conversations?${q.toString()}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message || "Failed to fetch admin conversations");
    }

    return await res.json();
  },

  /**
   * Admin: Fetch full details for a conversation
   */
  async getAdminConversationDetails(conversationId: number, token?: string): Promise<any> {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`/api/admin/chat/conversations/${conversationId}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message || "Failed to fetch conversation details");
    }

    return await res.json();
  },

  /**
   * Admin: Post official intervention message
   */
  async sendAdminIntervention(
    conversationId: number,
    text: string,
    token?: string
  ): Promise<ChatMessage> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`/api/admin/chat/conversations/${conversationId}/intervene`, {
      method: "POST",
      headers,
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message || "Failed to post intervention");
    }

    const json = await res.json();
    return json.data;
  },

  /**
   * Admin: Add internal private note
   */
  async addAdminNote(
    conversationId: number,
    note: string,
    token?: string
  ): Promise<AdminNote> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`/api/admin/chat/conversations/${conversationId}/notes`, {
      method: "POST",
      headers,
      body: JSON.stringify({ note }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message || "Failed to save internal note");
    }

    const json = await res.json();
    return json.data;
  },

  /**
   * Admin: Flag or unflag conversation
   */
  async flagConversation(
    conversationId: number,
    isFlagged: boolean,
    reason?: string,
    token?: string
  ): Promise<void> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`/api/admin/chat/conversations/${conversationId}/flag`, {
      method: "POST",
      headers,
      body: JSON.stringify({ isFlagged, reason }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message || "Failed to update flag");
    }
  },

  /**
   * Admin: Mark conversation as resolved
   */
  async resolveConversation(
    conversationId: number,
    resolved: boolean = true,
    token?: string
  ): Promise<void> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`/api/admin/chat/conversations/${conversationId}/resolve`, {
      method: "POST",
      headers,
      body: JSON.stringify({ status: resolved ? "resolved" : "active" }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message || "Failed to resolve conversation");
    }
  },

  /**
   * Admin: Initiate a direct chat with any seller
   */
  async startAdminSellerChat(sellerId: number, token?: string): Promise<ConversationItem> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch("/api/admin/chat/conversations/start-seller", {
      method: "POST",
      headers,
      body: JSON.stringify({ sellerId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message || "Failed to start seller chat");
    }

    const json = await res.json();
    return json.data;
  },
};
