import { Card } from "../bingo.interface";
import { CardTheme } from "../bingo.interface";
import { CardsPerPage } from "../types";

export interface BuildPdfOptions {
  cards: Card[];
  header: string;
  footer: string;
  cardsPerPage: CardsPerPage;
  theme: CardTheme;
  onProgress?: (percent: number) => void;
  isCancelled?: () => boolean;
}

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 20;
const TOP_OFFSET = 50;
const BOTTOM_OFFSET = 50;

function parseColor(input: string): [number, number, number] {
  const s = (input || "").trim().toLowerCase();
  if (s.startsWith("#")) {
    let hex = s.slice(1);
    if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
    if (hex.length === 6) {
      return [
        parseInt(hex.slice(0, 2), 16) / 255,
        parseInt(hex.slice(2, 4), 16) / 255,
        parseInt(hex.slice(4, 6), 16) / 255,
      ];
    }
  }
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const parts = m[1].split(",").map((x) => parseFloat(x.trim()));
    if (parts.length >= 3) {
      return [parts[0] / 255, parts[1] / 255, parts[2] / 255];
    }
  }
  const named: Record<string, [number, number, number]> = {
    white: [1, 1, 1],
    black: [0, 0, 0],
    red: [1, 0, 0],
    green: [0, 0.5, 0],
    blue: [0, 0, 1],
    gray: [0.5, 0.5, 0.5],
    grey: [0.5, 0.5, 0.5],
  };
  if (named[s]) return named[s];
  return [0, 0, 0];
}

function parseLength(input: string): number {
  const s = (input || "").trim().toLowerCase();
  if (s === "" || s === "0") return 0;
  const m = s.match(/^([\d.]+)\s*(px|rem|em|pt)?$/);
  if (!m) return 0;
  const v = parseFloat(m[1]);
  const unit = m[2] || "px";
  if (unit === "px") return v * 0.75;
  if (unit === "pt") return v;
  if (unit === "rem" || unit === "em") return v * 12;
  return v;
}

function colorOp(c: [number, number, number]): string {
  return `${c[0].toFixed(3)} ${c[1].toFixed(3)} ${c[2].toFixed(3)}`;
}

function escText(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code === 0x5c || code === 0x28 || code === 0x29) {
      out += "\\" + s[i];
    } else if (code < 0x20 || code > 0xff) {
      out += " ";
    } else {
      out += s[i];
    }
  }
  return out;
}

function fontFamilyKey(fontFamily: string): "helvetica" | "times" | "courier" {
  const s = (fontFamily || "").toLowerCase();
  if (s.includes("courier") || s.includes("mono")) return "courier";
  if (s.includes("serif") && !s.includes("sans")) return "times";
  return "helvetica";
}

function roundedRectPath(
  x: number,
  yTop: number,
  w: number,
  h: number,
  r: number,
): string {
  const bottom = PAGE_H - yTop - h;
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  const k = 0.5522847498 * rr;
  const lines: string[] = [];
  lines.push(`${(x + rr).toFixed(2)} ${bottom.toFixed(2)} m`);
  lines.push(`${(x + w - rr).toFixed(2)} ${bottom.toFixed(2)} l`);
  lines.push(
    `${(x + w - k).toFixed(2)} ${bottom.toFixed(2)} ${(x + w).toFixed(2)} ${(bottom + k).toFixed(2)} ${(x + w).toFixed(2)} ${(bottom + rr).toFixed(2)} c`,
  );
  lines.push(`${(x + w).toFixed(2)} ${(bottom + h - rr).toFixed(2)} l`);
  lines.push(
    `${(x + w).toFixed(2)} ${(bottom + h - k).toFixed(2)} ${(x + w - k).toFixed(2)} ${(bottom + h).toFixed(2)} ${(x + w - rr).toFixed(2)} ${(bottom + h).toFixed(2)} c`,
  );
  lines.push(`${(x + rr).toFixed(2)} ${(bottom + h).toFixed(2)} l`);
  lines.push(
    `${(x + k).toFixed(2)} ${(bottom + h).toFixed(2)} ${x.toFixed(2)} ${(bottom + h - k).toFixed(2)} ${x.toFixed(2)} ${(bottom + h - rr).toFixed(2)} c`,
  );
  lines.push(`${x.toFixed(2)} ${(bottom + rr).toFixed(2)} l`);
  lines.push(
    `${x.toFixed(2)} ${(bottom + k).toFixed(2)} ${(x + k).toFixed(2)} ${bottom.toFixed(2)} ${(x + rr).toFixed(2)} ${bottom.toFixed(2)} c`,
  );
  lines.push("h");
  return lines.join("\n");
}

export function buildPdf(opts: BuildPdfOptions): Blob {
  const { cards, header, footer, cardsPerPage, theme, onProgress, isCancelled } =
    opts;

  const primary = parseColor(theme.primaryColor);
  const secondary = parseColor(theme.secondaryColor);
  const text = parseColor(theme.textColor);
  const background = parseColor(theme.backgroundColor);
  const borderWidth = Math.max(0.5, parseLength(theme.borderWidth));
  const radius = parseLength(theme.borderRadius);

  const family = fontFamilyKey(theme.fontFamily);
  const fontBoldName =
    family === "times"
      ? "Times-Bold"
      : family === "courier"
        ? "Courier-Bold"
        : "Helvetica-Bold";
  const fontRegName =
    family === "times"
      ? "Times-Roman"
      : family === "courier"
        ? "Courier"
        : "Helvetica";

  const perPage = cardsPerPage;
  const slotHeight = (PAGE_H - TOP_OFFSET - BOTTOM_OFFSET) / perPage;
  const cellSize = (PAGE_W - 2 * MARGIN_X) / 9;
  const gap = Math.max(1, cellSize * 0.065);
  const gridW = 9 * cellSize + 8 * gap;
  const gridH = 3 * cellSize + 2 * gap;
  const gridX = (PAGE_W - gridW) / 2;

  const streams: string[] = [];
  const totalPages = Math.ceil(cards.length / perPage) || 1;

  for (let p = 0; p < cards.length; p += perPage) {
    if (isCancelled && isCancelled()) {
      throw new Error("__cancelled__");
    }

    const pageCards = cards.slice(p, p + perPage);
    const ops: string[] = [];

    ops.push(
      `BT /F1 12 Tf 1 0 0 1 ${(PAGE_W / 2 - 40).toFixed(2)} ${(PAGE_H - 30).toFixed(2)} Tm (${escText(header)}) Tj ET`,
    );
    ops.push(
      `BT /F2 9 Tf 1 0 0 1 ${(PAGE_W / 2 - 40).toFixed(2)} 24 Tm (${escText(footer)}) Tj ET`,
    );

    pageCards.forEach((card, j) => {
      const slotStart = TOP_OFFSET + j * slotHeight;
      const cardY = slotStart + (slotHeight - gridH) / 2;

      for (let i = 0; i < 27; i++) {
        const r = Math.floor(i / 9);
        const c = i % 9;
        const x = gridX + c * (cellSize + gap);
        const y = cardY + r * (cellSize + gap);
        const v = card.numbers[i];
        const fill = v == null ? background : primary;

        ops.push("q");
        ops.push(`${colorOp(fill)} rg`);
        ops.push(`${colorOp(secondary)} RG`);
        ops.push(`${borderWidth} w`);
        ops.push(roundedRectPath(x, y, cellSize, cellSize, radius));
        ops.push("B");
        ops.push("Q");

        if (v != null) {
          const fs = Math.max(10, cellSize * 0.42);
          const tw = String(v).length * 0.556 * fs;
          const cx = x + cellSize / 2 - tw / 2;
          const cy = y + cellSize / 2;
          const baseline = PAGE_H - cy + fs * 0.35;
          ops.push(
            `BT /F1 ${fs.toFixed(1)} Tf 1 0 0 1 ${cx.toFixed(2)} ${baseline.toFixed(2)} Tm (${escText(String(v))}) Tj ET`,
          );
        }
      }

      const titleY = cardY + gridH + 4;
      const titleFs = 9;
      ops.push(
        `BT /F2 ${titleFs} Tf 1 0 0 1 ${gridX.toFixed(2)} ${(PAGE_H - titleY - titleFs).toFixed(2)} Tm (${escText(`${card.cardTitle}`)}) Tj ET`,
      );
    });

    streams.push(ops.join("\n"));

    const built = p / perPage + 1;
    if (onProgress) {
      onProgress(Math.round((built / totalPages) * 85) + 10);
    }
  }

  if (isCancelled && isCancelled()) {
    throw new Error("__cancelled__");
  }

  const objects: string[] = [];
  objects.push("");
  objects.push("");
  objects.push(
    `<< /Type /Font /Subtype /Type1 /BaseFont /${fontBoldName} /Encoding /WinAnsiEncoding >>`,
  );
  objects.push(
    `<< /Type /Font /Subtype /Type1 /BaseFont /${fontRegName} /Encoding /WinAnsiEncoding >>`,
  );

  const pageObjNums: number[] = [];
  for (const stream of streams) {
    const contentNum = objects.length + 1;
    objects.push(
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    );
    const pageNum = objects.length + 1;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentNum} 0 R >>`,
    );
    pageObjNums.push(pageNum);
  }

  objects[0] = `<< /Type /Catalog /Pages 2 0 R >>`;
  objects[1] = `<< /Type /Pages /Kids [${pageObjNums
    .map((n) => `${n} 0 R`)
    .join(" ")}] /Count ${pageObjNums.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) {
    pdf += `${String(o).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

  if (onProgress) onProgress(100);

  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) {
    bytes[i] = pdf.charCodeAt(i) & 0xff;
  }
  return new Blob([bytes], { type: "application/pdf" });
}
