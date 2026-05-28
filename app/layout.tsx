import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import "./globals.css";
import { Header } from "@/components/Header";
import { auth } from "@/auth";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BondarGames — Board game nights",
  description: "Book a seat at the next board game night with BondarGames.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col text-[var(--foreground)]">
        <SessionProvider session={session}>
          <Header />
          <main className="flex-1 mx-auto w-full max-w-5xl px-5 sm:px-8 py-8 sm:py-12">{children}</main>
          <footer className="mx-auto w-full max-w-5xl px-5 sm:px-8 py-10 text-xs text-[var(--muted)]">
            © {new Date().getFullYear()} BondarGames
          </footer>
        </SessionProvider>
      </body>
    </html>
  );
}
