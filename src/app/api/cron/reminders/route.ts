import { NextResponse } from "next/server";
import { sendDueReminders } from "@/lib/push";

// Harici zamanlayıcı (GitHub Actions / cron-job.org) birkaç dakikada bir
// çağırır: GET /api/cron/reminders  +  "Authorization: Bearer <CRON_SECRET>"
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET tanımlı değil" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  try {
    const result = await sendDueReminders();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("Hatırlatma hatası:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Bilinmeyen hata" },
      { status: 500 }
    );
  }
}
