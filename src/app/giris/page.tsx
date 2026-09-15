import { redirect } from "next/navigation";
import { getCurrentParticipant } from "@/lib/participant-session";
import ParticipantShell from "@/components/ParticipantShell";
import LoginForm from "./LoginForm";

export default async function GirisPage() {
  const participant = await getCurrentParticipant();
  if (participant) redirect("/maclar");

  return (
    <ParticipantShell>
      <h1 className="p-greeting">Yarışmaya katıl</h1>
      <p className="p-subtitle">
        Hesap oluşturmana gerek yok — bir isim ve 4 haneli bir PIN seç. Aynı isim + PIN ile her
        zaman geri dönebilirsin.
      </p>
      <LoginForm />
    </ParticipantShell>
  );
}
