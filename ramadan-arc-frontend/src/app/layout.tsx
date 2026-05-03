import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ramadan ARC",
  description: "A Ramadan assistant for prayer times, alarms, habits, duas, hadiths, reminders, analytics, and Arabic lessons.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Ramadan ARC",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#18785c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
