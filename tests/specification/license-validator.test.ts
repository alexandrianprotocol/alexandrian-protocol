/**
 * Unit tests: LicenseValidator
 */
import { describe, it, expect } from "vitest";
import { LicenseValidator, LICENSE_PRESETS } from "@alexandrian/protocol/core";

const commercialPayout = { metadata: { payout: { address: "0x0000000000000000000000000000000000000001", price: 0 } } };

describe("LicenseValidator.validateTerms()", () => {
  it("accepts valid terms with commercial use and attribution", () => {
    const terms = { commercialUse: true, attribution: true, shareAlike: false, derivatives: true };
    expect(LicenseValidator.validateTerms(terms).valid).toBe(true);
  });

  it("rejects shareAlike without derivatives", () => {
    const terms = { commercialUse: true, attribution: true, shareAlike: true, derivatives: false };
    const result = LicenseValidator.validateTerms(terms);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("ShareAlike"))).toBe(true);
  });
});

describe("LicenseValidator.validateLicense()", () => {
  it("accepts CC-BY-4.0 with payout metadata", () => {
    const license = { type: "CC-BY-4.0" as const, terms: LICENSE_PRESETS["CC-BY-4.0"], ...commercialPayout };
    const result = LicenseValidator.validateLicense(license);
    expect(result.valid).toBe(true);
  });

  it("accepts MIT with payout metadata", () => {
    const license = { type: "MIT" as const, terms: LICENSE_PRESETS["MIT"], ...commercialPayout };
    expect(LicenseValidator.validateLicense(license).valid).toBe(true);
  });

  it("accepts CC-BY-NC-4.0 (no commercial use, no payout required)", () => {
    const license = { type: "CC-BY-NC-4.0" as const, terms: LICENSE_PRESETS["CC-BY-NC-4.0"] };
    expect(LicenseValidator.validateLicense(license).valid).toBe(true);
  });

  it("rejects commercial use without payout address or price", () => {
    const license = { type: "CC-BY-4.0" as const, terms: LICENSE_PRESETS["CC-BY-4.0"] };
    const result = LicenseValidator.validateLicense(license);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes("payout"))).toBe(true);
  });
});

describe("LicenseValidator.areCompatible()", () => {
  const mit = { type: "MIT" as const, terms: LICENSE_PRESETS["MIT"] };
  const ccBy = { type: "CC-BY-4.0" as const, terms: LICENSE_PRESETS["CC-BY-4.0"] };
  const ccBySa = { type: "CC-BY-SA-4.0" as const, terms: LICENSE_PRESETS["CC-BY-SA-4.0"] };
  const ccByNc = { type: "CC-BY-NC-4.0" as const, terms: LICENSE_PRESETS["CC-BY-NC-4.0"] };
  const proprietary = { type: "PROPRIETARY" as const, terms: LICENSE_PRESETS["PROPRIETARY"] };

  it("MIT is compatible with MIT", () => {
    expect(LicenseValidator.areCompatible(mit, mit)).toBe(true);
  });

  it("CC-BY-4.0 and CC-BY-SA-4.0 (source shareAlike) require target shareAlike", () => {
    expect(LicenseValidator.areCompatible(ccBySa, ccBy)).toBe(false);
    expect(LicenseValidator.areCompatible(ccBySa, ccBySa)).toBe(true);
  });

  it("CC-BY-NC-4.0 is incompatible with commercial target (CC-BY-4.0)", () => {
    expect(LicenseValidator.areCompatible(ccByNc, ccBy)).toBe(false);
  });

  it("PROPRIETARY (no derivatives) is incompatible with CC-BY-4.0", () => {
    expect(LicenseValidator.areCompatible(proprietary, ccBy)).toBe(false);
    expect(LicenseValidator.areCompatible(ccBy, proprietary)).toBe(false);
  });
});

describe("LicenseValidator.getStrictestLicense()", () => {
  it("returns combined terms (stricter of set)", () => {
    const mit = { type: "MIT" as const, terms: LICENSE_PRESETS["MIT"] };
    const nc = { type: "CC-BY-NC-4.0" as const, terms: LICENSE_PRESETS["CC-BY-NC-4.0"] };
    const strictest = LicenseValidator.getStrictestLicense([mit, nc]);
    expect(strictest.terms.commercialUse).toBe(false);
    expect(strictest.terms.attribution).toBe(true);
  });
});
