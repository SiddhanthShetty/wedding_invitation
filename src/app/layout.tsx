import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { coupleNames } from "@/config/wedding";
import { allowIndexing, siteUrl } from "@/lib/site-url";
import "./globals.css";

const cormorant = localFont({
  variable: "--font-cormorant",
  display: "swap",
  src: [
    { path: "../fonts/cormorant-garamond-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/cormorant-garamond-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/cormorant-garamond-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../fonts/cormorant-garamond-latin-400-italic.woff2", weight: "400", style: "italic" },
    { path: "../fonts/cormorant-garamond-latin-500-italic.woff2", weight: "500", style: "italic" },
  ],
});

const marcellus = localFont({
  variable: "--font-marcellus",
  display: "swap",
  src: [{ path: "../fonts/marcellus-latin-400-normal.woff2", weight: "400", style: "normal" }],
});

const title = `${coupleNames} | Wedding Invitation`;
const description =
  "Join us as we celebrate the wedding of Sweekruti and Siddhanth. A beautiful celebration of love, tradition and Mangalorean heritage.";

export const metadata: Metadata = {
  metadataBase: siteUrl.ok ? new URL(siteUrl.url) : undefined,
  title: { default: title, template: `%s | ${coupleNames}` },
  description,
  alternates: siteUrl.ok ? { canonical: "/" } : undefined,
  openGraph: { type: "website", title, description, siteName: coupleNames, locale: "en_IN", url: siteUrl.ok ? "/" : undefined },
  twitter: { card: "summary_large_image", title, description },
  robots: allowIndexing ? { index: true, follow: true } : { index: false, follow: false },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: "#F5E5D1", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${cormorant.variable} ${marcellus.variable}`} suppressHydrationWarning>
      {/* Browser extensions often add attributes to <body> before React loads; ignore those. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
