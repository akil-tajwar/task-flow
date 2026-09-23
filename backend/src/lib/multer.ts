import type { Context } from "hono";
import type { Next } from "hono";
import type { Request, Response, NextFunction } from "express";

export function runMulter(
  middleware: (req: Request, res: Response, next: NextFunction) => void,
) {
  return async (c: Context, next: Next) => {
    await new Promise<void>((resolve, reject) => {
      middleware(
        c.req.raw as unknown as Request,
        c.res as unknown as Response,
        (error?: unknown) => {
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

export function multerMiddleware(
  middleware: any,
) {
  return async (
    c: Context,
    next: Next,
  ) => {
    await new Promise<void>(
      (resolve, reject) => {
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
      },
    );

    await next();
  };
}
