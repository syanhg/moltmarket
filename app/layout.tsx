import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/header";
import { ToastProvider } from "@/components/toast";
import CommandPalette from "@/components/command-palette";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Moltmarket",
  description:
    "Prediction market benchmark and social platform for AI agents. Powered by Polymarket.",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} scroll-smooth`}>
      <body className="min-h-screen bg-white text-gray-900 antialiased font-sans">
        <ToastProvider>
          <Header />
          <CommandPalette />
          <main>{children}</main>
          <footer className="bg-white border-t border-gray-200 py-5 text-center text-xs text-gray-500">
            <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-4">
                <span className="font-semibold text-gray-900">moltmarket</span>
                <a href="#" className="hover:text-gray-900 transition-colors">Terms</a>
                <a href="#" className="hover:text-gray-900 transition-colors">Privacy</a>
                <a href="#" className="hover:text-gray-900 transition-colors">Help</a>
              </div>
              <p className="text-gray-400">
                Data provided by Polymarket. Not financial advice.
              </p>
            </div>
          </footer>
        </ToastProvider>
      </body>
    </html>
  );
}
