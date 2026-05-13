"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Stage, Layer, Image as KonvaImage, Rect, Transformer, Group } from "react-konva";
import type Konva from "konva";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_RECT,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  type EditorRect,
  type KonvaEditorHandle,
} from "./types";
import { computeCoverFit } from "./utils";

interface KonvaEditorProps {
  imageSrc: string;
  rects: EditorRect[];
  onRectsChange: (rects: EditorRect[]) => void;
  onChange?: () => void;
}

export const KonvaEditor = forwardRef<KonvaEditorHandle, KonvaEditorProps>(
  function KonvaEditor({ imageSrc, rects, onRectsChange, onChange }, ref) {
    const stageRef = useRef<Konva.Stage>(null);
    const transformerRef = useRef<Konva.Transformer>(null);
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [fillColor, setFillColor] = useState(DEFAULT_RECT.fill);
    const [opacityPercent, setOpacityPercent] = useState(Math.round(DEFAULT_RECT.opacity * 100));

    useEffect(() => {
      const img = new window.Image();
      img.onload = () => setImage(img);
      img.src = imageSrc;
    }, [imageSrc]);

    useEffect(() => {
      const tr = transformerRef.current;
      const stage = stageRef.current;
      if (!tr || !stage) return;
      const node = selectedId
        ? stage.findOne((n: Konva.Node) => n.id() === selectedId)
        : null;
      if (node) {
        tr.nodes([node]);
      } else {
        tr.nodes([]);
      }
      tr.getLayer()?.batchDraw();
    }, [selectedId, rects]);

    useImperativeHandle(ref, () => ({
      getStageSnapshot(pixelRatio = 2) {
        const stage = stageRef.current;
        const tr = transformerRef.current;
        if (!stage) return null;
        const prevVisible = tr?.visible();
        if (tr) {
          tr.visible(false);
          tr.getLayer()?.batchDraw();
        }
        const dataUrl = stage.toDataURL({ pixelRatio });
        if (tr && prevVisible !== undefined) {
          tr.visible(prevVisible);
          tr.getLayer()?.batchDraw();
        }
        return dataUrl;
      },
    }));

    const notifyChange = useCallback(() => {
      onChange?.();
    }, [onChange]);

    const updateRects = useCallback(
      (next: EditorRect[]) => {
        onRectsChange(next);
        notifyChange();
      },
      [onRectsChange, notifyChange]
    );

    const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (e.target === e.target.getStage()) {
        setSelectedId(null);
      }
    }, []);

    const handleSelectRect = useCallback(
      (id: string) => {
        setSelectedId(id);
        const rect = rects.find((r) => r.id === id);
        if (rect) {
          setFillColor(rect.fill);
          setOpacityPercent(Math.round(rect.opacity * 100));
        }
      },
      [rects]
    );

    const handleRectDragEnd = useCallback(
      (id: string, e: Konva.KonvaEventObject<DragEvent>) => {
        const node = e.target;
        updateRects(
          rects.map((r) =>
            r.id === id ? { ...r, x: node.x(), y: node.y() } : r
          )
        );
      },
      [rects, updateRects]
    );

    const handleRectTransformEnd = useCallback(
      (id: string, e: Konva.KonvaEventObject<Event>) => {
        const node = e.target as Konva.Rect;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        updateRects(
          rects.map((r) =>
            r.id === id
              ? {
                  ...r,
                  x: node.x(),
                  y: node.y(),
                  width: Math.max(10, node.width() * scaleX),
                  height: Math.max(10, node.height() * scaleY),
                  rotation: node.rotation(),
                }
              : r
          )
        );
      },
      [rects, updateRects]
    );

    const handleAddRect = useCallback(() => {
      const id = `rect-${crypto.randomUUID()}`;
      const next = [...rects, { ...DEFAULT_RECT, id }];
      updateRects(next);
      setSelectedId(id);
      setFillColor(DEFAULT_RECT.fill);
      setOpacityPercent(Math.round(DEFAULT_RECT.opacity * 100));
    }, [rects, updateRects]);

    const handleDeleteSelected = useCallback(() => {
      if (!selectedId) return;
      updateRects(rects.filter((r) => r.id !== selectedId));
      setSelectedId(null);
    }, [rects, selectedId, updateRects]);

    const handleFillChange = useCallback(
      (color: string) => {
        setFillColor(color);
        if (!selectedId) return;
        updateRects(rects.map((r) => (r.id === selectedId ? { ...r, fill: color } : r)));
      },
      [rects, selectedId, updateRects]
    );

    const handleOpacityChange = useCallback(
      (percent: number) => {
        setOpacityPercent(percent);
        if (!selectedId) return;
        updateRects(
          rects.map((r) => (r.id === selectedId ? { ...r, opacity: percent / 100 } : r))
        );
      },
      [rects, selectedId, updateRects]
    );

    const cover = image
      ? computeCoverFit(image.naturalWidth, image.naturalHeight, STAGE_WIDTH, STAGE_HEIGHT)
      : null;

    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="base-outline" size="sm" onClick={handleAddRect}>
            Add Rectangle
          </Button>
          <div className="flex items-center gap-2">
            <Label htmlFor={`fill-${imageSrc.slice(-8)}`} className="text-xs text-muted-foreground">
              Color
            </Label>
            <input
              id={`fill-${imageSrc.slice(-8)}`}
              type="color"
              value={fillColor}
              onChange={(e) => handleFillChange(e.target.value)}
              disabled={!selectedId}
              className="h-8 w-10 cursor-pointer rounded border border-border bg-background disabled:opacity-50"
            />
          </div>
          <div className="flex min-w-[140px] flex-1 items-center gap-2">
            <Label className="text-xs text-muted-foreground shrink-0">Opacity</Label>
            <input
              type="range"
              min={0}
              max={100}
              value={opacityPercent}
              onChange={(e) => handleOpacityChange(Number(e.target.value))}
              disabled={!selectedId}
              className="w-full disabled:opacity-50"
            />
            <span className="text-xs text-muted-foreground w-8">{opacityPercent}%</span>
          </div>
          <Button
            type="button"
            variant="base-outline"
            size="sm"
            onClick={handleDeleteSelected}
            disabled={!selectedId}
          >
            Delete Selected
          </Button>
        </div>
        <div className="overflow-hidden rounded-lg border border-border">
          <Stage
            ref={stageRef}
            width={STAGE_WIDTH}
            height={STAGE_HEIGHT}
            onMouseDown={handleStageClick}
            onTouchStart={handleStageClick}
          >
            <Layer>
              <Group
                clipX={0}
                clipY={0}
                clipWidth={STAGE_WIDTH}
                clipHeight={STAGE_HEIGHT}
              >
                {image && cover && (
                  <KonvaImage
                    image={image}
                    x={cover.x}
                    y={cover.y}
                    width={cover.width}
                    height={cover.height}
                  />
                )}
                {rects.map((rect) => (
                  <Rect
                    key={rect.id}
                    id={rect.id}
                    x={rect.x}
                    y={rect.y}
                    width={rect.width}
                    height={rect.height}
                    rotation={rect.rotation}
                    fill={rect.fill}
                    opacity={rect.opacity}
                    draggable
                    onClick={() => handleSelectRect(rect.id)}
                    onTap={() => handleSelectRect(rect.id)}
                    onDragEnd={(e) => handleRectDragEnd(rect.id, e)}
                    onTransformEnd={(e) => handleRectTransformEnd(rect.id, e)}
                  />
                ))}
              </Group>
              <Transformer
                ref={transformerRef}
                rotateEnabled
                boundBoxFunc={(oldBox, newBox) => {
                  if (newBox.width < 10 || newBox.height < 10) return oldBox;
                  return newBox;
                }}
              />
            </Layer>
          </Stage>
        </div>
      </div>
    );
  }
);

KonvaEditor.displayName = "KonvaEditor";
