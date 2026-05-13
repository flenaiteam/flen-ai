"use client";

import dynamic from "next/dynamic";
import { Spinner } from "@/components/ui/spinner";

const BeforeAfterCollage = dynamic(
  () => import("@/components/BeforeAfterCollage").then((m) => m.BeforeAfterCollage),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[320px] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    ),
  }
);

export default function CollagePage() {
  return (
    <div className="flex flex-col gap-2">
      <div className="p-4">
        <h1 className="text-xl font-semibold text-foreground">Before / After Collage</h1>
        <p className="text-sm text-muted-foreground">
          Upload, crop, and annotate before and after images, then download a combined collage.
        </p>
      </div>
      <BeforeAfterCollage />
    </div>
  );
}
