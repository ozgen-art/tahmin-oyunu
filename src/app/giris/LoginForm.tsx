"use client";

import { useActionState } from "react";
import { loginOrRegisterAction, type AuthActionState } from "@/app/actions/participant";

const initialState: AuthActionState = {};

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(loginOrRegisterAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="displayName" className="text-sm font-medium">
          İsim (rumuz)
        </label>
        <input
          id="displayName"
          name="displayName"
          required
          minLength={2}
          maxLength={40}
          placeholder="ör. Ozgen K."
          className="rounded border border-black/15 bg-transparent px-3 py-2 outline-none focus:border-indigo-500 dark:border-white/20"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="pin" className="text-sm font-medium">
          4 haneli PIN
        </label>
        <input
          id="pin"
          name="pin"
          required
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          placeholder="ör. 1453"
          className="rounded border border-black/15 bg-transparent px-3 py-2 outline-none focus:border-indigo-500 dark:border-white/20"
        />
        <p className="text-xs text-black/50 dark:text-white/50">
          Bu PIN, sonraki ziyaretlerinde aynı isimle tekrar giriş yapabilmen için — şifre değildir,
          kimseyle paylaşma yeter.
        </p>
      </div>
      {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {pending ? "Giriş yapılıyor…" : "Giriş yap / Kayıt ol"}
      </button>
    </form>
  );
}
