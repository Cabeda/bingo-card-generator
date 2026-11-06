"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { MAX_LOGO_BYTES, normalizePrintOptions, PrintOptions } from "./printOptions";
import styles from "./PrintPreferences.module.css";

export function PrintPreferences({ value, onChange }: {
  value: PrintOptions;
  onChange: (value: PrintOptions) => void;
}): React.JSX.Element {
  const t = useTranslations("printPreferences");
  const [error, setError] = useState(false);
  const reader = useRef<FileReader | null>(null);
  const latest = useRef({ value, onChange });
  useEffect(() => { latest.current = { value, onChange }; }, [value, onChange]);
  useEffect(() => () => {
    reader.current?.abort();
    reader.current = null;
  }, []);

  const upload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(false);
    reader.current?.abort();
    reader.current = null;
    if (file.size > MAX_LOGO_BYTES || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError(true);
      return;
    }
    const next = new FileReader();
    reader.current = next;
    next.onload = async () => {
      if (reader.current !== next) return;
      const logo = normalizePrintOptions({ logo: next.result }).logo;
      if (!logo) { setError(true); return; }
      const image = new Image();
      image.src = logo;
      try {
        await image.decode();
        if (reader.current === next) latest.current.onChange({ ...latest.current.value, logo });
      } catch {
        if (reader.current === next) setError(true);
      }
    };
    next.onerror = () => { if (reader.current === next) setError(true); };
    try { next.readAsDataURL(file); }
    catch { setError(true); }
  };

  return <div className={styles.preferences}>
    <p className={styles.help}>{t("help")}</p>
    <label className={styles.toggle}>
      <input type="checkbox" checked={value.inkSaving} onChange={event => onChange({ ...value, inkSaving: event.target.checked })} />
      <span><b>{t("inkSaving")}</b><small>{t("inkHelp")}</small></span>
    </label>
    <label className={styles.toggle}>
      <input type="checkbox" checked={value.largeNumbers} onChange={event => onChange({ ...value, largeNumbers: event.target.checked })} />
      <span><b>{t("largeNumbers")}</b><small>{t("largeHelp")}</small></span>
    </label>
    <label>{t("borders")}
      <select value={value.borders} onChange={event => onChange({ ...value, borders: event.target.value as PrintOptions["borders"] })}>
        <option value="theme">{t("themeBorders")}</option>
        <option value="square">{t("squareBorders")}</option>
        <option value="none">{t("noBorders")}</option>
      </select>
    </label>
    <label>{t("footer")}
      <input type="text" aria-label={t("footer")} maxLength={100} value={value.footer} onChange={event => onChange({ ...value, footer: event.target.value })} placeholder={t("footerPlaceholder")} />
      <small>{t("footerHelp")}</small>
    </label>
    <label>{t("logo")}
      <input type="file" aria-label={t("logo")} accept="image/png,image/jpeg,image/webp" onChange={upload} />
      <small>{t("logoHelp")}</small>
    </label>
    {value.logo && <div className={styles.logo}>
      {/* A validated, bounded local data URL is the source; no image is uploaded. */}
      <img src={value.logo} alt={t("logoPreview")} />
      <button type="button" onClick={() => {
        reader.current?.abort();
        reader.current = null;
        setError(false);
        onChange({ ...value, logo: "" });
      }}>{t("removeLogo")}</button>
    </div>}
    {error && <p className={styles.error} role="alert">{t("imageError")}</p>}
  </div>;
}
