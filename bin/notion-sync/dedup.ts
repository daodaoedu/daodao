import { execSync } from "child_process";

export interface ExistingIssue {
  number: number;
  labels: { name: string }[];
}

export function findExistingIssue(
  targetRepo: string,
  shortId: string,
  fullPageId?: string
): ExistingIssue | null {
  const label = `notion:${shortId}`;
  try {
    const output = execSync(
      `gh issue list --repo daodaoedu/${targetRepo} --label "${label}" --state open --json number,labels,body`,
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    );
    const issues: (ExistingIssue & { body?: string })[] = JSON.parse(output.trim() || "[]");
    if (issues.length === 0) return null;

    // Verify against full page ID to avoid false positives from shortId collisions
    if (fullPageId) {
      const match = issues.find((i) => i.body?.includes(fullPageId));
      return match ?? null;
    }

    return issues[0] ?? null;
  } catch {
    // gh CLI not available or repo not accessible — treat as no existing issue
    return null;
  }
}

export function buildNotionLabel(shortId: string): string {
  return `notion:${shortId}`;
}
