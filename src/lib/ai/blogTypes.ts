export interface BlogCategoryOption {
  id: number | string;
  name: string;
}

export interface GeneratedBlogArticle {
  title: string;
  slug: string;
  categoryId?: number;
  categoryName?: string;
  excerpt: string;
  htmlContent: string;
  suggestedImagePrompt: string;
  generatedImageUrl?: string;
  tags: string[];
}

export interface GeneratedBlogImageResult {
  imageUrl: string;
  altText: string;
  promptUsed: string;
}

export interface AiModelOption {
  id: string;
  name: string;
  badge: string;
  tagline: string;
  category: "Gemini 4 Series" | "Open Weights" | "Standard";
}

export const AVAILABLE_AI_MODELS: AiModelOption[] = [
  {
    id: "gemini-4-hydrogen",
    name: "Gemini 4 Hydrogen",
    badge: "Flagship",
    tagline: "Deep reasoning, cultural nuance & editorial depth",
    category: "Gemini 4 Series",
  },
  {
    id: "gemini-4-argon",
    name: "Gemini 4 Argon",
    badge: "Editorial",
    tagline: "High-fashion creative prose & rich vocabulary",
    category: "Gemini 4 Series",
  },
  {
    id: "gemini-4-carbon",
    name: "Gemini 4 Carbon",
    badge: "Fast Pro",
    tagline: "High-stability balanced generation",
    category: "Gemini 4 Series",
  },
  {
    id: "gemma-4-31b-it",
    name: "Gemma 4 31B",
    badge: "Open Weights",
    tagline: "Advanced 32B class instruction-tuned model",
    category: "Open Weights",
  },
  {
    id: "gemini-3.8-flash",
    name: "Gemini 3.8 Flash",
    badge: "Sub-Second",
    tagline: "Ultra-fast response with high accuracy",
    category: "Standard",
  },
  {
    id: "gemini-3.1-pro-preview",
    name: "Gemini 3.1 Pro",
    badge: "Long Context",
    tagline: "Extended context analysis & research",
    category: "Standard",
  },
];

export interface BlogDraftResponse {
  article: GeneratedBlogArticle;
  botMessage: string;
}
