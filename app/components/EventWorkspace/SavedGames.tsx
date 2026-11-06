"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { SavedGameSummary } from "./gameLibrary";
import styles from "./SavedGames.module.css";

type SavedGamesProps = {
  games: readonly SavedGameSummary[];
  activeId: string | null;
  loading: boolean;
  onOpen: (id: string, mode: "resume" | "print") => void;
  onRemove: (id: string) => void;
};

export function SavedGames({ games, activeId, loading, onOpen, onRemove }: SavedGamesProps) {
  const t = useTranslations("library");
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const query = search.trim().toLocaleLowerCase(locale);
  const visibleGames = games.filter((game) => game.name.toLocaleLowerCase(locale).includes(query));
  const dates = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  return (
    <section className={styles.panel} aria-labelledby="saved-games-title">
      <div className={styles.heading}>
        <div>
          <h2 id="saved-games-title" className={styles.title}>{t("title")}</h2>
          <p className={styles.help}>{t("localNote")}</p>
        </div>
        <span className={styles.deviceMark} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="6" y="2" width="12" height="20" rx="3" />
            <path d="M10 18h4" />
          </svg>
        </span>
      </div>
      {loading ? (
        <p className={styles.empty} role="status">{t("loading")}</p>
      ) : games.length === 0 ? (
        <div className={styles.empty}>
          <h3>{t("emptyTitle")}</h3>
          <p>{t("emptyHelp")}</p>
        </div>
      ) : (
        <>
          <label className={styles.search}>
            {t("search")}
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("searchPlaceholder")} />
          </label>
          <p className={styles.resultCount} role="status">{t("resultCount", { count: visibleGames.length, total: games.length })}</p>
          {visibleGames.length === 0 ? (
            <div className={styles.empty}>
              <h3>{t("noResults")}</h3>
              <p>{t("noResultsHelp")}</p>
            </div>
          ) : (
            <ul className={styles.list} aria-label={t("listLabel")}>
              {visibleGames.map((game) => (
                <li key={game.id} className={styles.game}>
                  <div className={styles.identity}>
                    <div className={styles.nameRow}>
                      <h3 className={styles.name}>{game.name}</h3>
                      {game.id === activeId && <span className={styles.current}>{t("current")}</span>}
                    </div>
                    <p className={styles.metadata}>
                      <span>{t("cards", { count: game.cardCount })}</span>
                      <span>{t("calls", { count: game.calledCount })}</span>
                    </p>
                    <p className={styles.updated}>
                      {t("updated")} <time dateTime={new Date(game.updatedAt).toISOString()}>{dates.format(game.updatedAt)}</time>
                    </p>
                    <progress className={styles.progress} value={game.calledCount} max={90} aria-label={t("progress", { count: game.calledCount })} />
                  </div>
                  <div className={styles.actions} role="group" aria-label={t("gameActions", { name: game.name })}>
                    <button type="button" className={styles.primary} onClick={() => onOpen(game.id, "resume")}>{t(game.started ? "resume" : "open")}</button>
                    <button type="button" className={styles.print} onClick={() => onOpen(game.id, "print")}>{t("print")}</button>
                    <button type="button" className={styles.remove} onClick={() => onRemove(game.id)}>{t("remove")}</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
