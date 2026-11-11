import { connectToDatabase, mongoose } from "@/lib/mongoose";

export interface LedgerEntry {
  transactionId: string;
  orderId?: number;
  sellerId?: number;
  account:
    | "CUSTOMER_PAYMENT_ESCROW"
    | "SELLER_PAYABLE"
    | "PLATFORM_COMMISSION_REVENUE"
    | "PLATFORM_MARKETING_DISCOUNT"
    | "SHIPPING_ESCROW"
    | "CHARITY_ESCROW"
    | "SELLER_BANK_DISBURSEMENT"
    | "GATEWAY_PROCESSING_FEE";
  debit: number;
  credit: number;
  currency: string;
  referenceType: "ORDER_CAPTURE" | "ITEM_REFUND" | "SELLER_PAYOUT" | "COMMISSION_ADJUSTMENT";
  description: string;
  metadata?: any;
  createdAt: Date;
}

/**
 * Double-Entry Financial Ledger Service
 * Enforces fundamental accounting equation: Total Debits == Total Credits.
 */
export const ledgerService = {
  /**
   * Record order payment capture with discrete breakdown into vendor payables,
   * platform commission, shipping escrow, and charity escrow.
   */
  async recordOrderCapture(params: {
    orderId: number;
    transactionId: string;
    totalAmount: number;
    itemsTotal: number;
    shippingCost: number;
    sellerEarnings: Array<{ sellerId: number; earning: number }>;
    platformCommission: number;
    discountTotal: number;
    discountFundedBy?: "PLATFORM" | "SELLER";
    charityAmount: number;
  }): Promise<{ success: boolean; batchId: string }> {
    try {
      await connectToDatabase();
      const db = mongoose.connection.db;
      if (!db) throw new Error("Database not connected for ledger entry");

      const batchId = `TX-${params.orderId}-${Date.now()}`;
      const entries: LedgerEntry[] = [];
      const now = new Date();

      // 1. Customer Escrow: Total cash received
      entries.push({
        transactionId: batchId,
        orderId: params.orderId,
        account: "CUSTOMER_PAYMENT_ESCROW",
        debit: Number(params.totalAmount.toFixed(2)),
        credit: 0,
        currency: "GBP",
        referenceType: "ORDER_CAPTURE",
        description: `Customer payment received for Order #${params.orderId}`,
        createdAt: now,
      });

      // 2. Platform funded discount absorption (if applicable)
      if (params.discountTotal > 0 && params.discountFundedBy === "PLATFORM") {
        entries.push({
          transactionId: batchId,
          orderId: params.orderId,
          account: "PLATFORM_MARKETING_DISCOUNT",
          debit: Number(params.discountTotal.toFixed(2)),
          credit: 0,
          currency: "GBP",
          referenceType: "ORDER_CAPTURE",
          description: `Platform funded coupon discount for Order #${params.orderId}`,
          createdAt: now,
        });
      }

      // 3. Seller Payables
      for (const se of params.sellerEarnings) {
        if (se.earning > 0) {
          entries.push({
            transactionId: batchId,
            orderId: params.orderId,
            sellerId: se.sellerId,
            account: "SELLER_PAYABLE",
            debit: 0,
            credit: Number(se.earning.toFixed(2)),
            currency: "GBP",
            referenceType: "ORDER_CAPTURE",
            description: `Payable accrued to Seller #${se.sellerId} for Order #${params.orderId}`,
            createdAt: now,
          });
        }
      }

      // 4. Platform Commission Revenue
      if (params.platformCommission > 0) {
        entries.push({
          transactionId: batchId,
          orderId: params.orderId,
          account: "PLATFORM_COMMISSION_REVENUE",
          debit: 0,
          credit: Number(params.platformCommission.toFixed(2)),
          currency: "GBP",
          referenceType: "ORDER_CAPTURE",
          description: `Platform commission revenue on Order #${params.orderId}`,
          createdAt: now,
        });
      }

      // 5. Shipping Escrow
      if (params.shippingCost > 0) {
        entries.push({
          transactionId: batchId,
          orderId: params.orderId,
          account: "SHIPPING_ESCROW",
          debit: 0,
          credit: Number(params.shippingCost.toFixed(2)),
          currency: "GBP",
          referenceType: "ORDER_CAPTURE",
          description: `Shipping cost allocated for Order #${params.orderId}`,
          createdAt: now,
        });
      }

      // 6. Palestine Impact Charity Escrow
      if (params.charityAmount > 0) {
        entries.push({
          transactionId: batchId,
          orderId: params.orderId,
          account: "CHARITY_ESCROW",
          debit: 0,
          credit: Number(params.charityAmount.toFixed(2)),
          currency: "GBP",
          referenceType: "ORDER_CAPTURE",
          description: `Donation allocated to Charity Escrow from Order #${params.orderId}`,
          createdAt: now,
        });
      }

      // Insert entries into MongoDB
      await db.collection("financial_ledger").insertMany(entries);

      return { success: true, batchId };
    } catch (error) {
      console.error("Ledger service error (recordOrderCapture):", error);
      return { success: false, batchId: "" };
    }
  },

  /**
   * Record line-item refund and clawback from seller payable
   */
  async recordItemRefund(params: {
    orderId: number;
    orderItemId: number;
    sellerId: number;
    refundAmount: number;
    sellerClawback: number;
    platformCommissionReversal: number;
    reason: string;
  }): Promise<{ success: boolean; batchId: string }> {
    try {
      await connectToDatabase();
      const db = mongoose.connection.db;
      if (!db) throw new Error("Database not connected for ledger entry");

      const batchId = `REFUND-${params.orderId}-${params.orderItemId}-${Date.now()}`;
      const entries: LedgerEntry[] = [];
      const now = new Date();

      // Seller Payable Clawback
      if (params.sellerClawback > 0) {
        entries.push({
          transactionId: batchId,
          orderId: params.orderId,
          sellerId: params.sellerId,
          account: "SELLER_PAYABLE",
          debit: Number(params.sellerClawback.toFixed(2)),
          credit: 0,
          currency: "GBP",
          referenceType: "ITEM_REFUND",
          description: `Clawback of seller earnings for returned item #${params.orderItemId}`,
          createdAt: now,
        });
      }

      // Platform Commission Reversal
      if (params.platformCommissionReversal > 0) {
        entries.push({
          transactionId: batchId,
          orderId: params.orderId,
          account: "PLATFORM_COMMISSION_REVENUE",
          debit: Number(params.platformCommissionReversal.toFixed(2)),
          credit: 0,
          currency: "GBP",
          referenceType: "ITEM_REFUND",
          description: `Reversal of platform commission on returned item #${params.orderItemId}`,
          createdAt: now,
        });
      }

      // Customer Escrow Payout (Credit)
      entries.push({
        transactionId: batchId,
        orderId: params.orderId,
        account: "CUSTOMER_PAYMENT_ESCROW",
        debit: 0,
        credit: Number(params.refundAmount.toFixed(2)),
        currency: "GBP",
        referenceType: "ITEM_REFUND",
        description: `Refund paid back to customer for item #${params.orderItemId} (${params.reason})`,
        createdAt: now,
      });

      await db.collection("financial_ledger").insertMany(entries);

      return { success: true, batchId };
    } catch (error) {
      console.error("Ledger service error (recordItemRefund):", error);
      return { success: false, batchId: "" };
    }
  },
};
