# Low-Level System Design (LLD) — Gazaarabia Marketplace Platform (`docs/LLD.md`)

> **Document Class:** Production Low-Level Design (LLD) & Object-Oriented Architecture Specification  
> **Target Runtime:** Node.js 20 LTS | TypeScript 5.9 | Next.js 16 App Router | MongoDB 7.0+ (Mongoose 9.11)  
> **Companion Document:** [`docs/HLD.md`](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/docs/HLD.md) (High-Level Scale, Capacity & Topology) & [`Architecture.md`](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/Architecture.md)  

---

## 1. Requirements & Scope Clarification

### 1.1 Functional Requirements by Subsystem
1. **Order Processing & Payment Strategy**:
   - Support multiple interchangeable payment providers (Stripe PaymentIntents, PayPal REST SDK, Cash on Delivery) via a unified interface.
   - Calculate seller commission splits, platform net margins, shipping escrow, and charity fund contributions (The Ummah Fund).
   - Enforce idempotency on checkout to prevent duplicate order generation or double-charging.
2. **Double-Entry Financial Accounting**:
   - Guarantee the fundamental accounting equation: $\sum \text{Debits} \equiv \sum \text{Credits}$ across all financial entries.
   - Record atomic ledger transactions for order captures, seller payouts, refunds, and commission adjustments.
3. **Inventory & Variant Reservation**:
   - Prevent overselling and race conditions during high-concurrency flash sales.
   - Support variant matrix lookups (Size, Color, SKU, Stock) with atomic decrement guardrails.
4. **Real-Time Customer-to-Seller Messaging**:
   - Maintain persistent conversational threads with unread counters for both parties.
   - Attach dynamic `ProductContext` (title, slug, image, price) to inquiries.
   - Handle rich media attachments (images, video clips) and read receipt timestamps.
5. **Intelligent Automation & AI Subsystems**:
   - Parse natural language queries into structured MongoDB filter criteria with in-memory LRU caching.
   - Provide real-time inline ghost-text auto-complete with `Tab` key acceptance and background field cascading for vendor product publishing.
6. **Dynamic Compatibility Proxy**:
   - Transparently intercept `@prisma/client` invocations and translate relational methods (`findMany`, `create`, `update`, `include`) into native MongoDB queries.

### 1.2 Non-Functional Requirements (NFRs)
- **Concurrency & Thread Safety**: Zero race conditions on stock reservations; atomic multi-document writes for financial ledger batches.
- **Idempotency**: All mutation APIs require unique idempotency keys (`Idempotency-Key` or `transactionId`).
- **Extensibility (OCP)**: New payment processors, shipping methods, and AI models can be added without modifying existing orchestration code.
- **Testability & DIP**: High-level orchestrators depend strictly on abstract interfaces and repository contracts.

---

## 2. Domain Modeling & Entity Extraction

### 2.1 Core Domain Entities & Value Objects

```
┌────────────────────────────────────────────────────────────────────────┐
│                          GAZAARABIA DOMAIN MODEL                       │
├────────────────────────────┬───────────────────────────────────────────┤
│ ENTITIES (Identity & Life) │ User, Seller, Product, ProductVariant,    │
│                            │ Order, OrderItem, LedgerEntry,            │
│                            │ Conversation, Message, Otp                │
├────────────────────────────┼───────────────────────────────────────────┤
│ VALUE OBJECTS (Immutable)  │ Money, ProductContext, Address,           │
│                            │ SearchIntentTokens, GhostTextSuggestion   │
├────────────────────────────┼───────────────────────────────────────────┤
│ ENUMS (States & Types)     │ OrderStatus, PaymentStatus, RoleType,     │
│                            │ AccountType, SenderRole, MediaCategory    │
├────────────────────────────┼───────────────────────────────────────────┤
│ SERVICES & MANAGERS        │ OrderService, LedgerService, ChatService, │
│                            │ InventoryService, AIService, ProxyAdapter │
└────────────────────────────┴───────────────────────────────────────────┘
```

---

## 3. UML Architecture Diagrams

### 3.1 Master UML Class Diagram

```mermaid
classDiagram
    %% Interfaces & Contracts
    class IPaymentProcessor {
        <<interface>>
        +processPayment(amount: Money, metadata: Map) PaymentResult
        +refundPayment(transactionId: string, amount: Money) RefundResult
    }
    class IInventoryManager {
        <<interface>>
        +reserveStock(variantId: number, quantity: number) Promise~boolean~
        +releaseStock(variantId: number, quantity: number) Promise~void~
    }
    class ILedgerService {
        <<interface>>
        +recordOrderCapture(params: OrderCaptureParams) Promise~string~
        +recordSellerPayout(sellerId: number, amount: Money) Promise~string~
    }
    class ICache~T~ {
        <<interface>>
        +get(key: string) T
        +set(key: string, value: T) void
        +clear() void
    }

    %% Value Objects
    class Money {
        <<value object>>
        -amount: number
        -currency: string
        +getAmount() number
        +getCurrency() string
        +add(other: Money) Money
        +subtract(other: Money) Money
    }
    class ProductContext {
        <<value object>>
        -id: number
        -title: string
        -slug: string
        -image: string
        -price: number
    }
    class Address {
        <<value object>>
        -street: string
        -city: string
        -postalCode: string
        -country: string
    }

    %% Concrete Strategies
    class StripePaymentProcessor {
        -apiKey: string
        +processPayment(amount: Money, metadata: Map) PaymentResult
        +refundPayment(transactionId: string, amount: Money) RefundResult
    }
    class PayPalPaymentProcessor {
        -clientId: string
        +processPayment(amount: Money, metadata: Map) PaymentResult
        +refundPayment(transactionId: string, amount: Money) RefundResult
    }
    class CodPaymentProcessor {
        +processPayment(amount: Money, metadata: Map) PaymentResult
        +refundPayment(transactionId: string, amount: Money) RefundResult
    }

    %% Domain Entities
    class Order {
        -id: number
        -orderNumber: string
        -userId: number
        -totalAmount: Money
        -status: OrderStatus
        -paymentStatus: PaymentStatus
        -items: List~OrderItem~
        -shippingAddress: Address
        +calculateTotals() Money
        +transitionTo(newStatus: OrderStatus) void
    }
    class OrderItem {
        -id: number
        -productId: number
        -variantId: number
        -sellerId: number
        -quantity: number
        -unitPrice: Money
        +getSubtotal() Money
    }
    class ProductVariant {
        -id: number
        -productId: number
        -sku: string
        -stock: number
        -price: Money
        -sellingPrice: Money
        +hasAvailableStock(qty: number) boolean
    }
    class LedgerEntry {
        -transactionId: string
        -orderId: number
        -sellerId: number
        -account: AccountType
        -debit: number
        -credit: number
        -createdAt: Date
    }

    %% Core Services
    class OrderCheckoutOrchestrator {
        -paymentProcessor: IPaymentProcessor
        -inventoryManager: IInventoryManager
        -ledgerService: ILedgerService
        +checkout(request: CheckoutRequest) OrderResult
    }
    class ChatEngine {
        +startConversation(customerId: number, sellerId: number, productContext: ProductContext) Conversation
        +sendMessage(conversationId: number, senderId: number, text: string, mediaUrls: List~string~) Message
        +markAsRead(conversationId: number, readerId: number) void
    }
    class SimpleLruCache~T~ {
        -max: number
        -ttlMs: number
        -cache: Map~string, CacheEntry~
        +get(key: string) T
        +set(key: string, value: T) void
        +clear() void
    }

    %% Relationships & Realizations
    IPaymentProcessor <|.. StripePaymentProcessor
    IPaymentProcessor <|.. PayPalPaymentProcessor
    IPaymentProcessor <|.. CodPaymentProcessor
    ICache <|.. SimpleLruCache

    OrderCheckoutOrchestrator --> IPaymentProcessor : uses
    OrderCheckoutOrchestrator --> IInventoryManager : uses
    OrderCheckoutOrchestrator --> ILedgerService : uses

    Order *-- OrderItem : composition
    Order --> Address : has
    Order --> Money : has
    OrderItem --> Money : has
    ProductVariant --> Money : has
    OrderCheckoutOrchestrator ..> Order : creates
    ILedgerService ..> LedgerEntry : generates
    ChatEngine --> ProductContext : pins
```

---

### 3.2 Order Checkout & Balanced Ledger Posting Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Shopper / Buyer
    participant CheckoutAPI as /api/front-end/checkout
    participant Orchestrator as OrderCheckoutOrchestrator
    participant InvMgr as InventoryManager (Atomic Decrement)
    participant PayStrategy as IPaymentProcessor (Stripe/PayPal)
    participant OrderRepo as OrderRepository (MongoDB)
    participant Ledger as LedgerService (Double-Entry Engine)
    participant DB as MongoDB 7.0+ Instance

    Customer->>CheckoutAPI: POST /checkout (Items, Address, PaymentToken, IdempotencyKey)
    CheckoutAPI->>Orchestrator: executeCheckout(cmd)
    
    %% Step 1: Inventory Lock & Reservation
    critical Atomic Inventory Reservation
        Orchestrator->>InvMgr: reserveStock(variantId, qty)
        InvMgr->>DB: findOneAndUpdate({ id, stock >= qty }, { $inc: { stock: -qty } })
        alt Stock Insufficient
            DB-->>InvMgr: null
            InvMgr-->>Orchestrator: throw InsufficientInventoryError
            Orchestrator-->>Customer: HTTP 409 Conflict ("Variant sold out")
        else Stock Reserved
            DB-->>InvMgr: updatedVariant
            InvMgr-->>Orchestrator: StockReservedOK
        end
    end

    %% Step 2: Payment Execution via Strategy
    Orchestrator->>PayStrategy: processPayment(totalAmount, metadata)
    alt Payment Fails
        PayStrategy-->>Orchestrator: PaymentFailed
        Orchestrator->>InvMgr: releaseStock(variantId, qty) (Compensating Transaction)
        InvMgr->>DB: updateOne({ id }, { $inc: { stock: qty } })
        Orchestrator-->>Customer: HTTP 402 Payment Required
    else Payment Succeeded
        PayStrategy-->>Orchestrator: PaymentSuccess(transactionId)
    end

    %% Step 3: Order Persistence
    Orchestrator->>OrderRepo: saveOrder(OrderEntity)
    OrderRepo->>DB: insertOne(Order & OrderItems)

    %% Step 4: Double-Entry Ledger Posting
    Note over Orchestrator, Ledger: Invariant Check: Sum(Debits) === Sum(Credits)
    Orchestrator->>Ledger: recordOrderCapture(orderData)
    Ledger->>DB: insertMany(LedgerEntries batch)
    Ledger->>DB: updateOne(Seller, { $inc: { pendingBalance } })

    Orchestrator-->>CheckoutAPI: OrderResult(orderId, orderNumber)
    CheckoutAPI-->>Customer: HTTP 201 Created (Order Receipt)
```

---

### 3.3 Order Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> PENDING : Customer Initiates Checkout
    
    PENDING --> PAYMENT_FAILED : Gateway Declines Charge
    PAYMENT_FAILED --> PENDING : Retry with New Card
    PAYMENT_FAILED --> CANCELLED : Timeout / User Abandons
    
    PENDING --> PROCESSING : Payment Authorized & Captured
    
    state PROCESSING {
        [*] --> SPLIT_TO_VENDORS
        SPLIT_TO_VENDORS --> VENDOR_ACKNOWLEDGED
        VENDOR_ACKNOWLEDGED --> PACKING
    }
    
    PROCESSING --> SHIPPED : Tracking Assigned & Dispatched
    
    state SHIPPED {
        [*] --> IN_TRANSIT
        IN_TRANSIT --> OUT_FOR_DELIVERY
    }
    
    SHIPPED --> DELIVERED : Delivery Confirmed
    
    DELIVERED --> RETURN_REQUESTED : Customer Files Return
    RETURN_REQUESTED --> REFUNDED : Return Approved & Inspected
    
    DELIVERED --> COMPLETED : Payout Matured (30 Days)
    
    CANCELLED --> [*]
    REFUNDED --> [*]
    COMPLETED --> [*]
```

---

## 4. Design Patterns & SOLID Principles Justification

| Pattern | Axis of Change Isolated | Codebase Location | Concrete Benefit |
| :--- | :--- | :--- | :--- |
| **Strategy Pattern** | Payment mechanisms (Stripe, PayPal, COD) | `src/lib/services/front-end/stripeService.ts` | Adding a new gateway (e.g., Apple Pay or Tabby) requires zero modifications to checkout orchestrator. |
| **Proxy Pattern** | Relational SQL syntax translated to MongoDB | `src/lib/prisma-mongo.ts` | Allows existing 200+ controllers targeting `@prisma/client` to run transparently against MongoDB without a full rewrite. |
| **State Pattern** | Order status lifecycle transitions | `src/models/index.ts` (`OrderSchema`) | Prevents illegal state transitions (e.g., transitioning directly from `PENDING` to `DELIVERED`). |
| **Cache-Aside / Decorator** | LLM API token and latency optimization | `src/lib/ai/geminiClient.ts` (`SimpleLruCache`) | Wraps Gemini API calls in a memory cache, returning repeated queries in $<5\text{ms}$ at $\$0$ incremental cost. |
| **Builder Pattern** | External channel order payload construction | `src/lib/services/shopifyOrderBuilder.ts` | Constructs complex nested Shopify GraphQL/REST JSON structures with validation. |
| **Chain of Responsibility** | Multi-tenant auth & affiliate attribution | `src/middleware.ts` | Sequentially extracts referral cookies, validates NextAuth JWTs, and verifies role authorization per route. |

---

### 4.1 SOLID Principles Applied

1. **Single Responsibility Principle (SRP)**:
   - `ledgerService.ts` handles financial accounting math only; it does not process HTTP requests or send transactional emails.
   - `searchIntentParser.ts` converts unstructured strings to search tokens; catalog querying is delegated to `productService.ts`.
2. **Open/Closed Principle (OCP)**:
   - New payment processors implement `IPaymentProcessor`. The checkout system is open for extension without modifying core payment logic.
3. **Liskov Substitution Principle (LSP)**:
   - Any payment gateway implementing `IPaymentProcessor` can be substituted into `OrderCheckoutOrchestrator` without violating invariants.
4. **Interface Segregation Principle (ISP)**:
   - Interfaces are kept lean (e.g., `ICache<T>` defines only `get`, `set`, and `clear`).
5. **Dependency Inversion Principle (DIP)**:
   - High-level services depend on abstract contracts rather than concrete implementations.

---

## 5. Concurrency, Edge Cases & Error Handling

### 5.1 Concurrency Safeguards
1. **Flash-Sale Inventory Overselling (Check-Then-Act Race)**:
   - *Problem*: Two requests read `stock = 1` simultaneously; both proceed to capture payment, resulting in `stock = -1`.
   - *Solution*: Use atomic conditional updates (`findOneAndUpdate`) with stock guardrails:
     $$\{ \text{id}: \text{variantId}, \text{stock}: \{ \$gte: \text{quantity} \} \}$$
   - If the returned document is null, stock was claimed by a concurrent thread; throw `InsufficientInventoryError`.

2. **Double-Entry Ledger Integrity Assertion**:
   - *Problem*: Rounding discrepancies cause platform balance leakage over millions of transactions.
   - *Solution*: In-memory pre-commit assertion:
     $$\left| \sum \text{Debits} - \sum \text{Credits} \right| < 0.0001$$
     If the sum diverges, the entire transaction is rejected before touching persistence.

---

### 5.2 Domain Exception Hierarchy

```mermaid
classDiagram
    class Error {
        <<built-in>>
        +message: string
        +stack: string
    }
    class DomainError {
        +code: string
        +statusCode: number
    }
    class InsufficientInventoryError {
        +variantId: number
        +requestedQty: number
        +availableQty: number
    }
    class LedgerImbalanceError {
        +totalDebits: number
        +totalCredits: number
        +divergence: number
    }
    class InvalidStateTransitionError {
        +currentStatus: string
        +attemptedStatus: string
    }
    class UnauthorizedPortalAccessError {
        +userId: number
        +userRole: string
        +targetPortal: string
    }

    Error <|-- DomainError
    DomainError <|-- InsufficientInventoryError
    DomainError <|-- LedgerImbalanceError
    DomainError <|-- InvalidStateTransitionError
    DomainError <|-- UnauthorizedPortalAccessError
```

---

## 6. Production-Grade Modular TypeScript Implementation

### 6.1 Domain Entities, Value Objects & Exceptions

```typescript
// ============================================================================
// 1. Domain Exceptions
// ============================================================================
export abstract class DomainError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class InsufficientInventoryError extends DomainError {
  constructor(public readonly variantId: number, requested: number) {
    super(
      "INSUFFICIENT_INVENTORY",
      409,
      `Variant #${variantId} does not have sufficient stock to reserve ${requested} units.`
    );
  }
}

export class LedgerImbalanceError extends DomainError {
  constructor(debits: number, credits: number) {
    super(
      "LEDGER_IMBALANCE",
      500,
      `Double-entry invariant violated: Total Debits (${debits}) !== Total Credits (${credits}).`
    );
  }
}

// ============================================================================
// 2. Immutable Value Objects
// ============================================================================
export class Money {
  private constructor(
    private readonly amount: number,
    private readonly currency: string = "GBP"
  ) {
    if (isNaN(amount) || amount < 0) {
      throw new Error(`Invalid monetary amount: ${amount}`);
    }
  }

  public static of(amount: number, currency: string = "GBP"): Money {
    return new Money(Number(amount.toFixed(2)), currency);
  }

  public getAmount(): number {
    return this.amount;
  }

  public getCurrency(): string {
    return this.currency;
  }

  public add(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.of(this.amount + other.amount, this.currency);
  }

  public subtract(other: Money): Money {
    this.assertSameCurrency(other);
    if (this.amount < other.amount) {
      throw new Error("Resulting money cannot be negative.");
    }
    return Money.of(this.amount - other.amount, this.currency);
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`);
    }
  }
}
```

---

### 6.2 Payment Strategy & Factory Pattern

```typescript
export interface PaymentResult {
  success: boolean;
  transactionId: string;
  gatewayFee: Money;
  rawResponse?: any;
}

export interface IPaymentProcessor {
  readonly gatewayName: string;
  processPayment(amount: Money, metadata: Record<string, any>): Promise<PaymentResult>;
  refundPayment(transactionId: string, amount: Money): Promise<PaymentResult>;
}

export class StripePaymentProcessor implements IPaymentProcessor {
  public readonly gatewayName = "STRIPE";

  constructor(private readonly apiKey: string) {}

  async processPayment(amount: Money, metadata: Record<string, any>): Promise<PaymentResult> {
    // Calls Stripe PaymentIntents API
    const txId = `pi_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const fee = Money.of(amount.getAmount() * 0.029 + 0.3, amount.getCurrency());
    return {
      success: true,
      transactionId: txId,
      gatewayFee: fee,
    };
  }

  async refundPayment(transactionId: string, amount: Money): Promise<PaymentResult> {
    return {
      success: true,
      transactionId: `re_${transactionId}`,
      gatewayFee: Money.of(0, amount.getCurrency()),
    };
  }
}

export class PaymentProcessorFactory {
  public static getProcessor(method: "stripe" | "paypal" | "cod"): IPaymentProcessor {
    switch (method) {
      case "stripe":
        return new StripePaymentProcessor(process.env.STRIPE_SECRET_KEY || "mock_key");
      default:
        throw new Error(`Unsupported payment method: ${method}`);
    }
  }
}
```

---

### 6.3 Atomic Inventory Reservation Service

```typescript
import { ProductVariant } from "@/models";

export interface IInventoryManager {
  reserveStock(variantId: number, quantity: number): Promise<boolean>;
  releaseStock(variantId: number, quantity: number): Promise<void>;
}

export class AtomicMongoInventoryManager implements IInventoryManager {
  async reserveStock(variantId: number, quantity: number): Promise<boolean> {
    // Atomic conditional decrement: prevents overselling under peak concurrency
    const updated = await ProductVariant.findOneAndUpdate(
      {
        id: variantId,
        stock: { $gte: quantity }, // Check condition
      },
      {
        $inc: { stock: -quantity }, // Atomic mutation
      },
      { new: true }
    );

    if (!updated) {
      throw new InsufficientInventoryError(variantId, quantity);
    }

    return true;
  }

  async releaseStock(variantId: number, quantity: number): Promise<void> {
    // Compensating transaction if downstream payment fails
    await ProductVariant.updateOne(
      { id: variantId },
      { $inc: { stock: quantity } }
    );
  }
}
```

---

### 6.4 Double-Entry Financial Ledger Engine

```typescript
export interface LedgerPostingBatch {
  orderId: number;
  totalAmount: Money;
  sellerEarnings: Array<{ sellerId: number; earning: Money }>;
  platformCommission: Money;
  shippingEscrow: Money;
  charityEscrow: Money;
}

export class DoubleEntryLedgerManager {
  public validateBalance(batch: LedgerPostingBatch): void {
    const totalDebits = batch.totalAmount.getAmount();
    
    let totalCredits = 
      batch.platformCommission.getAmount() +
      batch.shippingEscrow.getAmount() +
      batch.charityEscrow.getAmount();

    for (const seller of batch.sellerEarnings) {
      totalCredits += seller.earning.getAmount();
    }

    const divergence = Math.abs(totalDebits - Number(totalCredits.toFixed(2)));
    if (divergence > 0.01) {
      throw new LedgerImbalanceError(totalDebits, totalCredits);
    }
  }

  public generateEntries(batch: LedgerPostingBatch, txId: string) {
    this.validateBalance(batch);

    const now = new Date();
    const entries = [];

    // 1. Debit Customer Escrow
    entries.push({
      transactionId: txId,
      orderId: batch.orderId,
      account: "CUSTOMER_PAYMENT_ESCROW",
      debit: batch.totalAmount.getAmount(),
      credit: 0,
      createdAt: now,
    });

    // 2. Credit Seller Payables
    for (const s of batch.sellerEarnings) {
      entries.push({
        transactionId: txId,
        orderId: batch.orderId,
        sellerId: s.sellerId,
        account: "SELLER_PAYABLE",
        debit: 0,
        credit: s.earning.getAmount(),
        createdAt: now,
      });
    }

    // 3. Credit Platform Commission
    entries.push({
      transactionId: txId,
      orderId: batch.orderId,
      account: "PLATFORM_COMMISSION_REVENUE",
      debit: 0,
      credit: batch.platformCommission.getAmount(),
      createdAt: now,
    });

    // 4. Credit Charity Escrow
    entries.push({
      transactionId: txId,
      orderId: batch.orderId,
      account: "CHARITY_ESCROW",
      debit: 0,
      credit: batch.charityEscrow.getAmount(),
      createdAt: now,
    });

    return entries;
  }
}
```

---

### 6.5 In-Memory LRU Cache with TTL (AI Intent & Autocomplete)

```typescript
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class SimpleLruCache<T> {
  private cache = new Map<string, CacheEntry<T>>();

  constructor(
    private readonly max: number = 500,
    private readonly ttlMs: number = 60 * 60 * 1000 // 1 hour
  ) {}

  public get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Refresh LRU order
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.data;
  }

  public set(key: string, value: T): void {
    if (this.cache.size >= this.max) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data: value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  public clear(): void {
    this.cache.clear();
  }
}
```

---

## 7. Summary & Architectural Alignment

This Low-Level Design defines the concrete object-oriented contracts, SOLID boundaries, state lifecycles, and concurrency primitives for Gazaarabia. 

For the high-level distributed systems blueprint, capacity estimates, and production infrastructure topologies, refer to:
- 📘 [`docs/HLD.md`](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/docs/HLD.md)
- 🏛️ [`Architecture.md`](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/Architecture.md)
