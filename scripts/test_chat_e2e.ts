import "dotenv/config";
import jwt from "jsonwebtoken";
import { connectToDatabase, mongoose } from "../src/lib/mongoose";

const BASE_URL = "http://localhost:3000";
const JWT_SECRET = process.env.JWT_SECRET!;

// Generate test tokens
const adminToken = jwt.sign({ id: 1 }, JWT_SECRET, { expiresIn: "1h" });
const sellerToken = jwt.sign({ id: 2 }, JWT_SECRET, { expiresIn: "1h" });
const customerToken = jwt.sign({ id: 4 }, JWT_SECRET, { expiresIn: "1h" });

async function request(path: string, options: any = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log("==================================================");
  console.log("🚀 STARTING CHAT SYSTEM REDESIGN E2E VERIFICATION");
  console.log("==================================================\n");

  let sellerAdminConvId: number | null = null;
  let customerSellerConvId: number | null = null;

  await connectToDatabase();
  const db = mongoose.connection.db!;

  // --------------------------------------------------------------------------
  // TEST 1: Seller initiates direct Admin Support Chat
  // --------------------------------------------------------------------------
  console.log("👉 Test 1: Seller initiates direct chat with Admin Support...");
  const initAdminChatRes = await request("/api/chat/conversations", {
    method: "POST",
    headers: { Authorization: `Bearer ${sellerToken}` },
    body: JSON.stringify({ type: "seller_admin" }),
  });

  if (!initAdminChatRes.ok || !initAdminChatRes.data.success) {
    throw new Error(`Test 1 Failed: ${JSON.stringify(initAdminChatRes.data)}`);
  }

  sellerAdminConvId = initAdminChatRes.data.data.id;
  console.log(`✅ Seller-Admin Support thread created/found. ID: ${sellerAdminConvId}`);

  // Clean previous E2E test messages from this thread to prevent duplicate test accumulation
  await db.collection("messages").deleteMany({ conversationId: sellerAdminConvId });
  await db.collection("conversations").updateOne(
    { id: sellerAdminConvId },
    { $set: { adminNotes: [] } }
  );

  // Seller sends a message to Admin
  const sellerMsgRes = await request(`/api/chat/conversations/${sellerAdminConvId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${sellerToken}` },
    body: JSON.stringify({ text: "Hello Admin, when will the monthly payout be released?" }),
  });

  if (!sellerMsgRes.ok || !sellerMsgRes.data.success) {
    throw new Error(`Test 1 (send msg) Failed: ${JSON.stringify(sellerMsgRes.data)}`);
  }
  console.log("✅ Seller sent support question to Admin successfully.");

  // --------------------------------------------------------------------------
  // TEST 2: Admin views Seller Support conversations & responds
  // --------------------------------------------------------------------------
  console.log("\n👉 Test 2: Admin views Seller Support chats & responds...");
  const adminGetSupportRes = await request("/api/admin/chat/conversations?type=seller_admin", {
    method: "GET",
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  if (!adminGetSupportRes.ok || !adminGetSupportRes.data.success) {
    throw new Error(`Test 2 (admin get support) Failed: ${JSON.stringify(adminGetSupportRes.data)}`);
  }

  const foundThread = adminGetSupportRes.data.data.find((c: any) => c.id === sellerAdminConvId);
  if (!foundThread) {
    throw new Error(`Test 2 Failed: Seller-Admin thread not listed in admin query`);
  }
  console.log("✅ Admin successfully queried Seller Support list and found thread.");

  // Admin responds
  const adminReplyRes = await request(`/api/chat/conversations/${sellerAdminConvId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ text: "Payouts are processed every Thursday morning." }),
  });

  if (!adminReplyRes.ok || !adminReplyRes.data.success) {
    throw new Error(`Test 2 (admin reply) Failed: ${JSON.stringify(adminReplyRes.data)}`);
  }
  console.log("✅ Admin sent reply to seller successfully.");

  // --------------------------------------------------------------------------
  // TEST 3: Customer initiates chat with Seller
  // --------------------------------------------------------------------------
  console.log("\n👉 Test 3: Customer initiates chat with Seller...");
  const initCustomerChatRes = await request("/api/chat/conversations", {
    method: "POST",
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ sellerId: 1, type: "customer_seller" }),
  });

  if (!initCustomerChatRes.ok || !initCustomerChatRes.data.success) {
    throw new Error(`Test 3 Failed: ${JSON.stringify(initCustomerChatRes.data)}`);
  }

  customerSellerConvId = initCustomerChatRes.data.data.id;
  console.log(`✅ Customer-Seller thread created/found. ID: ${customerSellerConvId}`);

  // Clean previous E2E test messages & notes from this thread to keep UI state clean
  await db.collection("messages").deleteMany({ conversationId: customerSellerConvId });
  await db.collection("conversations").updateOne(
    { id: customerSellerConvId },
    { $set: { adminNotes: [], isFlagged: false, status: "active", flagReason: null } }
  );

  // Customer sends normal product inquiry
  const custMsgRes = await request(`/api/chat/conversations/${customerSellerConvId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ text: "Hi, is this modest dress true to UK sizing?" }),
  });

  if (!custMsgRes.ok || !custMsgRes.data.success) {
    throw new Error(`Test 3 (cust msg) Failed: ${JSON.stringify(custMsgRes.data)}`);
  }
  console.log("✅ Customer sent inquiry to seller successfully.");

  // Seller replies to customer inquiry
  const sellerReplyRes = await request(`/api/chat/conversations/${customerSellerConvId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${sellerToken}` },
    body: JSON.stringify({ text: "Yes, our modest dresses follow standard UK sizing. Let me know if you need exact measurements." }),
  });

  if (!sellerReplyRes.ok || !sellerReplyRes.data.success) {
    throw new Error(`Test 3 (seller reply) Failed: ${JSON.stringify(sellerReplyRes.data)}`);
  }
  console.log("✅ Seller replied to customer inquiry successfully.");

  // --------------------------------------------------------------------------
  // TEST 4: Admin Live Monitoring of Customer ↔ Seller Chat
  // --------------------------------------------------------------------------
  console.log("\n👉 Test 4: Admin audits Customer ↔ Seller conversation in real-time...");
  const adminMonitorRes = await request(`/api/admin/chat/conversations/${customerSellerConvId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  if (!adminMonitorRes.ok || !adminMonitorRes.data.success) {
    throw new Error(`Test 4 Failed: ${JSON.stringify(adminMonitorRes.data)}`);
  }

  const monitoredMessages = adminMonitorRes.data.data.messages;
  const hasCustMsg = monitoredMessages.some((m: any) => m.text?.includes("true to UK sizing"));
  if (!hasCustMsg) {
    throw new Error("Test 4 Failed: Admin could not see the customer message!");
  }
  console.log(`✅ Admin successfully monitored the buyer-seller chat (${monitoredMessages.length} messages found).`);

  // --------------------------------------------------------------------------
  // TEST 5: Admin Official Intervention Notice
  // --------------------------------------------------------------------------
  console.log("\n👉 Test 5: Admin posts Official Moderator Notice into the thread...");
  const interveneRes = await request(`/api/admin/chat/conversations/${customerSellerConvId}/intervene`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ text: "Official Moderator Notice: Please check the standard size guide on the item page." }),
  });

  if (!interveneRes.ok || !interveneRes.data.success) {
    throw new Error(`Test 5 Failed: ${JSON.stringify(interveneRes.data)}`);
  }

  const interventionMsg = interveneRes.data.data;
  if (!interventionMsg.metadata?.isOfficialIntervention || interventionMsg.senderRole !== "admin") {
    throw new Error("Test 5 Failed: Intervention message did not have official intervention flag!");
  }
  console.log("✅ Admin Official Intervention notice posted successfully.");

  // Verify Customer can see the intervention message
  const customerViewRes = await request(`/api/chat/conversations/${customerSellerConvId}/messages`, {
    method: "GET",
    headers: { Authorization: `Bearer ${customerToken}` },
  });

  const custSeesIntervention = customerViewRes.data.data.some((m: any) =>
    m.text?.includes("Official Moderator Notice") && m.metadata?.isOfficialIntervention
  );
  if (!custSeesIntervention) {
    throw new Error("Test 5 Failed: Customer could not see official intervention notice!");
  }
  console.log("✅ Verified: Customer can view the Official Moderator Notice.");

  // --------------------------------------------------------------------------
  // TEST 6: Admin Private Internal Note Isolation (Crucial Security Check)
  // --------------------------------------------------------------------------
  console.log("\n👉 Test 6: Admin adds confidential internal note (Security Isolation Test)...");
  const secretNoteText = "INTERNAL_CONFIDENTIAL_AUDIT_KEY_77492";
  const noteRes = await request(`/api/admin/chat/conversations/${customerSellerConvId}/notes`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ note: `Internal audit check: ${secretNoteText}` }),
  });

  if (!noteRes.ok || !noteRes.data.success) {
    throw new Error(`Test 6 (add note) Failed: ${JSON.stringify(noteRes.data)}`);
  }
  console.log("✅ Admin saved private internal note.");

  // Admin MUST be able to see the note
  const adminViewWithNoteRes = await request(`/api/admin/chat/conversations/${customerSellerConvId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminSeesNote = adminViewWithNoteRes.data.data.messages.some((m: any) =>
    m.text?.includes(secretNoteText) && m.isInternalAdminNote === true
  );
  if (!adminSeesNote) {
    throw new Error("Test 6 Failed: Admin could not view internal staff note!");
  }
  console.log("✅ Admin can view internal staff note.");

  // Customer MUST NOT see the internal note
  const custCheckNoteRes = await request(`/api/chat/conversations/${customerSellerConvId}/messages`, {
    method: "GET",
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  const custLeak = custCheckNoteRes.data.data.some((m: any) =>
    m.text?.includes(secretNoteText) || m.isInternalAdminNote === true
  );
  if (custLeak) {
    throw new Error("🚨 SECURITY BREACH: Customer received internal admin note!");
  }
  console.log("🔒 SECURITY VERIFIED: Customer is strictly prevented from seeing internal admin notes.");

  // Seller MUST NOT see the internal note
  const sellerCheckNoteRes = await request(`/api/chat/conversations/${customerSellerConvId}/messages`, {
    method: "GET",
    headers: { Authorization: `Bearer ${sellerToken}` },
  });
  const sellerLeak = sellerCheckNoteRes.data.data.some((m: any) =>
    m.text?.includes(secretNoteText) || m.isInternalAdminNote === true
  );
  if (sellerLeak) {
    throw new Error("🚨 SECURITY BREACH: Seller received internal admin note!");
  }
  console.log("🔒 SECURITY VERIFIED: Seller is strictly prevented from seeing internal admin notes.");

  // --------------------------------------------------------------------------
  // TEST 7: Automated Anti-Scam / Fraud Detection
  // --------------------------------------------------------------------------
  console.log("\n👉 Test 7: Automated Anti-Scam & Off-Platform Solicitation Detection...");
  const scamMsgRes = await request(`/api/chat/conversations/${customerSellerConvId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({
      text: "Can I contact you on whatsapp or pay via paypal to your email customer@gmail.com?",
    }),
  });

  if (!scamMsgRes.ok || !scamMsgRes.data.success) {
    throw new Error(`Test 7 (send scam msg) Failed: ${JSON.stringify(scamMsgRes.data)}`);
  }
  console.log("✅ Sent suspicious solicitation message.");

  // Check if thread got auto-flagged
  const checkFlaggedRes = await request(`/api/admin/chat/conversations/${customerSellerConvId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  const convDoc = checkFlaggedRes.data.data.conversation;
  if (!convDoc.isFlagged || convDoc.status !== "flagged") {
    throw new Error(`Test 7 Failed: Conversation was NOT auto-flagged! ${JSON.stringify(convDoc)}`);
  }
  console.log(`✅ AUTOMATED FRAUD DETECTION VERIFIED: Thread auto-flagged as: "${convDoc.flagReason}"`);

  // Verify Admin flagged filter includes this conversation
  const flaggedListRes = await request("/api/admin/chat/conversations?status=flagged", {
    method: "GET",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const inFlaggedList = flaggedListRes.data.data.some((c: any) => c.id === customerSellerConvId);
  if (!inFlaggedList) {
    throw new Error("Test 7 Failed: Flagged conversation not returned under ?status=flagged");
  }
  console.log("✅ Flagged thread appears under Admin Flagged filter.");

  // --------------------------------------------------------------------------
  // TEST 8: Admin Dispute Resolution
  // --------------------------------------------------------------------------
  console.log("\n👉 Test 8: Admin resolves the dispute...");
  const resolveRes = await request(`/api/admin/chat/conversations/${customerSellerConvId}/resolve`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: "resolved" }),
  });

  if (!resolveRes.ok || !resolveRes.data.success) {
    throw new Error(`Test 8 Failed: ${JSON.stringify(resolveRes.data)}`);
  }

  const checkResolvedRes = await request(`/api/admin/chat/conversations/${customerSellerConvId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  if (checkResolvedRes.data.data.conversation.status !== "resolved") {
    throw new Error("Test 8 Failed: Conversation status was not resolved");
  }
  console.log("✅ Thread successfully marked as RESOLVED by Platform Admin.");

  console.log("\n==================================================");
  console.log("🎉 ALL 8 E2E TESTS PASSED WITH 100% SUCCESS!");
  console.log("==================================================");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("\n❌ E2E TEST FAILED:", err);
  process.exit(1);
});
