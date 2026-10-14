import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BhoomiSetu — From Land to Home",
  description: "Plan your plot, imagine your home, and build with confidence.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
