import multer from "multer";
import path from "path";
import fs from "fs";
import { Context, Next } from "hono";

const uploadPath = path.join(process.cwd(), "uploads", "comments");

fs.mkdirSync(uploadPath, {
  recursive: true,
});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadPath);
  },

  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname);

    const filename = `${crypto.randomUUID()}${extension}`;

    cb(null, filename);
  },
});

export const commentUpload = multer({
  storage,

  limits: {
    files: 10,
    fileSize: 10 * 1024 * 1024,
  },

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

export function multerMiddleware(middleware: any) {
  return async (c: Context, next: Next) => {
    await new Promise<void>((resolve, reject) => {
      middleware(
        c.req.raw as unknown as Request,
        c.res as unknown as Response,
        (error: unknown) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        },
      );
    });

    await next();
  };
}
