// app/page.tsx
'use client';

import { FileUpload } from "./components/FileUpload";

export default function Home(): React.JSX.Element {
  return (
    <main style={{ viewTransitionName: 'home-page' }}>
      <FileUpload />
    </main>
  );
}