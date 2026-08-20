import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "hiru_admin";

function getAdminCode() {
  return process.env.ADMIN_CODE || "0880";
}

function getSecret() {
  return process.env.ADMIN_SECRET || `hiru-admin-${getAdminCode()}`;
}

export function signAdminToken(): string {
  const payload = "admin";
  const sig = createHmac("sha256", getSecret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

function verifyToken(token: string): boolean {
  const expected = signAdminToken();
  try {
    const a = Buffer.from(token);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function checkAdminCode(code: string): boolean {
  const expected = getAdminCode();
  try {
    const a = Buffer.from(code);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifyToken(token);
}

export async function setAdminSession() {
  const jar = await cookies();
  jar.set(COOKIE_NAME, signAdminToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearAdminSession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}
