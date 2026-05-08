import { Client } from "@notionhq/client";
import type {
  PageObjectResponse,
  QueryDatabaseResponse,
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
