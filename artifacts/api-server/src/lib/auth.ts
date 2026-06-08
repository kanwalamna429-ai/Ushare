import type { Request, Response, NextFunction } from "express";

declare module "express-session" {
  interface SessionData {
    authenticated: boolean;
    username: string;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.authenticated) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
