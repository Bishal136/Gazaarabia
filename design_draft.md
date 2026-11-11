# Marketplace Architecture & Financial Integrity QA Audit Report: Gazaarabia

* **Date:** 2026-11-11
* **Audit Target:** Gazaarabia Multi-Vendor E-Commerce Platform
* **Repository:** `Gazaarabia` (Commit: `49cec13`)
* **Scope:** 11 Enterprise Multi-Vendor Marketplace Core Requirements (Inventory, Order Routing, Status Separation, Refunds, Double-Entry Financial Ledger, Seller Payouts, Payment Reconciliation, Tax/Invoices, Accounting Sync, Profit/Period Locking, Platform Offers & Charity Allocation)

---

## Executive Summary

A forensic codebase audit was conducted across the frontend client components, server route handlers (`/api`), and database schemas (`prisma/schema.prisma` and MongoDB collections). The audit evaluated the platform against the 11 critical marketplace architectural standards specified in the reference documentation.

All 11 domains contain architectural vulnerabilities, ranging from critical data race conditions that permit inventory overselling to missing double-entry ledger abstractions that prevent verifiable seller settlements and tax compliance.

| ID | Requirement Area | Severity | Current Implementation State | Core Risk |
|---|---|---|---|---|
| **01** | Stock Reservation & Release | **Critical** | Read-only check in checkout; no reservation hold | Concurrency race condition; stock overselling |
| **02** | Mixed Basket Order Splitting | **Critical** | Monolithic order document; items grouped by seller in read view only | Single point of failure; cannot ship or track sellers independently |
| **03** | Separate Order Status Machines | **High** | Single string `status` field overloading logistics and payment | Status collision; partial shipment and refund state corruption |
| **04** | Per-Item Refund & Discount Apportionment | **High** | Global `refundAmount` without line-item or discount allocation | Seller over/under-clawback; manual calculation errors |
| **05** | Double-Entry Financial Ledger | **High** | Mutable running balances (`availableBalance`, `pendingBalance`) | Audit failure; lack of verifiable transaction journal |
| **06** | Seller Balances, Holds & Failure Handling | **High** | Basic `pending` / `paid` payout records; no hold taxonomy | Unexplained seller payment holds; no automated dispute escrow |
| **07** | Payment Gateway & Bank Reconciliation | **Medium** | Stripe webhook updates status to `paid` without fee deduction checks | Unreconciled processor fee discrepancies; exchange rate drift |
| **08** | Seller Settlement Statements & Invoices | **Medium** | Affiliate/Ambassador invoices only; no seller settlement statements | Inability to provide seller tax invoices or credit notes |
| **09** | Accounting Software Export & Idempotency | **Medium** | No accounting integration or export idempotency guards | Duplicate journal entries; unhandled sync failures |
| **10** | Profit Calculation & Closed Period Locking | **Medium** | Profit assumes 100% margin if cost is null; mutable historic orders | Distorted profit analytics; retroactive accounting tampering |
| **11** | Platform Offers, Rewards & Charity Separation | **High** | Discounts deducted without tracking funding source (platform vs seller) | Margin cannibalization; commingling of charitable impact escrow |

---

## Detailed Defect Audits & Remediation Specifications

### Defect 01: Unsafe Stock Checkout Without Temporary Hold / TTL Reservation (Overselling Risk)

* **Severity:** Critical
* **Affected Routes & Components:**
  * Route: `/checkout`, `/api/front-end/orders`
  * Frontend: [src/app/(site)/checkout/page.tsx](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/src/app/(site)/checkout/page.tsx)
  * Backend API: [src/app/api/front-end/orders/route.ts](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/src/app/api/front-end/orders/route.ts#L80-L105)
  * Helper: [src/lib/helpers/stockHelper.ts](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/src/lib/helpers/stockHelper.ts#L43-L65)

#### Current vs. Expected Behavior
* **Current Behavior:**
  In `src/lib/helpers/stockHelper.ts`, `validateStockInTransaction` performs a non-locking check:
  ```typescript
  if (available < item.quantity) {
    insufficientItems.push({ ... });
  }
  ```
  Stock is neither decremented nor reserved at the moment the customer initiates checkout or is redirected to Stripe/PayPal. Inventory is only adjusted after an order is inserted or after payment confirmation. When multiple customers attempt to purchase low-stock inventory simultaneously, all pass the stock validation step, leading to multiple orders being confirmed for stock that does not exist.
* **Expected Behavior:**
  When a customer begins payment, an atomic `StockReservation` with a 15-minute Time-To-Live (TTL) must be recorded. Available inventory is calculated as `stock - activeReservations`. If payment succeeds, the reservation converts to a permanent sale. If payment fails, times out, or the user abandons the checkout session, the reservation expires automatically and releases the stock.

#### Viewport & Device Edge Cases
* On mobile devices, switching between mobile banking apps or SMS verification authenticators frequently extends the payment window to 3–8 minutes. Without a reserved lock, background web buyers can purchase the item while the mobile user is completing 3D Secure verification.

#### Recommended Solution / Code Patch
1. **Schema Extension (`prisma/schema.prisma`):**
```prisma
model StockReservation {
  id          Int      @id @default(autoincrement())
  productId   Int
  variantId   Int?
  quantity    Int
  userId      Int?
  sessionKey  String   @unique
  expiresAt   DateTime
  status      String   @default("ACTIVE") // ACTIVE, COMMITTED, EXPIRED, CANCELLED
  createdAt   DateTime @default(now())

  product     products @relation(fields: [productId], references: [id])
  @@index([productId, variantId, status, expiresAt])
}
```

2. **Atomic Reservation Logic (`src/lib/helpers/stockHelper.ts`):**
```typescript
export async function reserveStockForCheckout(
  items: Array<{ productId: number; variantId?: number; quantity: number }>,
  sessionKey: string,
  ttlMinutes = 15
): Promise<{ success: boolean; errors?: string[] }> {
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  return await prisma.$transaction(async (tx) => {
    for (const item of items) {
      const activeReservations = await tx.stockReservation.aggregate({
        where: {
          productId: item.productId,
          variantId: item.variantId ?? null,
          status: "ACTIVE",
          expiresAt: { gt: new Date() },
        },
        _sum: { quantity: true },
      });

      const reservedQty = activeReservations._sum.quantity || 0;
      const product = await tx.products.findUnique({
        where: { id: item.productId },
        select: { stock: true },
      });

      if (!product || (product.stock - reservedQty) < item.quantity) {
        throw new Error(`Insufficient stock for product ID: ${item.productId}`);
      }

      await tx.stockReservation.create({
        data: {
          productId: item.productId,
          variantId: item.variantId ?? null,
          quantity: item.quantity,
          sessionKey,
          expiresAt,
          status: "ACTIVE",
        },
      });
    }
    return { success: true };
  });
}
```

---

### Defect 02: Monolithic Order Structure Lacking Mixed-Basket Seller Order Partitioning

* **Severity:** Critical
* **Affected Routes & Components:**
  * Route: `/user/orders`, `/seller/orders`, `/api/front-end/orders`, `/api/seller/orders`
  * Frontend Buyer: [src/app/(site)/user/orders/page.tsx](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/src/app/(site)/user/orders/page.tsx)
  * Frontend Seller: [src/app/seller/(dashboard)/orders/page.tsx](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/src/app/seller/(dashboard)/orders/page.tsx)
  * Backend API: [src/app/api/front-end/orders/route.ts](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/src/app/api/front-end/orders/route.ts#L360-L450)
  * Backend Seller API: [src/app/api/seller/orders/route.ts](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/src/app/api/seller/orders/route.ts#L40-L100)

#### Current vs. Expected Behavior
* **Current Behavior:**
  When a buyer checks out a basket containing items from multiple distinct sellers, the system inserts a single monolithic record into `Orders` (`prisma.orders.create`). All line items are inserted into `OrderItem` referencing that parent order. In `/api/seller/orders`, each seller queries `OrderItem` joined back to the parent order:
  ```typescript
  const sellerItems = await db.collection("orders_item").find({ sellerId: seller.id }).toArray();
  const orderIds = [...new Set(sellerItems.map((i: any) => i.orderId))];
  const orders = await db.collection("orders").find({ id: { $in: orderIds } }).toArray();
  ```
  The parent order holds single fields for `deliveryOptionId`, `deliveryEta`, `trackingNumber`, and `status`. If Seller A ships their item via Royal Mail and Seller B ships their item three days later via DHL, the shared order entity cannot track two separate tracking numbers or delivery schedules. If Seller A marks the order as "shipped", it alters the status of the entire order for the customer.
* **Expected Behavior:**
  A customer cart with items from multiple sellers must generate one parent `CustomerOrder` (for payment processing and consolidated buyer invoicing) and separate `SellerOrder` (sub-order) entities for each distinct vendor. Each `SellerOrder` maintains its own shipping method, carrier, tracking code, shipping subtotal, and independent fulfillment status.

#### Viewport & Device Edge Cases
* On mobile screens, the consolidated order tracking timeline renders a single status bar. When one vendor's package is delivered while another is pending production, the buyer is shown confusing or contradictory tracking updates.

#### Recommended Solution / Code Patch
1. **Schema Migration:**
```prisma
model Orders {
  id              Int           @id @default(autoincrement())
  userId          Int
  totalAmount     Float
  status          String        @default("pending")
  paymentMethod   String
  transactionId   String?
  sellerOrders    SellerOrder[]
  createdAt       DateTime      @default(now())
}

model SellerOrder {
  id               Int         @id @default(autoincrement())
  orderId          Int
  sellerId         Int
  subtotal         Float
  shippingCost     Float       @default(0)
  commissionTotal  Float       @default(0)
  sellerNetPayout  Float       @default(0)
  fulfillmentState String      @default("unfulfilled") // unfulfilled, partially_fulfilled, fulfilled, cancelled
  carrier          String?
  trackingNumber   String?
  dispatchedAt     DateTime?
  deliveredAt      DateTime?

  order            Orders      @relation(fields: [orderId], references: [id])
  seller           seller      @relation(fields: [sellerId], references: [id])
  orderItems       OrderItem[]
  @@index([orderId, sellerId])
}
```

2. **Order Creation Routing Refactoring (`src/app/api/front-end/orders/route.ts`):**
```typescript
// Group order items by sellerId
const itemsBySeller = new Map<number, typeof orderItems>();
for (const item of orderItemsWithCalculations) {
  const list = itemsBySeller.get(item.sellerId) || [];
  list.push(item);
  itemsBySeller.set(item.sellerId, list);
}

// Create parent order and child seller orders atomically
const createdOrder = await prisma.$transaction(async (tx) => {
  const parent = await tx.orders.create({
    data: {
      userId,
      totalAmount,
      itemsTotal,
      shippingCost,
      status: "pending",
      paymentMethod,
    },
  });

  for (const [sellerId, items] of itemsBySeller.entries()) {
    const sellerSubtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
    const sellerCommission = items.reduce((sum, i) => sum + i.commissionAmount, 0);
    const sellerNet = items.reduce((sum, i) => sum + i.sellerEarning, 0);

    const subOrder = await tx.sellerOrder.create({
      data: {
        orderId: parent.id,
        sellerId,
        subtotal: sellerSubtotal,
        commissionTotal: sellerCommission,
        sellerNetPayout: sellerNet,
        fulfillmentState: "unfulfilled",
      },
    });

    for (const item of items) {
      await tx.orderItem.create({
        data: {
          ...item,
          orderId: parent.id,
          sellerOrderId: subOrder.id,
        },
      });
    }
  }
  return parent;
});
```

---

### Defect 03: Monolithic Order Status Overloading Payment, Fulfillment, Dispatch, and Delivery

* **Severity:** High
* **Affected Routes & Components:**
  * Route: `/orders/[id]`, `/seller/orders/[id]`, `/admin/orders`
  * Model: [prisma/schema.prisma](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/prisma/schema.prisma#L515)
  * Frontend Seller: [src/app/seller/(dashboard)/orders/page.tsx](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/src/app/seller/(dashboard)/orders/page.tsx)
  * API: [src/app/api/seller/orders/route.ts](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/src/app/api/seller/orders/route.ts)

#### Current vs. Expected Behavior
* **Current Behavior:**
  In `prisma/schema.prisma`, `model Orders` contains a single string field:
  ```prisma
  status String @default("pending")
  ```
  The values `"pending"`, `"paid"`, `"processing"`, `"shipped"`, `"delivered"`, and `"refunded"` are forced into one variable. If an order is paid and partially shipped, or if two items are delivered while one item is returned, this single status field cannot represent the state without losing critical logistical or financial context.
* **Expected Behavior:**
  Order state must be decoupled into independent state machines:
  1. `paymentStatus`: `PENDING`, `AUTHORIZED`, `CAPTURED`, `PARTIALLY_REFUNDED`, `REFUNDED`, `FAILED`
  2. `fulfillmentStatus`: `UNFULFILLED`, `PARTIALLY_FULFILLED`, `FULFILLED`
  3. `deliveryStatus`: `PENDING_DISPATCH`, `DISPATCHED`, `IN_TRANSIT`, `OUT_FOR_DELIVERY`, `DELIVERED`, `RETURNED`
  4. Line-item status tracking on `OrderItem` for partial deliveries.

#### Recommended Solution / Code Patch
```prisma
enum PaymentStatus {
  PENDING
  AUTHORIZED
  CAPTURED
  PARTIALLY_REFUNDED
  REFUNDED
  FAILED
}

enum FulfillmentStatus {
  UNFULFILLED
  PARTIALLY_FULFILLED
  FULFILLED
  CANCELLED
}

enum DeliveryStatus {
  NOT_APPLICABLE
  PENDING_DISPATCH
  DISPATCHED
  IN_TRANSIT
  OUT_FOR_DELIVERY
  DELIVERED
  FAILED_ATTEMPT
  RETURNED_TO_SENDER
}
```

---

### Defect 04: Global Blanket Refunds Without Per-Item Accounting or Pro-Rata Discount Reallocation

* **Severity:** High
* **Affected Routes & Components:**
  * Route: `/api/refunds/process`, `/seller/return-requests`
  * API: [src/app/api/refunds/process/route.ts](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/src/app/api/refunds/process/route.ts#L25-L68)
  * Schema: [prisma/schema.prisma](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/prisma/schema.prisma#L604-L635)

#### Current vs. Expected Behavior
* **Current Behavior:**
  `src/app/api/refunds/process/route.ts` accepts an arbitrary `refundAmount` and updates the entire order:
  ```typescript
  await prisma.orders.update({
    where: { id: Number(orderId) },
    data: { status: "refunded" },
  });
  ```
  It does not correlate refunds with specific `orderItem` rows. It does not call Stripe or PayPal APIs to execute the payment gateway refund. It does not deduct the clawed-back payout from the responsible seller, nor does it reverse commission amounts allocated to affiliates and ambassadors. Furthermore, if a 20% order-wide discount code was originally used, returning a single £100 item must refund £80 (net amount paid), not £100.
* **Expected Behavior:**
  1. Calculate `effectivePaidPrice = (unitPrice * quantity) - itemProportionalDiscount`.
  2. Call `stripe.refunds.create({ payment_intent: pi_id, amount: Math.round(effectivePaidPrice * 100) })`.
  3. Mark specific `OrderItem` as `REFUNDED`.
  4. Claw back `sellerEarning` from `seller.pendingBalance` or debit future payouts.
  5. Void or reverse unvested ambassador/affiliate earnings associated with the returned line item.

#### Recommended Solution / Code Patch
```typescript
export async function processItemRefund({
  orderId,
  orderItemId,
  reason,
  adminUserId,
}: {
  orderId: number;
  orderItemId: number;
  reason: string;
  adminUserId: number;
}) {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.orders.findUnique({
      where: { id: orderId },
      include: { orderItems: true },
    });
    const item = order?.orderItems.find((i) => i.id === orderItemId);
    if (!order || !item) throw new Error("Order or Item not found");

    // Calculate proportional discount share
    const totalOrderItemsValue = order.orderItems.reduce((s, i) => s + (i.unitPrice * i.quantity), 0);
    const itemGrossValue = item.unitPrice * item.quantity;
    const discountRatio = totalOrderItemsValue > 0 ? (itemGrossValue / totalOrderItemsValue) : 0;
    const itemDiscountShare = (order.discountTotal || 0) * discountRatio;
    const refundableAmount = Math.max(0, itemGrossValue - itemDiscountShare);

    // Call payment provider
    if (order.paymentMethod === "stripe" && order.transactionId) {
      await stripe.refunds.create({
        payment_intent: order.transactionId,
        amount: Math.round(refundableAmount * 100),
        metadata: { orderId, orderItemId, reason },
      });
    }

    // Update item status and clawback seller balance
    await tx.orderItem.update({
      where: { id: orderItemId },
      data: { isRefunded: true, refundAmount: refundableAmount },
    });

    await tx.seller.update({
      where: { id: item.sellerId },
      data: {
        pendingBalance: { decrement: item.sellerEarning },
      },
    });

    return { success: true, refundedAmount: refundableAmount };
  });
}
```

---

### Defect 05: Absence of Immutable Double-Entry Financial Ledger for Marketplace Transactions

* **Severity:** High
* **Affected Routes & Components:**
  * Route: `/seller/earnings`, `/api/seller/earnings`, `/admin/payouts`
  * API: [src/app/api/seller/earnings/route.ts](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/src/app/api/seller/earnings/route.ts#L70-L80)
  * Schema: [prisma/schema.prisma](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/prisma/schema.prisma#L60-L80)

#### Current vs. Expected Behavior
* **Current Behavior:**
  Seller balances are represented as raw, mutable numbers on the seller document (`availableBalance`, `pendingBalance`, `totalEarned`). When payouts or refunds occur, values are overwritten directly. There is no append-only double-entry ledger. If a discrepancy arises between total order sales, platform commission deductions, and seller disbursements, there is no immutable audit trail to reconstruct the source of the variance.
* **Expected Behavior:**
  An immutable double-entry ledger recording all marketplace transactions across standard ledger accounts:
  * `CustomerEscrow` (Asset)
  * `SellerPayable` (Liability)
  * `PlatformCommission` (Revenue)
  * `PaymentProcessingFee` (Expense)
  * `CharityEscrow` (Liability)
  Every economic transaction must produce paired debit and credit entries with equal totals.

#### Recommended Solution / Code Patch
```prisma
model FinancialLedgerEntry {
  id              Int       @id @default(autoincrement())
  transactionId   String    // Unique idempotency group key
  orderId         Int?
  sellerId        Int?
  account         String    // e.g. "SELLER_PAYABLE", "PLATFORM_REVENUE", "ESCROW"
  debit           Float     @default(0)
  credit          Float     @default(0)
  currency        String    @default("GBP")
  referenceType   String    // ORDER_CAPTURE, COMMISSION_FEE, REFUND, PAYOUT_DISBURSEMENT
  description     String
  createdAt       DateTime  @default(now())

  @@index([transactionId])
  @@index([sellerId, account])
}
```

---

### Defect 06: Incomplete Seller Balance Life-Cycle (Missing Hold Reasons, Payout Schedules, and Failure Alerts)

* **Severity:** High
* **Affected Routes & Components:**
  * Route: `/seller/earnings`, `/admin/seller-payouts`
  * Frontend: [src/app/seller/(dashboard)/earnings/page.tsx](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/src/app/seller/(dashboard)/earnings/page.tsx#L50-L100)
  * API: [src/app/api/seller/earnings/route.ts](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/src/app/api/seller/earnings/route.ts#L70-L85)
  * Schema: [prisma/schema.prisma](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/prisma/schema.prisma#L119-L137)

#### Current vs. Expected Behavior
* **Current Behavior:**
  The seller earnings interface shows only three numbers: `Available`, `Pending`, and `Total Earned`. The underlying `SellerPayout` model only supports `status` values of `pending` or `paid`. There is no visibility into:
  1. Upcoming release dates for items in the 30-day return cooling period.
  2. Funds held due to open buyer disputes or incomplete KYC verification.
  3. Failed payout transfer details (such as incorrect IBAN/routing numbers or rejected transfers) and guided remediation.
* **Expected Behavior:**
  The seller dashboard must display clear sub-balances:
  * `Available for Payout` (Cooling period passed, ready for withdrawal)
  * `In Escrow / Cooling Period` (Item delivered, awaiting 30-day return window completion, with exact scheduled release date)
  * `On Hold` (Specific dispute ID, policy review, or KYC flag attached)
  * `Failed Payouts` (Detailed processor failure reason, e.g., "Account holder name mismatch", with a direct link to update banking information)

---

### Defect 07: Lack of Automated Payment Provider (Stripe/PayPal) and Bank Settlement Reconciliation

* **Severity:** Medium
* **Affected Routes & Components:**
  * Route: `/admin/reconciliation`, `/api/stripe/webhook`
  * API: [src/app/api/stripe/webhook/route.ts](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/src/app/api/stripe/webhook/route.ts#L35-L65)

#### Current vs. Expected Behavior
* **Current Behavior:**
  In `src/app/api/stripe/webhook/route.ts`, when `payment_intent.succeeded` arrives, the system sets `order.status = "paid"`. It does not retrieve or store the `balance_transaction` details from Stripe. The platform does not track the actual net amount settled into its bank account after Stripe processing fees (e.g. 2.9% + £0.30) and currency conversion margins.
* **Expected Behavior:**
  When a payment succeeds, the webhook must capture:
  * `gross_amount`: £100.00
  * `processor_fee`: £3.20
  * `net_settlement`: £96.80
  * `settlement_currency`: GBP
  A reconciliation module must automatically flag any discrepancies between the recorded order value and actual bank deposits.

---

### Defect 08: Missing Seller Settlement Statements, Commission Tax Invoices, and Credit Notes

* **Severity:** Medium
* **Affected Routes & Components:**
  * Route: `/seller/invoices`, `/seller/earnings`
  * API: [src/app/api/affiliate-invoices/route.ts](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/src/app/api/affiliate-invoices/route.ts)
  * Schema: [prisma/schema.prisma](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/prisma/schema.prisma#L119-L140)

#### Current vs. Expected Behavior
* **Current Behavior:**
  While the system generates automated monthly PDF invoices for affiliates and brand ambassadors, it provides no settlement statements or commission tax invoices for sellers. When a buyer refunds an item and commission is clawed back, no credit notes are generated.
* **Expected Behavior:**
  * **Seller Settlement Statement:** A monthly statement listing all sales, gross revenue, shipping reimbursements, and payouts disbursed.
  * **Platform Commission Invoice:** A formal VAT invoice detailing the marketplace commissions deducted by Gazaarabia from the seller.
  * **Credit Note:** An official accounting document adjusting the commission invoice when returned goods result in commission clawbacks.

---

### Defect 09: Lack of Accounting Software Export Idempotency and Transfer Failure Visibility

* **Severity:** Medium
* **Affected Routes & Components:**
  * Route: `/admin/accounting`, `/api/admin/accounting/export`
  * API: [src/app/admin/(dashboard)/orders/page.tsx](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/src/app/admin/(dashboard)/orders/page.tsx)

#### Current vs. Expected Behavior
* **Current Behavior:**
  The platform contains no standard accounting export service (e.g., Xero, QuickBooks, or Sage format CSVs). Existing export buttons on orders download ad-hoc flat spreadsheets with no idempotency key, allowing accidental re-exports that cause duplicate entries in external bookkeeping systems.
* **Expected Behavior:**
  An export queue that creates immutable `AccountingExportBatch` records. Each batch tracks an `idempotencyKey`, export timestamp, status (`PENDING`, `SYNCED`, `FAILED`), and exact error logs if synchronization fails. Transactions already included in a closed batch cannot be re-exported.

---

### Defect 10: Premature Profit Display Without Cost Data & Unlocked Closed Accounting Periods

* **Severity:** Medium
* **Affected Routes & Components:**
  * Route: `/admin/analytics`, `/seller/earnings`
  * Frontend: [src/components/seller/ProductPreviewCard.tsx](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/src/components/seller/ProductPreviewCard.tsx#L84-L88)
  * Schema: [prisma/schema.prisma](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/prisma/schema.prisma#L323)

#### Current vs. Expected Behavior
* **Current Behavior:**
  `costPrice` on `products` is optional (`Float?`). When calculating profit or earnings metrics, the platform assumes cost is £0 if not populated, displaying inflated 100% gross profit margins to sellers and administrators. Furthermore, past accounting months are never locked; a status change on an order from six months ago alters historic financial metrics.
* **Expected Behavior:**
  * If `costPrice` is absent or 0, the UI must display `"Profit: Cost data missing"` instead of showing an inaccurate profit estimate.
  * Implement `AccountingPeriod` records. Once a fiscal month is closed and marked `LOCKED`, no order or transaction records within that period may be edited. Any subsequent refund, dispute, or adjustment must be recorded as a Prior Period Adjustment in the current open period.

---

### Defect 11: Unsegregated Platform Offers, Creator Rewards, and Impact / Charity Contributions

* **Severity:** High
* **Affected Routes & Components:**
  * Route: `/checkout`, `/api/front-end/orders`
  * API: [src/app/api/front-end/orders/route.ts](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/src/app/api/front-end/orders/route.ts#L170-L330)
  * Schema: [prisma/schema.prisma](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/prisma/schema.prisma#L556-L558)

#### Current vs. Expected Behavior
* **Current Behavior:**
  In `src/app/api/front-end/orders/route.ts`, coupon discounts, affiliate earnings, ambassador commissions, and charity donations are commingled in a single calculation. There is no indicator specifying whether a coupon discount is **platform-funded** (absorbed by Gazaarabia marketing) or **seller-funded** (absorbed by the vendor). In current calculations, discounts are deducted from the affiliate or general order total while the seller still receives payment on the undiscounted subtotal, resulting in unintentional platform loss. Furthermore, charity donations (`charityAmount`) sit in general operational funds rather than a segregated escrow account.
* **Expected Behavior:**
  * Introduce `discountFundedBy: "PLATFORM" | "SELLER"` on coupon rules. If seller-funded, the discount reduces the seller's gross payout. If platform-funded, the seller receives full payout and the discount is debited to platform marketing expense.
  * Segregate creator rewards and Palestinian humanitarian impact contributions (`charityAmount`) into dedicated escrow balance ledgers to prevent commingling with operational cash.

---

## Technical Implementation Roadmap

```mermaid
flowchart TD
    subgraph Phase 1: Core Transaction Integrity
        A1[Defect 01: Stock Reservation TTL Engine] --> A2[Defect 02: Seller SubOrder Splitting]
        A2 --> A3[Defect 03: Separate State Machines]
    end

    subgraph Phase 2: Financial Accuracy
        B1[Defect 04: Line-Item Refund Engine] --> B2[Defect 05: Double-Entry Transaction Ledger]
        B2 --> B3[Defect 11: Funding Source & Charity Segregation]
    end

    subgraph Phase 3: Reporting & Compliance
        C1[Defect 06: Seller Balance Taxonomy & Holds] --> C2[Defect 07: Gateway Reconciliation]
        C2 --> C3[Defect 08: Settlement Statements & Invoices]
        C3 --> C4[Defect 09 & 10: Period Locking & Accounting Sync]
    end

    Phase 1 --> Phase 2
    Phase 2 --> Phase 3
```

### Staged Execution Plan
1. **Sprint 1 (Transaction Protection):** Deploy `StockReservation` with 15-minute TTL to eliminate overselling races; split monolithic orders into `SellerOrder` records.
2. **Sprint 2 (Financial Precision):** Implement line-item refunds with discount apportionment; deploy the `FinancialLedgerEntry` double-entry journal.
3. **Sprint 3 (Vendor Operations & Compliance):** Roll out seller settlement statements, commission tax invoices, and accounting period locking.
