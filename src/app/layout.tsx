import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Countries & Capitals — 3D Globe Game",
  description:
    "Guess the country, capital, and geography fact on a responsive 3D globe across 100 levels.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
