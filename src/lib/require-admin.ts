import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME, isValidAdminToken } from "./admin-auth";

/** Admin sayfalarında/action'larında çağrılır; geçerli oturum yoksa /admin'e yönlendirir. */
export async function assertAdmin(): Promise<void> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE_NAME)?.value;
  if (!(await isValidAdminToken(token))) {
    redirect("/admin");
  }
}

export async function isAdminAuthed(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE_NAME)?.value;
  return isValidAdminToken(token);
}
