export type PanelSide = "before" | "after";

export type PanelStep = "source" | "crop" | "edit";

export interface EditorRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: string;
  opacity: number;
}

export interface PanelState {
  step: PanelStep;
  sourceBlobUrl?: string;
  croppedDataUrl?: string;
  filename?: string;
  rects: EditorRect[];
}

export type CollageExportFormat = "png" | "jpg";

export interface KonvaEditorHandle {
  getStageSnapshot(pixelRatio?: number): string | null;
}

export const STAGE_WIDTH = 500;
export const STAGE_HEIGHT = 400;

export const DEFAULT_COLLAGE_BG = "#ffffff";
export const DEFAULT_COLLAGE_TEXT = "#111111";
export const DEFAULT_HEADER_FONT_SIZE = 24;

export type HeaderFontWeight = "bold" | "regular";

export function buildHeaderFont(size: number, weight: HeaderFontWeight): string {
  return `${weight === "bold" ? "bold" : "normal"} ${size}px system-ui, sans-serif`;
}

export const DEFAULT_RECT: Omit<EditorRect, "id"> = {
  x: (STAGE_WIDTH - 120) / 2,
  y: (STAGE_HEIGHT - 60) / 2,
  width: 120,
  height: 60,
  rotation: 0,
  fill: "#000000",
  opacity: 0.85,
};

export function createInitialPanelState(): PanelState {
  return { step: "source", rects: [] };
}
