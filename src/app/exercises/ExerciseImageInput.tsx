"use client";

import { useState, type ChangeEvent } from "react";

const MAX_DIMENSION = 1600;

async function downscale(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85),
  );
  if (!blob) return file;
  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}

// Verkleinert Handyfotos vor dem Hochladen, damit der Request unter dem
// Server-Action-Limit bleibt.
export default function ExerciseImageInput() {
  const [busy, setBusy] = useState(false);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    setBusy(true);
    try {
      const resized = await downscale(file);
      const transfer = new DataTransfer();
      transfer.items.add(resized);
      input.files = transfer.files;
    } catch {
      // Format nicht dekodierbar (z.B. HEIC in manchen Browsern) - Original behalten.
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <input
        id="image"
        name="image"
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="block w-full text-sm"
      />
      {busy && <p className="mt-1 text-xs text-zinc-500">Bild wird verkleinert…</p>}
    </>
  );
}
