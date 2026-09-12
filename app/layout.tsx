import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import "@clerk/ui/themes/shadcn.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { IBM_Plex_Serif } from "next/font/google";
import { Mona_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";


import Navbar from "@/components/navbar";
const ibmPlexSerif = IBM_Plex_Serif({
  variable: "--font-ibm-plex-serif",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});
const monaSans = Mona_Sans({
  variable: "--font-mona-sans",
  subsets: ["latin"],
  
  display: "swap",
});

export const metadata: Metadata = {
  title: "Spoken Pages",
  description: "Transform your books into interactive AI  conversations m Upload your PDF, get a summary, and start talking to your book via voice.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${ibmPlexSerif.variable} ${monaSans.variable} relative font-sans h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider appearance={{ theme: shadcn }}>
          <Navbar />
          {children}
          <Toaster />
        </ClerkProvider>

      </body>
    </html>
  );
}
