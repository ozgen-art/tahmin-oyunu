import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Header from "@/components/Header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UCL · UEL Tahmin Yarışması",
  description:
    "Şampiyonlar Ligi ve UEFA Avrupa Ligi maçları için skor, ilk gol ve kazanan tahmini yapıp puan topla.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        <Header />
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">{children}</main>
        <footer className="mx-auto w-full max-w-4xl px-4 py-6 text-xs text-black/50 dark:text-white/40">
          Sadece UEFA Şampiyonlar Ligi ve UEFA Avrupa Ligi maçları · Puanlar bahis oranlarından
          türetilir (oran × 10, tam sayıya yuvarlanır).
        </footer>
      </body>
    </html>
  );
}
