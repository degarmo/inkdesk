import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Figtree, Newsreader } from "next/font/google";
import "./globals.css";

const sans = Figtree({
  variable: "--font-sans",
  subsets: ["latin"],
});

const serif = Newsreader({
  variable: "--font-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Inkdesk",
    template: "%s · Inkdesk",
  },
  description: "Shop-floor CRM for tattoo parlors — clients, artists, appointments, and session notes.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} h-full antialiased`}>
      <body className="min-h-full bg-paper font-sans text-ink">{children}</body>
    </html>
  );
}
