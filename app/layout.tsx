import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Orbitron } from "next/font/google";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap"
});

export const metadata: Metadata = {
  title: "Star Wars Watch Order",
  description: "Track your progress through the Star Wars saga in chronological order with episode-level detail.",
  manifest: "/manifest.json",
  icons: [
    { rel: "icon", type: "image/png", url: "/favicon-r2.png" },
    { rel: "shortcut icon", type: "image/png", url: "/favicon-r2.png" },
    { rel: "apple-touch-icon", url: "/favicon-r2.png" },
  ],
  openGraph: {
    title: "Star Wars Watch Order",
    description: "Track your progress through the Star Wars saga in chronological order.",
    type: "website",
    siteName: "Star Wars Watch Order",
  },
  twitter: {
    card: "summary",
    title: "Star Wars Watch Order",
    description: "Track your progress through the Star Wars saga in chronological order.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SW Watch Order",
  },
};

export const viewport: Viewport = {
  themeColor: "#00e5ff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={orbitron.className}>
        <div className="starfield">
          <div className="stars layer1" />
          <div className="stars layer2" />
          <div className="stars layer3" />
        </div>
        <div className="app-shell">
          {children}
        </div>
      </body>
    </html>
  );
}
