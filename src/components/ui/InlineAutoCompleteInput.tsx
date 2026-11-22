"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { TextField, Box } from "@mui/material";
import { Loader2 } from "lucide-react";

interface InlineAutoCompleteInputProps {
  value: string;
  onChange: (e: any) => void;
  name?: string;
  label?: React.ReactNode;
  placeholder?: string;
  fullWidth?: boolean;
  sx?: any;
  disabled?: boolean;
  required?: boolean;
  categoryId?: string | number;
  onAccept?: (completedTitle: string, cascade?: any) => void;
  helperText?: React.ReactNode;
}

// Comprehensive instant client-side dictionary for 0ms immediate autocomplete on first keystroke
const INSTANT_COMPLETIONS: Array<{
  pattern: RegExp;
  title: string;
  categoryId: number;
  categoryName: string;
  subcategoryId: number;
  subcategoryName: string;
  fitType: string;
  shortDescription: string;
  tags: string[];
}> = [
  {
    pattern: /^(b|bl|bla|black|black\s+n|black\s+nidh)/i,
    title: "Black Nidha Embroidered Abaya",
    categoryId: 10,
    categoryName: "ABAYAS",
    subcategoryId: 102,
    subcategoryName: "Embroidered Abayas",
    fitType: "Modest / Loose Fit",
    shortDescription: "Elegant black abaya crafted from luxurious Korean Nidha fabric with subtle cuff embroidery.",
    tags: ["black abaya", "nidha fabric", "open front", "modest fashion", "everyday luxury"],
  },
  {
    pattern: /^(black\s+v|black\s+vel)/i,
    title: "Black Velvet Luxury Abaya",
    categoryId: 10,
    categoryName: "ABAYAS",
    subcategoryId: 103,
    subcategoryName: "Occasion & Luxury Abayas",
    fitType: "A-Line Silhouette",
    shortDescription: "Plush midnight black velvet abaya with shimmering artisanal detailing for evening occasions.",
    tags: ["black abaya", "velvet abaya", "luxury wear", "evening wear"],
  },
  {
    pattern: /^(r|ro|roy|royal|royal\s+p|royal\s+purp)/i,
    title: "Royal Purple Velvet Occasion Abaya",
    categoryId: 10,
    categoryName: "ABAYAS",
    subcategoryId: 103,
    subcategoryName: "Occasion & Luxury Abayas",
    fitType: "A-Line Silhouette",
    shortDescription: "Show-stopping royal purple velvet abaya with artisanal embroidery for Eid and weddings.",
    tags: ["purple abaya", "velvet abaya", "luxury wear", "eid collection"],
  },
  {
    pattern: /^(m|mo|mor|moroc|moroccan)/i,
    title: "Moroccan Royal Embroidered Kaftan",
    categoryId: 11,
    categoryName: "KAFTANS",
    subcategoryId: 105,
    subcategoryName: "Moroccan Kaftans",
    fitType: "Loose / Flared",
    shortDescription: "Authentic Moroccan handmade royal kaftan featuring traditional gold sfifa braiding.",
    tags: ["moroccan kaftan", "silk kaftan", "gold sfifa", "wedding attire"],
  },
  {
    pattern: /^(k|ka|kaf|kaftan)/i,
    title: "Kaftan Luxury Gold Embroidered Silk",
    categoryId: 11,
    categoryName: "KAFTANS",
    subcategoryId: 106,
    subcategoryName: "Embroidered Kaftans",
    fitType: "Loose / Flared",
    shortDescription: "Flowing silk kaftan highlighted with intricate gold-thread embroidery.",
    tags: ["kaftan", "silk kaftan", "embroidered kaftan", "luxury modest"],
  },
  {
    pattern: /^(c|ch|chi|chiffon)/i,
    title: "Chiffon Silk Maxi Wrap Scarf",
    categoryId: 12,
    categoryName: "HIJABS & SCARVES",
    subcategoryId: 109,
    subcategoryName: "Chiffon Silk Wraps",
    fitType: "Regular Fit",
    shortDescription: "Featherlight breathable chiffon silk hijab wrap designed for non-slip coverage.",
    tags: ["chiffon hijab", "silk wrap", "breathable", "hijab fashion"],
  },
  {
    pattern: /^(h|hi|hij|hijab)/i,
    title: "Hijab Premium Modal Everyday Scarf",
    categoryId: 12,
    categoryName: "HIJABS & SCARVES",
    subcategoryId: 108,
    subcategoryName: "Premium Modal Hijabs",
    fitType: "Regular Fit",
    shortDescription: "Ultra-soft modal fabric hijab providing effortless drape and all-day comfort.",
    tags: ["modal hijab", "everyday scarf", "breathable wrap", "modest wear"],
  },
  {
    pattern: /^(d|dj|dje|djellaba)/i,
    title: "Djellaba Moroccan Hooded Robe",
    categoryId: 13,
    categoryName: "DJELLABAS",
    subcategoryId: 111,
    subcategoryName: "Hooded Djellabas",
    fitType: "Loose / Flared",
    shortDescription: "Traditional Moroccan hooded djellaba with fine randa stitching.",
    tags: ["djellaba", "moroccan djellaba", "hooded robe", "modest wear"],
  },
  {
    pattern: /^(p|pa|pal|palestine)/i,
    title: "Palestine Tatreez Heritage Hoodie",
    categoryId: 15,
    categoryName: "HOODIES & SWEATSHIRTS",
    subcategoryId: 116,
    subcategoryName: "Solidarity Calligraphy Sweats",
    fitType: "Oversized Fit",
    shortDescription: "Heavyweight 420gsm organic cotton hoodie embroidered with authentic Palestinian Tatreez.",
    tags: ["palestine", "tatreez", "solidarity hoodie", "heritage wear"],
  },
  {
    pattern: /^(t|ta|tat|tatreez)/i,
    title: "Tatreez Handmade Palestinian Scarf",
    categoryId: 19,
    categoryName: "GIFTS & HERITAGE",
    subcategoryId: 124,
    subcategoryName: "Palestinian Tatreez Gifts",
    fitType: "Regular Fit",
    shortDescription: "Artisanal Palestinian heirloom scarf featuring authentic cross-stitch Tatreez embroidery.",
    tags: ["tatreez", "palestinian gift", "handmade", "ethical fashion"],
  },
  {
    pattern: /^(w|wh|whi|white\s+t|white\s+thobe)/i,
    title: "White Tailored Classic Emirati Thobe",
    categoryId: 16,
    categoryName: "MEN'S THOBES",
    subcategoryId: 117,
    subcategoryName: "Classic White Thobes",
    fitType: "Tailored Fit",
    shortDescription: "Crisp wrinkle-resistant white thobe with authentic Emirati tassel and structured collar.",
    tags: ["white thobe", "emirati thobe", "men modest", "islamic menswear"],
  },
  {
    pattern: /^(e|em|emb|embroidered)/i,
    title: "Embroidered Open Front Abaya",
    categoryId: 10,
    categoryName: "ABAYAS",
    subcategoryId: 102,
    subcategoryName: "Embroidered Abayas",
    fitType: "Modest / Loose Fit",
    shortDescription: "Delicately embroidered open front abaya with matching modesty inner slip.",
    tags: ["embroidered abaya", "open front", "modest wear", "dubai style"],
  },
  {
    pattern: /^(o|op|ope|open)/i,
    title: "Open Front Luxury Modest Abaya",
    categoryId: 10,
    categoryName: "ABAYAS",
    subcategoryId: 101,
    subcategoryName: "Open Front Abayas",
    fitType: "Modest / Loose Fit",
    shortDescription: "Versatile open-front abaya designed for fluid layering and graceful movement.",
    tags: ["open front", "layering abaya", "modest luxury", "everyday abaya"],
  },
  {
    pattern: /^(v|ve|vel|velvet)/i,
    title: "Velvet Luxury Occasion Abaya",
    categoryId: 10,
    categoryName: "ABAYAS",
    subcategoryId: 103,
    subcategoryName: "Occasion & Luxury Abayas",
    fitType: "A-Line Silhouette",
    shortDescription: "Opulent rich velvet abaya with shimmering beadwork for celebratory occasions.",
    tags: ["velvet abaya", "occasion wear", "eid wear", "modest luxury"],
  },
  {
    pattern: /^(s|si|sil|silk)/i,
    title: "Silk Embroidered Modest Abaya",
    categoryId: 10,
    categoryName: "ABAYAS",
    subcategoryId: 102,
    subcategoryName: "Embroidered Abayas",
    fitType: "Modest / Loose Fit",
    shortDescription: "Pure mulberry silk blend abaya with subtle tone-on-tone embroidery.",
    tags: ["silk abaya", "embroidered abaya", "luxury drape", "pure silk"],
  },
  {
    pattern: /^(g|go|gol|gold)/i,
    title: "Gold Embellished Royal Kaftan",
    categoryId: 11,
    categoryName: "KAFTANS",
    subcategoryId: 107,
    subcategoryName: "Occasion Kaftans",
    fitType: "Loose / Flared",
    shortDescription: "Regal Moroccan evening kaftan embellished with fine golden threads and crystal accents.",
    tags: ["gold kaftan", "royal kaftan", "occasion wear", "evening attire"],
  },
  {
    pattern: /^(l|lu|lux|luxury)/i,
    title: "Luxury Modest Embroidered Abaya",
    categoryId: 10,
    categoryName: "ABAYAS",
    subcategoryId: 103,
    subcategoryName: "Occasion & Luxury Abayas",
    fitType: "Modest / Loose Fit",
    shortDescription: "Artisanal handcrafted luxury abaya designed for timeless modest elegance.",
    tags: ["luxury abaya", "modest fashion", "embroidered", "high fashion"],
  },
  {
    pattern: /^(n|na|nav|navy)/i,
    title: "Navy Blue Silk Modest Kaftan",
    categoryId: 11,
    categoryName: "KAFTANS",
    subcategoryId: 105,
    subcategoryName: "Moroccan Kaftans",
    fitType: "Loose / Flared",
    shortDescription: "Deep navy blue fluid silk kaftan finished with silver Moroccan sfifa braiding.",
    tags: ["navy kaftan", "blue kaftan", "moroccan style", "modest luxury"],
  },
];

// In-browser cache for instant local hits (<1ms)
const clientLruCache = new Map<string, { suggestion: string; suffix: string; cascade?: any }>();

function extractSuffix(typed: string, full: string): string {
  if (!full) return "";
  const tLower = typed.toLowerCase();
  const fLower = full.toLowerCase();

  if (fLower.startsWith(tLower)) {
    return full.slice(typed.length);
  }

  const idx = fLower.indexOf(tLower);
  if (idx !== -1) {
    return full.slice(idx + typed.length);
  }

  return "";
}

function findInstantMatch(typed: string) {
  const trimmed = typed.trim();
  if (trimmed.length < 1) return null;

  for (const item of INSTANT_COMPLETIONS) {
    if (item.pattern.test(trimmed)) {
      const suffix = extractSuffix(typed, item.title);
      return {
        suggestion: item.title,
        suffix,
        cascade: {
          categoryId: item.categoryId,
          categoryName: item.categoryName,
          subcategoryId: item.subcategoryId,
          subcategoryName: item.subcategoryName,
          fitType: item.fitType,
          shortDescription: item.shortDescription,
          tags: item.tags,
        },
      };
    }
  }

  return null;
}

export const InlineAutoCompleteInput: React.FC<InlineAutoCompleteInputProps> = ({
  value,
  onChange,
  name = "title",
  label,
  placeholder = "e.g., Sakina Embroidered Black Abaya",
  fullWidth = true,
  sx,
  disabled = false,
  categoryId,
  onAccept,
  helperText,
}) => {
  const [ghostSuffix, setGhostSuffix] = useState<string>("");
  const [currentCascade, setCurrentCascade] = useState<any>(null);
  const [fullSuggestion, setFullSuggestion] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFocused, setIsFocused] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearSuggestion = useCallback(() => {
    setGhostSuffix("");
    setFullSuggestion("");
    setCurrentCascade(null);
  }, []);

  const acceptSuggestion = useCallback(() => {
    if (!ghostSuffix && !fullSuggestion) return;
    const completed = fullSuggestion || `${value}${ghostSuffix}`;

    onChange({
      target: {
        name,
        value: completed,
      },
    });

    if (onAccept) {
      onAccept(completed, currentCascade);
    }

    clearSuggestion();
  }, [ghostSuffix, fullSuggestion, value, name, onChange, onAccept, currentCascade, clearSuggestion]);

  // Real-Time Keystroke Engine: 0ms instant local match + 100ms ultra-fast network debounce
  useEffect(() => {
    const trimmed = value.trim();

    if (trimmed.length < 1) {
      clearSuggestion();
      setIsLoading(false);
      return;
    }

    // 1. Synchronous Instant Match (<1ms)
    const instantMatch = findInstantMatch(value);
    if (instantMatch) {
      setGhostSuffix(instantMatch.suffix);
      setFullSuggestion(instantMatch.suggestion);
      setCurrentCascade(instantMatch.cascade);
      setIsLoading(false);
      return;
    }

    // 2. Check LRU Cache
    const cacheKey = `${trimmed.toLowerCase()}_${categoryId || "all"}`;
    const cached = clientLruCache.get(cacheKey);

    if (cached) {
      const suffix = extractSuffix(value, cached.suggestion) || cached.suffix;
      setGhostSuffix(suffix);
      setFullSuggestion(cached.suggestion);
      setCurrentCascade(cached.cascade);
      setIsLoading(false);
      return;
    }

    if (trimmed.length < 2) {
      clearSuggestion();
      return;
    }

    // 3. Ultra-fast 100ms debounce for custom/novel titles
    if (abortControllerRef.current) abortControllerRef.current.abort();
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      setIsLoading(true);
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const res = await fetch("/api/ai/inline-autocomplete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prefix: value, categoryId }),
          signal: controller.signal,
        });

        if (!res.ok) {
          setIsLoading(false);
          return;
        }

        const data = await res.json();
        if (data.success && data.suggestion) {
          const suffix = extractSuffix(value, data.suggestion) || data.suffix || "";
          setGhostSuffix(suffix);
          setFullSuggestion(data.suggestion);
          setCurrentCascade(data.cascade);

          clientLruCache.set(cacheKey, {
            suggestion: data.suggestion,
            suffix,
            cascade: data.cascade,
          });
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.warn("[Autocomplete Client Error]:", err);
        }
      } finally {
        setIsLoading(false);
      }
    }, 100);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [value, categoryId, clearSuggestion]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!ghostSuffix) return;

    const input = inputRef.current;
    const isAtEnd = input ? input.selectionStart === value.length : true;

    if ((e.key === "Tab" || (e.key === "ArrowRight" && isAtEnd)) && ghostSuffix) {
      e.preventDefault();
      acceptSuggestion();
    } else if (e.key === "Escape") {
      e.preventDefault();
      clearSuggestion();
    }
  };

  return (
    <Box sx={{ position: "relative", width: fullWidth ? "100%" : "auto" }}>
      {/* Ghost Text Overlay: Pixel-aligned behind the input text */}
      {isFocused && ghostSuffix && value && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 w-full h-full flex items-center select-none overflow-hidden"
          style={{
            zIndex: 1,
            paddingLeft: "14px",
            paddingRight: "14px",
            paddingTop: "16.5px",
            paddingBottom: "16.5px",
            fontSize: "1rem",
            fontFamily: "inherit",
            letterSpacing: "inherit",
            lineHeight: "1.4375em",
            boxSizing: "border-box",
          }}
        >
          <span style={{ opacity: 0, whiteSpace: "pre" }}>{value}</span>
          <span
            style={{
              color: "#94a3b8",
              opacity: 0.9,
              whiteSpace: "pre",
              fontWeight: 400,
            }}
          >
            {ghostSuffix}
          </span>
        </div>
      )}

      {/* Main Native TextField */}
      <TextField
        inputRef={inputRef}
        label={label}
        name={name}
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false);
          setTimeout(() => clearSuggestion(), 200);
        }}
        fullWidth={fullWidth}
        placeholder={placeholder}
        disabled={disabled}
        sx={{
          ...sx,
          "& .MuiOutlinedInput-input": {
            position: "relative",
            zIndex: 2,
            backgroundColor: "transparent",
          },
        }}
        helperText={helperText}
      />

      {/* Senior Designed Floating Accept Badge */}
      {isFocused && (ghostSuffix || isLoading) && (
        <div
          className="absolute right-3 top-[-10px] z-10 flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium shadow-xs transition-all duration-150 border bg-slate-900 text-white border-slate-800 hover:bg-slate-800 cursor-pointer select-none"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            acceptSuggestion();
          }}
          title="Press Tab key to accept suggestion"
        >
          {isLoading ? (
            <>
              <Loader2 size={11} className="animate-spin text-slate-300" />
              <span>Thinking...</span>
            </>
          ) : (
            <>
              <span className="text-slate-300">Tab</span>
              <kbd className="px-1 py-0.2 bg-slate-800 text-slate-200 rounded border border-slate-700 text-[10px] font-mono leading-none">
                ⇥
              </kbd>
              <span className="text-slate-300">to complete</span>
            </>
          )}
        </div>
      )}
    </Box>
  );
};

export default InlineAutoCompleteInput;
