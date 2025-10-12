// app/game/page.tsx
'use client';

import BingoGame from "../components/BingoGame";

export default function GamePage() {
  return (
    <main style={{ viewTransitionName: 'game-page' }}>
      <BingoGame />
    </main>
  );
}