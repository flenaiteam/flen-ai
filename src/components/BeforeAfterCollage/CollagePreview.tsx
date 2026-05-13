"use client";

import { useEffect, useState } from "react";
import type { HeaderFontWeight, KonvaEditorHandle } from "./types";
import { loadHtmlImage } from "./utils";

const PREVIEW_IMAGE_HEIGHT = 200;

interface CollagePreviewProps {
  headerText: string;
  headerFontSize: number;
  headerFontWeight: HeaderFontWeight;
  footerText: string;
  beforeSubtext: string;
  afterSubtext: string;
  backgroundColor: string;
  textColor: string;
  beforeEditor: KonvaEditorHandle | null;
  afterEditor: KonvaEditorHandle | null;
  previewKey: number;
}

export function CollagePreview({
  headerText,
  headerFontSize,
  headerFontWeight,
  footerText,
  beforeSubtext,
  afterSubtext,
  backgroundColor,
  textColor,
  beforeEditor,
  afterEditor,
  previewKey,
}: CollagePreviewProps) {
  const [beforeSrc, setBeforeSrc] = useState<string | null>(null);
  const [afterSrc, setAfterSrc] = useState<string | null>(null);
  const [beforeWidth, setBeforeWidth] = useState(0);
  const [afterWidth, setAfterWidth] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      const beforeSnapshot = beforeEditor?.getStageSnapshot(1);
      const afterSnapshot = afterEditor?.getStageSnapshot(1);
      if (!beforeSnapshot || !afterSnapshot || cancelled) return;

      Promise.all([loadHtmlImage(beforeSnapshot), loadHtmlImage(afterSnapshot)]).then(
        ([beforeImg, afterImg]) => {
          if (cancelled) return;
          setBeforeSrc(beforeSnapshot);
          setAfterSrc(afterSnapshot);
          setBeforeWidth(
            (beforeImg.naturalWidth / beforeImg.naturalHeight) * PREVIEW_IMAGE_HEIGHT
          );
          setAfterWidth((afterImg.naturalWidth / afterImg.naturalHeight) * PREVIEW_IMAGE_HEIGHT);
        }
      );
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [afterEditor, beforeEditor, previewKey]);

  if (!beforeSrc || !afterSrc) return null;

  const hasHeader = headerText.trim().length > 0;
  const hasFooter = footerText.trim().length > 0;
  const hasBeforeSubtext = beforeSubtext.trim().length > 0;
  const hasAfterSubtext = afterSubtext.trim().length > 0;

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-border/70 p-6">
      <p className="text-sm font-medium text-muted-foreground">Collage preview</p>
      <div
        className="flex w-full flex-col items-center gap-4 rounded-lg px-6 py-8"
        style={{ backgroundColor }}
      >
        {hasHeader && (
          <p
            className="text-center"
            style={{
              color: textColor,
              fontSize: headerFontSize,
              fontWeight: headerFontWeight === "bold" ? 700 : 400,
            }}
          >
            {headerText}
          </p>
        )}
        <div className="flex items-start justify-center gap-4" style={{ maxWidth: "100%" }}>
          <div className="flex flex-col items-center gap-2">
            <img
              src={beforeSrc}
              alt="Before preview"
              className="rounded-md border border-border/50 object-cover"
              style={{ height: PREVIEW_IMAGE_HEIGHT, width: beforeWidth }}
            />
            {hasBeforeSubtext && (
              <p className="text-center text-sm font-semibold" style={{ color: textColor }}>
                {beforeSubtext}
              </p>
            )}
          </div>
          <div className="flex flex-col items-center gap-2">
            <img
              src={afterSrc}
              alt="After preview"
              className="rounded-md border border-border/50 object-cover"
              style={{ height: PREVIEW_IMAGE_HEIGHT, width: afterWidth }}
            />
            {hasAfterSubtext && (
              <p className="text-center text-sm font-semibold" style={{ color: textColor }}>
                {afterSubtext}
              </p>
            )}
          </div>
        </div>
        {hasFooter && (
          <p className="text-center text-lg" style={{ color: textColor }}>
            {footerText}
          </p>
        )}
      </div>
    </div>
  );
}
