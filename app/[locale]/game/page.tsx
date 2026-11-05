// app/[locale]/game/page.tsx
'use client';

import React, { useEffect, useState } from "react";
import BingoUxPrototype from "../../components/BingoUxPrototype";
import BingoGame from "../../components/BingoGame";
import { ErrorBoundary } from "../../components/ErrorBoundary";

export default function GamePage(): React.JSX.Element {
  const [prototype, setPrototype] = useState(false);
  useEffect(() => { setPrototype(new URLSearchParams(window.location.search).has("variant")); }, []);
  if (prototype) return <BingoUxPrototype game />;
  return (
    <ErrorBoundary>
      <BingoGame />
    </ErrorBoundary>
  );
}
