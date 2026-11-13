import { Download, Mail, MessageCircle, Printer } from "lucide-react";
import { coupleNames } from "@/config/wedding";
import { generateQr } from "@/lib/qr";
import { emailUrl, whatsappUrl } from "@/lib/share";
import { siteUrl } from "@/lib/site-url";
import { CopyLink } from "./CopyLink";
import { Emblem } from "./Monogram";
import { SectionHeading } from "./Section";

const svgDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export async function Share() {
  if (!siteUrl.ok) {
    return (
      <section id="share" aria-labelledby="share-title" className="bg-parchment px-5 py-20 sm:py-28">
        <SectionHeading id="share-title" title="Share the Invitation" />
        <div className="mx-auto max-w-xl border border-gold bg-ivory p-6 text-center sm:p-8">
          <p>The QR code and sharing links will appear here once the invitation has its permanent web address.</p>
          {process.env.NODE_ENV !== "production" ? <p className="mt-3 text-[1rem] text-maroon/70">For the site owner: {siteUrl.reason} See the README, “Going live”.</p> : null}
        </div>
      </section>
    );
  }

  const url = siteUrl.url;
  const qr = await generateQr(url);
  return (
    <section id="share" aria-labelledby="share-title" className="bg-parchment px-5 py-20 sm:py-28">
      <SectionHeading id="share-title" title="Share the Invitation" lead="Scan the code with a phone camera, or send the link to family and friends." />
      <div className="mx-auto grid max-w-4xl items-center gap-10 md:grid-cols-[auto_1fr]">
        <figure className="mx-auto w-full max-w-[19rem] border border-gold bg-paper p-2">
          <div className="border border-gold/60 px-5 pt-3 pb-6 text-center">
            <Emblem alt={coupleNames} sizes="12rem" className="mx-auto w-40" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={svgDataUrl(qr.svg)} alt={`QR code that opens ${url}`} width={220} height={220} className="mx-auto mt-4 w-full max-w-[220px] bg-white" />
            <figcaption className="mt-3 font-label text-[0.9rem] text-gold-deep">Scan to open our invitation</figcaption>
          </div>
        </figure>

        <div>
          <p className="font-label text-[0.95rem] text-gold-deep">Invitation link</p>
          <p className="mt-1 border border-gold bg-ivory px-3 py-2.5 text-[1.05rem] break-all select-all">{url}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <CopyLink url={url} className="btn btn-maroon" />
            <a href={whatsappUrl(url)} target="_blank" rel="noopener noreferrer" className="btn btn-line">
              <MessageCircle className="size-4" aria-hidden="true" />
              Share on WhatsApp
            </a>
            <a href={emailUrl(url)} className="btn btn-line">
              <Mail className="size-4" aria-hidden="true" />
              Share by email
            </a>
          </div>

          <p className="mt-8 font-label text-[0.95rem] text-gold-deep">For printed invitations</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <a href={qr.pngDataUrl} download="sweekruti-siddhanth-qr.png" className="btn btn-line">
              <Download className="size-4" aria-hidden="true" />
              Download QR (PNG)
            </a>
            <a href={svgDataUrl(qr.svg)} download="sweekruti-siddhanth-qr.svg" className="btn btn-line">
              <Download className="size-4" aria-hidden="true" />
              Download QR (SVG)
            </a>
            <a href="/print/qr" className="btn btn-line">
              <Printer className="size-4" aria-hidden="true" />
              Print QR code
            </a>
            <a href="/print/card" className="btn btn-line">
              <Printer className="size-4" aria-hidden="true" />
              Print invitation card
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
