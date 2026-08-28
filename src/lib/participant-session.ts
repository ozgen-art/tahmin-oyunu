import "server-only";
import { cookies } from "next/headers";
import { findParticipantByToken } from "./db";
import type { Participant } from "./types";

export const PARTICIPANT_COOKIE_NAME = "tahmin_participant_session";

export async function getCurrentParticipant(): Promise<Participant | null> {
  const store = await cookies();
  const token = store.get(PARTICIPANT_COOKIE_NAME)?.value;
  return findParticipantByToken(token);
}
