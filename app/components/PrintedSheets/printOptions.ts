export interface PrintOptions {
  inkSaving: boolean;
  footer: string;
  logo: string;
  largeNumbers: boolean;
  borders: "theme" | "square" | "none";
}

export const MAX_LOGO_BYTES = 1024 * 1024;
const MAX_LOGO_DATA_LENGTH = 1_500_000;

export const DEFAULT_PRINT_OPTIONS: Readonly<PrintOptions> = {
  inkSaving: false,
  footer: "",
  logo: "",
  largeNumbers: true,
  borders: "theme",
};

/** Saved print preferences accept local raster images only, never external URLs or SVG. */
export function normalizePrintOptions(value: unknown): PrintOptions {
  const candidate = value && typeof value === "object" ? value as Partial<PrintOptions> : {};
  return {
    inkSaving: candidate.inkSaving === true,
    largeNumbers: candidate.largeNumbers !== false,
    footer: typeof candidate.footer === "string" ? candidate.footer.trim().slice(0, 100) : "",
    logo: typeof candidate.logo === "string" && candidate.logo.length <= MAX_LOGO_DATA_LENGTH &&
      /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(candidate.logo) ? candidate.logo : "",
    borders: candidate.borders === "square" || candidate.borders === "none" ? candidate.borders : "theme",
  };
}
