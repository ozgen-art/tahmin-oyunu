import "server-only";
import webpush from "web-push";
import { getSupabaseAdmin } from "./supabase-admin";

// ---------------------------------------------------------------------------
// Web push: abonelik kaydı + maçtan ~1 saat önce otomatik hatırlatma
// ---------------------------------------------------------------------------

/** Maça bu kadar süre kala (veya daha az) hatırlatma gönderilir. */
const REMINDER_LEAD_MS = 65 * 60 * 1000;

export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

interface SubscriptionRow {
  id: string;
  participant_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

let vapidConfigured = false;
function configureWebPush() {
  if (vapidConfigured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    throw new Error(
      "Web push ortam değişkenleri eksik: NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY ve VAPID_SUBJECT tanımlı olmalı."
    );
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

export async function savePushSubscription(
  participantId: string,
  sub: PushSubscriptionInput,
  userAgent: string | null
): Promise<void> {
  const db = getSupabaseAdmin();
  // Aynı cihaz (endpoint) başka bir katılımcıyla giriş yapmış olabilir —
  // endpoint'e göre upsert edip sahibini güncelliyoruz.
  const { error } = await db.from("push_subscriptions").upsert(
    {
      participant_id: participantId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      user_agent: userAgent,
    },
    { onConflict: "endpoint" }
  );
  if (error) throw new Error(error.message);
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  const db = getSupabaseAdmin();
  const { error } = await db.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) throw new Error(error.message);
}

/** Katılımcı başına kayıtlı cihaz sayısı (admin panelinde göstermek için). */
export async function countSubscriptionsByParticipant(): Promise<Map<string, number>> {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("push_subscriptions").select("participant_id");
  if (error) throw new Error(error.message);
  const counts = new Map<string, number>();
  for (const row of data as Array<{ participant_id: string }>) {
    counts.set(row.participant_id, (counts.get(row.participant_id) ?? 0) + 1);
  }
  return counts;
}

interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
}

/** Tek aboneliğe gönderir; abonelik artık geçersizse (404/410) siler. */
async function sendToSubscription(sub: SubscriptionRow, payload: PushPayload): Promise<boolean> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 60 }
    );
    return true;
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      await removePushSubscription(sub.endpoint);
    } else {
      console.error("Push gönderilemedi:", status, (err as Error).message);
    }
    return false;
  }
}

export interface ReminderResult {
  dueMatches: number;
  notifiedParticipants: number;
  sentNotifications: number;
}

/**
 * Başlamasına ~1 saat (REMINDER_LEAD_MS) kalan ve henüz hatırlatılmamış
 * maçları bulur; bu maçların en az birine tahmin girmemiş her katılımcının
 * kayıtlı cihazlarına TEK bir bildirim gönderir. Zamanlayıcı birkaç dakikada
 * bir çağırdığı için aynı maçlar bir kez işaretlenir (reminder_sent_at).
 */
export async function sendDueReminders(): Promise<ReminderResult> {
  configureWebPush();
  const db = getSupabaseAdmin();
  const nowIso = new Date().toISOString();
  const horizonIso = new Date(Date.now() + REMINDER_LEAD_MS).toISOString();

  // Atomik "sahiplenme": iki eşzamanlı çalışma aynı maçı iki kez bildirmesin.
  const { data: claimed, error: claimErr } = await db
    .from("matches")
    .update({ reminder_sent_at: nowIso })
    .eq("status", "scheduled")
    .is("reminder_sent_at", null)
    .gt("kickoff_at", nowIso)
    .lte("kickoff_at", horizonIso)
    .select("id, home_team, away_team, kickoff_at");
  if (claimErr) throw new Error(claimErr.message);

  const due = (claimed ?? []) as Array<{
    id: string;
    home_team: string;
    away_team: string;
    kickoff_at: string;
  }>;
  if (due.length === 0) return { dueMatches: 0, notifiedParticipants: 0, sentNotifications: 0 };

  const dueIds = due.map((m) => m.id);
  const [subsRes, predsRes] = await Promise.all([
    db.from("push_subscriptions").select("*"),
    db.from("predictions").select("participant_id, match_id").in("match_id", dueIds),
  ]);
  if (subsRes.error) throw new Error(subsRes.error.message);
  if (predsRes.error) throw new Error(predsRes.error.message);

  const predicted = new Set(
    (predsRes.data as Array<{ participant_id: string; match_id: string }>).map(
      (p) => `${p.participant_id}:${p.match_id}`
    )
  );
  const subsByParticipant = new Map<string, SubscriptionRow[]>();
  for (const s of subsRes.data as SubscriptionRow[]) {
    const list = subsByParticipant.get(s.participant_id) ?? [];
    list.push(s);
    subsByParticipant.set(s.participant_id, list);
  }

  let notifiedParticipants = 0;
  let sentNotifications = 0;
  for (const [participantId, subs] of subsByParticipant) {
    const missing = due.filter((m) => !predicted.has(`${participantId}:${m.id}`));
    if (missing.length === 0) continue;

    const names = missing.map((m) => `${m.home_team} - ${m.away_team}`);
    const shown = names.slice(0, 3).join(", ");
    const extra = names.length > 3 ? ` ve ${names.length - 3} maç daha` : "";
    const payload: PushPayload = {
      title: "⏰ Maçlara 1 saat kaldı!",
      body: `Tahmin girmediğin maçlar: ${shown}${extra}`,
      url: "/maclar",
      tag: "reminder",
    };

    let anySent = false;
    for (const sub of subs) {
      if (await sendToSubscription(sub, payload)) {
        sentNotifications += 1;
        anySent = true;
      }
    }
    if (anySent) notifiedParticipants += 1;
  }

  return { dueMatches: due.length, notifiedParticipants, sentNotifications };
}

/** Admin panelinden "test bildirimi": tüm kayıtlı cihazlara gönderir. */
export async function sendTestNotification(): Promise<{ sent: number; total: number }> {
  configureWebPush();
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("push_subscriptions").select("*");
  if (error) throw new Error(error.message);
  const subs = data as SubscriptionRow[];
  let sent = 0;
  for (const sub of subs) {
    if (
      await sendToSubscription(sub, {
        title: "🔔 Test bildirimi",
        body: "Bildirimler çalışıyor! Maçlardan 1 saat önce hatırlatma alacaksın.",
        url: "/maclar",
        tag: "test",
      })
    ) {
      sent += 1;
    }
  }
  return { sent, total: subs.length };
}
