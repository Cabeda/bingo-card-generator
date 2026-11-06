import { createCustomTheme, getPresetThemeNames, getTheme, isValidTheme, PRESET_THEMES } from "./themes";

it("offers the documented presets and falls back to Classic", () => {
  expect(getPresetThemeNames()).toEqual(["classic", "modern", "vintage", "dark", "highContrast", "kids"]);
  expect(getTheme("kids").name).toBe("Kids");
  expect(getTheme("missing").name).toBe("Classic");
});
it.each([null, undefined, false, 3, "theme", {}])("rejects malformed theme %p", input => {
  expect(isValidTheme(input)).toBe(false);
});
it.each(Object.keys(PRESET_THEMES.classic))("rejects a non-string %s", key => {
  expect(isValidTheme({ ...PRESET_THEMES.classic, [key]: 42 })).toBe(false);
});
it("fills missing custom settings and preserves every explicit value", () => {
  expect(createCustomTheme({})).toEqual({ ...PRESET_THEMES.classic, name: "Custom" });
  expect(createCustomTheme(PRESET_THEMES.kids)).toEqual(PRESET_THEMES.kids);
  expect(isValidTheme(createCustomTheme({}))).toBe(true);
});
