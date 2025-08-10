import type { Metadata } from "next";
import "./globals.css";
import { Orbitron } from "next/font/google";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap"
});

export const metadata: Metadata = {
  title: "Star Wars Watch Order",
  description: "Track your progress through a galactic Star Wars watch order with episode-level detail.",
  icons: [
    {
      rel: 'icon',
      type: 'image/png',
      url: '/favicon-r2.png',
    },
    {
      rel: 'shortcut icon',
      type: 'image/png',
      url: '/favicon-r2.png',
    },
  ],
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
