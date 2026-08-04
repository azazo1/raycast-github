import { describe, expect, test } from "bun:test";

import { GitHubAuthError, RestRepo, normalizeRepo, parseGhJsonLines } from "../src/github";

const sampleRepo: RestRepo = {
  id: 1,
  name: "demo",
  full_name: "azazo1/demo",
  html_url: "https://github.com/azazo1/demo",
  description: "A demo repo",
  language: "TypeScript",
  private: false,
  archived: false,
  updated_at: "2026-08-01T12:00:00Z",
};

describe("github repo normalization", () => {
  test("maps REST payload fields to the Repo model", () => {
    const repo = normalizeRepo(sampleRepo);

    expect(repo.fullName).toBe("azazo1/demo");
    expect(repo.url).toBe("https://github.com/azazo1/demo");
    expect(repo.isPrivate).toBe(false);
    expect(repo.isArchived).toBe(false);
  });

  test("parses gh api JSON lines output", () => {
    const secondRepo: RestRepo = {
      ...sampleRepo,
      id: 2,
      name: "demo2",
      full_name: "azazo1/demo2",
    };
    const output = `${JSON.stringify(sampleRepo)}\n${JSON.stringify(secondRepo)}`;

    const repos = parseGhJsonLines(output);

    expect(repos).toHaveLength(2);
    expect(repos[1].fullName).toBe("azazo1/demo2");
  });

  test("keeps auth errors user friendly", () => {
    const error = new GitHubAuthError("Add a GitHub token in extension preferences.");

    expect(error.name).toBe("GitHubAuthError");
    expect(error.message).toContain("GitHub token");
  });
});
