import { describe, expect, it } from "vitest";
import { RELATION, familyLines } from "@/components/Families";
import { weddingConfig } from "@/config/wedding";

const none = { brideFullName: null, groomFullName: null, brideParents: null, groomParents: null, brideGrandparents: null, groomGrandparents: null };

describe("family lines", () => {
  it("has the groom's grandparents and leaves the bride's to be added", () => {
    expect(weddingConfig.families.groomGrandparents).toEqual(["Lt. Shri Vasu Shetty and Lt. Smt. Gulabi Shetty", "Lt. Shri Vasu Shetty and Smt. Sakubai Shetty"]);
    expect(weddingConfig.families.brideGrandparents).toBeNull();
  });

  it("uses Shri and Smt. throughout", () => {
    const f = weddingConfig.families;
    for (const line of [f.brideParents, f.groomParents, ...(f.groomGrandparents ?? [])]) {
      expect(line).toMatch(/^(Lt\. )?Shri .+ and (Lt\. )?Smt\. .+$/);
      expect(line).not.toMatch(/\bMrs?\b/);
    }
  });

  it("abbreviates the relations, and spells them out for screen readers", () => {
    expect(RELATION.daughter).toEqual({ parents: ["D/o", "Daughter of"], grandparents: ["G/D/o", "Granddaughter of"] });
    expect(RELATION.son).toEqual({ parents: ["S/o", "Son of"], grandparents: ["G/S/o", "Grandson of"] });
  });

  it("uses the parents' names as given", () => {
    expect(weddingConfig.families.brideParents).toBe("Shri Krishna Gambhir and Smt. Vanita Gambhir");
    expect(weddingConfig.families.groomParents).toBe("Shri Chandrahas Shetty and Smt. Ramita Shetty");
  });

  it("names only the couple until the parents are filled in", () => {
    const l = familyLines(none, "Sweekruti", "Siddhanth");
    expect([l.intro, l.bride.name, l.joiner, l.groom.name, l.closing]).toEqual([
      "Together with their families",
      "Sweekruti",
      "and",
      "Siddhanth",
      "request the honour of your presence at their marriage",
    ]);
    expect([l.bride.parents, l.groom.parents]).toEqual([null, null]);
  });

  it("puts each set of parents under their child", () => {
    const l = familyLines({ ...none, brideFullName: "Sweekruti A", brideParents: "Mr A and Mrs A", groomParents: "Mr B and Mrs B", groomGrandparents: ["C and D B"] }, "Sweekruti", "Siddhanth");
    expect(l.intro).toBe("Together with our families, we request the honour of your presence at the marriage of");
    expect(l.bride).toEqual({ name: "Sweekruti A", parents: "Mr A and Mrs A", grandparents: null, relation: "daughter" });
    expect(l.joiner).toBe("with");
    expect(l.groom).toEqual({ name: "Siddhanth", parents: "Mr B and Mrs B", grandparents: ["C and D B"], relation: "son" });
    expect(l.closing).toBeNull();
  });

  it("works when only one side's parents are given", () => {
    const l = familyLines({ ...none, groomParents: "Mr B and Mrs B" }, "Sweekruti", "Siddhanth");
    expect([l.bride.parents, l.groom.parents]).toEqual([null, "Mr B and Mrs B"]);
    expect(l.joiner).toBe("with");
  });
});
