# Future Letter FRD v0.1 — final browser verification

Date: 2026-08-22
Result: **PASS — 10/10 Playwright tests in 32.6 seconds**

## Real stack used

- Product: Next.js at `http://localhost:3001`
- API and Future Letter worker: `daodao-server` at `http://localhost:4000`
- Database: disposable PostgreSQL container on loopback port 55432, including secure migration 082
- Queue: isolated Redis DB 15, real BullMQ `future-letter` worker
- Browser: Playwright Chromium, one worker, video always enabled

The browser and API contexts used two disposable users. Cleanup verified zero Future Letter rows, notification records, notification events, and Redis jobs before removing the database container and closing all test ports.

## Passed scenarios

1. Closing meaningful content auto-saves exactly one draft and reopening the CTA restores it.
2. Closing an all-whitespace form creates no draft.
3. A scheduled letter is delivered by the real worker, remains redacted until the first idempotent open, and stays opened after reload.
4. Scheduled deletion focuses the safe cancel action first and removes the BullMQ delayed job after confirmation.
5. The practice-title snapshot survives removal of the live practice relation.
6. Scheduled plaintext is absent from owner DOM, list/get/timeline responses, and cross-account access returns 404.
7. Full and homepage timelines share ordered past/today/future coordinates and homepage focus routing.
8. Clearing an existing draft deletes the stale server copy.
9. The write CTA remains disabled during initial draft loading and cached revalidation.
10. Homepage and full timelines load complete paginated metadata without exposing letter content.

## Evidence

The raw artifacts below were retained locally for review but are intentionally not committed because they duplicate video data and may contain disposable test-user context:

- `results.json`: machine-readable Playwright result plus per-test network, browser-error, server-log, and worker-log attachments.
- `html/index.html`: interactive report containing the same attachments.
- `test-results/*/video.webm`: ten browser recordings, retained on success.

Final privacy checks found no authentication token or Future Letter plaintext in the persisted text evidence. Server error logging now redacts `cookie`, `set-cookie`, and `authorization` headers, with a regression test.

## Quality gates

- Server lint: pass, 0 errors (80 existing warnings)
- Server typecheck: pass
- Server focused tests: 8 suites / 44 tests pass
- Prisma generation: pass
- Storage schema drift: pass
- OpenAPI JSON/YAML and TypeScript regeneration: pass
- Frontend monorepo lint: pass (existing warnings only)
- Frontend monorepo typecheck: 17/17 packages pass
- Frontend pure logic: 11 tests pass
- Playwright E2E typecheck: pass
- Playwright Chromium: 10/10 pass in 32.6 seconds
