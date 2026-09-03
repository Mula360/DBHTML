import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Deccan Birders EC Portal",
  description: "Internal tool for the Deccan Birders Executive Committee",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
