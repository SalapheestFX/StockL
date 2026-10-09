import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stocky AI | Intelligent Stock Research",
  description:
    "Explore market prices, financial news, and AI-assisted stock research with Stocky AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}