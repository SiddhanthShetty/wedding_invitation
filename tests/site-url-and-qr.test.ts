import jsQR from "jsqr";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import { generateQr } from "@/lib/qr";
import { emailUrl, whatsappUrl } from "@/lib/share";
import { parseProductionUrl } from "@/lib/site-url";

describe("parseProductionUrl", () => {
  it.each([
    ["https://sweekruti-siddhanth.com", "https://sweekruti-siddhanth.com"],
    ["https://sweekruti-siddhanth.com/", "https://sweekruti-siddhanth.com"],
    ["https://sweekruti-siddhanth-wedding.vercel.app", "https://sweekruti-siddhanth-wedding.vercel.app"],
    ["https://wedding.example.in/invite/", "https://wedding.example.in/invite"],
  ])("accepts %s", (input, expected) => {
    expect(parseProductionUrl(input)).toEqual({ ok: true, url: expected });
  });

  it.each([
    undefined,
    "",
    "not a url",
    "http://sweekruti-siddhanth.com",
    "http://localhost:3000",
    "https://localhost:3000",
    "https://127.0.0.1",
    "https://192.168.1.20:3000",
    "https://[::1]:3000",
    "file:///Users/me/index.html",
    "https://my-mac.local",
    "https://intranet",
    "https://wedding-git-main-sid.vercel.app",
    "https://wedding-a1b2c3d4e-sid.vercel.app",
    "https://deploy-preview-12--wedding.netlify.app",
    "https://user:pass@sweekruti-siddhanth.com",
  ])("refuses %s", (input) => {
    expect(parseProductionUrl(input).ok).toBe(false);
  });
});

describe("QR code", () => {
  const url = "https://sweekruti-siddhanth.com";

  it("PNG decodes back to exactly the invitation address", async () => {
    const { pngDataUrl } = await generateQr(url);
    const png = PNG.sync.read(Buffer.from(pngDataUrl.split(",")[1]!, "base64"));
    expect(png.width).toBeGreaterThanOrEqual(1000);
    const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    expect(decoded?.data).toBe(url);
  });

  it("still decodes when shrunk to a small, low-contrast print", async () => {
    const { pngDataUrl } = await generateQr(url);
    const src = PNG.sync.read(Buffer.from(pngDataUrl.split(",")[1]!, "base64"));
    const size = 240;
    const out = new Uint8ClampedArray(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const s = (Math.floor((y * src.height) / size) * src.width + Math.floor((x * src.width) / size)) * 4;
        const d = (y * size + x) * 4;
        // Wash the image out, as a faded print would be.
        for (let c = 0; c < 3; c++) out[d + c] = 70 + src.data[s + c]! * 0.6;
        out[d + 3] = 255;
      }
    }
    expect(jsQR(out, size, size)?.data).toBe(url);
  });

  it("SVG is a standalone, scalable image with a quiet zone", async () => {
    const { svg } = await generateQr(url);
    expect(svg).toMatch(/^<svg[^>]+viewBox=/);
    expect(svg).toContain("#421319");
  });
});

describe("share links", () => {
  const url = "https://sweekruti-siddhanth.com";
  it("WhatsApp link carries the invitation address", () => {
    const wa = new URL(whatsappUrl(url));
    expect(wa.origin).toBe("https://wa.me");
    expect(wa.searchParams.get("text")).toContain(url);
    expect(wa.searchParams.get("text")).toContain("Sweekruti & Siddhanth");
  });
  it("email link carries the invitation address", () => {
    const mail = emailUrl(url);
    expect(mail.startsWith("mailto:?subject=")).toBe(true);
    expect(decodeURIComponent(mail)).toContain(url);
  });
});
