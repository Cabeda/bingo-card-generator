// app/[locale]/page.tsx
'use client';

import { FileUpload } from "../components/FileUpload";

export default function Home() {
  return (
    <main style={{ viewTransitionName: 'home-page' }}>
      <FileUpload />
    </main>
  );
}
