import { describe, it, expect } from 'vitest';
import {
  collectMarkers,
  imageToPng,
  scanImageBoxes,
  type OperatorList,
  type PdfImage,
  type PdfOps,
  type TextItem,
} from './pdf-figure-scan';

// Fake op codes — scanImageBoxes only compares against the PdfOps it receives.
const OPS: PdfOps = {
  save: 1,
  restore: 2,
  transform: 3,
  paintImageXObject: 4,
  paintImageXObjectRepeat: 5,
  paintInlineImageXObject: 6,
};

// A CTM that maps the unit square to a box at (x, y) of size (w, h).
function place(x: number, y: number, w: number, h: number): number[] {
  return [w, 0, 0, h, x, y];
}

describe('scanImageBoxes', () => {
  it('locates an image box from the CTM, in PDF user space', () => {
    const ops: OperatorList = {
      fnArray: [OPS.transform, OPS.paintImageXObject],
      argsArray: [place(100, 200, 50, 40), ['img1']],
    };
    expect(scanImageBoxes(ops, OPS, 40)).toEqual([
      { name: 'img1', bbox: { x: 100, y: 200, width: 50, height: 40 } },
    ]);
  });

  it('drops images smaller than the minimum side', () => {
    const ops: OperatorList = {
      fnArray: [OPS.transform, OPS.paintImageXObject],
      argsArray: [place(0, 0, 20, 20), ['tiny']],
    };
    expect(scanImageBoxes(ops, OPS, 40)).toEqual([]);
  });

  it('restores the CTM on q/Q, so a restored transform does not leak', () => {
    const ops: OperatorList = {
      fnArray: [OPS.save, OPS.transform, OPS.restore, OPS.paintImageXObject],
      argsArray: [null, place(0, 0, 80, 80), null, ['back']],
    };
    // After restore the CTM is identity → unit box is 1×1 → filtered out.
    expect(scanImageBoxes(ops, OPS, 40)).toEqual([]);
  });
});

describe('collectMarkers', () => {
  const at = (str: string, x: number, y: number): TextItem => ({
    str,
    transform: [1, 0, 0, 1, x, y],
  });

  it('reassembles a "QUESTÃO N" marker split across glyph items', () => {
    const items = [
      at('Q', 65, 692),
      at('UEST', 73, 692),
      at('ã', 96, 692),
      at('O', 103, 692),
      at(' ', 111, 692),
      at('91', 114, 692),
    ];
    expect(collectMarkers(items, 602)).toEqual([{ numero: 91, x: 65, y: 692 }]);
  });

  it('separates two markers sharing a baseline across the two columns', () => {
    const items = [at('QUESTÃO 91', 65, 692), at('QUESTÃO 92', 377, 692)];
    expect(
      collectMarkers(items, 602)
        .map((m) => m.numero)
        .sort(),
    ).toEqual([91, 92]);
  });

  it('ignores lines without a marker', () => {
    expect(collectMarkers([at('Questões de 91 a 135', 70, 714)], 602)).toEqual([]);
  });
});

describe('imageToPng', () => {
  const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  it('encodes a 24bpp RGB image to a PNG', () => {
    const img: PdfImage = {
      width: 2,
      height: 1,
      kind: 2,
      data: new Uint8Array([255, 0, 0, 0, 255, 0]),
    };
    const png = imageToPng(img);
    expect(png?.subarray(0, 8)).toEqual(PNG_SIGNATURE);
  });

  it('returns null for an unsupported image kind', () => {
    const img: PdfImage = { width: 1, height: 1, kind: 1, data: new Uint8Array([0]) };
    expect(imageToPng(img)).toBeNull();
  });
});
