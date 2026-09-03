"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ADMIN_COOKIE_NAME, makeAdminToken } from "@/lib/admin-auth";
import { assertAdmin } from "@/lib/require-admin";
import { parseScoreOptionsText, parseScorerOptionsText } from "@/lib/parse";
import type { Competition } from "@/lib/types";
import {
  createMatch,
  deleteMatch as deleteMatchDb,
  finalizeMatch as finalizeMatchDb,
  findMatchByExternalRef,
  getMatchPhaseSync,
  reopenMatch as reopenMatchDb,
  setResultOptions,
  setScoreOptions,
  setScorerOptions,
  updateMatchInfo,
} from "@/lib/db";
import { fetchUpcomingMatchesFromLiveApi } from "@/lib/odds-source";

export interface AdminActionState {
  error?: string;
  success?: boolean;
  message?: string;
}

export async function adminLoginAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const password = String(formData.get("password") ?? "");
  const token = await makeAdminToken(password);
  if (!token) return { error: "Şifre yanlış." };

  const store = await cookies();
  store.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
    secure: process.env.NODE_ENV === "production",
  });
  redirect("/admin/dashboard");
}

export async function adminLogoutAction(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE_NAME);
  redirect("/admin");
}

export async function createMatchAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await assertAdmin();

  const competition = String(formData.get("competition") ?? "") as Competition;
  const homeTeam = String(formData.get("homeTeam") ?? "").trim();
  const awayTeam = String(formData.get("awayTeam") ?? "").trim();
  const kickoffAt = String(formData.get("kickoffAt") ?? "");

  if (competition !== "UCL" && competition !== "UEL") {
    return { error: "Kategori Şampiyonlar Ligi veya Avrupa Ligi olmalı." };
  }
  if (!homeTeam || !awayTeam) return { error: "Takım isimleri boş olamaz." };
  if (!kickoffAt || Number.isNaN(new Date(kickoffAt).getTime())) {
    return { error: "Geçerli bir maç tarihi/saati girin." };
  }

  const match = await createMatch({ competition, homeTeam, awayTeam, kickoffAt });
  revalidatePath("/admin/dashboard");
  revalidatePath("/maclar");
  redirect(`/admin/dashboard/${match.id}`);
}

export async function updateMatchAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await assertAdmin();
  const matchId = String(formData.get("matchId") ?? "");
  const competition = String(formData.get("competition") ?? "") as Competition;
  const homeTeam = String(formData.get("homeTeam") ?? "").trim();
  const awayTeam = String(formData.get("awayTeam") ?? "").trim();
  const kickoffAt = String(formData.get("kickoffAt") ?? "");

  if (!matchId) return { error: "Geçersiz maç." };
  if (competition !== "UCL" && competition !== "UEL") {
    return { error: "Kategori Şampiyonlar Ligi veya Avrupa Ligi olmalı." };
  }
  if (!homeTeam || !awayTeam) return { error: "Takım isimleri boş olamaz." };
  if (!kickoffAt || Number.isNaN(new Date(kickoffAt).getTime())) {
    return { error: "Geçerli bir maç tarihi/saati girin." };
  }

  await updateMatchInfo(matchId, { competition, homeTeam, awayTeam, kickoffAt });
  revalidatePath(`/admin/dashboard/${matchId}`);
  revalidatePath("/admin/dashboard");
  revalidatePath("/maclar");
  revalidatePath(`/maclar/${matchId}`);
  return { success: true };
}

export async function deleteMatchAction(formData: FormData): Promise<void> {
  await assertAdmin();
  const matchId = String(formData.get("matchId") ?? "");
  if (matchId) await deleteMatchDb(matchId);
  revalidatePath("/admin/dashboard");
  revalidatePath("/maclar");
  redirect("/admin/dashboard");
}

export async function setResultOddsAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await assertAdmin();
  const matchId = String(formData.get("matchId") ?? "");
  const home = Number(String(formData.get("homeOdds") ?? "").replace(",", "."));
  const draw = Number(String(formData.get("drawOdds") ?? "").replace(",", "."));
  const away = Number(String(formData.get("awayOdds") ?? "").replace(",", "."));

  if (!matchId) return { error: "Geçersiz maç." };
  if (![home, draw, away].every((v) => Number.isFinite(v) && v > 1)) {
    return { error: "Oranların hepsi 1'den büyük geçerli sayılar olmalı." };
  }

  await setResultOptions(matchId, { home, draw, away });
  revalidatePath(`/admin/dashboard/${matchId}`);
  revalidatePath(`/maclar/${matchId}`);
  return { success: true };
}

export async function setScoreOddsAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await assertAdmin();
  const matchId = String(formData.get("matchId") ?? "");
  const text = String(formData.get("scoreRows") ?? "");
  if (!matchId) return { error: "Geçersiz maç." };

  const { rows, errors } = parseScoreOptionsText(text);
  if (errors.length > 0) return { error: errors.join(" ") };
  if (rows.length === 0) return { error: "En az bir skor seçeneği girmelisiniz." };

  await setScoreOptions(matchId, rows);
  revalidatePath(`/admin/dashboard/${matchId}`);
  revalidatePath(`/maclar/${matchId}`);
  return { success: true };
}

export async function setScorerOddsAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await assertAdmin();
  const matchId = String(formData.get("matchId") ?? "");
  const text = String(formData.get("scorerRows") ?? "");
  if (!matchId) return { error: "Geçersiz maç." };

  const { rows, errors } = parseScorerOptionsText(text);
  if (errors.length > 0) return { error: errors.join(" ") };
  if (rows.length === 0) return { error: "En az bir oyuncu seçeneği girmelisiniz." };

  await setScorerOptions(matchId, rows);
  revalidatePath(`/admin/dashboard/${matchId}`);
  revalidatePath(`/maclar/${matchId}`);
  return { success: true };
}

export async function finalizeMatchAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await assertAdmin();
  const matchId = String(formData.get("matchId") ?? "");
  const finalHomeScore = Number(formData.get("finalHomeScore"));
  const finalAwayScore = Number(formData.get("finalAwayScore"));
  const finalScorerOptionId = String(formData.get("finalScorerOptionId") ?? "") || null;

  if (!matchId) return { error: "Geçersiz maç." };
  if (
    !Number.isInteger(finalHomeScore) ||
    !Number.isInteger(finalAwayScore) ||
    finalHomeScore < 0 ||
    finalAwayScore < 0
  ) {
    return { error: "Skorlar 0 veya daha büyük tam sayı olmalı." };
  }

  await finalizeMatchDb(matchId, { finalHomeScore, finalAwayScore, finalScorerOptionId });
  revalidatePath(`/admin/dashboard/${matchId}`);
  revalidatePath("/admin/dashboard");
  revalidatePath("/maclar");
  revalidatePath(`/maclar/${matchId}`);
  revalidatePath("/tahminlerim");
  revalidatePath("/liderlik-tablosu");
  return { success: true };
}

export async function reopenMatchAction(formData: FormData): Promise<void> {
  await assertAdmin();
  const matchId = String(formData.get("matchId") ?? "");
  if (matchId) await reopenMatchDb(matchId);
  revalidatePath(`/admin/dashboard/${matchId}`);
  revalidatePath("/admin/dashboard");
  revalidatePath("/maclar");
  revalidatePath("/liderlik-tablosu");
}

/**
 * API-Football'dan bugün + yarın için UCL/UEL maçlarını çeker. Yeni bir maç
 * bulunursa oluşturur; daha önce içe aktarılmış ama henüz kilitlenmemiş
 * (başlama saati gelmemiş) bir maç varsa oranlarını günceller. Kilitlenmiş
 * veya sonuçlanmış maçlara dokunmaz.
 */
export async function importMatchesFromApiAction(
  _prevState: AdminActionState,
  _formData: FormData
): Promise<AdminActionState> {
  await assertAdmin();

  let externalMatches;
  try {
    externalMatches = await fetchUpcomingMatchesFromLiveApi();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "API-Football isteği başarısız." };
  }

  if (externalMatches.length === 0) {
    return { success: true, message: "Bugün/yarın için UCL veya UEL maçı bulunamadı." };
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const em of externalMatches) {
    const existing = await findMatchByExternalRef(em.externalId);
    let matchId: string;

    if (existing) {
      if (getMatchPhaseSync(existing) !== "open") {
        skipped += 1;
        continue;
      }
      matchId = existing.id;
      updated += 1;
    } else {
      const match = await createMatch({
        competition: em.competition,
        homeTeam: em.homeTeam,
        awayTeam: em.awayTeam,
        kickoffAt: em.kickoffAt,
        externalRef: em.externalId,
      });
      matchId = match.id;
      created += 1;
    }

    if (em.result1x2Odds) {
      await setResultOptions(matchId, em.result1x2Odds);
    }
    if (em.correctScoreOdds.length > 0) {
      await setScoreOptions(matchId, em.correctScoreOdds);
    }
    if (em.firstScorerOdds.length > 0) {
      await setScorerOptions(matchId, em.firstScorerOdds);
    }
  }

  revalidatePath("/admin/dashboard");
  revalidatePath("/maclar");

  const parts = [];
  if (created > 0) parts.push(`${created} yeni maç eklendi`);
  if (updated > 0) parts.push(`${updated} maçın oranı güncellendi`);
  if (skipped > 0) parts.push(`${skipped} maç zaten kilitli olduğu için atlandı`);

  return { success: true, message: parts.join(", ") || "İşlem tamamlandı." };
}
