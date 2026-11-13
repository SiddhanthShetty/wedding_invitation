import type { Metadata } from "next";
import { PrintSheet } from "@/components/PrintSheet";

export const metadata: Metadata = { title: "QR code for printing", robots: { index: false, follow: false } };

export default function Page() {
  return <PrintSheet layout="qr" />;
}
