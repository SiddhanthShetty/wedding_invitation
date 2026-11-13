import { coupleNames, weddingConfig } from "@/config/wedding";
import { formatDate } from "@/lib/datetime";
import { weddingInstant } from "@/lib/wedding";
import { Countdown } from "@/components/Countdown";
import { COVER_SCRIPT, Cover, PetalShower } from "@/components/Cover";
import { Events } from "@/components/Events";
import { Families } from "@/components/Families";
import { Footer } from "@/components/Footer";
import { GoodToKnow, hasGoodToKnow } from "@/components/GoodToKnow";
import { Hero } from "@/components/Hero";
import { InviteProvider } from "@/components/InviteProvider";
import { Seal } from "@/components/Monogram";
import { MusicProvider } from "@/components/MusicProvider";
import { Nav } from "@/components/Nav";
import { Rsvp } from "@/components/Rsvp";
import { Share } from "@/components/Share";
import { Story } from "@/components/Story";

export default function Home() {
  const target = weddingInstant();
  const date = weddingConfig.weddingDate ? formatDate(weddingConfig.weddingDate) : null;
  const respondBy = weddingConfig.rsvp.respondBy ? formatDate(weddingConfig.rsvp.respondBy).long : null;
  return (
    <InviteProvider>
    <MusicProvider track={weddingConfig.music}>
      <script dangerouslySetInnerHTML={{ __html: COVER_SCRIPT }} />
      <Cover bride={weddingConfig.brideName} groom={weddingConfig.groomName} />
      <PetalShower />
      <Nav names={coupleNames} logo={<Seal className="size-10" size={80} />} showGoodToKnow={hasGoodToKnow(weddingConfig.goodToKnow)} />
      <main>
        <Hero />
        <Story />
        <Families />
        <Events />
        <GoodToKnow notes={weddingConfig.goodToKnow} />
        <Rsvp events={weddingConfig.events.map((e) => ({ id: e.id, name: e.name }))} respondBy={respondBy} />
        <Countdown targetMs={target ? target.getTime() : null} dateLabel={date ? `${date.weekday}, ${date.long} (${weddingConfig.timezone === "Asia/Kolkata" ? "India time" : weddingConfig.timezone})` : null} />
        <Share />
      </main>
      <Footer />
    </MusicProvider>
    </InviteProvider>
  );
}
