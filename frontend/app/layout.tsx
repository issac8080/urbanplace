import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Urban — AI-Governed Home Services & Tutor Marketplace",
  description: "Connect with verified home service providers and tutors.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={outfit.variable}>
      <body className="min-h-screen bg-surface-50 text-slate-900 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
