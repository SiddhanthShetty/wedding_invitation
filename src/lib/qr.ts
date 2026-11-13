import QRCode from "qrcode";

export const QR_DARK = "#421319";
export const QR_LIGHT = "#FFFFFF";

const base = { errorCorrectionLevel: "Q" as const, margin: 4, color: { dark: QR_DARK, light: QR_LIGHT } };

/** QR code for the invitation address, as an SVG string and a print-size PNG. */
export async function generateQr(url: string): Promise<{ svg: string; pngDataUrl: string }> {
  const [svg, pngDataUrl] = await Promise.all([
    QRCode.toString(url, { ...base, type: "svg" }),
    QRCode.toDataURL(url, { ...base, width: 1200 }),
  ]);
  return { svg, pngDataUrl };
}
