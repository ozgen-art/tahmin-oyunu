"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { submitPrediction } from "@/lib/db";
import { getCurrentParticipant } from "@/lib/participant-session";

export interface PredictionActionState {
  error?: string;
  success?: boolean;
}

function parseScoreInput(raw: string): number | undefined {
  if (raw.trim() === "") return undefined;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n <= 20 ? n : NaN;
}

export async function submitPredictionAction(
  _prevState: PredictionActionState,
  formData: FormData
): Promise<PredictionActionState> {
  const participant = await getCurrentParticipant();
  if (!participant) {
    return { error: "Tahmin gönderebilmek için önce giriş yapmalısınız." };
  }

  const matchId = String(formData.get("matchId") ?? "");
  if (!matchId) return { error: "Geçersiz maç." };

  const resultOptionId = String(formData.get("resultOptionId") ?? "") || undefined;
  const scorerOptionId = String(formData.get("scorerOptionId") ?? "") || undefined;
  const jokerUsed = formData.get("jokerUsed") === "on";

  const homeRaw = String(formData.get("predictedHomeScore") ?? "");
  const awayRaw = String(formData.get("predictedAwayScore") ?? "");
  const predictedHomeScore = parseScoreInput(homeRaw);
  const predictedAwayScore = parseScoreInput(awayRaw);

  if (Number.isNaN(predictedHomeScore) || Number.isNaN(predictedAwayScore)) {
    return { error: "Skor 0-20 arasında bir tam sayı olmalı." };
  }
  if ((predictedHomeScore === undefined) !== (predictedAwayScore === undefined)) {
    return { error: "Skor için hem ev sahibi hem deplasman skorunu girin." };
  }

  if (!resultOptionId && predictedHomeScore === undefined && !scorerOptionId) {
    return { error: "En az bir tahmin kategorisi doldurmalısınız." };
  }

  try {
    await submitPrediction({
      participantId: participant.id,
      matchId,
      resultOptionId,
      predictedHomeScore,
      predictedAwayScore,
      scorerOptionId,
      jokerUsed,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Tahmin kaydedilemedi." };
  }

  revalidatePath(`/maclar/${matchId}`);
  revalidatePath("/maclar");
  revalidatePath("/tahminlerim");
  revalidatePath("/liderlik-tablosu");
  redirect("/maclar");
}
