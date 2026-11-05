'use client';

// Throwaway: compare three first-use and audience layouts on the existing routes.
// URL: ?variant=A|B|C. All draws and settings are in-memory demo state.
import React, { useEffect, useState } from 'react';
import './BingoUxPrototype.css';
import { ThemeToggle } from './ThemeToggle';
import { useCardTheme } from './ThemeProvider';
import { PRESET_THEMES } from '../utils/themes';

const names = ['A · Guided studio', 'B · Event workspace', 'C · Audience first'];
const initial = [4, 18, 63, 27, 81, 9, 55, 36, 72, 14, 48, 22, 67, 31, 90, 42];

export default function BingoUxPrototype({ game = false }: { game?: boolean }): React.JSX.Element {
  const { currentTheme, selectedThemeKey, customThemes, setTheme } = useCardTheme();
  const availableThemes = { ...PRESET_THEMES, ...customThemes };
  const [variant, setVariant] = useState('A');
  const [screen, setScreen] = useState(game);
  const [drawn, setDrawn] = useState(initial);
  const [paused, setPaused] = useState(false);
  const [target, setTarget] = useState('One line');
  const [cards, setCards] = useState(200);
  const [event, setEvent] = useState('Community bingo');
  const [audience, setAudience] = useState(false);
  const change = (key: string) => {
    setVariant(key);
    const url = new URL(window.location.href);
    url.searchParams.set('variant', key);
    window.history.replaceState(null, '', url);
  };
  useEffect(() => {
    const read = () => { const key = new URLSearchParams(window.location.search).get('variant'); setVariant(['A','B','C'].includes(key || '') ? key! : 'A'); };
    read(); window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, []);
  useEffect(() => {
    const keys = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('input,textarea,select,[contenteditable]')) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') change(String.fromCharCode(65 + (variant.charCodeAt(0) - 65 + (e.key === 'ArrowRight' ? 1 : 2)) % 3));
    };
    window.addEventListener('keydown', keys); return () => window.removeEventListener('keydown', keys);
  }, [variant]);
  const draw = () => {
    const remaining = Array.from({ length: 90 }, (_, i) => i + 1).filter(n => !drawn.includes(n));
    if (!paused && remaining.length) setDrawn([...drawn, remaining[Math.floor(Math.random() * remaining.length)]]);
  };
  const board = <div className="ux-board" aria-label="All 90 numbers">{Array.from({ length: 90 }, (_, i) => i + 1).map(n => <span key={n} className={`${drawn.includes(n) ? 'called' : ''} ${drawn.at(-1) === n ? 'latest' : ''}`} aria-label={`${n}${drawn.includes(n) ? ', called' : ', not called'}`}>{n}</span>)}</div>;
  const recent = <div className="ux-recent"><span>PREVIOUS CALLS</span>{drawn.slice(-6, -1).reverse().map(n => <b key={n}>{n}</b>)}</div>;
  const number = <section className="ux-number" aria-live="polite"><span>{paused ? 'GAME PAUSED' : 'LATEST NUMBER'}</span><strong>{drawn.at(-1)}</strong><small>Call {drawn.length} of 90</small></section>;
  const controls = <div className="ux-controls"><button className="ux-primary" onClick={draw} disabled={paused || drawn.length === 90}>Draw next number →</button><button onClick={() => setPaused(!paused)}>{paused ? 'Resume game' : 'Pause game'}</button><label>Playing for<select value={target} onChange={e => setTarget(e.target.value)}><option>One line</option><option>Full house</option></select></label><button onClick={() => setAudience(!audience)}>{audience ? 'Show host controls' : 'Audience view'}</button><button onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen(); }}>Full screen ↗</button></div>;
  const setup = <div className="ux-setup"><label>Event name<input value={event} onChange={e => setEvent(e.target.value)} /></label><label>How many players?<input type="number" min="1" max="1000" value={cards} onChange={e => setCards(Number(e.target.value))} /></label><p>Each player gets a unique 90-ball card. Print the cards, then draw numbers on the big screen.</p><button className="ux-primary" onClick={() => setScreen(true)}>Try the host screen →</button><div className="ux-card-sample" aria-label={`${currentTheme.name} card theme preview`}><b>{currentTheme.name} · Card preview</b><div>{[4, null, 22, null, 42, null, 63, null, 81].map((n,i) => <span key={i}>{n}</span>)}</div></div><small>Demo only · no files generated or saved</small></div>;
  return <div style={{ '--ux-card-primary': currentTheme.primaryColor, '--ux-card-text': currentTheme.textColor, '--ux-card-background': currentTheme.backgroundColor, '--ux-card-border': currentTheme.secondaryColor, '--ux-card-radius': currentTheme.borderRadius, '--ux-card-font': currentTheme.fontFamily } as React.CSSProperties} className={`ux-prototype ux-${variant} ${audience ? 'ux-audience' : ''}`}>
    <header className="ux-header"><button className="ux-brand" onClick={() => setScreen(false)}><span>✳</span> bingo<span className="ux-brand-dot">.</span></button><nav><button aria-pressed={!screen} onClick={() => setScreen(false)}>1. Prepare cards</button><button aria-pressed={screen} onClick={() => setScreen(true)}>2. Host a game</button></nav><div className="ux-theme-tools"><label>Card theme<select value={selectedThemeKey} onChange={e => setTheme(e.target.value)}>{Object.entries(availableThemes).map(([key, theme]) => <option key={key} value={key}>{theme.name}</option>)}</select></label><ThemeToggle /></div></header>
    {screen ? <main className="ux-game"><div className="ux-event"><div><span className="ux-eyebrow">{paused ? '● PAUSED' : '● LIVE DEMO'} · 90-BALL BINGO</span><h1>{event}</h1></div><div className="ux-target"><small>PLAYING FOR</small><b>{target}</b></div><div className="ux-count"><b>{drawn.length} / 90</b><small>numbers called</small></div></div><div className="ux-stage">{variant === 'B' && !audience && <aside><h2>Host desk</h2><p>Draw at your own pace. Pause whenever a player calls a win.</p>{controls}</aside>}<div className="ux-call">{number}{recent}</div><section className="ux-board-wrap"><div className="ux-board-title"><h2>All numbers</h2><span>● Called <i /> Waiting</span></div>{board}</section></div><footer className="ux-game-footer"><b>{paused ? 'Please wait — the game is paused.' : target === 'One line' ? 'Complete one horizontal line? Call “Line!”' : 'Marked every number on your card? Call “Bingo!”'}</b><span>{90 - drawn.length} numbers remaining</span></footer>{variant !== 'B' && !audience && controls}{audience && <button className="ux-exit" onClick={() => setAudience(false)}>Exit audience view</button>}</main> : <main className="ux-home">{variant === 'B' && <aside className="ux-sidebar"><span className="ux-eyebrow">YOUR EVENT</span><h2>Let’s get ready.</h2><ol><li><b>Create your cards</b><p>One unique card per player.</p></li><li><b>Print & hand out</b><p>Give everyone a seat at the game.</p></li><li><b>Bring up the big screen</b><p>Call numbers. Celebrate winners.</p></li></ol><button onClick={() => setScreen(true)}>Preview live game ↗</button></aside>}<section className="ux-intro"><span className="ux-eyebrow">A ROOM FULL OF PEOPLE. ONE GREAT GAME.</span><h1>{variant === 'A' ? <>Your bingo night,<br />beautifully simple.</> : variant === 'B' ? 'Create cards for your event.' : <>Big numbers.<br />Shared moments.</>}</h1><p>Create printable bingo cards and host a 90-ball game everyone can follow. From the first card to the final call.</p>{variant === 'C' ? <><button className="ux-primary" onClick={() => setScreen(true)}>Explore the big screen →</button><button onClick={() => change('A')}>Prepare your cards</button><div className="ux-preview"><span>YOUR NEXT GREAT BINGO NIGHT</span><strong>42</strong><p>One line · 16 numbers called</p></div></> : variant === 'A' ? <div className="ux-steps"><div><b>01</b><h3>Create</h3><p>Choose how many cards you need.</p></div><div><b>02</b><h3>Print</h3><p>Hand a unique card to each player.</p></div><div><b>03</b><h3>Play</h3><p>Put the calls on the big screen.</p></div></div> : <p className="ux-note">90 numbers · 3 rows per card · Play for a line, then a full house</p>}</section>{variant !== 'C' && <section className="ux-create"><span className="ux-eyebrow">STEP 01 / PREPARE</span><h2>A card for everyone.</h2>{setup}</section>}</main>}
    {process.env.NODE_ENV !== 'production' && <div className="ux-switcher"><button aria-label="Previous design" onClick={() => change(String.fromCharCode(65 + (variant.charCodeAt(0) - 65 + 2) % 3))}>←</button><span>{names[variant.charCodeAt(0) - 65]}<small> {screen ? 'Host screen' : 'First use'} · {drawn.length} calls · {target} · {audience ? 'Audience' : 'Host'}</small></span><button aria-label="Next design" onClick={() => change(String.fromCharCode(65 + (variant.charCodeAt(0) - 65 + 1) % 3))}>→</button></div>}
  </div>;
}
