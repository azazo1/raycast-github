import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  List,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";

import { GitHubAuthError, Repo, listRepositories } from "./github";

type Preferences = {
  githubToken?: string;
};

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function repoMatchesQuery(repo: Repo, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return [repo.fullName, repo.description, repo.language].some((value) =>
    Boolean(value?.toLowerCase().includes(normalizedQuery)),
  );
}

function RepoListItem({
  repo,
  onRefresh,
}: {
  repo: Repo;
  onRefresh: () => void;
}) {
  const accessories: List.Item.Accessory[] = [];

  if (repo.language) {
    accessories.push({ icon: Icon.Code, text: repo.language });
  }
  if (repo.isPrivate) {
    accessories.push({
      icon: { source: Icon.Lock, tintColor: Color.Yellow },
      tooltip: "Private",
    });
  }
  if (repo.isArchived) {
    accessories.push({
      icon: { source: Icon.Layers, tintColor: Color.Orange },
      tooltip: "Archived",
    });
  }
  accessories.push({ icon: Icon.Clock, text: formatUpdatedAt(repo.updatedAt) });

  return (
    <List.Item
      title={repo.fullName}
      subtitle={repo.description ?? undefined}
      icon={repo.isPrivate ? Icon.Lock : Icon.Globe}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={repo.url} />
          <Action.CopyToClipboard title="Copy URL" content={repo.url} />
          <Action
            title="Refresh"
            icon={Icon.RotateClockwise}
            onAction={onRefresh}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
        </ActionPanel>
      }
    />
  );
}

export default function SearchRepos() {
  const { githubToken } = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const { data, error, isLoading, revalidate } = useCachedPromise(
    (token: string) => listRepositories(token),
    [githubToken ?? ""],
    { failureToastOptions: { title: "Failed to load repositories" } },
  );
  const filteredRepos = data?.filter((repo) =>
    repoMatchesQuery(repo, searchText),
  );

  if (error) {
    const title =
      error instanceof GitHubAuthError
        ? error.message
        : "Failed to load repositories. Check network or GitHub API status.";
    const description =
      error instanceof GitHubAuthError
        ? "Add a GitHub token in extension preferences or authenticate gh CLI."
        : "Check your network connection and try again.";

    return (
      <List>
        <List.EmptyView
          icon={Icon.Lock}
          title={title}
          description={description}
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
              <Action
                title="Retry"
                icon={Icon.RotateClockwise}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (!isLoading && data?.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Folder}
          title="No repositories found"
          description="Your GitHub account does not have any owned repositories."
        />
      </List>
    );
  }

  if (!isLoading && data && filteredRepos?.length === 0) {
    return (
      <List
        searchText={searchText}
        onSearchTextChange={setSearchText}
        filtering={false}
      >
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No repositories match"
          description="Try a different repository name, description, or language."
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      searchBarPlaceholder="Search your GitHub repositories"
    >
      {filteredRepos?.map((repo) => (
        <RepoListItem key={repo.id} repo={repo} onRefresh={revalidate} />
      ))}
    </List>
  );
}
