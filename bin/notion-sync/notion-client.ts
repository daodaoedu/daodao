import { Client } from "@notionhq/client";
import type {
  PageObjectResponse,
  QueryDatabaseResponse,
  BlockObjectResponse,
} from "@notionhq/client/build/src/api-endpoints.js";

export type { PageObjectResponse };

export function createNotionClient(apiKey: string): Client {
  return new Client({ auth: apiKey });
}

export async function queryDatabase(
  client: Client,
  databaseId: string,
  filter?: object
): Promise<PageObjectResponse[]> {
  const results: PageObjectResponse[] = [];
  let cursor: string | undefined;

  do {
    const response: QueryDatabaseResponse = await client.databases.query({
      database_id: databaseId,
      filter: filter as Parameters<typeof client.databases.query>[0]["filter"],
      start_cursor: cursor,
      page_size: 100,
    });

    for (const page of response.results) {
      if (page.object === "page" && "properties" in page) {
        results.push(page as PageObjectResponse);
      }
    }

    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return results;
}

export async function updatePageProperty(
  client: Client,
  pageId: string,
  properties: Record<string, unknown>
): Promise<void> {
  await client.pages.update({
    page_id: pageId,
    properties: properties as Parameters<typeof client.pages.update>[0]["properties"],
  });
}

function blockToMarkdown(block: BlockObjectResponse): string {
  switch (block.type) {
    case "paragraph":
      return block.paragraph.rich_text.map((t) => t.plain_text).join("") + "\n";
    case "heading_1":
      return "# " + block.heading_1.rich_text.map((t) => t.plain_text).join("") + "\n";
    case "heading_2":
      return "## " + block.heading_2.rich_text.map((t) => t.plain_text).join("") + "\n";
    case "heading_3":
      return "### " + block.heading_3.rich_text.map((t) => t.plain_text).join("") + "\n";
    case "bulleted_list_item":
      return "- " + block.bulleted_list_item.rich_text.map((t) => t.plain_text).join("") + "\n";
    case "numbered_list_item":
      return "1. " + block.numbered_list_item.rich_text.map((t) => t.plain_text).join("") + "\n";
    case "to_do":
      return (block.to_do.checked ? "- [x] " : "- [ ] ") + block.to_do.rich_text.map((t) => t.plain_text).join("") + "\n";
    case "code":
      return "```" + (block.code.language ?? "") + "\n" + block.code.rich_text.map((t) => t.plain_text).join("") + "\n```\n";
    case "quote":
      return "> " + block.quote.rich_text.map((t) => t.plain_text).join("") + "\n";
    case "callout":
      return "> " + block.callout.rich_text.map((t) => t.plain_text).join("") + "\n";
    case "divider":
      return "---\n";
    default:
      return "";
  }
}

export async function fetchPageContent(client: Client, pageId: string): Promise<string> {
  const lines: string[] = [];
  let cursor: string | undefined;

  do {
    const response = await client.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
      page_size: 100,
    });

    for (const block of response.results) {
      const md = blockToMarkdown(block as BlockObjectResponse);
      if (md) lines.push(md);
    }

    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return lines.join("").trim();
}

export function extractProperty(
  page: PageObjectResponse,
  propName: string
): unknown {
  const props = page.properties;
  if (!props || !(propName in props)) return undefined;
  const prop = props[propName];
  if (!prop) return undefined;

  switch (prop.type) {
    case "title":
      return prop.title.map((t) => t.plain_text).join("");
    case "rich_text":
      return prop.rich_text.map((t) => t.plain_text).join("");
    case "select":
      return prop.select?.name ?? null;
    case "multi_select":
      return prop.multi_select.map((s) => s.name);
    case "checkbox":
      return prop.checkbox;
    case "url":
      return prop.url;
    case "formula":
      if (prop.formula.type === "string") return prop.formula.string;
      return null;
    default:
      return null;
  }
}
