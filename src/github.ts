import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const GITHUB_API_BASE_URL = "https://api.github.com";
const PER_PAGE = 100;
const MAX_PAGES = 5;
const GH_TIMEOUT_MS = 20_000;
const GH_MAX_BUFFER = 8 * 1024 * 1024;
const GH_RESOLVE_TIMEOUT_MS = 5_000;

let cachedGhCommand: string | null = null;

export type Repo = {
  id: number;
  name: string;
  fullName: string;
  url: string;
  description: string | null;
  language: string | null;
  isPrivate: boolean;
  isArchived: boolean;
  updatedAt: string;
};

export type RestRepo = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  private: boolean;
  archived: boolean;
  updated_at: string;
};

export class GitHubAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitHubAuthError";
  }
}

export function normalizeRepo(repo: RestRepo): Repo {
  return {
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    url: repo.html_url,
    description: repo.description,
    language: repo.language,
    isPrivate: repo.private,
    isArchived: repo.archived,
    updatedAt: repo.updated_at,
  };
}

export function parseGhJsonLines(output: string): Repo[] {
  return output
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => normalizeRepo(JSON.parse(line) as RestRepo));
}

function getGhErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const stderr = (error as Error & { stderr?: string }).stderr?.trim();
    return stderr || error.message;
  }

  return String(error);
}

async function resolveGhCommand(): Promise<string> {
  if (cachedGhCommand) {
    return cachedGhCommand;
  }

  const shell = process.env.SHELL || "sh";

  try {
    const { stdout } = await execFileAsync(shell, ["-lc", "command -v gh"], {
      timeout: GH_RESOLVE_TIMEOUT_MS,
    });
    const command = stdout.trim().split(/\r?\n/)[0];

    if (!command) {
      throw new Error("command -v gh returned an empty result.");
    }

    cachedGhCommand = command;
    return command;
  } catch (error) {
    throw new GitHubAuthError(
      `gh CLI is unavailable: ${getGhErrorMessage(error)}. Add a GitHub token in extension preferences.`,
    );
  }
}

export async function listRepositories(token?: string): Promise<Repo[]> {
  const normalizedToken = token?.trim() ?? "";
  return normalizedToken
    ? listRepositoriesWithToken(normalizedToken)
    : listRepositoriesWithGh();
}

async function listRepositoriesWithToken(token: string): Promise<Repo[]> {
  const repositories: Repo[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const url = new URL(`${GITHUB_API_BASE_URL}/user/repos`);
    url.searchParams.set("affiliation", "owner");
    url.searchParams.set("sort", "updated");
    url.searchParams.set("per_page", String(PER_PAGE));
    url.searchParams.set("page", String(page));

    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "raycast-open-github-repos",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new GitHubAuthError("GitHub token is invalid or expired.");
      }
      if (response.status === 403) {
        throw new GitHubAuthError(
          "GitHub API rejected the request. Check token scopes or rate limit.",
        );
      }
      throw new Error(
        `GitHub API request failed with status ${response.status}.`,
      );
    }

    const pageRepos = (await response.json()) as RestRepo[];
    repositories.push(...pageRepos.map(normalizeRepo));

    if (pageRepos.length < PER_PAGE) {
      break;
    }
  }

  return repositories;
}

async function listRepositoriesWithGh(): Promise<Repo[]> {
  const command = await resolveGhCommand();
  const args = [
    "api",
    "user/repos",
    "--paginate",
    "--method",
    "GET",
    "-f",
    "affiliation=owner",
    "-f",
    "sort=updated",
    "-f",
    "per_page=100",
    "--jq",
    ".[] | {id, name, full_name, html_url, description, language, private, archived, updated_at}",
  ];

  try {
    const { stdout } = await execFileAsync(command, args, {
      timeout: GH_TIMEOUT_MS,
      maxBuffer: GH_MAX_BUFFER,
    });

    return parseGhJsonLines(stdout);
  } catch (error) {
    throw new GitHubAuthError(
      `gh CLI is unavailable or not authenticated: ${getGhErrorMessage(error)}. Add a GitHub token in extension preferences.`,
    );
  }
}
