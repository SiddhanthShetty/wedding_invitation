import { weddingConfig, type Families as FamiliesConfig } from "@/config/wedding";
import { Corner, Divider } from "./art";

type Person = { name: string; parents: string | null; relation: "daughter" | "son" };

/**
 * The formal invitation lines, with each set of parents under their child:
 *   Together with our families, we request the honour of your presence at the marriage of
 *   [bride]  D/o [bride's parents]
 *   with
 *   [groom]  S/o [groom's parents]
 * With no parents' names filled in, it names just the couple.
 */
export function familyLines(f: FamiliesConfig, brideName: string, groomName: string) {
  const bride: Person = { name: f.brideFullName ?? brideName, parents: f.brideParents, relation: "daughter" };
  const groom: Person = { name: f.groomFullName ?? groomName, parents: f.groomParents, relation: "son" };
  const blessings = { bride: f.brideGrandparents, groom: f.groomGrandparents };
  if (f.brideParents || f.groomParents) {
    return {
      blessings,
      intro: "Together with our families, we request the honour of your presence at the marriage of",
      bride,
      joiner: "with",
      groom,
      closing: null,
    };
  }
  return {
    blessings,
    intro: "Together with their families",
    bride,
    joiner: "and",
    groom,
    closing: "request the honour of your presence at their marriage",
  };
}

const SHORT = { daughter: "D/o", son: "S/o" } as const;
const LONG = { daughter: "Daughter of", son: "Son of" } as const;

function Couple({ person }: { person: Person }) {
  return (
    <>
      <p className="text-[clamp(2.4rem,9vw,3.2rem)] leading-tight font-medium italic">{person.name}</p>
      {person.parents ? (
        <p className="mx-auto mt-1.5 max-w-md text-[1.2rem] leading-snug text-balance">
          {/* Shown as D/o or S/o; screen readers hear "Daughter of" or "Son of". */}
          <span aria-hidden="true" className="font-label text-[0.95rem] tracking-wide text-gold-deep">
            {SHORT[person.relation]}
          </span>
          <span className="sr-only">{LONG[person.relation]}</span> {person.parents}
        </p>
      ) : null}
    </>
  );
}

/** "With the blessings of" and the grandparents, bride's side first. */
function Blessings({ bride, groom, brideName }: { bride: string[] | null; groom: string[] | null; brideName: string }) {
  // A missing side is left out for guests; the local preview shows where it will go.
  const preview = process.env.NODE_ENV !== "production";
  if (!bride && !groom && !preview) return null;
  return (
    <div className="mb-8">
      <p className="font-label text-[0.95rem] tracking-[0.14em] text-gold-deep">With the blessings of</p>
      <ul className="mt-2 space-y-0.5 text-[1.15rem] leading-snug">
        {bride ? (
          bride.map((n) => <li key={`b-${n}`}>{n}</li>)
        ) : preview ? (
          <li className="text-[1rem] text-maroon/60 italic">
            <span className="border-b border-dashed border-maroon/40">{brideName}&rsquo;s grandparents</span> (only you can see this until it&rsquo;s filled in)
          </li>
        ) : null}
        {groom?.map((n) => <li key={`g-${n}`}>{n}</li>)}
      </ul>
      <Divider className="mt-6" color="#B9853A" />
    </div>
  );
}

export function Families() {
  const l = familyLines(weddingConfig.families, weddingConfig.brideName, weddingConfig.groomName);
  return (
    <section id="families" aria-labelledby="families-title" className="bg-paper px-5 pb-20 sm:pb-28">
      <h2 id="families-title" className="sr-only">
        From our families
      </h2>
      <div className="relative mx-auto max-w-2xl border border-gold bg-ivory px-6 py-12 text-center shadow-[0_14px_40px_-26px_rgba(94,11,18,0.5)] sm:px-14 sm:py-16">
        <div className="pointer-events-none absolute inset-2 border border-gold/50" aria-hidden="true" />
        <Corner className="absolute top-3.5 left-3.5 size-10" color="#B9853A" />
        <Corner className="absolute top-3.5 right-3.5 size-10 rotate-90" color="#B9853A" />
        <Corner className="absolute right-3.5 bottom-3.5 size-10 rotate-180" color="#B9853A" />
        <Corner className="absolute bottom-3.5 left-3.5 size-10 -rotate-90" color="#B9853A" />

        <div className="relative font-display text-maroon">
          <Blessings bride={l.blessings.bride} groom={l.blessings.groom} brideName={weddingConfig.brideName} />
          <p className="mx-auto max-w-md text-[1.2rem] leading-relaxed text-pretty italic">{l.intro}</p>
          <div className="mt-6">
            <Couple person={l.bride} />
          </div>
          <p className="my-4 font-label text-[1rem] tracking-[0.2em] text-gold-deep">{l.joiner}</p>
          <Couple person={l.groom} />
          {l.closing ? <p className="mx-auto mt-5 max-w-md text-[1.15rem] leading-relaxed text-pretty italic">{l.closing}</p> : null}
          <Divider className="mt-8" color="#B9853A" />
        </div>
      </div>
    </section>
  );
}
