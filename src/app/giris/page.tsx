import { redirect } from "next/navigation";
import { getCurrentParticipant } from "@/lib/participant-session";
import LoginForm from "./LoginForm";

export default async function GirisPage() {
  const participant = await getCurrentParticipant();
  if (participant) redirect("/maclar");

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Yarışmaya katıl</h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Hesap oluşturmana gerek yok — bir isim ve 4 haneli bir PIN seç. Aynı isim + PIN ile her
          zaman geri dönebilirsin.
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
