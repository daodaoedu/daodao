import { Client } from "@notionhq/client";

const REQUIRED_PROPERTIES = [
  "Task name",
  "Status",
  "Sync to GitHub",
  "Auto Mode",
  "Scope",
  "Target Repo",
  "GitHub Issue",
  "GitHub PR",
  "Acceptance Criteria",
];

export interface ValidationResult {
  valid: boolean;
  missing: string[];
}

export async function validateDatabaseSchema(
  client: Client,
  databaseId: string
): Promise<ValidationResult> {
  const db = await client.databases.retrieve({ database_id: databaseId });
  const existing = Object.keys(db.properties);
  const missing = REQUIRED_PROPERTIES.filter((p) => !existing.includes(p));
  return { valid: missing.length === 0, missing };
}

export function assertSchemaValid(result: ValidationResult): void {
  if (!result.valid) {
    const list = result.missing.join(", ");
    process.stderr.write(
      `[schema-validate] FAIL: missing required Notion DB properties: ${list}\n`
    );
    process.exit(1);
  }
}
