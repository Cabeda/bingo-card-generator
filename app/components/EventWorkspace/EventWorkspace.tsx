"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card, Game } from "../../utils/bingo.interface";
import { createGameId } from "../../utils/types";
import { generateRandomBingoCards } from "../../utils/utils";
import {
  checkClaim,
  drawNextNumber,
  loadGameFile,
  saveGameFile,
} from "../../utils/gameFiles";
import { useCardTheme } from "../ThemeProvider";
import { ThemeToggle } from "../ThemeToggle";
import { ThemeSelector } from "../ThemeSelector";
import { LanguageSelector } from "../LanguageSelector";
import { PRESET_THEMES } from "../../utils/themes";
import {
  emptySession,
  EventSession,
  EventStage,
  restoreSession,
  SESSION_KEY,
} from "./session";
import {
  CARDS_PER_PAGE_OPTIONS,
  sheetCount,
} from "../PrintedSheets/printLayout";
import { PrintedSheets } from "../PrintedSheets/PrintedSheets";
import "./workspace.css";

/** Generate, print and host one persistent bingo event. */
export function EventWorkspace({
  entry = "generate",
}: {
  entry?: EventStage;
}): React.JSX.Element {
  const t = useTranslations("event");
  const locale = useLocale();
  const { currentTheme, selectedThemeKey, customThemes, setTheme } =
    useCardTheme();
  const [session, setSession] = useState<EventSession>(emptySession);
  const [ready, setReady] = useState(false);
  const [entryMode, setEntryMode] = useState<"prepare" | "open">(
    entry === "host" ? "open" : "prepare",
  );
  const [name, setName] = useState("");
  const [count, setCount] = useState(200);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [storageWarning, setStorageWarning] = useState(false);
  const [audience, setAudience] = useState(false);
  const [sound, setSound] = useState(false);
  const [voice, setVoice] = useState(false);
  const [claimNumber, setClaimNumber] = useState("");
  const [claim, setClaim] = useState<{
    card: Card | null;
    valid: boolean;
  } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const claimDialog = useRef<HTMLDialogElement>(null);
  const generationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const announcement = useRef<number | null>(null);
  const { game, drawn, paused, target, stage, started, cardsPerPage } =
    session;
  const cards = game?.cards ?? [];
  const eventName = game?.filename ?? name;
  const totalSheets = sheetCount(cards.length, cardsPerPage);
  const setCardsPerPage = (value: number): void => {
    setSession((previous) => ({ ...previous, cardsPerPage: value }));
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      let restored: EventSession | null = saved
        ? restoreSession(JSON.parse(saved))
        : null;
      // Preserve games from the previous host and card-generation pages.
      if (!restored) {
        const oldGame =
          localStorage.getItem("bingoGame") ||
          sessionStorage.getItem("bingoGame");
        if (oldGame)
          restored = restoreSession({
            game: JSON.parse(oldGame),
            drawn: JSON.parse(localStorage.getItem("drawnNumbers") || "[]"),
            stage: entry === "generate" ? "print" : entry,
            started: true,
          });
      }
      if (restored) {
        setSession({
          ...restored,
          stage: entry === "generate" ? restored.stage : entry,
          started: restored.started || entry === "host",
        });
        setName(restored.game!.filename);
        setCount(restored.game!.cards.length);
      }
    } catch {
      setError("restoreError");
    } finally {
      setReady(true);
    }
    return () => {
      if (generationTimer.current) clearTimeout(generationTimer.current);
      void audioContext.current?.close();
      window.speechSynthesis?.cancel();
    };
  }, [entry]);

  useEffect(() => {
    if (!ready || !game) return;
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      setStorageWarning(false);
    } catch {
      setStorageWarning(true);
    }
  }, [session, game, ready]);

  const navigate = (next: EventStage): void => {
    setSession((previous) => ({
      ...previous,
      stage: next,
      started: previous.started || next === "host",
    }));
    setClaim(null);
    setError("");
  };
  const replaceGame = (next: Game, nextStage: EventStage): void => {
    setSession((previous) => ({
      ...emptySession,
      cardsPerPage: previous.cardsPerPage,
      game: next,
      stage: nextStage,
      started: nextStage === "host",
    }));
    setName(next.filename);
    setCount(next.cards.length);
    setAudience(false);
    setClaim(null);
    setError("");
  };
  const generate = (): void => {
    if (!name.trim() || !Number.isInteger(count) || count < 1 || count > 1000) {
      setError("setupError");
      return;
    }
    if (game && !window.confirm(t("replaceConfirm"))) return;
    setBusy(true);
    setError("");
    generationTimer.current = setTimeout(() => {
      try {
        replaceGame(
          {
            filename: createGameId(name.trim()),
            cards: generateRandomBingoCards(count),
          },
          "print",
        );
      } catch {
        setError("generateError");
      } finally {
        setBusy(false);
      }
    }, 40);
  };
  const openFile = async (file?: File): Promise<void> => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("File too large");
      const loaded = loadGameFile(file.name, await file.text());
      if (game && !window.confirm(t("replaceConfirm"))) return;
      replaceGame(loaded, "host");
    } catch {
      setError("fileError");
    } finally {
      setBusy(false);
    }
  };
  const download = (): void => {
    // Download controls are only rendered for a prepared game.
    const url = URL.createObjectURL(
      new Blob([saveGameFile(game!)], { type: "text/plain" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${game!.filename.replace(/[^\p{L}\p{N}_ -]/gu, "-").slice(0, 100) || "bingo"}.bingoCards`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const draw = useCallback(() => {
    if (!game || paused || stage !== "host") return;
    setSession((previous) => {
      if (previous.paused || previous.stage !== "host" || !previous.game)
        return previous;
      const next = drawNextNumber(previous.drawn);
      return next === null
        ? previous
        : { ...previous, drawn: [...previous.drawn, next] };
    });
  }, [game, paused, stage]);

  // Announce each new call once; restoring a session never speaks stale calls.
  useEffect(() => {
    const number = drawn.at(-1);
    if (!ready || !number || number === announcement.current) return;
    announcement.current = number;
    if (sound && window.AudioContext) {
      try {
        audioContext.current ??= new AudioContext();
        const context = audioContext.current;
        void context.resume();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.frequency.value = 660;
        gain.gain.setValueAtTime(0.08, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          context.currentTime + 0.2,
        );
        oscillator.start();
        oscillator.stop(context.currentTime + 0.2);
        oscillator.onended = () => {
          oscillator.disconnect();
          gain.disconnect();
        };
      } catch {
        /* A silent draw remains usable when audio is unavailable. */
      }
    }
    if (voice && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(String(number));
      utterance.lang =
        (
          { pt: "pt-PT", en: "en-GB", es: "es-ES", fr: "fr-FR" } as Record<
            string,
            string
          >
        )[locale] || locale;
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }, [drawn, ready, sound, voice, locale]);

  useEffect(() => {
    const keys = (event: KeyboardEvent) => {
      if (
        stage !== "host" ||
        event.repeat ||
        claim ||
        audience ||
        (event.target instanceof HTMLElement &&
          event.target.closest(
            "input,textarea,select,button,summary,[contenteditable],dialog",
          ))
      )
        return;
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        draw();
      }
    };
    window.addEventListener("keydown", keys);
    return () => window.removeEventListener("keydown", keys);
  }, [draw, claim, audience, stage]);
  useEffect(() => {
    if (claim) claimDialog.current!.showModal();
  }, [claim]);

  const verifyClaim = (): void => {
    const card =
      cards.find((c) => c.cardNumber === Number(claimNumber)) ?? null;
    setSession((previous) => ({ ...previous, paused: true }));
    setClaim({
      card,
      valid: !!card && checkClaim(card.numbers, drawn, target),
    });
  };
  const fullScreen = async (): Promise<void> => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen)
        await document.documentElement.requestFullscreen();
      else setError("fullscreenError");
    } catch {
      setError("fullscreenError");
    }
  };
  const themeTools = (
    <div className="bingo-theme-tools">
      <label>
        {t("cardTheme")}
        <select
          value={selectedThemeKey}
          onChange={(e) => setTheme(e.target.value)}
        >
          {Object.entries({ ...PRESET_THEMES, ...customThemes }).map(
            ([key, theme]) => (
              <option key={key} value={key}>
                {theme.name}
              </option>
            ),
          )}
        </select>
      </label>
      <LanguageSelector />
      <ThemeToggle />
    </div>
  );
  const steps = (
    <nav className="bingo-flow-nav" aria-label={t("steps")}>
      {(["generate", "print", "host"] as const).map((step, i) => (
        <button
          key={step}
          aria-current={stage === step ? "step" : undefined}
          disabled={busy || (step !== "generate" && !game)}
          onClick={() => navigate(step)}
        >
          <span>{i + 1}</span>
          {t(step)}
          {i < 2 && <i aria-hidden="true">→</i>}
        </button>
      ))}
    </nav>
  );

  if (!ready)
    return (
      <div className="bingo-loading" role="status">
        {t("loading")}
      </div>
    );
  return (
    <div
      className={`bingo-workspace ${stage === "host" ? "is-hosting" : ""} ${audience ? "is-audience" : ""}`}
      style={
        {
          "--bingo-accent": currentTheme.primaryColor,
          "--bingo-accent-text": currentTheme.textColor,
        } as React.CSSProperties
      }
    >
      {stage !== "host" && (
        <header className="bingo-flow-header">
          <button className="bingo-brand" onClick={() => navigate("generate")}>
            ✳ bingo.
          </button>
          <span>{t("yourEvent")}</span>
          <details className="bingo-header-settings">
            <summary>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <path d="M4 7h16M4 17h16" />
                <circle cx="9" cy="7" r="3" fill="var(--background)" />
                <circle cx="15" cy="17" r="3" fill="var(--background)" />
              </svg>
              {t("settings")}
              <span className="bingo-settings-chevron" aria-hidden="true">⌄</span>
            </summary>
            <div className="bingo-preferences-panel">
              <h2>{t("preferences")}</h2>
              <p>{t("preferencesHelp")}</p>
              {themeTools}
            </div>
          </details>
        </header>
      )}
      {!audience && steps}
      {error && (
        <p className="bingo-error" role="alert">
          {t(error)}
        </p>
      )}
      {storageWarning && (
        <p className="bingo-error" role="alert">
          {t("storageError")}
        </p>
      )}
      {stage === "generate" && (
        <main className="bingo-flow">
          <div
            className="bingo-entry-choice"
            role="group"
            aria-label={t("choosePath")}
          >
            <button
              aria-pressed={entryMode === "prepare"}
              onClick={() => {
                setEntryMode("prepare");
                setError("");
              }}
            >
              {t("prepareNew")}
            </button>
            <button
              aria-pressed={entryMode === "open"}
              onClick={() => {
                setEntryMode("open");
                setError("");
              }}
            >
              {t("hostSaved")}
            </button>
          </div>
          <div className="bingo-flow-setup">
            <section>
              <span className="bingo-eyebrow">
                {t(entryMode === "prepare" ? "prepareEyebrow" : "hostEyebrow")}
              </span>
              <h1>{t(entryMode === "prepare" ? "setupTitle" : "openTitle")}</h1>
              <p>{t(entryMode === "prepare" ? "setupIntro" : "openIntro")}</p>
              <ol>
                {(entryMode === "prepare"
                  ? ["explainCards", "explainPrint", "explainHost"]
                  : ["openExplain", "openPreserve", "openStart"]
                ).map((key) => (
                  <li key={key}>{t(key)}</li>
                ))}
              </ol>
            </section>
            {entryMode === "prepare" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  generate();
                }}
              >
                <h2>{t("setupForm")}</h2>
                <label>
                  {t("eventName")}
                  <input
                    required
                    maxLength={80}
                    value={name}
                    placeholder={t("eventPlaceholder")}
                    onChange={(e) => setName(e.target.value)}
                    disabled={busy}
                  />
                </label>
                <label>
                  {t("cardCount")}
                  <input
                    aria-label={t("cardCount")}
                    type="number"
                    min={1}
                    max={1000}
                    required
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    disabled={busy}
                  />
                  <small>{t("countHelp")}</small>
                </label>
                <div className="bingo-flow-estimate">
                  <span>{t("cardsCount", { count: count || 0 })}</span>
                  <b>
                    {t("sheetsCount", {
                      count: sheetCount(count || 0, cardsPerPage),
                    })}
                  </b>
                  <small>
                    {t("sheetTheme", {
                      count: cardsPerPage,
                      theme: currentTheme.name,
                    })}
                  </small>
                </div>
                <button className="bingo-primary" disabled={busy}>
                  {t(busy ? "generating" : "generateAction")}
                </button>
                <small>{t("nextPrint")}</small>
              </form>
            ) : (
              <section className="bingo-open-panel">
                <span className="bingo-file-icon" aria-hidden="true">
                  ↥
                </span>
                <h2>{t("openPanelTitle")}</h2>
                <p>{t("openPanelHelp")}</p>
                <button
                  className="bingo-primary"
                  disabled={busy}
                  onClick={() => fileInput.current!.click()}
                >
                  {t(busy ? "opening" : "openAction")}
                </button>
                <small>{t("openHelp")}</small>
              </section>
            )}
          </div>
        </main>
      )}
      {stage === "print" && (
        <main className="bingo-flow">
          <div className="bingo-flow-print-heading">
            <div>
              <span className="bingo-eyebrow">{t("printEyebrow")}</span>
              <h1>{t("printTitle")}</h1>
              <p>
                {eventName} · {t("cardsCount", { count: cards.length })} ·{" "}
                {t("sheetsCount", {
                  count: sheetCount(cards.length, cardsPerPage),
                })}
              </p>
            </div>
            <button onClick={() => navigate("generate")}>
              {t("editGame")}
            </button>
          </div>
          <div className="bingo-flow-print-layout">
            <section className="bingo-flow-paper-preview">
              <div className="bingo-flow-preview-label">
                {t("cardPreview")}
                <span>
                  {t("showingSheet", {
                    count: 1,
                    total: totalSheets,
                  })}
                </span>
              </div>
              <PrintedSheets cards={cards} eventName={eventName}
                cardsPerPage={cardsPerPage} theme={currentTheme} preview />
              <p>{t("sameCards")}</p>
            </section>
            <aside className="bingo-flow-print-actions">
              <h2>{t("printHeading")}</h2>
              <p>{t("printHelp")}</p>
              <fieldset className="bingo-flow-layout">
                <legend>{t("cardsPerSheet")}</legend>
                <div className="bingo-flow-layout-options">
                  {CARDS_PER_PAGE_OPTIONS.map((option) => {
                    return (
                      <label
                        key={option}
                        className={option === cardsPerPage ? "is-selected" : ""}
                      >
                        <input
                          type="radio"
                          name="cards-per-sheet"
                          value={option}
                          checked={option === cardsPerPage}
                          onChange={() => setCardsPerPage(option)}
                        />
                        <span
                          aria-hidden="true"
                          className="bingo-flow-layout-icon"
                        >
                          {Array.from({ length: option }, (_, index) => (
                            <i key={index} />
                          ))}
                        </span>
                        {option}
                      </label>
                    );
                  })}
                </div>
                <small>
                  {t("layoutSummary", {
                    count: cardsPerPage,
                    sheets: totalSheets,
                  })}
                </small>
                <small>{t("layoutFit")}</small>
              </fieldset>
              <button className="bingo-primary" onClick={() => window.print()}>
                {t("printAction")}
              </button>
              <small>{t("printSettings")}</small>
              <button onClick={download}>{t("downloadAction")}</button>
              <small>{t("backupHelp")}</small>
              <details>
                <summary>{t("customizeTheme")}</summary>
                <ThemeSelector />
              </details>
              <hr />
              <h2>{t("readyHeading")}</h2>
              <p>{t(started ? "resumeHelp" : "startHelp")}</p>
              <button
                className="bingo-primary"
                onClick={() => navigate("host")}
              >
                {t(started ? "resumeAction" : "hostAction")}
              </button>
            </aside>
          </div>
        </main>
      )}
      {stage === "host" && (
        <main className="bingo-c-game">
          <header className="bingo-c-heading">
            <div className="bingo-c-identity">
              <button
                onClick={() => navigate("print")}
                aria-label={t("backToCards")}
              >
                ✳
              </button>
              <div>
                <span className="bingo-eyebrow">
                  {t("hostMeta", { count: cards.length })}
                </span>
                <h1>{eventName}</h1>
              </div>
            </div>
            <div
              className={`bingo-c-status ${paused ? "is-paused" : ""}`}
              role="status"
            >
              <i />
              {t(
                paused
                  ? "paused"
                  : !drawn.length
                    ? "ready"
                    : drawn.length === 90
                      ? "finished"
                      : "live",
              )}
            </div>
            {!audience && (
              <div className="bingo-host-utilities">
                  <button onClick={() => setAudience(true)}>
                    {t("audienceAction")}
                  </button>
                  <details className="bingo-host-settings">
                    <summary>{t("settings")}</summary>
                    <div className="bingo-host-settings-panel">
                      <h2>{t("preferences")}</h2>
                      {themeTools}
                      <label className="bingo-checkbox">
                        <input
                          type="checkbox"
                          checked={sound}
                          onChange={(e) => setSound(e.target.checked)}
                        />
                        {t("sound")}
                      </label>
                      <label className="bingo-checkbox">
                        <input
                          type="checkbox"
                          checked={voice}
                          onChange={(e) => setVoice(e.target.checked)}
                        />
                        {t("voice")}
                      </label>
                      <button onClick={fullScreen}>{t("fullscreen")}</button>
                      <button onClick={download}>{t("downloadAction")}</button>
                      <button
                        onClick={() => {
                          if (window.confirm(t("restartConfirm"))) {
                            setSession((previous) => ({
                              ...previous,
                              drawn: [],
                              paused: false,
                            }));
                            announcement.current = null;
                          }
                        }}
                      >
                        {t("restart")}
                      </button>
                    </div>
                  </details>
              </div>
            )}
          </header>
          <div className="bingo-c-arena">
            <section className="bingo-c-focus" aria-label={t("callRegion")}>
              <div
                className="bingo-c-current"
                aria-live="polite"
                aria-atomic="true"
              >
                <span className="bingo-eyebrow">
                  {t(drawn.length ? "latest" : "letsPlay")}
                </span>
                <strong
                  key={drawn.length}
                  className={drawn.length ? "bingo-reveal" : ""}
                >
                  {drawn.at(-1) ?? "—"}
                </strong>
                <span>
                  {drawn.length
                    ? t("callCount", { count: drawn.length })
                    : t("firstCallHelp")}
                </span>
              </div>
              <div className="bingo-c-history">
                <div>
                  <span className="bingo-eyebrow">{t("previous")}</span>
                  <small>{t("newestFirst")}</small>
                </div>
                <div>
                  {drawn.length < 2 && (
                    <small className="bingo-c-no-calls">
                      {t("historyEmpty")}
                    </small>
                  )}
                  {drawn
                    .slice(-6, -1)
                    .reverse()
                    .map((n) => (
                      <b key={n} className="bingo-history-arrival">
                        {n}
                      </b>
                    ))}
                </div>
              </div>
              <div className="bingo-c-prize">
                <span className="bingo-eyebrow">{t("playingFor")}</span>
                <h2>{t(target)}</h2>
                <p>
                  {t(
                    paused
                      ? "pauseHelp"
                      : target === "line"
                        ? "lineHelp"
                        : "fullHelp",
                  )}
                </p>
              </div>
            </section>
            <section
              className="bingo-c-board-panel"
              aria-labelledby="number-board-heading"
            >
              <div className="bingo-c-board-heading">
                <h2 id="number-board-heading">{t("numberBoard")}</h2>
                <div className="bingo-c-legend">
                  <span>
                    <i />
                    {t("called")}
                  </span>
                  <span>
                    <i />
                    {t("waiting")}
                  </span>
                </div>
              </div>
              <div className="bingo-c-board" aria-label={t("allNumbers")}>
                {Array.from({ length: 9 }, (_, row) => (
                  <div className="bingo-c-board-row" key={row}>
                    <span className="bingo-c-range">
                      {row * 10 + 1}–{row * 10 + 10}
                    </span>
                    {Array.from({ length: 10 }, (_, col) => {
                      const n = row * 10 + col + 1;
                      return (
                        <span
                          key={n}
                          className={`bingo-c-cell ${drawn.includes(n) ? "is-called" : ""} ${drawn.at(-1) === n ? "is-latest" : ""}`}
                          aria-label={t("numberState", {
                            number: n,
                            state: t(
                              drawn.at(-1) === n
                                ? "latest"
                                : drawn.includes(n)
                                  ? "called"
                                  : "waiting",
                            ),
                          })}
                        >
                          {n}
                        </span>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="bingo-c-board-summary">
                <span>{t("calledCount", { count: drawn.length })}</span>
                <div
                  role="progressbar"
                  aria-label={t("called")}
                  aria-valuenow={drawn.length}
                  aria-valuemin={0}
                  aria-valuemax={90}
                >
                  <i style={{ width: `${(drawn.length / 90) * 100}%` }} />
                </div>
                <span>{t("remainingCount", { count: 90 - drawn.length })}</span>
              </div>
            </section>
          </div>
          {!audience ? (
            <>
              <footer className="bingo-c-desk" aria-label={t("hostControls")}>
                <div className="bingo-c-actions">
                  <button
                    className="bingo-primary"
                    onClick={draw}
                    disabled={paused || drawn.length === 90}
                    aria-keyshortcuts="Space Enter"
                  >
                    {t(drawn.length ? "drawNext" : "drawFirst")}
                  </button>
                  <button
                    onClick={() =>
                      setSession((previous) => ({
                        ...previous,
                        paused: !previous.paused,
                      }))
                    }
                  >
                    {t(paused ? "resume" : "pause")}
                  </button>
                  <span className="bingo-keyboard-hint">{t("keyboardHelp")}</span>
                </div>
                <div className="bingo-c-options">
                  <label>
                    {t("playingFor")}
                    <select
                      value={target}
                      onChange={(e) =>
                        setSession((previous) => ({
                          ...previous,
                          target: e.target.value === "full" ? "full" : "line",
                        }))
                      }
                    >
                      <option value="line">{t("line")}</option>
                      <option value="full">{t("full")}</option>
                    </select>
                  </label>

                </div>
              </footer>
              <form
                className="bingo-claim-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  verifyClaim();
                }}
              >
                <label>
                  {t("claimLabel")}
                  <input
                    type="number"
                    required
                    min={1}
                    value={claimNumber}
                    onChange={(e) => setClaimNumber(e.target.value)}
                    placeholder={t("cardNumber")}
                    inputMode="numeric"
                  />
                </label>
                <button disabled={!claimNumber}>{t("checkClaim")}</button>
                <small>{t("claimHelp")}</small>
              </form>
            </>
          ) : (
            <div className="bingo-c-audience-actions">
              <button onClick={() => setAudience(false)}>
                {t("returnHost")}
              </button>
              <button onClick={fullScreen}>{t("fullscreen")}</button>
            </div>
          )}
        </main>
      )}
      <input
        hidden
        ref={fileInput}
        type="file"
        accept=".bingoCards"
        aria-label={t("fileInput")}
        onChange={(e) => {
          void openFile(e.target.files![0]);
          e.target.value = "";
        }}
      />
      <PrintedSheets cards={cards} eventName={eventName}
        cardsPerPage={cardsPerPage} theme={currentTheme} />

      <dialog
        ref={claimDialog}
        className={`bingo-claim-dialog ${claim?.valid ? "is-winning" : ""}`}
        aria-labelledby="claim-title"
        onCancel={() => setClaim(null)}
        onClose={() => setClaim(null)}
      >
        {claim && (
          <>
            <span aria-hidden="true" className="bingo-win-symbol">
              {claim.valid ? "✦" : "○"}
            </span>
            <h2 id="claim-title">
              {t(
                !claim.card
                  ? "cardNotFound"
                  : claim.valid
                    ? "claimValid"
                    : "claimInvalid",
              )}
            </h2>
            {claim.card && (
              <>
                <p>
                  {t("claimCard", {
                    number: claim.card.cardNumber,
                    target: t(target),
                  })}
                </p>
                <div className="bingo-claim-grid">
                  {claim.card.numbers.map((n, i) => (
                    <span
                      key={i}
                      className={
                        n !== null && drawn.includes(n) ? "is-marked" : ""
                      }
                    >
                      {n}
                    </span>
                  ))}
                </div>
              </>
            )}
            <p>{t("claimPaused")}</p>
            <button
              autoFocus
              onClick={() => {
                claimDialog.current!.close();
                setClaim(null);
              }}
            >
              {t("close")}
            </button>
          </>
        )}
      </dialog>
    </div>
  );
}
