import { coupleNames } from "@/config/wedding";

export function shareText(url: string): string {
  return `With the blessings of our families, we invite you to the wedding of ${coupleNames}. Our invitation: ${url}`;
}

export const whatsappUrl = (url: string) => `https://wa.me/?text=${encodeURIComponent(shareText(url))}`;

export const emailUrl = (url: string) =>
  `mailto:?subject=${encodeURIComponent(`Wedding invitation: ${coupleNames}`)}&body=${encodeURIComponent(`${shareText(url)}\n`)}`;
