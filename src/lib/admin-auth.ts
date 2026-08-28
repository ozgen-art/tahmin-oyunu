import { sha256Hex } from "./hash";

export const ADMIN_COOKIE_NAME = "tahmin_admin_session";

/** Doğru şifre girildiyse cookie'ye yazılacak token'ı üretir, yanlışsa null döner. */
export async function makeAdminToken(submittedPassword: string): Promise<string | null> {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword || submittedPassword !== adminPassword) return null;
  return sha256Hex(adminPassword);
}

export async function isValidAdminToken(token: string | undefined): Promise<boolean> {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword || !token) return false;
  return token === (await sha256Hex(adminPassword));
}
