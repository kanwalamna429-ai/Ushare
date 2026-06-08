import { Router, type IRouter } from "express";
import { LoginBody, ChangePasswordBody, ChangeUsernameBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

// Read at request time so the env var is always current after restarts
function getAdminUsername(): string {
  return runtimeUsername ?? (process.env.ADMIN_USERNAME ?? "admin");
}

function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? "changeme";
}

// Runtime overrides via API (persist for the life of the process)
let runtimePassword: string | null = null;
let runtimeUsername: string | null = null;

function getCurrentPassword(): string {
  return runtimePassword ?? getAdminPassword();
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, password } = parsed.data;
  if (username !== getAdminUsername() || password !== getCurrentPassword()) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  req.session.authenticated = true;
  req.session.username = username;
  res.json({ authenticated: true, username });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  req.session.destroy(() => {});
  res.json({ authenticated: false, username: null });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  if (req.session?.authenticated) {
    res.json({ authenticated: true, username: req.session.username ?? null });
  } else {
    res.json({ authenticated: false, username: null });
  }
});

router.post("/auth/change-password", requireAuth, async (req, res): Promise<void> => {
  const parsed = ChangePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { currentPassword: provided, newPassword } = parsed.data;
  if (provided !== getCurrentPassword()) {
    res.status(400).json({ error: "Current password is incorrect" });
    return;
  }

  runtimePassword = newPassword;
  res.json({ authenticated: true, username: req.session.username ?? null });
});

router.post("/auth/change-username", requireAuth, async (req, res): Promise<void> => {
  const parsed = ChangeUsernameBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { currentPassword: provided, newUsername } = parsed.data;
  if (provided !== getCurrentPassword()) {
    res.status(400).json({ error: "Current password is incorrect" });
    return;
  }

  runtimeUsername = newUsername;
  req.session.username = newUsername;
  res.json({ authenticated: true, username: newUsername });
});

export default router;
