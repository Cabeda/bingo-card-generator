"use client";

// THROWAWAY: three host layouts on /en/game?variant=A|B|C. No saved games are read or changed.
// Question: does a caller's desk, a board-first match sheet, or a presentation stage serve live bingo best?
import { useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import PrototypeSwitcher from "../../PrototypeSwitcher";
import styles from "./host-prototype.module.css";

const variants = ["A", "B", "C"] as const;
const names = { A: "Caller’s desk", B: "Match sheet", C: "Stage" };
const opening = [12, 43, 8, 71, 26, 57];
const sequence = [...opening, ...Array.from({ length: 90 }, (_, i) => (i * 37 + 13) % 90 + 1).filter(n => !opening.includes(n))];

export default function HostPrototype() {
  const search = useSearchParams();
  const variant = variants.find(v => v === search.get("variant")) ?? "A";
  const [drawn, setDrawn] = useState<number[]>(opening);
  const [paused, setPaused] = useState(false);
  const [target, setTarget] = useState("One line");
  const [audience, setAudience] = useState(false);
  const [showBoard, setShowBoard] = useState(false);
  const [claim, setClaim] = useState("");
  const [claimMessage, setClaimMessage] = useState("");
  const latest = drawn.at(-1);
  const recent = drawn.slice(-6, -1).reverse();
  const draw = () => {
    if (!paused && drawn.length < 90) setDrawn(sequence.slice(0, drawn.length + 1));
  };
  const board = (
    <div className={styles.board} aria-label="Number board">
      {Array.from({ length: 90 }, (_, i) => i + 1).map(n => (
        <span key={n} className={`${drawn.includes(n) ? styles.called : ""} ${n === latest ? styles.latestCell : ""}`}
          aria-label={`${n}, ${drawn.includes(n) ? "called" : "waiting"}`}>{n}</span>
      ))}
    </div>
  );
  const history = (
    <div className={styles.history}>
      <span>Previous calls</span>
      <div>{recent.length ? recent.map(n => <b key={n}>{n}</b>) : <p>Your recent calls will appear here.</p>}</div>
    </div>
  );
  const actions = (
    <div className={styles.actions}>
      <button className={styles.draw} onClick={draw} disabled={paused || drawn.length === 90}>
        {drawn.length === 90 ? "All numbers called" : latest ? "Draw next number" : "Draw first number"}
        {drawn.length < 90 && <span aria-hidden="true">↗</span>}
      </button>
      <button className={styles.pause} onClick={() => setPaused(!paused)}>{paused ? "Resume" : "Pause"}</button>
    </div>
  );
  const progress = <div className={styles.progress}><span>{drawn.length} called</span><progress value={drawn.length} max="90" aria-label="Numbers called" /><span>{90 - drawn.length} left</span></div>;
  const tools = (
    <div className={styles.tools}>
      <label>Playing for<select value={target} onChange={e => setTarget(e.target.value)}><option>One line</option><option>Full house</option></select></label>
      <details className={styles.claim}><summary>Check a claim</summary><div>
        <label>Card number<input type="number" min="1" placeholder="e.g. 24" value={claim} onChange={e => setClaim(e.target.value)} /></label>
        <button disabled={!claim} onClick={() => { setPaused(true); setClaimMessage(`Paused to check card ${claim}. Claim results are simulated in this prototype.`); }}>Check card</button>
        <p role="status">{claimMessage || "Sample interaction only; no real cards are loaded."}</p>
      </div></details>
    </div>
  );
  const empty = <div className={styles.empty}><span>Everything’s set.</span><h2>Shall we begin?</h2><p>Draw the first number when your players are ready.</p></div>;
  const status = <span className={styles.status}><i />{paused ? "Paused" : drawn.length === 90 ? "Game complete" : latest ? "Game in progress" : "Ready to begin"}</span>;
  const identity = <div className={styles.identity}><span className={styles.brand}>✳ bingo.</span><div><h1>Friday night bingo</h1><span>90-ball bingo · 200 cards</span></div></div>;
  const utilities = <div className={styles.utilities}>{status}<button onClick={() => setAudience(!audience)}>{audience ? "Return to host" : "Audience view"}<span aria-hidden="true"> ↗</span></button></div>;

  const parts = { identity, utilities, latest, drawn, audience, actions, history, target, empty, board, progress, tools, showBoard, onToggleBoard: () => setShowBoard(!showBoard) };
  return (
    <div className={`${styles.prototype} ${styles[variant]} ${audience ? styles.audience : ""}`}>
      <div className={styles.topNote}>Design study · sample game · changes stay in this tab</div>
      {variant === "A" && <VariantA {...parts} />}

      {variant === "B" && <VariantB {...parts} />}

      {variant === "C" && <VariantC {...parts} />}

      <details className={styles.state}><summary>Prototype state &amp; demo controls</summary><div><button onClick={() => { setDrawn([]); setPaused(false); setClaimMessage(""); }}>Start empty</button><button onClick={() => { setDrawn(opening); setPaused(false); setClaimMessage(""); }}>Load sample calls</button><pre>{JSON.stringify({ variant, drawn, paused, target, audience, showBoard, claim, claimMessage }, null, 2)}</pre><p>Question: which layout makes calling, checking and presenting easiest? No local storage is used.</p></div></details>
      <PrototypeSwitcher variants={variants.map(id => ({ id, name: names[id] }))} current={variant} />
    </div>
  );
}

interface LayoutParts {
  identity: ReactNode; utilities: ReactNode; latest?: number; drawn: number[];
  audience: boolean; actions: ReactNode; history: ReactNode; target: string;
  empty: ReactNode; board: ReactNode; progress: ReactNode; tools: ReactNode;
  showBoard: boolean; onToggleBoard: () => void;
}

export function VariantA({ identity, utilities, latest, drawn, audience, actions, history, target, empty, board, progress, tools }: LayoutParts) {
  return (<>
        <header className={styles.header}>{identity}{utilities}</header>
        <div className={styles.deskLayout}>
          <section className={styles.console} aria-label="Current call">
            {latest ? <><div className={styles.callLabel}>Latest number <span>Call {drawn.length} of 90</span></div><strong className={styles.deskNumber} aria-live="polite">{latest}</strong></> : empty}
            {!audience && actions}
            {history}
            <div className={styles.target}><span>Playing for</span><b>{target}</b><p>{target === "One line" ? "Complete a horizontal line." : "Mark every number on your card."}</p></div>
          </section>
          <section className={styles.boardSection}><div className={styles.sectionHead}><h2>Number board</h2><span><i /> Called <i /> Waiting</span></div>{board}{progress}</section>
        </div>
        {!audience && <footer className={styles.deskFooter}>{tools}<span>Host your game at your own pace.</span></footer>}
      </>);
}

export function VariantB({ identity, utilities, latest, drawn, audience, actions, history, target, empty, board, progress, tools }: LayoutParts) {
  return (<>
        <header className={styles.header}>{identity}{utilities}</header>
        <section className={styles.matchRibbon} aria-label="Current call">
          {latest ? <><div className={styles.ribbonCall}><span>Latest call</span><strong aria-live="polite">{latest}</strong><small>Call {drawn.length} / 90</small></div>{history}<div className={styles.ribbonTarget}><span>Playing for</span><b>{target}</b></div></> : empty}
        </section>
        <div className={styles.matchLayout}>
          <section className={styles.matchBoard}><h2>Number board</h2>{board}{progress}</section>
          {!audience && <aside className={styles.matchControls}><h2>Host controls</h2><p>Draw at your own pace. Pause to check a claim.</p>{actions}{tools}</aside>}
        </div>
      </>);
}

export function VariantC({ identity, utilities, latest, drawn, audience, actions, history, target, empty, board, tools, showBoard, onToggleBoard }: LayoutParts) {
  return (<>
        <header className={styles.stageHeader}>{identity}{utilities}</header>
        <section className={styles.stageHero} aria-label="Current call">
          <span className={styles.stageTarget}>We’re playing for <b>{target.toLowerCase()}</b></span>
          {latest ? <><div className={styles.stageNumber} aria-live="polite">{latest}</div><p>Call {drawn.length} of 90</p></> : empty}
          {history}
        </section>
        {!audience && <div className={styles.stageDesk}>{actions}{tools}</div>}
        <section className={styles.stageBoard}>
          <button className={styles.boardToggle} onClick={onToggleBoard} aria-expanded={showBoard}>{showBoard ? "Hide number board" : "Show number board"}<span>{drawn.length} called · {90 - drawn.length} remaining {showBoard ? "−" : "+"}</span></button>
          {showBoard && board}
        </section>
      </>);
}
