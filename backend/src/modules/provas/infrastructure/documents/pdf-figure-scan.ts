import { PNG } from 'pngjs';
import type {
  AlternativeMarker,
  FigureBox,
  QuestionMarker,
} from '../../domain/ports/exam-figure-source';

// Low-level helpers over pdfjs output: track the CTM through the operator list to
// locate raster images, cluster text items into "QUESTÃO N" markers, and encode
// the decoded pixels to PNG. Kept separate so the adapter stays thin. Only this
// file and the adapter know pdfjs/pngjs (Anti-Corruption Layer over the libs).

export interface OperatorList {
  fnArray: number[];
  argsArray: unknown[];
}
export interface TextItem {
  str: string;
  transform: number[];
}
export interface PdfOps {
  save: number;
  restore: number;
  transform: number;
  paintImageXObject: number;
  paintImageXObjectRepeat: number;
  paintInlineImageXObject: number;
}
export interface PdfImage {
  width: number;
  height: number;
  kind: number;
  data: Uint8Array;
}
export interface ImageBox {
  name: string;
  bbox: FigureBox;
}

const IDENTITY: number[] = [1, 0, 0, 1, 0, 0];
// pdfjs ImageKind
const RGB_24BPP = 2;
const RGBA_32BPP = 3;
const MARKER = /QUEST[ÃAã]O\s*(\d+)/i;
// A lone alternative letter (image alternatives): "A", "A)", "A." — but not "A"
// followed by more letters (that would be a text alternative or the stem).
const ALT_MARKER = /^([A-E])(?![\p{L}])/u;

function mul(a: number[], b: number[]): number[] {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

function applyPoint(m: number[], x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

// An image XObject is painted over the unit square, so its device box is the CTM
// applied to the corners of [0,1]×[0,1].
function unitBox(ctm: number[]): FigureBox {
  const corners = [
    applyPoint(ctm, 0, 0),
    applyPoint(ctm, 1, 0),
    applyPoint(ctm, 1, 1),
    applyPoint(ctm, 0, 1),
  ];
  const xs = corners.map((c) => c[0]);
  const ys = corners.map((c) => c[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

function stepCtm(
  fn: number,
  args: unknown,
  ops: PdfOps,
  ctm: number[],
  stack: number[][],
): number[] {
  if (fn === ops.save) return (stack.push(ctm), ctm);
  if (fn === ops.restore) return stack.pop() ?? IDENTITY;
  if (fn === ops.transform) return mul(ctm, args as number[]);
  return ctm;
}

function isImageOp(fn: number, ops: PdfOps): boolean {
  return (
    fn === ops.paintImageXObject ||
    fn === ops.paintImageXObjectRepeat ||
    fn === ops.paintInlineImageXObject
  );
}

function imageName(args: unknown): string {
  return Array.isArray(args) && typeof args[0] === 'string' ? args[0] : '';
}

function pushBox(boxes: ImageBox[], args: unknown, ctm: number[], minSidePt: number): void {
  const bbox = unitBox(ctm);
  if (bbox.width < minSidePt || bbox.height < minSidePt) return;
  boxes.push({ name: imageName(args), bbox });
}

/** Walks the operator list tracking the CTM, collecting image boxes ≥ minSidePt. */
export function scanImageBoxes(ops: OperatorList, pdfOps: PdfOps, minSidePt: number): ImageBox[] {
  const boxes: ImageBox[] = [];
  const stack: number[][] = [];
  let ctm = IDENTITY;
  for (let i = 0; i < ops.fnArray.length; i++) {
    ctm = stepCtm(ops.fnArray[i], ops.argsArray[i], pdfOps, ctm, stack);
    if (isImageOp(ops.fnArray[i], pdfOps)) pushBox(boxes, ops.argsArray[i], ctm, minSidePt);
  }
  return boxes;
}

export function isTextItem(item: unknown): item is TextItem {
  const it = item as TextItem;
  return typeof it?.str === 'string' && Array.isArray(it?.transform);
}

// pdfjs emits "QUESTÃO 91" as several glyph items on one baseline, so we cluster
// items by column + rounded y before matching the marker.
function lineKey(item: TextItem, width: number): number {
  const column = item.transform[4] < width / 2 ? 0 : 1;
  return column * 100_000 + Math.round(item.transform[5]);
}

function groupLines(items: TextItem[], width: number): Map<number, TextItem[]> {
  const lines = new Map<number, TextItem[]>();
  for (const item of items) {
    const key = lineKey(item, width);
    const bucket = lines.get(key) ?? [];
    bucket.push(item);
    lines.set(key, bucket);
  }
  return lines;
}

function markerFromLine(items: TextItem[]): QuestionMarker | null {
  const sorted = [...items].sort((a, b) => a.transform[4] - b.transform[4]);
  const match = MARKER.exec(sorted.map((i) => i.str).join(''));
  if (!match) return null;
  return { numero: Number(match[1]), x: sorted[0].transform[4], y: sorted[0].transform[5] };
}

/** Extracts the "QUESTÃO N" markers with their position on the page. */
export function collectMarkers(items: TextItem[], width: number): QuestionMarker[] {
  return [...groupLines(items, width).values()]
    .map(markerFromLine)
    .filter((m): m is QuestionMarker => m !== null);
}

function altFromLine(items: TextItem[]): AlternativeMarker | null {
  const sorted = [...items].sort((a, b) => a.transform[4] - b.transform[4]);
  const match = ALT_MARKER.exec(
    sorted
      .map((i) => i.str)
      .join('')
      .trim(),
  );
  if (!match) return null;
  return { letra: match[1], x: sorted[0].transform[4], y: sorted[0].transform[5] };
}

/** Extracts lone alternative-letter markers (A–E) with their position. */
export function collectAlternativeMarkers(items: TextItem[], width: number): AlternativeMarker[] {
  return [...groupLines(items, width).values()]
    .map(altFromLine)
    .filter((m): m is AlternativeMarker => m !== null);
}

function rgbToRgba(img: PdfImage): Buffer {
  const out = Buffer.alloc(img.width * img.height * 4);
  const src = img.data;
  for (let i = 0, j = 0; i + 2 < src.length; i += 3, j += 4) {
    out[j] = src[i];
    out[j + 1] = src[i + 1];
    out[j + 2] = src[i + 2];
    out[j + 3] = 255;
  }
  return out;
}

function toRgba(img: PdfImage): Buffer | null {
  if (img.kind === RGBA_32BPP) return Buffer.from(img.data);
  if (img.kind === RGB_24BPP) return rgbToRgba(img);
  return null;
}

/** Encodes a decoded pdfjs image to PNG bytes, or null for an unsupported kind. */
export function imageToPng(img: PdfImage): Buffer | null {
  const rgba = toRgba(img);
  if (!rgba) return null;
  const png = new PNG({ width: img.width, height: img.height });
  rgba.copy(png.data);
  return PNG.sync.write(png);
}
