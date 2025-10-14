// app/[locale]/game/page.tsx
'use client';

import BingoGame from "../../components/BingoGame";
import { ErrorBoundary } from "../../components/ErrorBoundary";

export default function GamePage(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <BingoGame />
    </ErrorBoundary>
  );
}
