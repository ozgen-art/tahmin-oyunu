"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createParticipant, findParticipantByName, verifyParticipantPin } from "@/lib/db";
import { PARTICIPANT_COOKIE_NAME } from "@/lib/participant-session";

export interface AuthActionState {
  error?: string;
}

function setParticipantCookie(store: Awaited<ReturnType<typeof cookies>>, token: string) {
  store.set(PARTICIPANT_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function loginOrRegisterAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const displayName = String(formData.get("displayName") ?? "").trim();
  const pin = String(formData.get("pin") ?? "").trim();

  if (displayName.length < 2 || displayName.length > 40) {
    return { error: "İsim 2-40 karakter arasında olmalı." };
  }
  if (!/^\d{4}$/.test(pin)) {
    return { error: "PIN, 4 haneli bir rakam olmalı (ör. 1453)." };
  }

  const existing = await findParticipantByName(displayName);
  let participant;
  if (existing) {
    const ok = await verifyParticipantPin(existing, pin);
    if (!ok) {
      return {
        error: "Bu isim zaten kullanımda ve girdiğiniz PIN eşleşmiyor. Farklı bir isim deneyin.",
      };
    }
    participant = existing;
  } else {
    participant = await createParticipant(displayName, pin);
  }

  const store = await cookies();
  setParticipantCookie(store, participant.sessionToken);
  redirect("/maclar");
}

export async function logoutParticipantAction(): Promise<void> {
  const store = await cookies();
  store.delete(PARTICIPANT_COOKIE_NAME);
  redirect("/");
}
