import mongoose, { Schema, Model } from "mongoose";

// Helper to get or define model to prevent overwrite errors in Next.js HMR
function getOrCreateModel<T>(name: string, schema: Schema): Model<T> {
  return (mongoose.models[name] as Model<T>) || mongoose.model<T>(name, schema);
}

// ------------------------------------------------------------------------------
// 1. Roles & Users
// ------------------------------------------------------------------------------
export const RoleSchema = new Schema(
  {
    id: { type: Number, unique: true, index: true },
    name: { type: String, required: true, unique: true },
  },
  { timestamps: true, strict: false }
);
export const Role = getOrCreateModel("Role", RoleSchema);

export const UserSchema = new Schema(
  {
    id: { type: Number, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    phone: { type: String },
    password: { type: String, required: true },
    roleId: { type: Number, index: true },
    isGuest: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    otpCode: { type: String },
    otpExpiresAt: { type: Date },
    stripeCustomerId: { type: String },
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },
    googleId: { type: String },
  },
  { timestamps: true, strict: false }
);
export const User = getOrCreateModel("User", UserSchema);

// ------------------------------------------------------------------------------
// 1b. OTP Verification Schema (with auto-expiring MongoDB TTL index)
// ------------------------------------------------------------------------------
export const OtpSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    otp: {
      type: String,
      required: true,
      trim: true,
    },
    purpose: {
      type: String,
      enum: ["registration", "login", "password_reset"],
      default: "registration",
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // MongoDB TTL: deletes document once expiresAt is reached
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    attempts: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true, strict: false }
);

OtpSchema.index({ email: 1, purpose: 1 });
OtpSchema.index({ email: 1, otp: 1 });

export const Otp = getOrCreateModel("Otp", OtpSchema);

// ------------------------------------------------------------------------------
// 2. Sellers & Stores
// ------------------------------------------------------------------------------
export const SellerSchema = new Schema(
  {
    id: { type: Number, unique: true, index: true },
    userId: { type: Number, unique: true, index: true },
    shopName: { type: String },
    shopSlug: { type: String, unique: true },
    logo: { type: String },
    banner: { type: String },
    isActive: { type: Boolean, default: false },
    status: { type: String, default: "Pending", index: true },
    commissionValue: { type: Number, default: 5 },
    payoutDays: { type: Number, default: 30 },
    minimumPayout: { type: Number, default: 50 },
    availableBalance: { type: Number, default: 0 },
    pendingBalance: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },
    storeType: { type: String },
    shopifyDomain: { type: String, index: true },
    shopifyAccessToken: { type: String },
  },
  { timestamps: true, strict: false }
);
export const Seller = getOrCreateModel("Seller", SellerSchema);

// ------------------------------------------------------------------------------
// 3. Categories & Subcategories
// ------------------------------------------------------------------------------
export const CategorySchema = new Schema(
  {
    id: { type: Number, unique: true, index: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    image: { type: String },
    description: { type: String },
    order: { type: Number, default: 0 },
    status: { type: String, default: "Active" },
  },
  { timestamps: true, strict: false }
);
export const Category = getOrCreateModel("Category", CategorySchema);

export const SubcategorySchema = new Schema(
  {
    id: { type: Number, unique: true, index: true },
    categoryId: { type: Number, index: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, index: true },
    image: { type: String },
  },
  { timestamps: true, strict: false }
);
export const Subcategory = getOrCreateModel("Subcategory", SubcategorySchema);

// ------------------------------------------------------------------------------
// 4. Products, Variants & Images
// ------------------------------------------------------------------------------
export const ProductSchema = new Schema(
  {
    id: { type: Number, unique: true, index: true },
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String },
    sellerId: { type: Number, index: true },
    categoryId: { type: Number, index: true },
    subcategoryId: { type: Number, index: true },
    brandId: { type: Number },
    basePrice: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    sku: { type: String },
    status: { type: String, default: "Active", index: true },
    featured: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: true },
  },
  { timestamps: true, strict: false }
);
export const Product = getOrCreateModel("Product", ProductSchema);

export const ProductVariantSchema = new Schema(
  {
    id: { type: Number, unique: true, index: true },
    productId: { type: Number, required: true, index: true },
    sizeId: { type: Number },
    colorId: { type: Number },
    sku: { type: String },
    price: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    imageUrl: { type: String },
    externalVariantId: { type: String },
  },
  { timestamps: true, strict: false }
);
export const ProductVariant = getOrCreateModel("ProductVariant", ProductVariantSchema);

export const VariantImageSchema = new Schema(
  {
    id: { type: Number, unique: true, index: true },
    productVariantId: { type: Number, required: true, index: true },
    url: { type: String, required: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true, strict: false }
);
export const VariantImage = getOrCreateModel("VariantImage", VariantImageSchema);

// ------------------------------------------------------------------------------
// 5. Orders & Order Items
// ------------------------------------------------------------------------------
export const OrderSchema = new Schema(
  {
    id: { type: Number, unique: true, index: true },
    orderNumber: { type: String, required: true, unique: true, index: true },
    userId: { type: Number, index: true },
    totalAmount: { type: Number, required: true },
    status: { type: String, default: "Pending", index: true },
    paymentStatus: { type: String, default: "Pending" },
    paymentMethod: { type: String },
    shippingAddressId: { type: Number },
  },
  { timestamps: true, strict: false }
);
export const Order = getOrCreateModel("Order", OrderSchema);

export const OrderItemSchema = new Schema(
  {
    id: { type: Number, unique: true, index: true },
    orderId: { type: Number, required: true, index: true },
    productId: { type: Number, required: true, index: true },
    productVariantId: { type: Number },
    sellerId: { type: Number, index: true },
    quantity: { type: Number, default: 1 },
    price: { type: Number, required: true },
  },
  { timestamps: true, strict: false }
);
export const OrderItem = getOrCreateModel("OrderItem", OrderItemSchema);

// ------------------------------------------------------------------------------
// 6. Settings & Content
// ------------------------------------------------------------------------------
export const PlatformSettingsSchema = new Schema(
  {
    id: { type: Number, unique: true, index: true },
    siteName: { type: String, default: "Gazaarabia" },
    siteLogo: { type: String },
    defaultCommissionValue: { type: Number, default: 10 },
    siteEmail: { type: String },
    contactPhone: { type: String },
  },
  { timestamps: true, strict: false }
);
export const PlatformSettings = getOrCreateModel("PlatformSettings", PlatformSettingsSchema);

export const HomePageSettingSchema = new Schema(
  {
    id: { type: Number, unique: true, index: true },
    heroBanners: { type: Schema.Types.Mixed },
    featuredCategories: { type: Schema.Types.Mixed },
    sections: { type: Schema.Types.Mixed },
  },
  { timestamps: true, strict: false }
);
export const HomePageSetting = getOrCreateModel("HomePageSetting", HomePageSettingSchema);

// ------------------------------------------------------------------------------
// 7. Generic Dynamic Collection Handler for All 51 Tables
// ------------------------------------------------------------------------------
export function getDynamicCollection(collectionName: string): Model<any> {
  const modelName = `Dynamic_${collectionName}`;
  if (mongoose.models[modelName]) {
    return mongoose.models[modelName];
  }
  const dynamicSchema = new Schema(
    { id: { type: Number, index: true } },
    { collection: collectionName, timestamps: true, strict: false }
  );
  return mongoose.model(modelName, dynamicSchema);
}
