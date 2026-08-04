import { describe, expect, test } from "bun:test";

import { fuzzyScore } from "../src/fuzzy";

describe("fuzzy score", () => {
  test("matches query characters in order", () => {
    expect(fuzzyScore("raycast-github", "rg")).toBeGreaterThanOrEqual(0);
    expect(fuzzyScore("raycast-github", "rgh")).toBeGreaterThanOrEqual(0);
  });

  test("rejects missing query characters", () => {
    expect(fuzzyScore("raycast-github", "xyz")).toBe(-1);
  });

  test("prefers contiguous matches", () => {
    expect(fuzzyScore("abcdef", "abc")).toBeGreaterThan(fuzzyScore("abcdef", "ace"));
  });
});
