"use client";

// THROWAWAY: shared navigation for design studies, never rendered in production.
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./EventWorkspace/host-prototype/host-prototype.module.css";

export default function PrototypeSwitcher({ variants, current }: {
  variants: { id: string; name: string }[]; current: string;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const index = variants.findIndex(variant => variant.id === current);
  const cycle = (direction: number) => {
    const params = new URLSearchParams(search.toString());
    params.set("variant", variants[(index + direction + variants.length) % variants.length].id);
    router.replace(`?${params}`, { scroll: false });
  };
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      const element = event.target as HTMLElement;
      if (element.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        cycle(event.key === "ArrowLeft" ? -1 : 1);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  if (process.env.NODE_ENV === "production") return null;
  return <nav className={styles.switcher} aria-label="Prototype variants">
    <button onClick={() => cycle(-1)} aria-label="Previous variant">←</button>
    <div><small>Host layout · {index + 1} / {variants.length}</small><b>{current} · {variants[index].name}</b></div>
    <button onClick={() => cycle(1)} aria-label="Next variant">→</button>
  </nav>;
}
