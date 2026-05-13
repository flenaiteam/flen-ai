"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { AlertCircle, Upload } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CropModal } from "./CropModal";
import { KonvaEditor } from "./KonvaEditor";
import type { KonvaEditorHandle, PanelSide, PanelState } from "./types";
import { loadImageFromUrl, revokeIfBlobUrl } from "./utils";

interface ImagePanelProps {
  side: PanelSide;
  label: string;
  state: PanelState;
  onStateChange: (state: PanelState) => void;
  onEditorReady: (side: PanelSide, editor: KonvaEditorHandle | null) => void;
  onChange?: () => void;
}

export function ImagePanel({
  side,
  label,
  state,
  onStateChange,
  onEditorReady,
  onChange,
}: ImagePanelProps) {
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [changeConfirmOpen, setChangeConfirmOpen] = useState(false);
  const editorRef = useRef<KonvaEditorHandle>(null);

  useEffect(() => {
    if (state.step !== "edit") {
      onEditorReady(side, null);
      return;
    }
    const frame = requestAnimationFrame(() => {
      onEditorReady(side, editorRef.current);
    });
    return () => cancelAnimationFrame(frame);
  }, [onEditorReady, side, state.croppedDataUrl, state.step]);

  const resetToSource = useCallback(() => {
    revokeIfBlobUrl(state.sourceBlobUrl);
    onStateChange({ step: "source", rects: [] });
    onEditorReady(side, null);
    setUrlInput("");
    setUrlError(null);
    onChange?.();
  }, [onChange, onEditorReady, onStateChange, side, state.sourceBlobUrl]);

  const onDrop = useCallback(
    (accepted: File[]) => {
      const file = accepted[0];
      if (!file) return;
      revokeIfBlobUrl(state.sourceBlobUrl);
      const blobUrl = URL.createObjectURL(file);
      onStateChange({
        step: "crop",
        sourceBlobUrl: blobUrl,
        filename: file.name,
        rects: [],
      });
      onChange?.();
    },
    [onChange, onStateChange, state.sourceBlobUrl]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: false,
  });

  const handleLoadUrl = useCallback(async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    setUrlError(null);
    setLoadingUrl(true);
    try {
      const { dataUrl, filename } = await loadImageFromUrl(trimmed);
      revokeIfBlobUrl(state.sourceBlobUrl);
      onStateChange({
        step: "crop",
        sourceBlobUrl: dataUrl,
        filename,
        rects: [],
      });
      onChange?.();
    } catch {
      setUrlError(
        "This image URL blocked cross-origin access. Try downloading and uploading instead."
      );
    } finally {
      setLoadingUrl(false);
    }
  }, [onChange, onStateChange, state.sourceBlobUrl, urlInput]);

  const handleCropConfirm = useCallback(
    (croppedDataUrl: string) => {
      onStateChange({
        ...state,
        step: "edit",
        croppedDataUrl,
        rects: [],
      });
      onChange?.();
    },
    [onChange, onStateChange, state]
  );

  const handleCropCancel = useCallback(() => {
    resetToSource();
  }, [resetToSource]);

  const handleRectsChange = useCallback(
    (rects: PanelState["rects"]) => {
      onStateChange({ ...state, rects });
    },
    [onStateChange, state]
  );

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/70 bg-background/90 p-4">
      <h3 className="text-sm font-semibold text-foreground">{label}</h3>

      {state.step === "source" && (
        <div className="flex flex-col gap-4">
          <div
            {...getRootProps()}
            className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 px-4 py-8 text-center transition-colors hover:border-brand-500 hover:bg-muted/50"
          >
            <input {...getInputProps()} />
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {isDragActive ? "Drop image here…" : "Drag & drop an image, or click to upload"}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`url-${side}`}>Or paste image URL</Label>
            <div className="flex gap-2">
              <Input
                id={`url-${side}`}
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/image.jpg"
                onKeyDown={(e) => e.key === "Enter" && void handleLoadUrl()}
              />
              <Button
                type="button"
                variant="brand"
                onClick={() => void handleLoadUrl()}
                disabled={loadingUrl || !urlInput.trim()}
              >
                {loadingUrl ? "Loading…" : "Load"}
              </Button>
            </div>
            {urlError && (
              <Alert variant="error">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{urlError}</AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      )}

      {state.step === "crop" && state.sourceBlobUrl && (
        <CropModal
          open
          imageSrc={state.sourceBlobUrl}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}

      {state.step === "edit" && state.croppedDataUrl && (
        <div className="flex flex-col gap-3">
          <KonvaEditor
            ref={editorRef}
            imageSrc={state.croppedDataUrl}
            rects={state.rects}
            onRectsChange={handleRectsChange}
            onChange={onChange}
          />
          <Button
            type="button"
            variant="base-outline"
            size="sm"
            className="self-start"
            onClick={() => setChangeConfirmOpen(true)}
          >
            Change Image
          </Button>
        </div>
      )}

      <ConfirmAlertDialog
        open={changeConfirmOpen}
        onOpenChange={setChangeConfirmOpen}
        title="Change image?"
        description="Changing the image will remove your rectangles. Continue?"
        cancelLabel="Cancel"
        confirmLabel="Continue"
        confirmVariant="brand"
        onConfirm={resetToSource}
      />
    </div>
  );
}
