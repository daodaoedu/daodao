import { execSync } from "child_process";

export interface ExistingIssue {
  number: number;
  labels: { name: string }[];
}

export function findExistingIssue(
  targetRepo: string,
  shortId: string
): ExistingIssue | null {
  const label = `notion:${shortId}`;
  try {
    const output = execSync(
      `gh issue list --repo daodaoedu/${targetRepo} --label "${label}" --state open --json number,labels`,
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    );
    const issues: ExistingIssue[] = JSON.parse(output.trim() || "[]");
    return issues.length > 0 ? (issues[0] ?? null) : null;
  } catch {
    // gh CLI not available or repo not accessible — treat as no existing issue
    return null;
  }
}

export function buildNotionLabel(shortId: string): string {
  return `notion:${shortId}`;
}
