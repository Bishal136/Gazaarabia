export interface ImpactInitiativeMeta {
  slug: string;
  title: string;
  eyebrow: string;
  hero: string;
  desc: string;
}

export const IMPACT_INITIATIVES_META: Record<string, ImpactInitiativeMeta> = {
  "women-empowerment": {
    slug: "women-empowerment",
    title: "Empowering Women Through Craft & Opportunity",
    eyebrow: "Women Empowerment",
    hero: "/images/impact/s1.webp",
    desc: "At Gazaarabia, we partner with women artisans across communities, offering skill development, fair wages, and long-term financial independence.",
  },
  "sustainable-fashion": {
    slug: "sustainable-fashion",
    title: "Sustainability at the Heart of Every Design",
    eyebrow: "Sustainable Fashion",
    hero: "/images/impact/s2.webp",
    desc: "We focus on eco-friendly fabrics, ethical production, and low-impact processes to protect our planet while creating luxury modest fashion.",
  },
  "cultural-heritage": {
    slug: "cultural-heritage",
    title: "Preserving Craft Traditions Passed Down Through Generations",
    eyebrow: "Cultural Heritage",
    hero: "/images/impact/s3.jpg",
    desc: "We document, celebrate, and revive ancient textile traditions, ensuring they are passed forward with pride and integrity.",
  },
  "global-reach": {
    slug: "global-reach",
    title: "Connecting Artisans With Conscious Consumers Everywhere",
    eyebrow: "Global Reach",
    hero: "/images/impact/s4.webp",
    desc: "Gazaarabia bridges the gap between skilled artisans and global markets, ensuring every creation finds a home and every maker earns fair recognition.",
  },
};

export const IMPACT_SLUGS = Object.keys(IMPACT_INITIATIVES_META);
