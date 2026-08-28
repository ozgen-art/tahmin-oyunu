"use client";

import { useActionState } from "react";
import { adminLoginAction, type AdminActionState } from "@/app/actions/admin";

const initialState: AdminActionState = {};

export default function AdminLoginForm() {
  const [state, formAction, pending] = useActionState(adminLoginAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Admin şifresi
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoFocus
          className="rounded border border-black/15 bg-transparent px-3 py-2 outline-none focus:border-indigo-500 dark:border-white/20"
        />
      </div>
      {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {pending ? "Giriş yapılıyor…" : "Giriş yap"}
      </button>
    </form>
  );
}
