"use client";

import { useEffect, useState } from "react";
import { subscribePushAction, unsubscribePushAction } from "@/app/actions/push";

type State =
  | "loading"
  | "unsupported"
  | "ios-install"
  | "denied"
  | "off"
  | "on";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export default function PushToggle() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;

      const supported =
        "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!supported) {
        if (!cancelled) setState(isIOS && !standalone ? "ios-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setState("denied");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        const sub = await reg.pushManager.getSubscription();
        if (sub && Notification.permission === "granted") {
          // Aynı cihaz başka biriyle giriş yapmış olabilir: sahibi güncelle.
          await subscribePushAction(JSON.parse(JSON.stringify(sub)));
          if (!cancelled) setState("on");
        } else if (!cancelled) {
          setState("off");
        }
      } catch {
        if (!cancelled) setState("unsupported");
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("Bildirim anahtarı tanımlı değil.");
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));
      const result = await subscribePushAction(JSON.parse(JSON.stringify(sub)));
      if (!result.ok) throw new Error(result.error ?? "Kaydedilemedi.");
      setState("on");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bildirimler açılamadı.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unsubscribePushAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bildirimler kapatılamadı.");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading" || state === "unsupported") return null;

  if (state === "on") {
    return (
      <div className="p-muted" style={{ fontSize: 12.5, marginBottom: 14 }}>
        🔔 Maçlardan 1 saat önce hatırlatma alacaksın.{" "}
        <button
          type="button"
          onClick={disable}
          disabled={busy}
          style={{ textDecoration: "underline", background: "none", border: 0, color: "inherit", cursor: "pointer" }}
        >
          Kapat
        </button>
        {error && <span className="p-error"> {error}</span>}
      </div>
    );
  }

  return (
    <div className="p-card" style={{ marginBottom: 14, padding: "14px 16px" }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>🔔 Maç hatırlatmaları</div>
      {state === "ios-install" && (
        <p className="p-muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
          iPhone&apos;da bildirim almak için siteyi Safari&apos;de <b>Paylaş → Ana Ekrana Ekle</b> ile
          ekle ve uygulamayı ana ekrandaki simgeden aç. Sonra buradan bildirimleri açabilirsin.
        </p>
      )}
      {state === "denied" && (
        <p className="p-muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
          Bildirimler bu cihazda engellenmiş. Telefonun ayarlarından bu uygulama için bildirimlere
          izin verip sayfayı yenile.
        </p>
      )}
      {state === "off" && (
        <>
          <p className="p-muted" style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 10 }}>
            Tahmin girmediğin maçlar için, maç başlamadan 1 saat önce telefonuna bildirim gönderelim.
          </p>
          <button type="button" className="p-save-btn" onClick={enable} disabled={busy}>
            {busy ? "Açılıyor…" : "Bildirimleri aç"}
          </button>
        </>
      )}
      {error && <p className="p-error" style={{ marginTop: 8 }}>{error}</p>}
    </div>
  );
}
