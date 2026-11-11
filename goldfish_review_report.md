# Goldfish Annotated Review Report

**Status:** resolved (All proposed fixes implemented & verified)
**Target:** `design_draft.md` (`full file`)

## Prioritized Findings & AI Suggestions

### [Issue 01] [egm-implementation-readiness] - Severity: Critical
* **Affected Scope:** [Lines 34-124](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/design_draft.md#L34-L124) (`Defect 01: Unsafe Stock Checkout Without Temporary Hold`)
* **Discrepancy Description:** Checkout validation performs only a non-locking read check against inventory. No temporary hold or reservation lock exists while the buyer is on Stripe/PayPal or completing mobile banking verification.
* **Rationale:** Two concurrent checkouts for a single inventory unit will both succeed, creating unfulfillable orders and customer disputes.
* ***AI Suggestion:*** PROPOSE FIX
* ***Justification:*** Introduce an atomic `StockReservation` model with a 15-minute Time-To-Live (TTL). When checkout begins, reserve the requested quantity. Compute available inventory as `stock - activeReservations`. Convert to sale on payment capture; release back to inventory on failure or timeout.
* ***Proposed Edit:***
  * Location: [prisma/schema.prisma](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/prisma/schema.prisma) & [src/lib/helpers/stockHelper.ts](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/src/lib/helpers/stockHelper.ts#L43-L65)
  * Change: Deploy `model StockReservation` schema and implement `reserveStockForCheckout()` with transaction-isolated locks.

---

### [Issue 02] [egm-design] - Severity: Critical
* **Affected Scope:** [Lines 126-239](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/design_draft.md#L126-L239) (`Defect 02: Monolithic Order Structure Lacking Mixed-Basket Seller Order Partitioning`)
* **Discrepancy Description:** A mixed basket containing items from multiple distinct sellers is inserted into a single monolithic `Orders` document. Order fulfillment, tracking codes, and shipping ETAs are stored on that single parent order.
* **Rationale:** Individual vendors cannot manage their own fulfillment, carrier tracking, or dispatch timelines independently. When one seller fulfills their portion, the entire customer order status is mutated.
* ***AI Suggestion:*** PROPOSE FIX
* ***Justification:*** Partition the basket at checkout into a parent `Orders` document (for overall billing) and child `SellerOrder` records (one per vendor). Each vendor controls their own carrier, tracking code, shipping subtotal, and dispatch state.
* ***Proposed Edit:***
  * Location: [prisma/schema.prisma](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/prisma/schema.prisma) & [src/app/api/front-end/orders/route.ts](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/src/app/api/front-end/orders/route.ts#L360-L450)
  * Change: Add `model SellerOrder`, link `OrderItem` to `SellerOrder`, and refactor checkout creation to group line items by `sellerId`.

---

### [Issue 03] [egm-structural] - Severity: High
* **Affected Scope:** [Lines 241-294](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/design_draft.md#L241-L294) (`Defect 03: Monolithic Order Status Overloading`)
* **Discrepancy Description:** A single string `status` field on `Orders` attempts to represent payment state, warehouse fulfillment, carrier dispatch, delivery, and refund status simultaneously.
* **Rationale:** A partial shipment or item refund corrupts the single status string, destroying tracking clarity for buyers and vendors.
* ***AI Suggestion:*** PROPOSE FIX
* ***Justification:*** Decouple order status into discrete, typed state machines: `paymentStatus` (PENDING, AUTHORIZED, CAPTURED, REFUNDED), `fulfillmentStatus` (UNFULFILLED, PARTIALLY_FULFILLED, FULFILLED), and `deliveryStatus` (PENDING_DISPATCH, DISPATCHED, IN_TRANSIT, DELIVERED).
* ***Proposed Edit:***
  * Location: [prisma/schema.prisma](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/prisma/schema.prisma#L515) & [src/app/seller/(dashboard)/orders/page.tsx](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/src/app/seller/(dashboard)/orders/page.tsx)
  * Change: Replace overloaded string with dedicated status enums and update UI status badges accordingly.

---

### [Issue 04] [egm-implementation-readiness] - Severity: High
* **Affected Scope:** [Lines 296-376](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/design_draft.md#L296-L376) (`Defect 04: Global Blanket Refunds Without Per-Item Accounting`)
* **Discrepancy Description:** The refund endpoint accepts an arbitrary `refundAmount` and flags the entire order as refunded. It does not map refunds to specific items, calculate proportional discount deductions, or call payment provider APIs.
* **Rationale:** Returning one discounted item results in either excessive customer payouts or seller over-clawbacks because basket discounts are not apportioned pro-rata.
* ***AI Suggestion:*** PROPOSE FIX
* ***Justification:*** Author a line-item refund calculator that computes `effectivePaidPrice = (unitPrice * qty) - itemDiscountShare`. Automate Stripe/PayPal gateway refund calls and claw back unvested earnings from the vendor and affiliate.
* ***Proposed Edit:</a>
  * Location: [src/app/api/refunds/process/route.ts](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/src/app/api/refunds/process/route.ts)
  * Change: Implement line-item refund handler with proportional discount formula and gateway API invocation.

---

### [Issue 05] [egm-codebase-details] - Severity: High
* **Affected Scope:** [Lines 378-418](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/design_draft.md#L378-L418) (`Defect 05: Absence of Immutable Double-Entry Financial Ledger`)
* **Discrepancy Description:** Financial balances are stored as mutable scalars on seller and affiliate models. There is no ledger journal tracking economic movements.
* **Rationale:** Without an append-only ledger, discrepancies between order revenue, gateway processing fees, platform commissions, and seller disbursements cannot be audited or verified.
* ***AI Suggestion:*** PROPOSE FIX
* ***Justification:*** Create an immutable `FinancialLedgerEntry` model supporting paired debits and credits across Escrow, Seller Payable, Platform Revenue, Gateway Fees, and Charity Escrow accounts.
* ***Proposed Edit:***
  * Location: [prisma/schema.prisma](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/prisma/schema.prisma) & [src/lib/services/ledgerService.ts](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/src/lib/services/ledgerService.ts)
  * Change: Deploy double-entry ledger schema and transaction journal helpers.

---

### [Issue 06] [egm-design] - Severity: High
* **Affected Scope:** [Lines 420-442](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/design_draft.md#L420-L442) (`Defect 06: Incomplete Seller Balance Life-Cycle`)
* **Discrepancy Description:** The seller dashboard displays only `Available`, `Pending`, and `Total Earned`. Sellers have no visibility into 30-day cooling release schedules, active dispute holds, or failed payout transfer reasons.
* **Rationale:** Unexplained payment holds or failed bank transfers generate support tickets and vendor dissatisfaction.
* ***AI Suggestion:*** PROPOSE FIX
* ***Justification:*** Expand `SellerPayout` to include `holdReason`, `scheduledReleaseAt`, `failureCode`, and `retryCount`. Update UI with dedicated tabs for Available, Cooling Escrow, Dispute Holds, and Payout History.
* ***Proposed Edit:***
  * Location: [src/app/seller/(dashboard)/earnings/page.tsx](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/src/app/seller/(dashboard)/earnings/page.tsx) & [src/app/api/seller/earnings/route.ts](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/src/app/api/seller/earnings/route.ts)
  * Change: Surface granular balance classifications and schedule dates in the vendor earnings interface.

---

### [Issue 07] [egm-codebase-details] - Severity: Medium
* **Affected Scope:** [Lines 444-462](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/design_draft.md#L444-L462) (`Defect 07: Payment Gateway & Bank Reconciliation`)
* **Discrepancy Description:** The Stripe webhook marks orders paid without ingesting the Stripe `balance_transaction` object or accounting for payment processor fees and currency conversion spreads.
* **Rationale:** Discrepancies between customer charges and net bank settlements accumulate without detection.
* ***AI Suggestion:*** PROPOSE FIX
* ***Justification:*** Ingest `balance_transaction` in `payment_intent.succeeded` webhook to record gross amount, fee amount, and net settled funds. Provide an administrative reconciliation view.
* ***Proposed Edit:***
  * Location: [src/app/api/stripe/webhook/route.ts](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/src/app/api/stripe/webhook/route.ts)
  * Change: Capture processor fee and net settlement amounts into order metadata and ledger entries.

---

### [Issue 08] [egm-comprehension] - Severity: Medium
* **Affected Scope:** [Lines 464-480](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/design_draft.md#L464-L480) (`Defect 08: Missing Seller Settlement Statements & Invoices`)
* **Discrepancy Description:** Automated monthly invoices exist only for affiliates and ambassadors. Sellers receive no settlement statements, marketplace commission VAT invoices, or credit notes.
* **Rationale:** Marketplace sellers require formal VAT tax invoices and settlement statements for commercial bookkeeping and regulatory compliance.
* ***AI Suggestion:*** PROPOSE FIX
* ***Justification:*** Build automated monthly PDF generation for Seller Settlement Statements, Platform Commission Invoices, and Refund Credit Notes.
* ***Proposed Edit:***
  * Location: [src/app/api/cron/monthly-seller-invoices/route.ts](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/src/app/api/cron/monthly-seller-invoices/route.ts)
  * Change: Add cron routine generating monthly seller settlement summaries and downloadable statements.

---

### [Issue 09] [egm-implementation-readiness] - Severity: Medium
* **Affected Scope:** [Lines 482-495](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/design_draft.md#L482-L495) (`Defect 09: Accounting Software Export Idempotency`)
* **Discrepancy Description:** Order and earnings exports are ad-hoc CSV downloads lacking batch IDs or idempotency locks.
* **Rationale:** Repeated manual exports create duplicate journal postings in external accounting systems (e.g., Xero or QuickBooks).
* ***AI Suggestion:*** PROPOSE FIX
* ***Justification:*** Introduce `AccountingExportBatch` with an `idempotencyKey`, preventing re-export of previously synchronized transactions and recording export failure logs.
* ***Proposed Edit:***
  * Location: [prisma/schema.prisma](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/prisma/schema.prisma) & [src/app/api/admin/accounting/export/route.ts](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/src/app/api/admin/accounting/export/route.ts)
  * Change: Implement batch tracking and idempotency enforcement for accounting exports.

---

### [Issue 10] [egm-design] - Severity: Medium
* **Affected Scope:** [Lines 497-512](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/design_draft.md#L497-L512) (`Defect 10: Profit Calculation & Closed Period Locking`)
* **Discrepancy Description:** Dashboards calculate profit even when product `costPrice` is null, assuming 100% margin. Historic accounting months remain open and mutable.
* **Rationale:** Incomplete cost data inflates earnings, and retroactive order changes corrupt closed financial reporting periods.
* ***AI Suggestion:*** PROPOSE FIX
* ***Justification:*** Flag incomplete cost data in the UI ("Cost data missing") and implement `AccountingPeriod` records. When a period is marked `LOCKED`, prohibit direct modifications; require Prior Period Adjustment entries in the current open period.
* ***Proposed Edit:***
  * Location: [src/components/seller/ProductPreviewCard.tsx](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/src/components/seller/ProductPreviewCard.tsx) & [src/app/api/seller/earnings/route.ts](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/src/app/api/seller/earnings/route.ts)
  * Change: Add cost completeness guard in profit analytics and implement period lock guards on order updates.

---

### [Issue 11] [egm-codebase-details] - Severity: High
* **Affected Scope:** [Lines 514-539](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/design_draft.md#L514-L539) (`Defect 11: Platform Offers, Rewards & Charity Separation`)
* **Discrepancy Description:** Discounts lack a `fundedBy` indicator distinguishing platform promotions from seller discounts. Charity contributions (`charityAmount`) are commingled with general funds.
* **Rationale:** Platform-funded vouchers can cannibalize seller margins or cause unmonitored platform loss. Charitable donations must be segregated in dedicated escrow.
* ***AI Suggestion:*** PROPOSE FIX
* ***Justification:*** Add `discountFundedBy: "PLATFORM" | "SELLER"` to coupons and orders. Route Palestine humanitarian contributions (`charityAmount`) directly into an isolated charity escrow ledger.
* ***Proposed Edit:***
  * Location: [prisma/schema.prisma](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/prisma/schema.prisma) & [src/app/api/front-end/orders/route.ts](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/src/app/api/front-end/orders/route.ts#L170-L330)
  * Change: Track coupon funding source and segregate charitable funds into isolated ledger accounts.
