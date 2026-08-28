import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/require-admin";
import AdminLoginForm from "./AdminLoginForm";

export default async function AdminPage() {
  if (await isAdminAuthed()) redirect("/admin/dashboard");

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6">
      <h1 className="text-2xl font-bold">Admin Girişi</h1>
      <AdminLoginForm />
    </div>
  );
}
