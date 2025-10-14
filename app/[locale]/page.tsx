// app/[locale]/page.tsx
'use client';

import { FileUpload } from "../components/FileUpload";
import { ErrorBoundary } from "../components/ErrorBoundary";

export default function Home(): React.JSX.Element {
  return (
    <main style={{ viewTransitionName: 'home-page' }}>
      <ErrorBoundary>
        <FileUpload />
      </ErrorBoundary>
    </main>
  );
}
