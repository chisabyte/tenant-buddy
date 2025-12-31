/**
 * Text Normalization for Tribunal-Ready Documents
 * 
 * Normalizes user text to be factual, clear, and professional
 * while preserving the original meaning.
 */

// ============================================================================
// Emotional/Subjective Phrases to Remove or Replace
// ============================================================================

const EMOTIONAL_PHRASES: Array<{ pattern: RegExp; replacement: string }> = [
  // Frustration expressions
  { pattern: /\b(so frustrated|really frustrated|very frustrated|extremely frustrated)\b/gi, replacement: "" },
  { pattern: /\b(I('m| am) (so |really |very )?fed up|sick of|tired of)\b/gi, replacement: "" },
  { pattern: /\b(can't believe|unbelievable|ridiculous|outrageous|disgusting)\b/gi, replacement: "" },
  { pattern: /\b(terrible|horrible|awful|worst|nightmare)\b/gi, replacement: "significant" },
  
  // Accusations
  { pattern: /\bthey (don't|do not) care\b/gi, replacement: "" },
  { pattern: /\b(lazy|incompetent|useless|negligent)\s+(landlord|agent|property manager)\b/gi, replacement: "$2" },
  { pattern: /\bdeliberately\s+ignor(ing|ed)\b/gi, replacement: "has not responded to" },
  
  // Exaggerations
  { pattern: /\b(always|never|constantly|forever)\b/gi, replacement: "repeatedly" },
  { pattern: /\b(massive|huge|enormous)\b/gi, replacement: "substantial" },
  { pattern: /\b(tiny|minuscule)\b/gi, replacement: "small" },
  
  // First-person emotion
  { pattern: /\bI('m| am) (so |really |very )?(angry|upset|worried|stressed|anxious)\b/gi, replacement: "" },
  { pattern: /\bthis is (so |really |very )?(stressful|worrying|concerning)\b/gi, replacement: "this requires attention" },
  
  // Demands/ultimatums
  { pattern: /\b(I demand|you must|you have to|they need to)\b/gi, replacement: "requesting" },
  
  // Profanity (basic filter)
  { pattern: /\b(damn|bloody|crap|crap+y|crapola)\b/gi, replacement: "" },
];

// ============================================================================
// Common Spelling Corrections
// ============================================================================

const SPELLING_CORRECTIONS: Record<string, string> = {
  "recieve": "receive",
  "recieved": "received",
  "occured": "occurred",
  "occuring": "occurring",
  "maintainance": "maintenance",
  "maintanance": "maintenance",
  "seperate": "separate",
  "definately": "definitely",
  "accomodation": "accommodation",
  "acommodation": "accommodation",
  "appartment": "apartment",
  "landloard": "landlord",
  "tennant": "tenant",
  "tennent": "tenant",
  "leaking": "leaking",
  "leeking": "leaking",
  "mould": "mould", // Keep Australian spelling
  "mold": "mould",
  "plummer": "plumber",
  "electrian": "electrician",
  "heatter": "heater",
  "airconditioner": "air conditioner",
  "aircon": "air conditioner",
  "a/c": "air conditioner",
  "doesnt": "doesn't",
  "dont": "don't",
  "cant": "can't",
  "wont": "won't",
  "isnt": "isn't",
  "wasnt": "wasn't",
  "hasnt": "hasn't",
  "havent": "haven't",
  "didnt": "didn't",
  "shouldnt": "shouldn't",
  "wouldnt": "wouldn't",
  "couldnt": "couldn't",
  "thats": "that's",
  "its": "it's", // Careful - context dependent
  "theyre": "they're",
  "youre": "you're",
  "were": "we're", // Careful - context dependent
  "Im": "I'm",
  "ive": "I've",
  "Ive": "I've",
  "woking": "working",
  "brocken": "broken",
  "borken": "broken",
};

// ============================================================================
// Main Normalization Function
// ============================================================================

export interface NormalizationResult {
  original: string;
  normalized: string;
  changes: string[];
  wasModified: boolean;
}

/**
 * Normalize text for tribunal-ready documents.
 * Preserves facts while removing emotional language.
 * 
 * @param text - Raw user text
 * @param maxLength - Maximum length for output (0 = no limit)
 * @returns NormalizationResult with original and normalized text
 */
export function normalizeDescription(
  text: string | null | undefined,
  maxLength: number = 0
): NormalizationResult {
  if (!text || text.trim().length === 0) {
    return {
      original: text || "",
      normalized: "",
      changes: [],
      wasModified: false,
    };
  }

  const changes: string[] = [];
  let normalized = text.trim();

  // Step 1: Fix common spelling errors
  Object.entries(SPELLING_CORRECTIONS).forEach(([wrong, correct]) => {
    const regex = new RegExp(`\\b${wrong}\\b`, "gi");
    if (regex.test(normalized)) {
      normalized = normalized.replace(regex, correct);
      changes.push(`Spelling: ${wrong} → ${correct}`);
    }
  });

  // Step 2: Remove emotional phrases
  EMOTIONAL_PHRASES.forEach(({ pattern, replacement }) => {
    if (pattern.test(normalized)) {
      normalized = normalized.replace(pattern, replacement);
      changes.push(`Removed emotional phrase`);
    }
  });

  // Step 3: Clean up whitespace (multiple spaces, leading/trailing)
  normalized = normalized.replace(/\s+/g, " ").trim();

  // Step 4: Capitalize first letter
  if (normalized.length > 0 && normalized[0] !== normalized[0].toUpperCase()) {
    normalized = normalized[0].toUpperCase() + normalized.slice(1);
    changes.push("Capitalized first letter");
  }

  // Step 5: Ensure ends with punctuation
  if (normalized.length > 0 && !/[.!?]$/.test(normalized)) {
    normalized = normalized + ".";
    changes.push("Added ending punctuation");
  }

  // Step 6: Remove double punctuation
  normalized = normalized.replace(/([.!?])\1+/g, "$1");
  normalized = normalized.replace(/\s+([.!?,])/g, "$1");

  // Step 7: Truncate if needed (for Concise mode)
  if (maxLength > 0 && normalized.length > maxLength) {
    // Find a good break point
    let breakPoint = maxLength;
    const sentenceEnd = normalized.lastIndexOf(". ", maxLength);
    if (sentenceEnd > maxLength * 0.5) {
      breakPoint = sentenceEnd + 1;
    } else {
      const wordEnd = normalized.lastIndexOf(" ", maxLength);
      if (wordEnd > maxLength * 0.7) {
        breakPoint = wordEnd;
      }
    }
    normalized = normalized.substring(0, breakPoint).trim();
    if (!/[.!?]$/.test(normalized)) {
      normalized = normalized + "...";
    }
    changes.push(`Truncated to ${maxLength} chars`);
  }

  return {
    original: text,
    normalized,
    changes,
    wasModified: normalized !== text,
  };
}

/**
 * Quick normalize for UI display (no detailed tracking)
 */
export function quickNormalize(text: string | null | undefined, maxLength: number = 150): string {
  return normalizeDescription(text, maxLength).normalized;
}

/**
 * Normalize for Concise PDF mode (strict 1-2 sentences)
 */
export function normalizeForConcise(text: string | null | undefined): string {
  const result = normalizeDescription(text, 200);
  
  // Further compress: keep only first 2 sentences
  const sentences = result.normalized.split(/(?<=[.!?])\s+/);
  if (sentences.length > 2) {
    return sentences.slice(0, 2).join(" ");
  }
  
  return result.normalized;
}

/**
 * Normalize for Detailed PDF mode (full text, cleaned)
 */
export function normalizeForDetailed(text: string | null | undefined): string {
  return normalizeDescription(text, 0).normalized;
}

// ============================================================================
// Issue Title Normalization
// ============================================================================

/**
 * Normalize issue title for consistency
 */
export function normalizeTitle(title: string | null | undefined): string {
  if (!title) return "Untitled Issue";
  
  let normalized = title.trim();
  
  // Remove excessive punctuation
  normalized = normalized.replace(/[!?]+$/, "");
  
  // Capitalize first letter of each word (title case)
  normalized = normalized
    .split(" ")
    .map(word => {
      if (word.length === 0) return word;
      // Keep small words lowercase (except first word)
      if (["a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for"].includes(word.toLowerCase())) {
        return word.toLowerCase();
      }
      return word[0].toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
  
  // Ensure first letter is capitalized
  if (normalized.length > 0) {
    normalized = normalized[0].toUpperCase() + normalized.slice(1);
  }
  
  return normalized;
}

