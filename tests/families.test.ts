import { describe, expect, it } from "vitest";
import { familyLines } from "@/components/Families";
import { weddingConfig } from "@/config/wedding";

const none = { brideFullName: null, groomFullName: null, brideParents: null, groomParents: null, brideGrandparents: null, groomGrandparents: null };

describe("family lines", () => {
  it("has the groom's grandparents and leaves the bride's to be added", () => {
    expect(weddingConfig.families.groomGrandparents).toEqual(["Vasu and Gulabi Shetty", "Vasu and Sakubai Shetty"]);
    expect(weddingConfig.families.brideGrandparents).toBeNull();
  });

  it("uses the parents' names as given", () => {
    expect(weddingConfig.families.brideParents).toBe("Mr Krishna Gambhir and Mrs Vanita Gambhir");
    expect(weddingConfig.families.groomParents).toBe("Mr Chandrahas Shetty and Mrs Ramita Shetty");
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
    expect(l.bride).toEqual({ name: "Sweekruti A", parents: "Mr A and Mrs A", relation: "daughter" });
    expect(l.joiner).toBe("with");
    expect(l.groom).toEqual({ name: "Siddhanth", parents: "Mr B and Mrs B", relation: "son" });
    expect(l.closing).toBeNull();
    expect(l.blessings).toEqual({ bride: null, groom: ["C and D B"] });
  });

  it("works when only one side's parents are given", () => {
    const l = familyLines({ ...none, groomParents: "Mr B and Mrs B" }, "Sweekruti", "Siddhanth");
    expect([l.bride.parents, l.groom.parents]).toEqual([null, "Mr B and Mrs B"]);
    expect(l.joiner).toBe("with");
  });
});
