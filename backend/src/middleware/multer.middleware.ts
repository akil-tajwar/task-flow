// lib/multer.ts
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomInt } from "crypto";
import type { Context, Next } from "hono";
import type { Request, Response, NextFunction } from "express";

const uploadPath = path.join(process.cwd(), "uploads", "comments");
fs.mkdirSync(uploadPath, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadPath),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${randomInt(1000, 999999)}`;
    cb(null, `${unique}${ext}`);
  },
});

export const commentUpload = multer({
  storage,
  limits: { files: 10, fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "application/zip",
    ];
    if (!allowed.includes(file.mimetype)) {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
      return;
    }
    cb(null, true);
  },
});

export function runMulter(
  middleware: (req: Request, res: Response, next: NextFunction) => void,
) {
  return async (c: Context, next: Next) => {
    await new Promise<void>((resolve, reject) => {
      middleware(
        c.req.raw as unknown as Request,
        c.res as unknown as Response,
        (error?: unknown) => (error ? reject(error) : resolve()),
      );
    });
    await next();
  };
}
