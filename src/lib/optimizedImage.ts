// Uebungsbilder ueber die Vercel-Bildoptimierung verkleinert ausliefern statt
// das Original aus dem Supabase-Storage zu laden (spart Supabase-Egress).
// Erlaubte Breiten: next.config images.imageSizes/deviceSizes; Qualitaet 75 = Default.
const ALLOWED_WIDTHS = [96, 128, 256, 384, 640, 828, 1200] as const;

export function optimizedImage(url: string, width: (typeof ALLOWED_WIDTHS)[number]): string {
  if (!url.includes(".supabase.co/storage/v1/object/public/")) return url;
  return `/_next/image?url=${encodeURIComponent(url)}&w=${width}&q=75`;
}
