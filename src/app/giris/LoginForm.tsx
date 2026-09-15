"use client";

import { useActionState } from "react";
import { loginOrRegisterAction, type AuthActionState } from "@/app/actions/participant";

const initialState: AuthActionState = {};

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(loginOrRegisterAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4" style={{ maxWidth: 340 }}>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="displayName" className="p-scorer-label">
          İsim (rumuz)
        </label>
        <input
          id="displayName"
          name="displayName"
          required
          minLength={2}
          maxLength={40}
          placeholder="ör. Ozgen K."
          className="p-input"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="pin" className="p-scorer-label">
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
          className="p-input"
        />
        <p className="p-muted" style={{ fontSize: 11.5 }}>
          Bu PIN, sonraki ziyaretlerinde aynı isimle tekrar giriş yapabilmen için — şifre
          değildir, kimseyle paylaşma yeter.
        </p>
      </div>
      {state.error && <p className="p-error">{state.error}</p>}
      <button type="submit" disabled={pending} className="p-save-btn">
        {pending ? "Giriş yapılıyor…" : "Giriş yap / Kayıt ol"}
      </button>
    </form>
  );
}
