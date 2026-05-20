import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Validy — fråga din data",
  description:
    "Minimalistisk chatt för att ställa frågor om bostadsrättsföreningars ekonomi och fastighet.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <head>
        <link rel="preconnect" href="https://rsms.me/" />
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
