import { CardTheme } from "./bingo.interface";

/**
 * Preset bingo card themes.
 * 
 * Each theme provides a complete visual configuration for bingo cards.
 * Themes are designed with different use cases in mind:
 * - Classic: Traditional bingo look (current default)
 * - Modern: Clean, minimalist design
 * - Vintage: Retro colors and style
 * - Dark: Dark mode optimized
 * - High Contrast: Maximum accessibility
 * - Kids: Colorful and playful
 */

export const PRESET_THEMES: Record<string, CardTheme> = {
  classic: {
    name: "Classic",
    primaryColor: "#ff007f",
    secondaryColor: "#000000",
    textColor: "#ffffff",
    backgroundColor: "#ffffff",
    fontFamily: "'Roboto', sans-serif",
    borderRadius: "0.25rem",
    borderWidth: "0.125rem",
    cellPadding: "0",
  },
  modern: {
    name: "Modern",
    primaryColor: "#4F46E5",
    secondaryColor: "#E5E7EB",
    textColor: "#FFFFFF",
    backgroundColor: "#F9FAFB",
    fontFamily: "'Inter', sans-serif",
    borderRadius: "0.5rem",
    borderWidth: "1px",
    cellPadding: "0",
  },
  vintage: {
    name: "Vintage",
    primaryColor: "#D97706",
    secondaryColor: "#92400E",
    textColor: "#FEF3C7",
    backgroundColor: "#FEF3C7",
    fontFamily: "'Georgia', serif",
    borderRadius: "0.125rem",
    borderWidth: "0.1875rem",
    cellPadding: "0",
  },
  dark: {
    name: "Dark",
    primaryColor: "#6366F1",
    secondaryColor: "#4B5563",
    textColor: "#F3F4F6",
    backgroundColor: "#1F2937",
    fontFamily: "'Roboto', sans-serif",
    borderRadius: "0.375rem",
    borderWidth: "0.0625rem",
    cellPadding: "0",
  },
  highContrast: {
    name: "High Contrast",
    primaryColor: "#000000",
    secondaryColor: "#FFFF00",
    textColor: "#FFFFFF",
    backgroundColor: "#FFFFFF",
    fontFamily: "'Arial', sans-serif",
    borderRadius: "0",
    borderWidth: "0.25rem",
    cellPadding: "0",
  },
  kids: {
    name: "Kids",
    primaryColor: "#EC4899",
    secondaryColor: "#8B5CF6",
    textColor: "#FFFFFF",
    backgroundColor: "#FEF9C3",
    fontFamily: "'Comic Sans MS', cursive",
    borderRadius: "1rem",
    borderWidth: "0.1875rem",
    cellPadding: "0",
  },
};

/**
 * Get all preset theme names in order.
 */
export function getPresetThemeNames(): string[] {
  return Object.keys(PRESET_THEMES);
}

/**
 * Get a theme by key, falling back to classic theme if not found.
 */
export function getTheme(key: string): CardTheme {
  return PRESET_THEMES[key] || PRESET_THEMES.classic;
}

/**
 * Validate that a theme object has all required properties.
 */
export function isValidTheme(theme: unknown): theme is CardTheme {
  if (!theme || typeof theme !== 'object') return false;
  
  const t = theme as Record<string, unknown>;
  
  return (
    typeof t.name === 'string' &&
    typeof t.primaryColor === 'string' &&
    typeof t.secondaryColor === 'string' &&
    typeof t.textColor === 'string' &&
    typeof t.backgroundColor === 'string' &&
    typeof t.fontFamily === 'string' &&
    typeof t.borderRadius === 'string' &&
    typeof t.borderWidth === 'string' &&
    typeof t.cellPadding === 'string'
  );
}

/**
 * Create a custom theme with default values for missing properties.
 */
export function createCustomTheme(partial: Partial<CardTheme>): CardTheme {
  return {
    name: partial.name || "Custom",
    primaryColor: partial.primaryColor || PRESET_THEMES.classic.primaryColor,
    secondaryColor: partial.secondaryColor || PRESET_THEMES.classic.secondaryColor,
    textColor: partial.textColor || PRESET_THEMES.classic.textColor,
    backgroundColor: partial.backgroundColor || PRESET_THEMES.classic.backgroundColor,
    fontFamily: partial.fontFamily || PRESET_THEMES.classic.fontFamily,
    borderRadius: partial.borderRadius || PRESET_THEMES.classic.borderRadius,
    borderWidth: partial.borderWidth || PRESET_THEMES.classic.borderWidth,
    cellPadding: partial.cellPadding || PRESET_THEMES.classic.cellPadding,
  };
}
