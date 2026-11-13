import { coupleNames, weddingConfig } from "@/config/wedding";
import { formatDate } from "@/lib/datetime";
import { generateQr } from "@/lib/qr";
import { siteUrl } from "@/lib/site-url";
import { Corner, Divider } from "./art";
import { PrintButton } from "./CopyLink";
import { Emblem } from "./Monogram";

/** Printable layouts. "card" is a full invitation on A5; "qr" is a small scan-me card on A6. */
export async function PrintSheet({ layout }: { layout: "card" | "qr" }) {
  if (!siteUrl.ok) {
    return (
      <main className="grid min-h-svh place-items-center bg-paper p-6 text-center">
        <p className="max-w-md">
          This page prints the QR code, so it needs the invitation&rsquo;s permanent web address first. {siteUrl.reason}{" "}
          <a href="/" className="underline decoration-gold underline-offset-4">
            Back to the invitation
          </a>
        </p>
      </main>
    );
  }
  const qr = await generateQr(siteUrl.url);
  const date = weddingConfig.weddingDate ? formatDate(weddingConfig.weddingDate) : null;
  const card = layout === "card";
  const page = card ? { w: "148mm", h: "210mm", size: "A5" } : { w: "105mm", h: "148mm", size: "A6" };
  return (
    <main className="min-h-svh bg-parchment px-4 py-8 print:bg-paper print:p-0">
      <style>{`@page { size: ${page.size}; margin: 0 } @media print { html, body { width: ${page.w}; height: ${page.h}; } }`}</style>
      <div className="no-print mx-auto mb-6 flex max-w-xl flex-wrap items-center justify-center gap-3">
        <PrintButton />
        <a href={card ? "/print/qr" : "/print/card"} className="btn btn-line">
          {card ? "Switch to the small QR card" : "Switch to the full invitation card"}
        </a>
        <a href="/#share" className="btn btn-line">
          Back to the invitation
        </a>
        <p className="w-full text-center text-[1rem] text-maroon/75">
          Prints on {page.size}. In the print dialog, set margins to “None” and switch on “Background graphics”. Print one and scan it before printing the rest.
        </p>
      </div>

      <article
        className="relative mx-auto flex flex-col items-center justify-center bg-paper text-center text-maroon shadow-[0_2px_24px_rgba(66,19,25,0.18)] print:shadow-none"
        style={{ width: page.w, height: page.h, maxWidth: "100%", padding: "9mm", printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
      >
        <div className="absolute inset-[5mm] border border-gold" />
        <div className="absolute inset-[6.5mm] border border-gold/60" />
        <Corner className="absolute top-[8mm] left-[8mm] size-[11mm]" />
        <Corner className="absolute top-[8mm] right-[8mm] size-[11mm] rotate-90" />
        <Corner className="absolute right-[8mm] bottom-[8mm] size-[11mm] rotate-180" />
        <Corner className="absolute bottom-[8mm] left-[8mm] size-[11mm] -rotate-90" />

        <div className="relative px-[6mm]">
          <h1>
            <Emblem alt={coupleNames} priority sizes="70mm" className={`mx-auto ${card ? "w-[58mm]" : "w-[40mm]"}`} />
          </h1>
          {card ? <p className="mt-[1mm] font-label text-[10pt] tracking-[0.16em] text-gold-deep">Wedding Invitation</p> : null}
          {card ? (
            <>
              <Divider className="mt-[2mm]" color="#B9853A" />
              <p className="mx-auto mt-[2mm] max-w-[100mm] text-[11pt] leading-snug">
                With the blessings of our families, we invite you to join us as we celebrate the beginning of our forever.
              </p>
              <p className="mt-[3mm] font-label text-[10.5pt]">
                {date ? `${date.weekday}, ${date.long}` : "Date to be announced"}
                <br />
                {weddingConfig.location}
              </p>
            </>
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr.svg)}`}
            alt={`QR code that opens ${siteUrl.url}`}
            className="mx-auto mt-[3mm] bg-white"
            style={{ width: card ? "36mm" : "46mm", height: card ? "36mm" : "46mm" }}
          />
          <p className="mt-[2.5mm] font-label text-[9.5pt] text-gold-deep">
            {card ? "Scan for event details, directions and RSVP" : "Scan to open our wedding invitation"}
          </p>
          <p className="mt-[1mm] text-[8.5pt] break-all text-maroon/80">{siteUrl.url.replace(/^https:\/\//, "")}</p>
        </div>
      </article>
    </main>
  );
}
