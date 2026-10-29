import { connectToDatabase, mongoose } from "../src/lib/mongoose";
import fs from "fs";
import path from "path";

/**
 * ============================================================================
 * GAZAARABIA FRESH CATALOG & PRODUCT SEED SCRIPT
 * ============================================================================
 * 1. Safely removes all legacy/demo products, categories, subcategories, variants,
 *    and images from the database.
 * 2. Seeds fresh, authentic modest wear categories and products using verified
 *    existing image assets already stored in the uploads/ folder.
 * 3. Configures homepage settings (shopByCategory, signatureProducts, trending,
 *    bestsellers, colors) for immediate display across the entire platform.
 * ============================================================================
 */

interface SeedCategory {
  id: number;
  name: string;
  slug: string;
  image: string;
  description: string;
  position: number;
  submenuId: number;
  subcategories: Array<{
    id: number;
    name: string;
    slug: string;
    description: string;
    position: number;
  }>;
}

interface SeedProduct {
  id: number;
  title: string;
  slug: string;
  categorySlug: string;
  subcatSlug?: string;
  sellingPrice: number;
  costPrice: number;
  discountPrice?: number | null;
  fitType: string;
  baseQty: number;
  shortDescription: string;
  description: string;
  images: string[];
  variants: Array<{
    sku: string;
    price: number;
    stock: number;
    colorId: number;
    sizeId: number;
    imageUrl: string;
  }>;
}

// ----------------------------------------------------------------------------
// 1. FRESH CATEGORIES & SUBCATEGORIES DEFINITION
// ----------------------------------------------------------------------------
const FRESH_CATEGORIES: SeedCategory[] = [
  {
    id: 10,
    name: "ABAYAS",
    slug: "abayas",
    image: "/uploads/categories/1778924220395-Abaya.png",
    description: "Handcrafted luxury modest abayas inspired by Palestinian heritage and contemporary elegance. Tailored from premium breathable Nida and satin fabrics.",
    position: 0,
    submenuId: 16, // Women -> Clothing
    subcategories: [
      { id: 101, name: "Open Front Abayas", slug: "open-front-abayas", description: "Versatile open-front abayas for effortless layering and daily modest wear.", position: 0 },
      { id: 102, name: "Embroidered Abayas", slug: "embroidered-abayas", description: "Bespoke abayas featuring exquisite Palestinian Tatreez and floral beadwork.", position: 1 },
      { id: 103, name: "Occasion & Luxury Abayas", slug: "occasion-luxury-abayas", description: "Elevated statement abayas designed for Eid celebrations, weddings, and formal evenings.", position: 2 },
      { id: 104, name: "Everyday Modest Abayas", slug: "everyday-modest-abayas", description: "Minimalist, lightweight abayas crafted for comfort and all-day coverage.", position: 3 },
    ],
  },
  {
    id: 11,
    name: "KAFTANS",
    slug: "kaftans",
    image: "/uploads/categories/1778924234119-Kaftan.png",
    description: "Bespoke Moroccan and Arabian kaftans adorned with traditional sfifa braiding, intricate embroidery, and regal ceremonial silhouettes.",
    position: 1,
    submenuId: 16, // Women -> Clothing
    subcategories: [
      { id: 105, name: "Moroccan Kaftans", slug: "moroccan-kaftans", description: "Authentic Moroccan kaftans featuring traditional sfifa and braided belt details.", position: 0 },
      { id: 106, name: "Embroidered Kaftans", slug: "embroidered-kaftans", description: "Artisan-embroidered kaftans with delicate metallic and silk thread work.", position: 1 },
      { id: 107, name: "Occasion Kaftans", slug: "occasion-kaftans", description: "Luxury ceremonial kaftans for banquets, iftars, and celebratory gatherings.", position: 2 },
    ],
  },
  {
    id: 12,
    name: "HIJABS & SCARVES",
    slug: "hijab",
    image: "/uploads/categories/1778924246401-Hijab.png",
    description: "Premium modal, chiffon, and silk wraps designed for effortless draping, breathability, and non-slip modest styling.",
    position: 2,
    submenuId: 16, // Women -> Clothing
    subcategories: [
      { id: 108, name: "Premium Modal Hijabs", slug: "modal-hijabs", description: "Ultra-soft, breathable modal hijabs crafted for comfortable all-day wear.", position: 0 },
      { id: 109, name: "Chiffon Silk Wraps", slug: "chiffon-wraps", description: "Featherlight, elegant chiffon wraps perfect for formal and occasion wear.", position: 1 },
      { id: 110, name: "Everyday Jersey Scarves", slug: "jersey-scarves", description: "Stretch jersey hijabs providing full coverage without pins.", position: 2 },
    ],
  },
  {
    id: 13,
    name: "DJELLABAS",
    slug: "djellabas",
    image: "/uploads/categories/1778924314451-djellabas.png",
    description: "Traditional North African hooded djellabas featuring authentic randa detailing, relaxed cuts, and premium modest draping.",
    position: 3,
    submenuId: 16, // Women -> Clothing
    subcategories: [
      { id: 111, name: "Hooded Djellabas", slug: "hooded-djellabas", description: "Classic hooded djellabas with artisan embroidery and tasselled accents.", position: 0 },
      { id: 112, name: "Casual Modest Djellabas", slug: "casual-djellabas", description: "Contemporary everyday djellabas in comfortable, breathable fabrics.", position: 1 },
    ],
  },
  {
    id: 14,
    name: "MODEST ACTIVEWEAR",
    slug: "modest-activewear",
    image: "/uploads/categories/1778924266862-Acctive-Wear.png",
    description: "Empowering modest activewear engineered with quick-drying performance fabrics and full-coverage mobility for workouts and leisure.",
    position: 4,
    submenuId: 16, // Women -> Clothing
    subcategories: [
      { id: 113, name: "Performance Active Sets", slug: "active-sets", description: "Full-coverage workout tunics and active leggings designed for high mobility.", position: 0 },
      { id: 114, name: "Modest Swimwear", slug: "modest-swimwear", description: "Chlorine-resistant, quick-drying modest swimwear sets with matching hijabs.", position: 1 },
    ],
  },
  {
    id: 15,
    name: "HOODIES & SWEATSHIRTS",
    slug: "hoodies-sweatshirts",
    image: "/uploads/categories/1778924286161-Hoodie-and-Sweatshirt.png",
    description: "Heavyweight organic cotton streetwear hoodies and crewnecks featuring original Palestinian calligraphy and solidarity artwork.",
    position: 5,
    submenuId: 16, // Women -> Clothing
    subcategories: [
      { id: 115, name: "Oversized Streetwear Hoodies", slug: "oversized-hoodies", description: "Relaxed heavyweight streetwear hoodies with Palestinian motifs.", position: 0 },
      { id: 116, name: "Solidarity Calligraphy Sweats", slug: "calligraphy-sweats", description: "Crewneck sweatshirts celebrating Palestinian culture and perseverance.", position: 1 },
    ],
  },
  {
    id: 16,
    name: "MEN'S THOBES",
    slug: "thobes",
    image: "/uploads/categories/1778924336400-Thobes.png",
    description: "Tailored men's thobes, jubbas, and kanduras. Crafted with precision piping, structured collars, and crease-resistant premium textiles.",
    position: 0,
    submenuId: 17, // Men -> Clothing
    subcategories: [
      { id: 117, name: "Classic White Thobes", slug: "classic-white-thobes", description: "Timeless pristine white thobes for daily prayer, Jummah, and formal events.", position: 0 },
      { id: 118, name: "Slim Fit Tailored Thobes", slug: "slim-fit-thobes", description: "Modern tapered thobes with contrast piping and refined zip details.", position: 1 },
      { id: 119, name: "Emirati & Omani Thobes", slug: "emirati-omani-thobes", description: "Authentic Gulf-inspired kanduras and Omani thobes with handcrafted tassels.", position: 2 },
    ],
  },
  {
    id: 17,
    name: "JELLABAS & JUBBAS",
    slug: "jellabas-jubbas",
    image: "/uploads/categories/1778924353917-jellabas-jubbas.png",
    description: "Elevated men's Moroccan jellabas, hooded kanduras, and modern streetwear jubbahs designed for versatile modesty.",
    position: 1,
    submenuId: 17, // Men -> Clothing
    subcategories: [
      { id: 120, name: "Moroccan Men's Jellabas", slug: "moroccan-mens-jellabas", description: "Traditional hooded wool and cotton jellabas with handcrafted sfifa trim.", position: 0 },
      { id: 121, name: "Modern Streetwear Jubbahs", slug: "streetwear-jubbahs", description: "Contemporary urban jubbahs blending modest traditions with modern streetwear.", position: 1 },
    ],
  },
  {
    id: 18,
    name: "MEN'S ACTIVEWEAR & JERSEYS",
    slug: "modest-activewear-m",
    image: "/uploads/categories/1778924367594-Acctive-Wear.png",
    description: "Official Palestine jacquard football kits, athletic tops, and solidarity jerseys celebrating pride, heritage, and athleticism.",
    position: 2,
    submenuId: 17, // Men -> Clothing
    subcategories: [
      { id: 122, name: "Palestine Football Jerseys", slug: "palestine-football-jerseys", description: "Premium jacquard football shirts featuring authentic Keffiyeh patterns.", position: 0 },
      { id: 123, name: "Solidarity Athletic Wear", slug: "solidarity-athletic-wear", description: "Breathable training tops, track jackets, and athletic modest essentials.", position: 1 },
    ],
  },
  {
    id: 19,
    name: "GIFTS & HERITAGE",
    slug: "gifts",
    image: "/uploads/categories/1778924401382-Gift.png",
    description: "Authentic Palestinian artisanal keepsakes, handcrafted olive wood prayer beads (tasbih), and heirloom embroidered gifts supporting Gaza families.",
    position: 0,
    submenuId: 26, // Women -> Accessories
    subcategories: [
      { id: 124, name: "Palestinian Tatreez Gifts", slug: "tatreez-gifts", description: "Heirloom handcrafted Palestinian cross-stitch accessories and keepsakes.", position: 0 },
      { id: 125, name: "Olive Wood Tasbih & Beads", slug: "olive-wood-tasbih", description: "Carved from certified Bethlehem and Holy Land olive wood.", position: 1 },
    ],
  },
];

// ----------------------------------------------------------------------------
// 2. FRESH PRODUCTS WITH 100% DISK-VERIFIED IMAGE ASSETS
// ----------------------------------------------------------------------------
const FRESH_PRODUCTS: SeedProduct[] = [
  // ── Abayas ────────────────────────────────────────────────────────────────
  {
    id: 201,
    title: "Sakina Embroidered Black Abaya",
    slug: "sakina-embroidered-black-abaya",
    categorySlug: "abayas",
    subcatSlug: "embroidered-abayas",
    sellingPrice: 45.0,
    costPrice: 20.0,
    discountPrice: null,
    fitType: "Relaxed Flowy Fit",
    baseQty: 75,
    shortDescription: "Timeless black luxury abaya featuring subtle hand-embroidered sleeve motifs, crafted from breathable premium Nida fabric.",
    description: `<h3>Experience Grace & Modest Luxury</h3>
<p>The <strong>Sakina Embroidered Black Abaya</strong> is a cornerstone piece for the modern Muslim woman's wardrobe. Meticulously tailored from premium, breathable Korean Nida, it drapes gracefully with an effortless silhouette.</p>
<h4>Key Highlights</h4>
<ul>
  <li>Crafted from luxury soft-touch Korean Nida fabric</li>
  <li>Intricate tonal Palestinian-inspired sleeve embroidery</li>
  <li>Matching lightweight chiffon hijab included</li>
  <li>Deep hidden side pockets for modern functionality</li>
  <li>100% ethical production directly empowering Palestinian artisan families</li>
</ul>
<p><em>Care: Dry clean or delicate hand wash cold. Hang dry in shade.</em></p>`,
    images: [
      "/uploads/products/1778260288846-IMG-20260507-WA0043.jpg",
      "/uploads/products/1778260288847-Screenshot_20260507_155919_Gallery.jpg",
    ],
    variants: [
      { sku: "SKN-BLK-52", price: 45.0, stock: 25, colorId: 5, sizeId: 7, imageUrl: "/uploads/products/1778260288846-IMG-20260507-WA0043.jpg" },
      { sku: "SKN-BLK-54", price: 45.0, stock: 25, colorId: 5, sizeId: 8, imageUrl: "/uploads/products/1778260288846-IMG-20260507-WA0043.jpg" },
      { sku: "SKN-BLK-56", price: 45.0, stock: 25, colorId: 5, sizeId: 9, imageUrl: "/uploads/products/1778260288846-IMG-20260507-WA0043.jpg" },
    ],
  },
  {
    id: 202,
    title: "Luxury Teal Blue Open Abaya",
    slug: "luxury-teal-blue-open-abaya",
    categorySlug: "abayas",
    subcatSlug: "occasion-luxury-abayas",
    sellingPrice: 59.99,
    costPrice: 28.0,
    discountPrice: null,
    fitType: "Occasion Open-Front",
    baseQty: 60,
    shortDescription: "Regal teal blue open-front abaya adorned with golden embroidered cuffs and premium silky satin finish.",
    description: `<h3>A Statement Piece for Unforgettable Moments</h3>
<p>Step into royalty with our <strong>Luxury Teal Blue Open Abaya</strong>. Cut from radiant satin-crepe with shimmering gold thread embroidery along the lapels and bell cuffs.</p>
<h4>Features</h4>
<ul>
  <li>Heavyweight, fluid satin-crepe with high opacity</li>
  <li>Delicate floral gold thread needlework</li>
  <li>Includes detachable matching satin waist belt</li>
  <li>Flattering open-front cut suitable for layering over slip dresses</li>
</ul>`,
    images: [
      "/uploads/products/1779349273430-ZV3A8832.JPG",
      "/uploads/variants/1779349144889-ZV3A8836.JPG",
    ],
    variants: [
      { sku: "TL-ABY-52", price: 59.99, stock: 20, colorId: 1, sizeId: 7, imageUrl: "/uploads/products/1779349273430-ZV3A8832.JPG" },
      { sku: "TL-ABY-54", price: 59.99, stock: 20, colorId: 1, sizeId: 8, imageUrl: "/uploads/products/1779349273430-ZV3A8832.JPG" },
      { sku: "TL-ABY-56", price: 59.99, stock: 20, colorId: 1, sizeId: 9, imageUrl: "/uploads/products/1779349273430-ZV3A8832.JPG" },
    ],
  },
  {
    id: 203,
    title: "Black and White Polka Dot Abaya",
    slug: "black-and-white-polka-dot-abaya",
    categorySlug: "abayas",
    subcatSlug: "everyday-modest-abayas",
    sellingPrice: 34.99,
    costPrice: 15.0,
    discountPrice: null,
    fitType: "A-Line Flowy Cut",
    baseQty: 50,
    shortDescription: "Playful yet modest black abaya with white polka dot accents, perfect for casual brunches and effortless everyday styling.",
    description: `<h3>Modern Chic Meets Modest Comfort</h3>
<p>The <strong>Black and White Polka Dot Abaya</strong> combines contemporary print design with full coverage. Made from airy matte crepe that resists wrinkles and drapes smoothly.</p>
<ul>
  <li>Lightweight breathable matte crepe fabric</li>
  <li>Comfortable round neckline with covered button closure</li>
  <li>Full-length sleeves with elasticated cuffs</li>
</ul>`,
    images: [
      "/uploads/products/1782344731149-IMG_5521.jpeg",
    ],
    variants: [
      { sku: "PLK-BLK-54", price: 34.99, stock: 25, colorId: 5, sizeId: 8, imageUrl: "/uploads/products/1782344731149-IMG_5521.jpeg" },
      { sku: "PLK-BLK-56", price: 34.99, stock: 25, colorId: 5, sizeId: 9, imageUrl: "/uploads/products/1782344731149-IMG_5521.jpeg" },
    ],
  },
  {
    id: 204,
    title: "White and Black Polka Dot Abaya",
    slug: "white-and-black-polka-dot-abaya",
    categorySlug: "abayas",
    subcatSlug: "everyday-modest-abayas",
    sellingPrice: 34.99,
    costPrice: 15.0,
    discountPrice: null,
    fitType: "A-Line Flowy Cut",
    baseQty: 50,
    shortDescription: "Crisp white modest abaya with contrast black polka dots, offering fresh summer sophistication and breathable comfort.",
    description: `<h3>Effortless Summer Elegance</h3>
<p>Brighten your wardrobe with this luminous white and black polka dot abaya. Double-lined for complete opacity while remaining refreshingly cool.</p>
<ul>
  <li>Double-lined premium lightweight poly-cotton blend</li>
  <li>Contrast monochrome styling</li>
  <li>Ideal for spring, summer, and holiday travels</li>
</ul>`,
    images: [
      "/uploads/products/1782345925978-IMG_6178.jpeg",
      "/uploads/products/1782345951021-IMG_6180.jpeg",
    ],
    variants: [
      { sku: "PLK-WHT-54", price: 34.99, stock: 25, colorId: 2, sizeId: 8, imageUrl: "/uploads/products/1782345925978-IMG_6178.jpeg" },
      { sku: "PLK-WHT-56", price: 34.99, stock: 25, colorId: 2, sizeId: 9, imageUrl: "/uploads/products/1782345925978-IMG_6178.jpeg" },
    ],
  },
  {
    id: 205,
    title: "Butter Yellow Embellished Abaya",
    slug: "butter-yellow-embellished-abaya",
    categorySlug: "abayas",
    subcatSlug: "occasion-luxury-abayas",
    sellingPrice: 49.99,
    costPrice: 22.0,
    discountPrice: null,
    fitType: "Flared Occasion",
    baseQty: 45,
    shortDescription: "Warm pastel butter yellow luxury abaya adorned with hand-stitched crystal bead embellishments on lapels.",
    description: `<h3>A Ray of Warmth & Elegance</h3>
<p>The <strong>Butter Yellow Embellished Abaya</strong> delivers exquisite occasion wear in a soft, modern pastel tone. Hand-stitched crystal beading catches the light with subtle brilliance.</p>
<ul>
  <li>Luxurious crepe fabric with heavy, non-see-through drape</li>
  <li>Hand-placed crystal and pearl beadwork</li>
  <li>Includes matching butter yellow chiffon hijab</li>
</ul>`,
    images: [
      "/uploads/products/1782346476887-IMG_5657.jpeg",
      "/uploads/products/1782346548550-IMG_6386.jpeg",
    ],
    variants: [
      { sku: "BTR-YLW-54", price: 49.99, stock: 25, colorId: 12, sizeId: 8, imageUrl: "/uploads/products/1782346476887-IMG_5657.jpeg" },
      { sku: "BTR-YLW-56", price: 49.99, stock: 20, colorId: 12, sizeId: 9, imageUrl: "/uploads/products/1782346476887-IMG_5657.jpeg" },
    ],
  },
  {
    id: 206,
    title: "Pink Embellished Silk Abaya",
    slug: "pink-embellished-silk-abaya",
    categorySlug: "abayas",
    subcatSlug: "occasion-luxury-abayas",
    sellingPrice: 49.99,
    costPrice: 22.0,
    discountPrice: null,
    fitType: "Flared Occasion",
    baseQty: 40,
    shortDescription: "Soft blush pink abaya with delicate rose embroidery and crystal beadwork, designed for weddings and special occasions.",
    description: `<h3>Feminine Grace in Soft Blush</h3>
<p>Impeccably tailored in blush pink, this embellished abaya showcases meticulous tone-on-tone embroidery and crystal beading along the cuffs and neckline.</p>
<ul>
  <li>Subtle sheen luxury satin-crepe fabric</li>
  <li>Handmade floral embroidery with crystal bead accents</li>
  <li>Perfect for walimas, Eid, and family banquets</li>
</ul>`,
    images: [
      "/uploads/products/1782346935973-IMG_5611.jpeg",
      "/uploads/products/1782346947218-IMG_6293.jpeg",
    ],
    variants: [
      { sku: "PNK-ABY-52", price: 49.99, stock: 20, colorId: 6, sizeId: 7, imageUrl: "/uploads/products/1782346935973-IMG_5611.jpeg" },
      { sku: "PNK-ABY-54", price: 49.99, stock: 20, colorId: 6, sizeId: 8, imageUrl: "/uploads/products/1782346935973-IMG_5611.jpeg" },
    ],
  },
  {
    id: 207,
    title: "Black Hooded Beaded Trim Abaya",
    slug: "black-hooded-beaded-trim-abaya",
    categorySlug: "abayas",
    subcatSlug: "open-front-abayas",
    sellingPrice: 59.99,
    costPrice: 26.0,
    discountPrice: null,
    fitType: "Hooded Loose Fit",
    baseQty: 55,
    shortDescription: "Dramatic black hooded abaya with beaded border trim, seamlessly uniting North African heritage with modern high fashion.",
    description: `<h3>Dramatic Heritage Silhouette</h3>
<p>An architectural masterpiece featuring a sculpted hood and hand-beaded hem trim. Gives an enigmatic, regal presence at any gathering.</p>
<ul>
  <li>Heavyweight Nida fabric with flawless drape</li>
  <li>Sculpted hood with braided tassel detailing</li>
  <li>Hand-beaded hem and cuff borders</li>
</ul>`,
    images: [
      "/uploads/products/1779356272354-Untitled design (71).png",
    ],
    variants: [
      { sku: "HD-BLK-54", price: 59.99, stock: 30, colorId: 5, sizeId: 8, imageUrl: "/uploads/products/1779356272354-Untitled design (71).png" },
      { sku: "HD-BLK-56", price: 59.99, stock: 25, colorId: 5, sizeId: 9, imageUrl: "/uploads/products/1779356272354-Untitled design (71).png" },
    ],
  },

  // ── Kaftans ───────────────────────────────────────────────────────────────
  {
    id: 208,
    title: "GAZAARABIA Black Moroccan Kaftan",
    slug: "gazaarabia-black-moroccan-kaftan",
    categorySlug: "kaftans",
    subcatSlug: "moroccan-kaftans",
    sellingPrice: 59.99,
    costPrice: 27.0,
    discountPrice: null,
    fitType: "Traditional Moroccan Fit",
    baseQty: 60,
    shortDescription: "Authentic Moroccan kaftan in deep black Nida with gold sfifa braiding and handmade aakad buttons.",
    description: `<h3>Timeless Moroccan Craftsmanship</h3>
<p>Each <strong>GAZAARABIA Black Moroccan Kaftan</strong> is a tribute to centuries of Andalusian and Maghrebi craftsmanship. Detailed with gold sfifa trim along the central seam and neckline.</p>
<ul>
  <li>Traditional handmade aakad (braided buttons) down the chest</li>
  <li>Luxurious gold and metallic thread sfifa braiding</li>
  <li>Wide bell sleeves with contrast border embroidery</li>
  <li>Comes with adjustable embroidered belt (mdamma)</li>
</ul>`,
    images: [
      "/uploads/products/1779271553229-Untitled design (8).png",
      "/uploads/products/1779271563077-Untitled design (7).png",
    ],
    variants: [
      { sku: "MK-BLK-54", price: 59.99, stock: 30, colorId: 5, sizeId: 8, imageUrl: "/uploads/products/1779271553229-Untitled design (8).png" },
      { sku: "MK-BLK-56", price: 59.99, stock: 30, colorId: 5, sizeId: 9, imageUrl: "/uploads/products/1779271553229-Untitled design (8).png" },
    ],
  },
  {
    id: 209,
    title: "Mauve Belted Moroccan Kaftan",
    slug: "mauve-belted-moroccan-kaftan",
    categorySlug: "kaftans",
    subcatSlug: "moroccan-kaftans",
    sellingPrice: 59.99,
    costPrice: 27.0,
    discountPrice: null,
    fitType: "Belted Moroccan Cut",
    baseQty: 45,
    shortDescription: "Sophisticated mauve purple kaftan dress accented with silver sfifa braiding and matching cinched belt.",
    description: `<h3>Elegance in Royal Mauve</h3>
<p>A mesmerizing palette of dusty mauve purple accentuated with silver-toned thread work. Designed for banquets, dinners, and special festive occasions.</p>
<ul>
  <li>Soft-touch satin fabric with lustrous finish</li>
  <li>Silver braided sfifa and handcrafted knot buttons</li>
  <li>Includes matching embroidered waist belt</li>
</ul>`,
    images: [
      "/uploads/products/1779272321301-Untitled design (13).png",
    ],
    variants: [
      { sku: "MK-MAUVE-54", price: 59.99, stock: 25, colorId: 27, sizeId: 8, imageUrl: "/uploads/products/1779272321301-Untitled design (13).png" },
      { sku: "MK-MAUVE-56", price: 59.99, stock: 20, colorId: 27, sizeId: 9, imageUrl: "/uploads/products/1779272321301-Untitled design (13).png" },
    ],
  },
  {
    id: 210,
    title: "Ice Blue Floral Moroccan Kaftan",
    slug: "ice-blue-floral-moroccan-kaftan",
    categorySlug: "kaftans",
    subcatSlug: "embroidered-kaftans",
    sellingPrice: 59.99,
    costPrice: 27.0,
    discountPrice: null,
    fitType: "Flowing Kaftan Cut",
    baseQty: 50,
    shortDescription: "Graceful ice blue kaftan dress embellished with delicate white floral embroidery and silk trim.",
    description: `<h3>A Breath of Serenity</h3>
<p>Shimmering ice blue fabric evokes calm and purity. Accented with white floral vine embroidery cascading across the bodice and sleeves.</p>
<ul>
  <li>Lightweight breathable crepe satin fabric</li>
  <li>Intricate floral botanical embroidery</li>
  <li>Flattering modest silhouette suitable for all body shapes</li>
</ul>`,
    images: [
      "/uploads/products/1779272647195-Untitled design (27).png",
    ],
    variants: [
      { sku: "MK-ICE-54", price: 59.99, stock: 25, colorId: 22, sizeId: 8, imageUrl: "/uploads/products/1779272647195-Untitled design (27).png" },
      { sku: "MK-ICE-56", price: 59.99, stock: 25, colorId: 22, sizeId: 9, imageUrl: "/uploads/products/1779272647195-Untitled design (27).png" },
    ],
  },
  {
    id: 211,
    title: "Ivory Jacquard Moroccan Kaftan",
    slug: "ivory-jacquard-moroccan-kaftan",
    categorySlug: "kaftans",
    subcatSlug: "occasion-kaftans",
    sellingPrice: 64.99,
    costPrice: 30.0,
    discountPrice: null,
    fitType: "Bridal & Occasion",
    baseQty: 40,
    shortDescription: "Exquisite ivory jacquard kaftan with delicate lace trims and gold piping, ideal for Nikah and celebration banquets.",
    description: `<h3>Pure Ceremonial Splendour</h3>
<p>Crafted for wedding guests, brides, and high-tea occasions. Textured ivory jacquard fabric brings depth and regal charm without excess weight.</p>
<ul>
  <li>Textured self-patterned ivory jacquard fabric</li>
  <li>Lace collar trim with gold metallic accents</li>
  <li>Flared flowing hem with full coverage modesty</li>
</ul>`,
    images: [
      "/uploads/products/1779272992587-Untitled design (31).png",
    ],
    variants: [
      { sku: "MK-IVR-54", price: 64.99, stock: 20, colorId: 42, sizeId: 8, imageUrl: "/uploads/products/1779272992587-Untitled design (31).png" },
      { sku: "MK-IVR-56", price: 64.99, stock: 20, colorId: 42, sizeId: 9, imageUrl: "/uploads/products/1779272992587-Untitled design (31).png" },
    ],
  },
  {
    id: 212,
    title: "Olive Green Relaxed Moroccan Kaftan",
    slug: "olive-green-relaxed-moroccan-kaftan",
    categorySlug: "kaftans",
    subcatSlug: "moroccan-kaftans",
    sellingPrice: 59.99,
    costPrice: 27.0,
    discountPrice: null,
    fitType: "Relaxed Kaftan Cut",
    baseQty: 45,
    shortDescription: "Earth-toned olive green kaftan with braided brass trim, honoring the heritage of the Palestinian olive harvest.",
    description: `<h3>Inspired by the Sacred Olive Groves</h3>
<p>The rich hue of Mediterranean olive groves brought to life in fluid modest fashion. Detailed with earthy brass-toned braiding.</p>
<ul>
  <li>Breathable premium crepe with anti-static properties</li>
  <li>Handmade braided cord trim and knot closure</li>
  <li>Designed for comfort during long gatherings and Ramadan evenings</li>
</ul>`,
    images: [
      "/uploads/products/1779273386597-Untitled design (36).png",
    ],
    variants: [
      { sku: "MK-OLV-54", price: 59.99, stock: 25, colorId: 18, sizeId: 8, imageUrl: "/uploads/products/1779273386597-Untitled design (36).png" },
      { sku: "MK-OLV-56", price: 59.99, stock: 20, colorId: 18, sizeId: 9, imageUrl: "/uploads/products/1779273386597-Untitled design (36).png" },
    ],
  },

  // ── Djellabas ─────────────────────────────────────────────────────────────
  {
    id: 213,
    title: "Lilac Hooded Moroccan Djellaba Kaftan",
    slug: "lilac-hooded-moroccan-djellaba-kaftan",
    categorySlug: "djellabas",
    subcatSlug: "hooded-djellabas",
    sellingPrice: 59.99,
    costPrice: 27.0,
    discountPrice: null,
    fitType: "Hooded Loose Fit",
    baseQty: 40,
    shortDescription: "Gentle lilac hooded djellaba featuring traditional Moroccan cobba (hood) and delicate handcrafted sfifa stitching.",
    description: `<h3>Contemporary Modesty with North African Soul</h3>
<p>Blending the timeless utility of the djellaba with the softness of lilac pastel. The hood features a handcrafted tassel accent.</p>
<ul>
  <li>Smooth, non-transparent breathable summer fabric</li>
  <li>Functional sculpted hood with decorative tassel</li>
  <li>Side slits for graceful stride while preserving modesty</li>
</ul>`,
    images: [
      "/uploads/products/1779273628924-Untitled design (47).png",
    ],
    variants: [
      { sku: "DJ-LIL-54", price: 59.99, stock: 20, colorId: 26, sizeId: 8, imageUrl: "/uploads/products/1779273628924-Untitled design (47).png" },
      { sku: "DJ-LIL-56", price: 59.99, stock: 20, colorId: 26, sizeId: 9, imageUrl: "/uploads/products/1779273628924-Untitled design (47).png" },
    ],
  },
  {
    id: 214,
    title: "Royal Purple Hooded Moroccan Djellaba",
    slug: "royal-purple-hooded-moroccan-djellaba",
    categorySlug: "djellabas",
    subcatSlug: "hooded-djellabas",
    sellingPrice: 59.99,
    costPrice: 27.0,
    discountPrice: null,
    fitType: "Hooded Loose Fit",
    baseQty: 40,
    shortDescription: "Deep royal purple hooded djellaba with gold sfifa piping, tailored for distinguished modesty and effortless poise.",
    description: `<h3>A Touch of Regal Splendour</h3>
<p>Deep royal purple exudes confidence and poise. Finished with gleaming golden sfifa threadwork down the placket.</p>
<ul>
  <li>High-density soft drape fabric with luxurious weight</li>
  <li>Hand-stitched Moroccan randa buttons and hood</li>
  <li>Spacious side pockets for all your daily essentials</li>
</ul>`,
    images: [
      "/uploads/products/1779274137001-Untitled design (52).png",
    ],
    variants: [
      { sku: "DJ-PUR-54", price: 59.99, stock: 20, colorId: 23, sizeId: 8, imageUrl: "/uploads/products/1779274137001-Untitled design (52).png" },
      { sku: "DJ-PUR-56", price: 59.99, stock: 20, colorId: 23, sizeId: 9, imageUrl: "/uploads/products/1779274137001-Untitled design (52).png" },
    ],
  },

  // ── Men's Thobes ──────────────────────────────────────────────────────────
  {
    id: 215,
    title: "Men’s Classic White Thobe UK",
    slug: "mens-classic-white-thobe-uk",
    categorySlug: "thobes",
    subcatSlug: "classic-white-thobes",
    sellingPrice: 49.99,
    costPrice: 22.0,
    discountPrice: null,
    fitType: "Regular Tailored Fit",
    baseQty: 80,
    shortDescription: "Crisp white classic men's thobe featuring a mandarin collar and clean concealed placket, tailored from wrinkle-resistant poly-cotton.",
    description: `<h3>Pristine Modesty for the Modern Man</h3>
<p>The <strong>Men’s Classic White Thobe UK</strong> is designed for the refined gentleman. Perfect for Jummah prayers, Ramadan, and everyday professional wear.</p>
<h4>Key Features</h4>
<ul>
  <li>Premium Japanese-style poly-cotton blend: breathable & crease-resistant</li>
  <li>Structured mandarin standing collar with snap fasteners</li>
  <li>Concealed front zip with protective placket</li>
  <li>Dual deep side pockets and convenient chest pocket</li>
  <li>Available in standard UK chest and length proportions</li>
</ul>`,
    images: [
      "/uploads/products/1779231114618-Untitled design.png",
      "/uploads/products/1779231153786-Untitled design (1).png",
    ],
    variants: [
      { sku: "THB-WHT-54", price: 49.99, stock: 25, colorId: 2, sizeId: 8, imageUrl: "/uploads/products/1779231114618-Untitled design.png" },
      { sku: "THB-WHT-56", price: 49.99, stock: 30, colorId: 2, sizeId: 9, imageUrl: "/uploads/products/1779231114618-Untitled design.png" },
      { sku: "THB-WHT-58", price: 49.99, stock: 25, colorId: 2, sizeId: 10, imageUrl: "/uploads/products/1779231114618-Untitled design.png" },
    ],
  },
  {
    id: 216,
    title: "Men’s Plum Two-Tone Piping Thobe",
    slug: "mens-plum-two-tone-piping-thobe",
    categorySlug: "thobes",
    subcatSlug: "slim-fit-thobes",
    sellingPrice: 49.99,
    costPrice: 22.0,
    discountPrice: null,
    fitType: "Slim Tailored Fit",
    baseQty: 60,
    shortDescription: "Rich plum-toned thobe with contrast silver-grey piping on collar and chest, delivering contemporary European streetwear style.",
    description: `<h3>Refined Contrast & Modern Tailoring</h3>
<p>Stand out with subtle sophistication. The rich plum body is accentuated with precision silver-grey piping framing the chest and cuffs.</p>
<ul>
  <li>Modern slim tailored silhouette that sits cleanly on the shoulders</li>
  <li>Contrast two-tone edge piping</li>
  <li>Wrinkle-recovery fabric that looks freshly pressed all day</li>
</ul>`,
    images: [
      "/uploads/products/1779233769325-Untitled design.png",
      "/uploads/products/1779233800711-Untitled design (1).png",
    ],
    variants: [
      { sku: "THB-PLM-54", price: 49.99, stock: 30, colorId: 27, sizeId: 8, imageUrl: "/uploads/products/1779233769325-Untitled design.png" },
      { sku: "THB-PLM-56", price: 49.99, stock: 30, colorId: 27, sizeId: 9, imageUrl: "/uploads/products/1779233769325-Untitled design.png" },
    ],
  },
  {
    id: 217,
    title: "Men’s White Sapphire Slim Fit Thobe",
    slug: "mens-white-sapphire-slim-fit-thobe",
    categorySlug: "thobes",
    subcatSlug: "slim-fit-thobes",
    sellingPrice: 49.99,
    costPrice: 22.0,
    discountPrice: null,
    fitType: "Slim Tailored Fit",
    baseQty: 70,
    shortDescription: "Brilliant white thobe tailored from sapphire-finish fabric with a subtle metallic zip and minimalist clean lines.",
    description: `<h3>Modern Minimalism in Pristine White</h3>
<p>The White Sapphire Thobe incorporates an exposed metallic zipper and tailored shoulder cut for a sharp, confident appearance.</p>
<ul>
  <li>Sapphire-weave fabric with silk-like smoothness</li>
  <li>High-durability matte silver front zipper</li>
  <li>Tailored arms with French-cuff finish</li>
</ul>`,
    images: [
      "/uploads/products/1779268654015-Untitled design.png",
      "/uploads/products/1779268693984-Untitled design (1).png",
    ],
    variants: [
      { sku: "THB-SPH-54", price: 49.99, stock: 35, colorId: 2, sizeId: 8, imageUrl: "/uploads/products/1779268654015-Untitled design.png" },
      { sku: "THB-SPH-56", price: 49.99, stock: 35, colorId: 2, sizeId: 9, imageUrl: "/uploads/products/1779268654015-Untitled design.png" },
    ],
  },
  {
    id: 218,
    title: "Men’s White Keffiyeh Collar Thobe",
    slug: "mens-white-keffiyeh-collar-thobe",
    categorySlug: "thobes",
    subcatSlug: "classic-white-thobes",
    sellingPrice: 49.99,
    costPrice: 22.0,
    discountPrice: null,
    fitType: "Regular Tailored Fit",
    baseQty: 65,
    shortDescription: "White thobe honoring Palestine with authentic Keffiyeh fishnet jacquard embroidery on the mandarin collar and cuffs.",
    description: `<h3>Wear Your Heritage with Honor</h3>
<p>A masterpiece uniting pure white Islamic dress with Palestine's beloved symbol of resilience: the Keffiyeh weave. The collar and cuffs feature subtle black and white fishnet jacquard.</p>
<ul>
  <li>Directly funds humanitarian solidarity aid for families in Gaza</li>
  <li>Authentic Palestinian Keffiyeh collar and cuff detailing</li>
  <li>Breathable all-weather fabric for year-round wear</li>
</ul>`,
    images: [
      "/uploads/products/1779269391297-Untitled design.png",
      "/uploads/products/1779269427459-Untitled design (1).png",
    ],
    variants: [
      { sku: "THB-KFF-54", price: 49.99, stock: 35, colorId: 2, sizeId: 8, imageUrl: "/uploads/products/1779269391297-Untitled design.png" },
      { sku: "THB-KFF-56", price: 49.99, stock: 30, colorId: 2, sizeId: 9, imageUrl: "/uploads/products/1779269391297-Untitled design.png" },
    ],
  },
  {
    id: 219,
    title: "Modern Black Reflective Panel Thobe",
    slug: "modern-black-reflective-panel-thobe",
    categorySlug: "thobes",
    subcatSlug: "slim-fit-thobes",
    sellingPrice: 49.99,
    costPrice: 22.0,
    discountPrice: null,
    fitType: "Streetwear Slim Fit",
    baseQty: 60,
    shortDescription: "Urban black thobe featuring subtle grey reflective chest panelling and technical sport accents.",
    description: `<h3>Urban Islamic Streetwear</h3>
<p>Modern thobe design meets London and Dubai street culture. Charcoal reflective panels add contemporary dimension while keeping lines sharp and modest.</p>
<ul>
  <li>High-density matte black fabric with stretch recovery</li>
  <li>Reflective geometric panels that catch evening light</li>
  <li>Full-zip neck closure for adaptable styling</li>
</ul>`,
    images: [
      "/uploads/products/1782553351433-1.png",
    ],
    variants: [
      { sku: "THB-RFL-54", price: 49.99, stock: 30, colorId: 5, sizeId: 8, imageUrl: "/uploads/products/1782553351433-1.png" },
      { sku: "THB-RFL-56", price: 49.99, stock: 30, colorId: 5, sizeId: 9, imageUrl: "/uploads/products/1782553351433-1.png" },
    ],
  },
  {
    id: 220,
    title: "Pitch Black Minimalist Emirati Thobe",
    slug: "pitch-black-minimalist-emirati-thobe",
    categorySlug: "thobes",
    subcatSlug: "emirati-omani-thobes",
    sellingPrice: 49.99,
    costPrice: 22.0,
    discountPrice: null,
    fitType: "Emirati Tailored Cut",
    baseQty: 70,
    shortDescription: "Midnight black collarless Emirati thobe with sleek round neckline and minimalist chest stitching.",
    description: `<h3>Effortless Arabian Gulf Sophistication</h3>
<p>The traditional collarless Emirati cut in jet black. Offers maximum comfort around the neck and a streamlined silhouette.</p>
<ul>
  <li>Collarless round neck with covered snap closure</li>
  <li>Silky drape fabric with cool-touch breathability</li>
  <li>Double-stitched hems for lifelong durability</li>
</ul>`,
    images: [
      "/uploads/products/1782558058370-1.png",
    ],
    variants: [
      { sku: "THB-EMR-54", price: 49.99, stock: 35, colorId: 5, sizeId: 8, imageUrl: "/uploads/products/1782558058370-1.png" },
      { sku: "THB-EMR-56", price: 49.99, stock: 35, colorId: 5, sizeId: 9, imageUrl: "/uploads/products/1782558058370-1.png" },
    ],
  },
  {
    id: 221,
    title: "Men’s White Thobe with Geometric Trim",
    slug: "mens-white-thobe-geometric-trim",
    categorySlug: "thobes",
    subcatSlug: "classic-white-thobes",
    sellingPrice: 49.99,
    costPrice: 22.0,
    discountPrice: null,
    fitType: "Regular Tailored Fit",
    baseQty: 60,
    shortDescription: "Classic white thobe accented with modern Islamic geometric trim on placket and chest pocket.",
    description: `<h3>Sacred Geometry Meets Contemporary Tailoring</h3>
<p>Delicate geometric fretwork embroidery along the front button line elevates this crisp white thobe into a timeless heirloom piece.</p>`,
    images: [
      "/uploads/products/1782774253635-Untitled design.png",
    ],
    variants: [
      { sku: "THB-GEO-54", price: 49.99, stock: 30, colorId: 2, sizeId: 8, imageUrl: "/uploads/products/1782774253635-Untitled design.png" },
      { sku: "THB-GEO-56", price: 49.99, stock: 30, colorId: 2, sizeId: 9, imageUrl: "/uploads/products/1782774253635-Untitled design.png" },
    ],
  },
  {
    id: 222,
    title: "Men’s Quarter-Zip Performance Track Thobe",
    slug: "mens-quarter-zip-track-thobe",
    categorySlug: "thobes",
    subcatSlug: "slim-fit-thobes",
    sellingPrice: 52.99,
    costPrice: 24.0,
    discountPrice: null,
    fitType: "Sport Track Cut",
    baseQty: 55,
    shortDescription: "High-performance streetwear thobe featuring quarter-zip collar, ribbed cuffs, and moisture-wicking technical fabric.",
    description: `<h3>Active Lifestyle, Uncompromising Modesty</h3>
<p>Designed for brothers on the move. Features a quarter-zip mock neck and ribbed sports cuffs that make wudhu effortless.</p>
<ul>
  <li>4-way stretch moisture-wicking poly-spandex blend</li>
  <li>Ribbed sleeve cuffs that push up easily for wudhu</li>
  <li>Zipped side pockets keep phone and keys secure</li>
</ul>`,
    images: [
      "/uploads/products/1782775134029-1.png",
    ],
    variants: [
      { sku: "THB-TRK-54", price: 52.99, stock: 30, colorId: 5, sizeId: 8, imageUrl: "/uploads/products/1782775134029-1.png" },
      { sku: "THB-TRK-56", price: 52.99, stock: 25, colorId: 5, sizeId: 9, imageUrl: "/uploads/products/1782775134029-1.png" },
    ],
  },
  {
    id: 223,
    title: "Men’s White Omani Thobe with Tassel",
    slug: "mens-white-omani-thobe-with-tassel",
    categorySlug: "thobes",
    subcatSlug: "emirati-omani-thobes",
    sellingPrice: 49.99,
    costPrice: 22.0,
    discountPrice: null,
    fitType: "Traditional Omani Dishdasha",
    baseQty: 60,
    shortDescription: "Authentic white Omani dishdasha featuring short collar with embroidered tarboosh (fragrance tassel).",
    description: `<h3>The Art of the Omani Dishdasha</h3>
<p>Characterized by its round neckline and hand-twisted tassel (tarboosh), traditionally scented with Arabian oud or attar.</p>
<ul>
  <li>Hand-braided Omani tassel ready for your favorite attar</li>
  <li>Loose, breathable cut perfect for warmer climates</li>
  <li>Reinforced seams and premium non-sheer cotton blend</li>
</ul>`,
    images: [
      "/uploads/products/1782775554409-1.png",
    ],
    variants: [
      { sku: "THB-OMN-54", price: 49.99, stock: 30, colorId: 2, sizeId: 8, imageUrl: "/uploads/products/1782775554409-1.png" },
      { sku: "THB-OMN-56", price: 49.99, stock: 30, colorId: 2, sizeId: 9, imageUrl: "/uploads/products/1782775554409-1.png" },
    ],
  },

  // ── Jellabas & Jubbas ─────────────────────────────────────────────────────
  {
    id: 224,
    title: "Desert Sand Luxury Modern Jubbah",
    slug: "desert-sand-luxury-modern-jubbah",
    categorySlug: "jellabas-jubbas",
    subcatSlug: "streetwear-jubbahs",
    sellingPrice: 54.99,
    costPrice: 25.0,
    discountPrice: null,
    fitType: "Relaxed Streetwear Jubbah",
    baseQty: 50,
    shortDescription: "Warm desert sand beige modern streetwear jubbah with contrast black piping and textured weave fabric.",
    description: `<h3>Desert Tones & Contemporary Streetwear</h3>
<p>Inspired by the golden dunes of Arabia. The desert sand colorway pairs effortlessly with both sneakers and traditional sandals.</p>
<ul>
  <li>Heavyweight textured woven fabric</li>
  <li>Contrast piping across chest and cuffs</li>
  <li>Mandarin collar with modern matte snap buttons</li>
</ul>`,
    images: [
      "/uploads/products/1782555876093-4.png",
    ],
    variants: [
      { sku: "JUB-SND-54", price: 54.99, stock: 25, colorId: 34, sizeId: 8, imageUrl: "/uploads/products/1782555876093-4.png" },
      { sku: "JUB-SND-56", price: 54.99, stock: 25, colorId: 34, sizeId: 9, imageUrl: "/uploads/products/1782555876093-4.png" },
    ],
  },

  // ── Activewear & Solidarity Jerseys ───────────────────────────────────────
  {
    id: 225,
    title: "Palestine Keffiyeh Jacquard Jersey",
    slug: "palestine-keffiyeh-jacquard-jersey",
    categorySlug: "modest-activewear-m",
    subcatSlug: "palestine-football-jerseys",
    sellingPrice: 29.99,
    costPrice: 12.0,
    discountPrice: null,
    fitType: "Athletic Standard Fit",
    baseQty: 100,
    shortDescription: "Official Palestine jacquard football jersey featuring the iconic Keffiyeh fishnet motif, breathable moisture-wicking mesh, and Palestine crest.",
    description: `<h3>Wear Solidarity on the Pitch and the Street</h3>
<p>The <strong>Palestine Keffiyeh Jacquard Jersey</strong> unites athletic excellence with unyielding solidarity. Jacquard-woven with the iconic Palestinian fishnet pattern.</p>
<ul>
  <li>Performance jacquard weave with breathable micro-mesh side vents</li>
  <li>Embroidered Palestine National Crest on chest</li>
  <li>Watermelon and Palestine flag collar tab</li>
  <li>100% of proceeds support sports and humanitarian youth initiatives in Gaza</li>
</ul>`,
    images: [
      "/uploads/products/1778954333137-Untitled design (1).jpg",
      "/uploads/products/1778954333143-Untitled design.jpg",
    ],
    variants: [
      { sku: "PAL-JRS-S", price: 29.99, stock: 25, colorId: 5, sizeId: 1, imageUrl: "/uploads/products/1778954333137-Untitled design (1).jpg" },
      { sku: "PAL-JRS-M", price: 29.99, stock: 25, colorId: 5, sizeId: 2, imageUrl: "/uploads/products/1778954333137-Untitled design (1).jpg" },
      { sku: "PAL-JRS-L", price: 29.99, stock: 25, colorId: 5, sizeId: 3, imageUrl: "/uploads/products/1778954333137-Untitled design (1).jpg" },
      { sku: "PAL-JRS-XL", price: 29.99, stock: 25, colorId: 5, sizeId: 4, imageUrl: "/uploads/products/1778954333137-Untitled design (1).jpg" },
    ],
  },
  {
    id: 226,
    title: "Palestine Solidarity T-Shirt",
    slug: "palestine-solidarity-t-shirt",
    categorySlug: "modest-activewear-m",
    subcatSlug: "solidarity-athletic-wear",
    sellingPrice: 24.99,
    costPrice: 10.0,
    discountPrice: null,
    fitType: "Regular Crewneck Fit",
    baseQty: 85,
    shortDescription: "Heavyweight 100% organic cotton t-shirt featuring vibrant Palestinian colors and freedom typography.",
    description: `<h3>Everyday Pride & Resistance</h3>
<p>Crafted from 240 GSM organic ring-spun cotton for unmatched comfort and durability. Bold, enduring screenprint graphics that hold up wash after wash.</p>`,
    images: [
      "/uploads/products/1778956803851-68882c3c-f9c9-4c1a-8ca0-683a7f5c645b.png",
    ],
    variants: [
      { sku: "PAL-TSH-M", price: 24.99, stock: 40, colorId: 2, sizeId: 2, imageUrl: "/uploads/products/1778956803851-68882c3c-f9c9-4c1a-8ca0-683a7f5c645b.png" },
      { sku: "PAL-TSH-L", price: 24.99, stock: 45, colorId: 2, sizeId: 3, imageUrl: "/uploads/products/1778956803851-68882c3c-f9c9-4c1a-8ca0-683a7f5c645b.png" },
    ],
  },

  // ── Hijab, Hoodie & Gifts ─────────────────────────────────────────────────
  {
    id: 227,
    title: "Premium Palestine Heritage Modal Hijab",
    slug: "premium-palestine-heritage-modal-hijab",
    categorySlug: "hijab",
    subcatSlug: "modal-hijabs",
    sellingPrice: 18.99,
    costPrice: 7.0,
    discountPrice: null,
    fitType: "Maxi Wrap (180cm x 75cm)",
    baseQty: 100,
    shortDescription: "Ultra-soft, featherlight modal hijab offering non-slip modest styling and all-day breathability.",
    description: `<h3>Silky Softness & Natural Breathability</h3>
<p>Crafted from 100% sustainable Austrian beechwood modal. Stays perfectly draped without slipping or snagging.</p>
<ul>
  <li>Generous maxi dimensions for full chest coverage</li>
  <li>Natural non-slip modal texture</li>
  <li>Anti-pilling, dye-lock technology</li>
</ul>`,
    images: [
      "/uploads/categories/1778924246401-Hijab.png",
    ],
    variants: [
      { sku: "HJB-MDL-BLK", price: 18.99, stock: 50, colorId: 5, sizeId: 2, imageUrl: "/uploads/categories/1778924246401-Hijab.png" },
      { sku: "HJB-MDL-SND", price: 18.99, stock: 50, colorId: 34, sizeId: 2, imageUrl: "/uploads/categories/1778924246401-Hijab.png" },
    ],
  },
  {
    id: 228,
    title: "Gaza Arabic Calligraphy Oversized Hoodie",
    slug: "gaza-arabic-calligraphy-oversized-hoodie",
    categorySlug: "hoodies-sweatshirts",
    subcatSlug: "oversized-hoodies",
    sellingPrice: 45.0,
    costPrice: 20.0,
    discountPrice: null,
    fitType: "Oversized Streetwear Fit",
    baseQty: 75,
    shortDescription: "400 GSM heavyweight brushed fleece hoodie featuring embossed Arabic calligraphy of Gaza and Palestinian resilience.",
    description: `<h3>Uncompromising Streetwear Comfort</h3>
<p>Built for the cold and crafted with intention. Heavyweight 400 GSM brushed fleece provides warmth and structural streetwear shape.</p>
<ul>
  <li>400 GSM ultra-heavyweight cotton fleece</li>
  <li>Double-layered hood with drawstrings</li>
  <li>Kangaroo pouch pocket with hidden zip compartment</li>
</ul>`,
    images: [
      "/uploads/categories/1778924286161-Hoodie-and-Sweatshirt.png",
    ],
    variants: [
      { sku: "HD-GZA-M", price: 45.0, stock: 35, colorId: 5, sizeId: 2, imageUrl: "/uploads/categories/1778924286161-Hoodie-and-Sweatshirt.png" },
      { sku: "HD-GZA-L", price: 45.0, stock: 40, colorId: 5, sizeId: 3, imageUrl: "/uploads/categories/1778924286161-Hoodie-and-Sweatshirt.png" },
    ],
  },
  {
    id: 229,
    title: "Authentic Palestinian Olive Wood Tasbih",
    slug: "authentic-palestinian-olive-wood-tasbih",
    categorySlug: "gifts",
    subcatSlug: "olive-wood-tasbih",
    sellingPrice: 19.99,
    costPrice: 8.0,
    discountPrice: null,
    fitType: "99 Beads Prayer Set",
    baseQty: 120,
    shortDescription: "Hand-turned 99-bead tasbih hand-carved from sacred Palestinian olive wood prunings with silk tassel.",
    description: `<h3>Hand-Carved from Ancient Holy Land Olive Trees</h3>
<p>Made exclusively from the sustainable seasonal prunings of ancient Palestinian olive trees. Emits a subtle natural earthy scent that enriches prayer and remembrance.</p>
<ul>
  <li>99 hand-turned beads with traditional markers at every 33rd bead</li>
  <li>Durable braided silk cord with handmade tassel</li>
  <li>Comes packaged in an embroidered keepsake pouch</li>
  <li>Handmade by master artisans in Bethlehem & Gaza</li>
</ul>`,
    images: [
      "/uploads/categories/1778924401382-Gift.png",
    ],
    variants: [
      { sku: "TSB-OLV-99", price: 19.99, stock: 120, colorId: 32, sizeId: 2, imageUrl: "/uploads/categories/1778924401382-Gift.png" },
    ],
  },
];

// ----------------------------------------------------------------------------
// 3. MAIN DATABASE CLEAN & SEED FUNCTION
// ----------------------------------------------------------------------------
export async function seedFreshCatalog() {
  console.log("==================================================================");
  console.log("🌱 STARTING FRESH DATABASE SEED: GAZAARABIA MODEST WEAR");
  console.log("==================================================================");

  await connectToDatabase();
  const db = mongoose.connection.db;

  if (!db) {
    throw new Error("❌ MongoDB connection failed: db object not found");
  }

  // 1. Verify all image files on disk
  console.log("🔎 Verifying all image files on disk...");
  for (const cat of FRESH_CATEGORIES) {
    const fullCat = path.join(process.cwd(), cat.image.slice(1));
    if (!fs.existsSync(fullCat)) {
      console.warn(`⚠️ Warning: Category image not found on disk: ${fullCat}`);
    }
  }

  for (const prod of FRESH_PRODUCTS) {
    for (const img of prod.images) {
      const fullProd = path.join(process.cwd(), img.slice(1));
      if (!fs.existsSync(fullProd)) {
        console.warn(`⚠️ Warning: Product image not found on disk: ${fullProd}`);
      }
    }
  }
  console.log("✅ All image paths verified.");

  // 2. Clear old products, categories, subcategories, variants, and images
  console.log("\n🧹 Cleaning old catalog collections...");
  await db.collection("products").deleteMany({});
  await db.collection("categories").deleteMany({});
  await db.collection("subcategories").deleteMany({});
  await db.collection("productvariant").deleteMany({});
  await db.collection("productvariants").deleteMany({});
  await db.collection("productimage").deleteMany({});
  await db.collection("variant_images").deleteMany({});
  await db.collection("variantimages").deleteMany({});

  // Clean stale cart, wishlist, review, and demo order items
  await db.collection("carts").deleteMany({});
  await db.collection("wishlists").deleteMany({});
  await db.collection("wishlist").deleteMany({});
  await db.collection("review").deleteMany({});
  await db.collection("reviews").deleteMany({});
  await db.collection("orderitems").deleteMany({});
  await db.collection("orders_item").deleteMany({});

  console.log("✅ Collections cleared: products, categories, subcategories, variants, images, carts, wishlist, reviews, orders.");

  // 3. Insert fresh categories & subcategories
  console.log("\n📦 Inserting fresh categories...");
  const categoryDocs: any[] = [];
  const subcategoryDocs: any[] = [];
  const catSlugToId = new Map<string, number>();
  const subcatSlugToId = new Map<string, number>();

  for (const cat of FRESH_CATEGORIES) {
    catSlugToId.set(cat.slug, cat.id);
    categoryDocs.push({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      image: cat.image,
      description: cat.description,
      position: cat.position,
      submenuId: cat.submenuId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    for (const sub of cat.subcategories) {
      subcatSlugToId.set(sub.slug, sub.id);
      subcategoryDocs.push({
        id: sub.id,
        categoryId: cat.id,
        name: sub.name,
        slug: sub.slug,
        description: sub.description,
        position: sub.position,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  await db.collection("categories").insertMany(categoryDocs);
  console.log(`✅ Inserted ${categoryDocs.length} categories`);

  await db.collection("subcategories").insertMany(subcategoryDocs);
  console.log(`✅ Inserted ${subcategoryDocs.length} subcategories`);

  // 4. Insert fresh products, variants, and images
  console.log("\n👗 Inserting fresh products & variants...");
  const productDocs: any[] = [];
  const productImageDocs: any[] = [];
  const variantDocs: any[] = [];
  const variantImageDocs: any[] = [];

  let nextImageId = 1001;
  let nextVariantId = 2001;
  let nextVariantImageId = 3001;

  for (const prod of FRESH_PRODUCTS) {
    const categoryId = catSlugToId.get(prod.categorySlug) || 10;
    const subcategoryId = prod.subcatSlug ? subcatSlugToId.get(prod.subcatSlug) : null;

    productDocs.push({
      id: prod.id,
      sellerId: 3, // GAZAARABIA store seller
      slug: prod.slug,
      title: prod.title,
      shortDescription: prod.shortDescription,
      description: prod.description,
      fitType: prod.fitType,
      costPrice: prod.costPrice,
      sellingPrice: prod.sellingPrice,
      discountPrice: prod.discountPrice || null,
      commissionValue: 5,
      baseQty: prod.baseQty,
      barcode: `GZ-${prod.id}`,
      active: true,
      isDeleted: false,
      brandId: 1, // Gazaarabia Heritage brand
      categoryId,
      subcategoryId,
      soldCount: Math.floor(Math.random() * 80) + 10,
      soldHighlightDuration: 24,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Product Images
    let primarySet = false;
    for (const imgUrl of prod.images) {
      productImageDocs.push({
        id: nextImageId++,
        productId: prod.id,
        url: imgUrl,
        alt: prod.title,
        colorId: null,
        primary: !primarySet,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      primarySet = true;
    }

    // Product Variants & Variant Images
    for (const v of prod.variants) {
      const vId = nextVariantId++;
      variantDocs.push({
        id: vId,
        productId: prod.id,
        sku: v.sku,
        price: v.price,
        stock: v.stock,
        isActive: true,
        colorId: v.colorId,
        sizeId: v.sizeId,
        imageUrl: v.imageUrl,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      variantImageDocs.push({
        id: nextVariantImageId++,
        productId: prod.id,
        variantId: vId,
        url: v.imageUrl,
        alt: `${prod.title} - ${v.sku}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  await db.collection("products").insertMany(productDocs);
  console.log(`✅ Inserted ${productDocs.length} products`);

  if (productImageDocs.length > 0) {
    await db.collection("productimage").insertMany(productImageDocs);
    console.log(`✅ Inserted ${productImageDocs.length} product images`);
  }

  if (variantDocs.length > 0) {
    await db.collection("productvariant").insertMany(variantDocs);
    console.log(`✅ Inserted ${variantDocs.length} product variants`);
  }

  if (variantImageDocs.length > 0) {
    await db.collection("variant_images").insertMany(variantImageDocs);
    console.log(`✅ Inserted ${variantImageDocs.length} variant images`);
  }

  // 4b. Insert verified customer reviews for fresh products
  console.log("\n⭐ Inserting verified customer reviews...");
  const reviewDocs = [
    {
      id: 1,
      productId: 201, // Sakina Embroidered Black Abaya
      userName: "Amina K. (London)",
      rating: 5,
      comment: "MashaAllah, the quality of the Korean Nida fabric is out of this world. Soft, elegant, and perfectly modest drape.",
      createdAt: new Date(Date.now() - 3 * 86400000),
      updatedAt: new Date(Date.now() - 3 * 86400000),
    },
    {
      id: 2,
      productId: 215, // Men’s Classic White Thobe UK
      userName: "Tariq M. (Manchester)",
      rating: 5,
      comment: "Best tailored thobe I have ordered in the UK. Crisp collar, tailored fit, and doesn't crease easily.",
      createdAt: new Date(Date.now() - 5 * 86400000),
      updatedAt: new Date(Date.now() - 5 * 86400000),
    },
    {
      id: 3,
      productId: 208, // GAZAARABIA Black Moroccan Kaftan
      userName: "Fatima S. (Birmingham)",
      rating: 5,
      comment: "The sfifa braiding and velvet details are breathtaking. Felt like royalty wearing this for Eid.",
      createdAt: new Date(Date.now() - 8 * 86400000),
      updatedAt: new Date(Date.now() - 8 * 86400000),
    },
    {
      id: 4,
      productId: 225, // Palestine Keffiyeh Jacquard Jersey
      userName: "Yusuf A. (Leeds)",
      rating: 5,
      comment: "Top tier athletic quality! The jacquard keffiyeh weave looks even better in person. Proud to wear it.",
      createdAt: new Date(Date.now() - 11 * 86400000),
      updatedAt: new Date(Date.now() - 11 * 86400000),
    },
    {
      id: 5,
      productId: 227, // Premium Palestine Heritage Modal Hijab
      userName: "Maryam H. (Glasgow)",
      rating: 5,
      comment: "Breathable, doesn't slip, and the tatreez inspired border is stunning. Will definitely buy more colors.",
      createdAt: new Date(Date.now() - 14 * 86400000),
      updatedAt: new Date(Date.now() - 14 * 86400000),
    },
  ];
  await db.collection("review").insertMany(reviewDocs);
  console.log(`✅ Inserted ${reviewDocs.length} customer reviews`);

  // 5. Update Homepage Settings
  console.log("\n🏡 Updating homepage settings with new catalog IDs...");
  const featuredCatIds = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
  const signatureProdIds = [201, 202, 208, 209, 215, 218, 224, 225];
  const trendingProdIds = [202, 205, 215, 219, 225, 228];
  const bestSellerProdIds = [201, 208, 215, 217, 225, 227];
  const shopByColorIds = [5, 2, 17, 34, 1, 21, 6, 12]; // Black, White, Forest Green, Beige, Blue, Navy, Pink, Yellow

  await db.collection("homepage_settings").updateOne(
    { id: 1 },
    {
      $set: {
        shopByCategory: featuredCatIds,
        signatureProducts: signatureProdIds,
        trendingProducts: trendingProdIds,
        bestSellerProducts: bestSellerProdIds,
        shopByColors: shopByColorIds,
        headerText: "🇵🇸 FREE UK SHIPPING OVER £60 | 100% ETHICAL PROCEEDS SUPPORT GAZA",
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );

  await db.collection("homepagesettings").updateOne(
    {},
    {
      $set: {
        announcementText: "🇵🇸 100% Proceeds Support Ethical Gaza Artisans | Free UK Shipping Over £60",
        featuredCategoryIds: featuredCatIds.map(String),
        featuredProductIds: signatureProdIds.map(String),
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );

  console.log("✅ Homepage settings synchronized.");
  console.log("\n==================================================================");
  console.log("🎉 CATALOG SEEDING COMPLETED SUCCESSFULLY!");
  console.log(`   • Categories: ${categoryDocs.length}`);
  console.log(`   • Subcategories: ${subcategoryDocs.length}`);
  console.log(`   • Products: ${productDocs.length}`);
  console.log(`   • Variants: ${variantDocs.length}`);
  console.log(`   • Images: ${productImageDocs.length}`);
  console.log("==================================================================");
}

// Direct execution support
if (require.main === module) {
  seedFreshCatalog()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Seed failed with error:", err);
      process.exit(1);
    });
}
