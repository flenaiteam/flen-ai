import type { Area } from "react-easy-crop";

export function parseFilenameFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    const basename = pathParts[pathParts.length - 1] || "image";
    const label = `${parsed.hostname}/${basename}`;
    return label.length > 30 ? `${label.slice(0, 27)}...` : label;
  } catch {
    const fallback = url.split("/").filter(Boolean).pop() ?? "image";
    return fallback.length > 30 ? `${fallback.slice(0, 27)}...` : fallback;
  }
}

export function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Only set crossOrigin for remote URLs; blob/data URLs break when cors is forced.
    if (url.startsWith("http://") || url.startsWith("https://")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("CORS_BLOCKED"));
    img.src = url;
  });
}

export async function loadImageFromUrl(url: string): Promise<{ dataUrl: string; filename: string }> {
  const img = await createImage(url);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(img, 0, 0);
  return {
    dataUrl: canvas.toDataURL("image/png"),
    filename: parseFilenameFromUrl(url),
  };
}

function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation);
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  const rotRad = getRadianAngle(rotation);
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.naturalWidth,
    image.naturalHeight,
    rotation
  );

  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.naturalWidth / 2, -image.naturalHeight / 2);
  ctx.drawImage(image, 0, 0);

  const croppedCanvas = document.createElement("canvas");
  const croppedCtx = croppedCanvas.getContext("2d");
  if (!croppedCtx) throw new Error("Canvas not supported");

  croppedCanvas.width = pixelCrop.width;
  croppedCanvas.height = pixelCrop.height;
  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return croppedCanvas.toDataURL("image/png");
}

export interface CoverFitDimensions {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function computeCoverFit(
  imgW: number,
  imgH: number,
  stageW: number,
  stageH: number
): CoverFitDimensions {
  const scale = Math.max(stageW / imgW, stageH / imgH);
  const width = imgW * scale;
  const height = imgH * scale;
  return {
    x: (stageW - width) / 2,
    y: (stageH - height) / 2,
    width,
    height,
  };
}

export function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function revokeIfBlobUrl(url?: string) {
  if (url?.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}
