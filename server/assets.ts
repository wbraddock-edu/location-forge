import fs from "fs";
import path from "path";
import crypto from "crypto";

const VOLUME_ROOT = process.env.RAILWAY_VOLUME_MOUNT_PATH || ".";
export const ASSETS_ROOT = path.join(VOLUME_ROOT, "project-assets");
export const BACKUPS_ROOT = path.join(VOLUME_ROOT, "project-asset-backups");

fs.mkdirSync(ASSETS_ROOT, { recursive: true });
fs.mkdirSync(BACKUPS_ROOT, { recursive: true });

export interface ImageAssetRef {
  kind: "asset";
  url: string;
  path: string;
  bytes: number;
  mime: string;
  migratedAt: string;
  prompt?: string;
  title?: string;
  category?: string;
  provider?: string;
  model?: string;
}

export function isAssetRef(val: unknown): val is ImageAssetRef {
  return !!val && typeof val === "object" && (val as any).kind === "asset" && typeof (val as any).url === "string";
}

export function projectDir(projectId: number): string {
  const dir = path.join(ASSETS_ROOT, String(projectId));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Resolve and validate a filename inside a project dir. Prevents path traversal.
export function safeAssetPath(projectId: number, filename: string): string | null {
  if (!/^[A-Za-z0-9._-]+$/.test(filename)) return null;
  if (filename.includes("..")) return null;
  const dir = path.join(ASSETS_ROOT, String(projectId));
  const full = path.normalize(path.join(dir, filename));
  const dirAbs = path.resolve(dir) + path.sep;
  const fullAbs = path.resolve(full);
  if (!fullAbs.startsWith(dirAbs)) return null;
  return full;
}

export function writeImageToDisk(
  projectId: number,
  base64: string,
  mime = "image/png",
): { file: string; bytes: number; url: string; absPath: string } {
  const ext = mime.includes("jpeg") ? "jpg" : mime.includes("webp") ? "webp" : "png";
  const name = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
  const dir = projectDir(projectId);
  const full = path.join(dir, name);
  const buf = Buffer.from(base64, "base64");
  fs.writeFileSync(full, buf);
  const stat = fs.statSync(full);
  if (stat.size <= 0) {
    try { fs.unlinkSync(full); } catch {}
    throw new Error("Wrote image but file size is zero");
  }
  return {
    file: name,
    bytes: stat.size,
    url: `/api/project-assets/${projectId}/${name}`,
    absPath: full,
  };
}

export function writeBackup(projectId: number, payload: unknown): string {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(BACKUPS_ROOT, `project-${projectId}-${ts}.json`);
  fs.writeFileSync(file, JSON.stringify(payload));
  const stat = fs.statSync(file);
  if (stat.size <= 0) throw new Error("Backup write produced zero bytes");
  return file;
}
