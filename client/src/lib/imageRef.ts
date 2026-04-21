// Hybrid image value helpers.
//
// `visualImages[key]` may be either:
//   - a raw base64 string (legacy, embedded in project state), or
//   - an asset reference object: { kind: "asset", url: "/api/project-assets/<proj>/<file>", ... }
//
// After the limited migration test, both must continue to render and download.

import { getSessionToken } from "./queryClient";

export interface ImageAssetRef {
  kind: "asset";
  url: string;
  bytes?: number;
  mime?: string;
  migratedAt?: string;
  title?: string;
  category?: string;
  prompt?: string;
  provider?: string;
  model?: string;
}

export type ImageValue = string | ImageAssetRef | null | undefined;

export function isAssetRef(v: unknown): v is ImageAssetRef {
  return !!v && typeof v === "object" && (v as any).kind === "asset" && typeof (v as any).url === "string";
}

// Produce a URL suitable for an <img src> attribute. For asset refs we append
// the current session token as a query param so the server's auth middleware
// accepts the request (since <img> cannot set headers).
export function imageSrc(v: ImageValue): string {
  if (!v) return "";
  if (typeof v === "string") {
    if (v.startsWith("data:")) return v;
    return `data:image/png;base64,${v}`;
  }
  if (isAssetRef(v)) {
    const token = getSessionToken();
    if (!token) return v.url;
    const sep = v.url.includes("?") ? "&" : "?";
    return `${v.url}${sep}token=${encodeURIComponent(token)}`;
  }
  return "";
}

// True when the value actually carries an image.
export function hasImage(v: ImageValue): boolean {
  if (!v) return false;
  if (typeof v === "string") return v.length > 0;
  return isAssetRef(v);
}

// Fetch the raw bytes as a Blob so the browser can download or re-use them.
// For base64 strings this is synchronous in spirit; for refs we fetch with
// the session token.
export async function imageBlob(v: ImageValue): Promise<Blob | null> {
  if (!v) return null;
  if (typeof v === "string") {
    const b64 = v.startsWith("data:") ? v.split(",")[1] : v;
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: "image/png" });
  }
  if (isAssetRef(v)) {
    const token = getSessionToken();
    const headers: Record<string, string> = {};
    if (token) headers["X-Session-Id"] = token;
    const res = await fetch(v.url, { headers, credentials: "include" });
    if (!res.ok) return null;
    return await res.blob();
  }
  return null;
}

// Download a single image, covering both shapes.
export async function downloadImage(v: ImageValue, filename: string): Promise<void> {
  const blob = await imageBlob(v);
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Extract a base64 string for callers that still need one (e.g. sending an
// image as a reference for further generation). Returns null for asset refs
// (they cannot be synchronously converted); callers can fall back or fetch.
export function tryBase64(v: ImageValue): string | null {
  if (typeof v === "string") {
    return v.startsWith("data:") ? v.split(",")[1] ?? null : v;
  }
  return null;
}

// Async variant: fetches the asset and returns base64 without the data: prefix.
export async function toBase64Async(v: ImageValue): Promise<string | null> {
  const direct = tryBase64(v);
  if (direct) return direct;
  const blob = await imageBlob(v);
  if (!blob) return null;
  const buf = await blob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
  }
  return btoa(binary);
}
