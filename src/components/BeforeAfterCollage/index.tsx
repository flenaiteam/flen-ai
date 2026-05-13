"use client";

import { useCallback, useRef, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CollagePreview } from "./CollagePreview";
import { ImagePanel } from "./ImagePanel";
import {
  createInitialPanelState,
  DEFAULT_COLLAGE_BG,
  DEFAULT_COLLAGE_TEXT,
  DEFAULT_HEADER_FONT_SIZE,
  type CollageExportFormat,
  type HeaderFontWeight,
  type KonvaEditorHandle,
  type PanelSide,
  type PanelState,
} from "./types";
import { useCollageExport } from "./useCollageExport";

export function BeforeAfterCollage() {
  const [headerText, setHeaderText] = useState("");
  const [headerFontSize, setHeaderFontSize] = useState(DEFAULT_HEADER_FONT_SIZE);
  const [headerFontWeight, setHeaderFontWeight] = useState<HeaderFontWeight>("bold");
  const [footerText, setFooterText] = useState("");
  const [beforeSubtext, setBeforeSubtext] = useState("");
  const [afterSubtext, setAfterSubtext] = useState("");
  const [backgroundColor, setBackgroundColor] = useState(DEFAULT_COLLAGE_BG);
  const [textColor, setTextColor] = useState(DEFAULT_COLLAGE_TEXT);
  const [beforeState, setBeforeState] = useState<PanelState>(createInitialPanelState);
  const [afterState, setAfterState] = useState<PanelState>(createInitialPanelState);
  const [exportFormat, setExportFormat] = useState<CollageExportFormat>("png");
  const [previewKey, setPreviewKey] = useState(0);
  const [exporting, setExporting] = useState(false);

  const editorsRef = useRef<Record<PanelSide, KonvaEditorHandle | null>>({
    before: null,
    after: null,
  });
  const [beforeEditor, setBeforeEditor] = useState<KonvaEditorHandle | null>(null);
  const [afterEditor, setAfterEditor] = useState<KonvaEditorHandle | null>(null);

  const { exportCollage } = useCollageExport();

  const bumpPreview = useCallback(() => {
    setPreviewKey((k) => k + 1);
  }, []);

  const handleEditorReady = useCallback(
    (side: PanelSide, editor: KonvaEditorHandle | null) => {
      if (editorsRef.current[side] === editor) return;
      editorsRef.current[side] = editor;
      if (side === "before") setBeforeEditor(editor);
      else setAfterEditor(editor);
      if (editor) bumpPreview();
    },
    [bumpPreview]
  );

  const showPreview =
    beforeState.step === "edit" &&
    afterState.step === "edit" &&
    Boolean(beforeState.croppedDataUrl && afterState.croppedDataUrl);

  const handleDownload = useCallback(async () => {
    const beforeSnapshot = editorsRef.current.before?.getStageSnapshot(2);
    const afterSnapshot = editorsRef.current.after?.getStageSnapshot(2);
    if (!beforeSnapshot || !afterSnapshot) {
      toast.error("Both panels need a confirmed image before downloading.");
      return;
    }
    setExporting(true);
    try {
      await exportCollage({
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
        format: exportFormat,
        quality: 0.92,
      });
    } catch {
      toast.error("Failed to export collage");
    } finally {
      setExporting(false);
    }
  }, [
    afterSubtext,
    backgroundColor,
    beforeSubtext,
    exportCollage,
    exportFormat,
    footerText,
    headerFontSize,
    headerFontWeight,
    headerText,
    textColor,
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="collage-header">Header text</Label>
          <Input
            id="collage-header"
            value={headerText}
            onChange={(e) => {
              setHeaderText(e.target.value);
              bumpPreview();
            }}
            placeholder="Optional header text"
            className="text-center"
          />
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="header-font-size">Header font size</Label>
            <Input
              id="header-font-size"
              type="number"
              min={12}
              max={72}
              value={headerFontSize}
              onChange={(e) => {
                const next = Number(e.target.value);
                if (!Number.isNaN(next)) {
                  setHeaderFontSize(Math.min(72, Math.max(12, next)));
                  bumpPreview();
                }
              }}
              className="w-24"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="header-font-weight">Header weight</Label>
            <Select
              value={headerFontWeight}
              onValueChange={(v) => {
                setHeaderFontWeight(v as HeaderFontWeight);
                bumpPreview();
              }}
            >
              <SelectTrigger id="header-font-weight" className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bold">Bold</SelectItem>
                <SelectItem value="regular">Regular</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <ImagePanel
            side="before"
            label="Before"
            state={beforeState}
            onStateChange={setBeforeState}
            onEditorReady={handleEditorReady}
            onChange={bumpPreview}
          />
          <div className="flex flex-col gap-2">
            <Label htmlFor="before-subtext">Before label</Label>
            <Input
              id="before-subtext"
              value={beforeSubtext}
              onChange={(e) => {
                setBeforeSubtext(e.target.value);
                bumpPreview();
              }}
              placeholder='e.g. Before treatment'
              className="text-center"
            />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <ImagePanel
            side="after"
            label="After"
            state={afterState}
            onStateChange={setAfterState}
            onEditorReady={handleEditorReady}
            onChange={bumpPreview}
          />
          <div className="flex flex-col gap-2">
            <Label htmlFor="after-subtext">After label</Label>
            <Input
              id="after-subtext"
              value={afterSubtext}
              onChange={(e) => {
                setAfterSubtext(e.target.value);
                bumpPreview();
              }}
              placeholder='e.g. New smile'
              className="text-center"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex min-w-[200px] flex-1 flex-col gap-2">
          <Label htmlFor="collage-footer">Footer text</Label>
          <Input
            id="collage-footer"
            value={footerText}
            onChange={(e) => {
              setFooterText(e.target.value);
              bumpPreview();
            }}
            placeholder="Optional footer text"
            className="text-center"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="collage-bg">Background color</Label>
          <div className="flex items-center gap-2">
            <input
              id="collage-bg"
              type="color"
              value={backgroundColor}
              onChange={(e) => {
                setBackgroundColor(e.target.value);
                bumpPreview();
              }}
              className="h-10 w-14 cursor-pointer rounded border border-border bg-background"
            />
            <Input
              value={backgroundColor}
              onChange={(e) => {
                setBackgroundColor(e.target.value);
                bumpPreview();
              }}
              className="w-28 font-mono text-sm"
              maxLength={7}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="collage-text">Text color</Label>
          <div className="flex items-center gap-2">
            <input
              id="collage-text"
              type="color"
              value={textColor}
              onChange={(e) => {
                setTextColor(e.target.value);
                bumpPreview();
              }}
              className="h-10 w-14 cursor-pointer rounded border border-border bg-background"
            />
            <Input
              value={textColor}
              onChange={(e) => {
                setTextColor(e.target.value);
                bumpPreview();
              }}
              className="w-28 font-mono text-sm"
              maxLength={7}
            />
          </div>
        </div>
      </div>

      {showPreview && (
        <CollagePreview
          headerText={headerText}
          headerFontSize={headerFontSize}
          headerFontWeight={headerFontWeight}
          footerText={footerText}
          beforeSubtext={beforeSubtext}
          afterSubtext={afterSubtext}
          backgroundColor={backgroundColor}
          textColor={textColor}
          beforeEditor={beforeEditor}
          afterEditor={afterEditor}
          previewKey={previewKey}
        />
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          type="button"
          variant="brand"
          onClick={() => void handleDownload()}
          disabled={!showPreview || exporting}
        >
          <Download className="mr-2 h-4 w-4" />
          {exporting
            ? "Exporting…"
            : `Download Collage (${exportFormat.toUpperCase()})`}
        </Button>
        <Select
          value={exportFormat}
          onValueChange={(v) => setExportFormat(v as CollageExportFormat)}
        >
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="png">PNG</SelectItem>
            <SelectItem value="jpg">JPG</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
