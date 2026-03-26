import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agentroad — AI Agents Marketplace",
  description:
    "Discover and use specialized AI agents for copywriting, marketing, travel planning, and more. The marketplace for AI-powered productivity.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
