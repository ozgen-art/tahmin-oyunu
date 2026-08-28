"use server";

import { revalidatePath } from "next/cache";
import { submitPrediction } from "@/lib/db";
import { getCurrentParticipant } from "@/lib/participant-session";

export interface PredictionActionState {
  error?: string;
  success?: boolean;
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
  const scoreOptionId = String(formData.get("scoreOptionId") ?? "") || undefined;
  const scorerOptionId = String(formData.get("scorerOptionId") ?? "") || undefined;

  if (!resultOptionId && !scoreOptionId && !scorerOptionId) {
    return { error: "En az bir tahmin kategorisi seçmelisiniz." };
  }

  try {
    await submitPrediction({
      participantId: participant.id,
      matchId,
      resultOptionId,
      scoreOptionId,
      scorerOptionId,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Tahmin kaydedilemedi." };
  }

  revalidatePath(`/maclar/${matchId}`);
  revalidatePath("/maclar");
  revalidatePath("/tahminlerim");
  revalidatePath("/liderlik-tablosu");
  return { success: true };
}
