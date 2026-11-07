import { beforeEach, describe, expect, it, vi } from "vitest";
const { execSync } = vi.hoisted(() => ({ execSync: vi.fn() }));
vi.mock("child_process", () => ({ execSync, execFileSync: execSync }));
import { getIssueComments } from "../gh.js";
const comment = (body: string) => ({ body, createdAt: "2026-11-07T00:00:00Z", url: "url", author: { login: "pm" } });
const connection = (bodies: string[], more: boolean, cursor: string | null) => ({ nodes: bodies.map(comment), pageInfo: { hasPreviousPage: more, startCursor: cursor } });
beforeEach(() => execSync.mockReset());
describe("complete return history", () => {
  it("retains an older request behind 15 newer discussion comments", () => {
    execSync.mockReturnValueOnce(JSON.stringify({ data: { repository: { i471: { number: 471, comments: connection(Array(15).fill("discussion"), true, "cursor") } } } }))
      .mockReturnValueOnce(JSON.stringify({ data: { repository: { issue: { comments: connection(["<!-- daodao:acceptance-request -->"], false, "first") } } } }));
    const comments = getIssueComments([471], 15, true).get(471)!;
    expect(comments).toHaveLength(16);
    expect(comments[0].body).toBe("<!-- daodao:acceptance-request -->");
    expect(comments.at(-1)?.body).toBe("discussion");
  });
  it("keeps the bounded query for callers that only need recent comments", () => {
    execSync.mockReturnValueOnce(JSON.stringify({ data: { repository: { i471: { number: 471, comments: connection(["recent"], true, "cursor") } } } }));
    expect(getIssueComments([471]).get(471)?.map((c) => c.body)).toEqual(["recent"]);
    expect(execSync).toHaveBeenCalledTimes(1);
  });
});
