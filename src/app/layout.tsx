import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "StockL | AI Trading Research Desk",
    template: "%s | StockL",
  },
  description:
    "StockL is an AI-assisted trading research desk for stock market analysis, live market insights, financial news, and risk assessment.",
  applicationName: "StockL",
  icons: {
    icon: [
      {
        url: "/stocky-logo.jpg",
        type: "image/jpeg",
      },
    ],
    shortcut: "/stocky-logo.jpg",
    apple: "/stocky-logo.jpg",
  },
  keywords: [
    "StockL",
    "AI trading research",
    "stock market analysis",
    "market insights",
    "financial news",
    "risk assessment",
  ],
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