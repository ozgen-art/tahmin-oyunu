import type { Metadata } from "next";
import { Sora, Inter } from "next/font/google";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "UCL · UEL Tahmin Yarışması",
  description:
    "Şampiyonlar Ligi ve UEFA Avrupa Ligi maçları için skor, ilk gol ve kazanan tahmini yapıp puan topla.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${sora.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#0c0a1a] text-[#f6f3ff]">{children}</body>
    </html>
  );
}
