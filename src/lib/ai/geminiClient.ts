/**
 * ==============================================================================
 * GAZAARABIA AI ENGINE — CENTRALIZED GOOGLE GEMINI CLIENT
 * ==============================================================================
 * 1. Native High-Performance Google Gemini API Client (Supports Gemini 2.5 / 1.5 Flash).
 * 2. In-Memory LRU Cache with TTL: Repeated queries return in ~5ms at $0 API cost.
 * 3. AbortController Timeout Protection: Never blocks the HTTP thread.
 * 4. Graceful Fallback: Seamlessly falls back to database keyword search when
 *    GEMINI_API_KEY is unset or when API limits are reached.
 * ==============================================================================
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// In-Memory LRU Cache for search query intents
class SimpleLruCache<T> {
  private max: number;
  private ttlMs: number;
  private cache: Map<string, CacheEntry<T>>;

  constructor(max = 500, ttlMs = 60 * 60 * 1000) {
    this.max = max;
    this.ttlMs = ttlMs;
    this.cache = new Map();
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    // Re-insert to mark as recently used
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.data;
  }

  set(key: string, value: T): void {
    if (this.cache.size >= this.max) {
      // Evict oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, {
      data: value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

export const searchIntentCache = new SimpleLruCache<any>(500, 60 * 60 * 1000); // 1 hour TTL
export const visualSearchCache = new SimpleLruCache<any>(200, 30 * 60 * 1000); // 30 min TTL

export function isGeminiConfigured(): boolean {
  return !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
}

export function getGeminiModelName(): string {
  return process.env.GEMINI_MODEL || "gemini-2.5-flash";
}

/**
 * Generate Structured JSON via Google Gemini API
 */
export async function generateStructuredJson<T>(
  prompt: string,
  systemInstruction?: string,
  timeoutMs = 4000
): Promise<T | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  const model = getGeminiModelName();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const contents: any[] = [];
    if (systemInstruction) {
      contents.push({
        role: "user",
        parts: [{ text: `SYSTEM INSTRUCTIONS:\n${systemInstruction}` }],
      });
      contents.push({
        role: "model",
        parts: [{ text: "Understood. I will strictly follow these instructions and output only valid JSON." }],
      });
    }

    contents.push({
      role: "user",
      parts: [{ text: prompt }],
    });

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[Gemini API] Request failed (${response.status}):`, errText.slice(0, 200));
      return null;
    }

    const json = await response.json();
    const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return null;

    try {
      return JSON.parse(rawText) as T;
    } catch (parseErr) {
      console.warn("[Gemini API] Failed to parse JSON response:", rawText.slice(0, 150));
      return null;
    }
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      console.warn(`[Gemini API] Timeout reached (${timeoutMs}ms), falling back.`);
    } else {
      console.warn("[Gemini API] Inference error:", error.message || error);
    }
    return null;
  }
}

/**
 * Multimodal Visual Feature Analysis via Google Gemini API
 */
export async function analyzeImageWithGemini<T>(
  imageBase64: string,
  mimeType = "image/jpeg",
  prompt: string,
  systemInstruction?: string,
  timeoutMs = 6000
): Promise<T | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  const model = getGeminiModelName();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");

    const contents: any[] = [
      {
        role: "user",
        parts: [
          ...(systemInstruction ? [{ text: `SYSTEM INSTRUCTIONS:\n${systemInstruction}\n\n` }] : []),
          {
            inlineData: {
              mimeType,
              data: cleanBase64,
            },
          },
          { text: prompt },
        ],
      },
    ];

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.15,
          responseMimeType: "application/json",
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[Gemini Vision API] Request failed (${response.status}):`, errText.slice(0, 200));
      return null;
    }

    const json = await response.json();
    const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return null;

    return JSON.parse(rawText) as T;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      console.warn(`[Gemini Vision API] Timeout reached (${timeoutMs}ms), falling back.`);
    } else {
      console.warn("[Gemini Vision API] Vision analysis error:", error.message || error);
    }
    return null;
  }
}
