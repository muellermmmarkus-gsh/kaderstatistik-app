import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { APP_NAME, THEME_COLOR } from "@/lib/appTheme";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kaderstatistik-App",
  description: "Anwesenheit und Tore der E-Jugend erfassen und auswerten",
  applicationName: APP_NAME,
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: THEME_COLOR,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NavBar />
        {children}
        <footer className="px-4 py-4 text-center text-xs text-zinc-500">
          <Link href="/datenschutz" className="hover:underline">
            Datenschutz
          </Link>
        </footer>
      </body>
    </html>
  );
}
