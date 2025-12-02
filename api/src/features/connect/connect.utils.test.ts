import { describe, test, expect } from "bun:test";
import { normalizePhoneNumber } from "./connect.utils";

describe("normalizePhoneNumber", () => {
  test("should normalize phone with country code +66", () => {
    expect(normalizePhoneNumber("+66812345678")).toBe("0812345678");
  });

  test("should normalize phone with country code 66", () => {
    expect(normalizePhoneNumber("66812345678")).toBe("0812345678");
  });

  test("should normalize phone with leading 0", () => {
    expect(normalizePhoneNumber("0812345678")).toBe("0812345678");
  });

  test("should normalize phone with spaces", () => {
    expect(normalizePhoneNumber("081 234 5678")).toBe("0812345678");
  });

  test("should normalize phone with dashes", () => {
    expect(normalizePhoneNumber("081-234-5678")).toBe("0812345678");
  });

  test("should normalize phone with parentheses", () => {
    expect(normalizePhoneNumber("(081) 234-5678")).toBe("0812345678");
  });

  test("should normalize phone with mixed formatting", () => {
    expect(normalizePhoneNumber("+66 (81) 234-5678")).toBe("0812345678");
  });

  test("should return null for invalid phone (too short)", () => {
    expect(normalizePhoneNumber("081234")).toBeNull();
  });

  test("should return null for invalid phone (too long)", () => {
    expect(normalizePhoneNumber("081234567890")).toBeNull();
  });

  test("should return null for empty string", () => {
    expect(normalizePhoneNumber("")).toBeNull();
  });

  test("should handle phone without leading 0 and add it", () => {
    expect(normalizePhoneNumber("812345678")).toBe("0812345678");
  });
});
