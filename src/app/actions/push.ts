"use server";

import { headers } from "next/headers";
import { getCurrentParticipant } from "@/lib/participant-session";
import { assertAdmin } from "@/lib/require-admin";
import {
  removePushSubscription,
  savePushSubscription,
  sendTestNotification,
  type PushSubscriptionInput,
} from "@/lib/push";

export interface PushActionResult {
  ok: boolean;
  error?: string;
  message?: string;
}

function isValidSubscription(sub: unknown): sub is PushSubscriptionInput {
  if (!sub || typeof sub !== "object") return false;
  const s = sub as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  return (
    typeof s.endpoint === "string" &&
    s.endpoint.startsWith("https://") &&
    typeof s.keys?.p256dh === "string" &&
    typeof s.keys?.auth === "string"
  );
}

export async function subscribePushAction(sub: unknown): Promise<PushActionResult> {
  const participant = await getCurrentParticipant();
  if (!participant) return { ok: false, error: "Bildirim için önce giriş yapmalısın." };
  if (!isValidSubscription(sub)) return { ok: false, error: "Geçersiz bildirim aboneliği." };
  try {
    const userAgent = (await headers()).get("user-agent");
    await savePushSubscription(participant.id, sub, userAgent);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Abonelik kaydedilemedi." };
  }
}

export async function unsubscribePushAction(endpoint: string): Promise<PushActionResult> {
  const participant = await getCurrentParticipant();
  if (!participant) return { ok: false, error: "Giriş yapmalısın." };
  try {
    await removePushSubscription(endpoint);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Abonelik silinemedi." };
  }
}

export async function sendTestPushAction(): Promise<PushActionResult> {
  await assertAdmin();
  try {
    const { sent, total } = await sendTestNotification();
    return { ok: true, message: `${total} cihazdan ${sent} tanesine gönderildi.` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Gönderilemedi." };
  }
}
