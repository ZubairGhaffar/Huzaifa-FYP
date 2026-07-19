import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Member Recognition Dashboard",
  description: "Next.js dashboard for live camera streaming and member management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}