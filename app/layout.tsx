import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "TG Exercise Tracker",
  description: "Team Goda coaching platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <Providers>
          <Navbar />
          <main className="min-h-screen">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
