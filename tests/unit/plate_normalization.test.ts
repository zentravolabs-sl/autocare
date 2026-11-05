import { describe, it, expect } from "vitest";
import { normalizeRegistrationNumber } from "../../src/lib/validation/vehicle";

describe("Sri Lankan Vehicle License Plate Normalization", () => {
  it("normalizes modern plate with province code", () => {
    expect(normalizeRegistrationNumber("wp cab - 1234")).toBe("WP CAB-1234");
    expect(normalizeRegistrationNumber("WP  CAB 1234")).toBe("WP CAB-1234");
    expect(normalizeRegistrationNumber("sp caa-5678")).toBe("SP CAA-5678");
    expect(normalizeRegistrationNumber("CP KY-9999")).toBe("CP KY-9999");
    expect(normalizeRegistrationNumber("NW  BBD 4321")).toBe("NW BBD-4321");
  });

  it("normalizes modern plate without province code", () => {
    expect(normalizeRegistrationNumber("cab 1234")).toBe("CAB-1234");
    expect(normalizeRegistrationNumber("caa-5678")).toBe("CAA-5678");
    expect(normalizeRegistrationNumber("WP 1234")).toBe("WP-1234");
  });

  it("normalizes vintage numeric plates", () => {
    expect(normalizeRegistrationNumber("19 - 4567")).toBe("19-4567");
    expect(normalizeRegistrationNumber("65 9999")).toBe("65-9999");
    expect(normalizeRegistrationNumber("300-1122")).toBe("300-1122");
  });

  it("handles trims and clean formatting", () => {
    expect(normalizeRegistrationNumber("  WP   CAB-1234   ")).toBe("WP CAB-1234");
    expect(normalizeRegistrationNumber("")).toBe("");
  });
});
