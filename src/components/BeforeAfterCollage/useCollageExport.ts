"use client";

import { useCallback } from "react";
import { loadHtmlImage } from "./utils";
import type { CollageExportFormat, HeaderFontWeight } from "./types";
import { buildHeaderFont } from "./types";

const EXPORT_IMAGE_HEIGHT = 400;
const PANEL_GAP = 16;
const FOOTER_FONT = "24px system-ui, sans-serif";
const SUBTEXT_FONT = "bold 18px system-ui, sans-serif";
const HEADER_TOP_PADDING = 40;
const FOOTER_BOTTOM_PADDING = 40;
const SUBTEXT_GAP = 12;
const SECTION_GAP = 24;

export interface CollageExportParams {
  beforeSnapshot: string;
  afterSnapshot: string;
  beforeSubtext: string;
  afterSubtext: string;
  headerText: string;
  headerFontSize: number;
  headerFontWeight: HeaderFontWeight;
  footerText: string;
  backgroundColor: string;
  textColor: string;
  format: CollageExportFormat;
  quality?: number;
}

function getFontSizePx(font: string): number {
  const match = font.match(/(\d+(?:\.\d+)?)px/);
  return match ? Number(match[1]) : 16;
}

function measureTextHeight(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: string,
  maxWidth: number
): number {
  if (!text.trim()) return 0;
  ctx.font = font;
  const lines = wrapText(ctx, text, maxWidth);
  const lineHeight = getFontSizePx(font) * 1.4;
  return lines.length * lineHeight;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function drawCenteredText(
  ctx: CanvasRenderingContext2D,
  text: string,
  y: number,
  centerX: number,
  canvasWidth: number,
  font: string,
  color: string,
  maxWidth: number
) {
  if (!text.trim()) return y;
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const lines = wrapText(ctx, text, maxWidth);
  const lineHeight = getFontSizePx(font) * 1.4;
  let offsetY = y;
  for (const line of lines) {
    ctx.fillText(line, centerX, offsetY);
    offsetY += lineHeight;
  }
  return offsetY;
}

function normalizedWidth(img: HTMLImageElement, targetHeight: number) {
  if (!img.naturalHeight) return targetHeight;
  return (img.naturalWidth / img.naturalHeight) * targetHeight;
}

function subtextBandHeight(
  ctx: CanvasRenderingContext2D,
  beforeSubtext: string,
  afterSubtext: string,
  beforeW: number,
  afterW: number
): number {
  const beforeH = measureTextHeight(ctx, beforeSubtext, SUBTEXT_FONT, beforeW);
  const afterH = measureTextHeight(ctx, afterSubtext, SUBTEXT_FONT, afterW);
  const maxH = Math.max(beforeH, afterH);
  return maxH > 0 ? SUBTEXT_GAP + maxH : 0;
}

async function buildCollageCanvas(params: CollageExportParams): Promise<HTMLCanvasElement> {
  const {
    beforeSnapshot,
    afterSnapshot,
    beforeSubtext,
    afterSubtext,
    headerText,
    headerFontSize,
    headerFontWeight,
    footerText,
    backgroundColor,
    textColor,
  } = params;

  const [beforeImg, afterImg] = await Promise.all([
    loadHtmlImage(beforeSnapshot),
    loadHtmlImage(afterSnapshot),
  ]);

  const beforeW = normalizedWidth(beforeImg, EXPORT_IMAGE_HEIGHT);
  const afterW = normalizedWidth(afterImg, EXPORT_IMAGE_HEIGHT);
  const imagesWidth = beforeW + PANEL_GAP + afterW;

  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d");
  if (!measureCtx) throw new Error("Canvas not supported");

  const maxTextWidth = Math.max(imagesWidth, 600);
  const hasHeader = headerText.trim().length > 0;
  const hasFooter = footerText.trim().length > 0;
  const subtextHeight = subtextBandHeight(
    measureCtx,
    beforeSubtext,
    afterSubtext,
    beforeW,
    afterW
  );

  const headerFont = buildHeaderFont(headerFontSize, headerFontWeight);

  let height = 0;
  if (hasHeader) {
    height += HEADER_TOP_PADDING;
    height += measureTextHeight(measureCtx, headerText, headerFont, maxTextWidth);
    height += SECTION_GAP;
  }

  height += EXPORT_IMAGE_HEIGHT;
  height += subtextHeight;

  if (hasFooter) {
    if (subtextHeight > 0 || hasHeader) height += SECTION_GAP;
    height += measureTextHeight(measureCtx, footerText, FOOTER_FONT, maxTextWidth);
    height += FOOTER_BOTTOM_PADDING;
  } else if (subtextHeight > 0) {
    height += SECTION_GAP;
  }

  const canvasWidth = Math.ceil(Math.max(imagesWidth + 80, maxTextWidth + 80));
  const canvasHeight = Math.ceil(height);

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  let y = 0;
  if (hasHeader) {
    y += HEADER_TOP_PADDING;
    y = drawCenteredText(
      ctx,
      headerText,
      y,
      canvasWidth / 2,
      canvasWidth,
      headerFont,
      textColor,
      maxTextWidth
    );
    y += SECTION_GAP;
  }

  const imagesStartX = (canvasWidth - imagesWidth) / 2;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const drawPanel = (img: HTMLImageElement, x: number) => {
    const w = normalizedWidth(img, EXPORT_IMAGE_HEIGHT);
    if (img.naturalWidth < 200 || img.naturalHeight < 200) {
      ctx.imageSmoothingQuality = "high";
    }
    ctx.drawImage(img, x, y, w, EXPORT_IMAGE_HEIGHT);
    return w;
  };

  const beforeDrawnW = drawPanel(beforeImg, imagesStartX);
  const afterDrawnW = drawPanel(afterImg, imagesStartX + beforeDrawnW + PANEL_GAP);

  if (subtextHeight > 0) {
    y += EXPORT_IMAGE_HEIGHT + SUBTEXT_GAP;
    const subtextEndY = Math.max(
      drawCenteredText(
        ctx,
        beforeSubtext,
        y,
        imagesStartX + beforeDrawnW / 2,
        canvasWidth,
        SUBTEXT_FONT,
        textColor,
        beforeDrawnW
      ),
      drawCenteredText(
        ctx,
        afterSubtext,
        y,
        imagesStartX + beforeDrawnW + PANEL_GAP + afterDrawnW / 2,
        canvasWidth,
        SUBTEXT_FONT,
        textColor,
        afterDrawnW
      )
    );
    y = subtextEndY;
  } else {
    y += EXPORT_IMAGE_HEIGHT;
  }

  if (hasFooter) {
    y += SECTION_GAP;
    drawCenteredText(
      ctx,
      footerText,
      y,
      canvasWidth / 2,
      canvasWidth,
      FOOTER_FONT,
      textColor,
      maxTextWidth
    );
  }

  return canvas;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        try {
          resolve(dataUrlToBlob(canvas.toDataURL(mime, quality)));
        } catch (err) {
          reject(err instanceof Error ? err : new Error("Failed to export collage"));
        }
      },
      mime,
      quality
    );
  });
}

export function useCollageExport() {
  const exportCollage = useCallback(async (params: CollageExportParams) => {
    const canvas = await buildCollageCanvas(params);
    const { format, quality = 0.92 } = params;
    const mime = format === "png" ? "image/png" : "image/jpeg";
    const filename = format === "png" ? "collage.png" : "collage.jpg";

    const blob = await canvasToBlob(canvas, mime, format === "jpg" ? quality : undefined);
    triggerDownload(blob, filename);
  }, []);

  return { exportCollage };
}
