"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getCroppedImg } from "./utils";

interface CropModalProps {
  open: boolean;
  imageSrc: string;
  onConfirm: (croppedDataUrl: string) => void;
  onCancel: () => void;
}

export function CropModal({ open, imageSrc, onConfirm, onCancel }: CropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [applying, setApplying] = useState(false);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleApply = useCallback(async () => {
    if (!croppedAreaPixels) {
      toast.error("Crop area not ready yet. Adjust the crop slightly and try again.");
      return;
    }
    setApplying(true);
    try {
      const dataUrl = await getCroppedImg(imageSrc, croppedAreaPixels);
      onConfirm(dataUrl);
    } catch {
      toast.error("Failed to crop image. Try uploading the file again.");
    } finally {
      setApplying(false);
    }
  }, [croppedAreaPixels, imageSrc, onConfirm]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Crop image</DialogTitle>
        </DialogHeader>
        <div className="relative h-72 w-full overflow-hidden rounded-lg bg-muted">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={undefined}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-muted-foreground shrink-0">Zoom</label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full"
          />
        </div>
        <DialogFooter className="border-t-0 bg-transparent p-0">
          <Button type="button" variant="base-outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="brand"
            onClick={() => void handleApply()}
            disabled={applying || !croppedAreaPixels}
          >
            {applying ? "Applying…" : "Apply Crop"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
