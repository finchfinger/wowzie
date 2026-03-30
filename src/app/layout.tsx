import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PlayingWidget } from "@/components/PlayingWidget";
import { Toaster } from "sonner";
import Script from "next/script";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";

export const metadata: Metadata = {
  title: {
    default: "Wowzi — Find & Book Kids' Camps and Classes",
    template: "%s | Wowzi",
  },
  description: "Browse, compare, and book the best kids' camps and classes near you. Everything from summer camps and STEM workshops to art programs and sports camps — all in one place.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://golly-roan.vercel.app"),
  openGraph: {
    siteName: "Wowzi",
    type: "website",
    title: "Wowzi — Find & Book Kids' Camps and Classes",
    description: "Browse, compare, and book the best kids' camps and classes near you.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Wowzi — Find & Book Kids' Camps and Classes",
    description: "Browse, compare, and book the best kids' camps and classes near you.",
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:wght@400;500;700&family=Google+Sans+Text:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      {GA_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}',{send_page_view:false});`}
          </Script>
        </>
      )}
      <body
        className="antialiased"
      >
        <Providers>
          <div className="flex min-h-screen flex-col">
            <Header />
            <div className="flex-1">{children}</div>
            <Footer />
          </div>
          <PlayingWidget />
          <Toaster position="bottom-center" richColors />
        </Providers>
      </body>
    </html>
  );
}
