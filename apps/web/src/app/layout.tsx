import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { themeScript } from "@/components/theme-script";
import { Toaster } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import "./globals.css";

const sans = Geist({ subsets: ["latin", "latin-ext"], variable: "--font-sans" });
const mono = Geist_Mono({ subsets: ["latin", "latin-ext"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "LexAI",
  description: "Documente juridice românești: redactare, editare și verificare pe textul oficial al legii.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ro" className={cn("h-full antialiased", sans.variable, mono.variable)} suppressHydrationWarning>
      <head>
        <Script id="lexai-tema" strategy="beforeInteractive">
          {themeScript}
        </Script>
      </head>
      <body className="min-h-full bg-background font-sans text-foreground">
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
