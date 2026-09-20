# Plan: daodao-mcp — Read-only MCP Server for DB Debugging

**Status**: Revised after critic review
**Created**: 2026-05-08
**Last Revised**: 2026-05-08
**Mode**: Direct plan with critic-driven revision pass

**Revision changelog (2026-05-08)**:
- C1: Rewrote mask layer — PII-focused (email/OAuth IDs/JSONB) instead of password/token-focused
- C2: Replaced regex SQL guard with `pgsql-parser` AST-based validation
- C3: Fixed AC3 verification to use `SELECT current_setting(...)` instead of `SHOW`
- M1: Limit injection now uses AST (covered by C2 fix)
- M3: Effort estimate raised from 8h → 12-14h
- M4: R6 mitigation switched from "check non-localhost" to "verify current_user = daodao_readonly"
- AC7: `userId` is `external_id` (UUID), not internal SERIAL
- AC1: Repo must be **private**
- New: `query` tool accepts optional `params: unknown[]` for parameterized queries

---

## 1. Requirements Summary

A standalone TypeScript MCP server in a **new `daodao-mcp` repo** that lets Claude Code (running locally on the user's laptop) query the daodao PostgreSQL DB on VPS in **read-only** mode for debugging purposes.

**Core scope**:
- Two general-purpose tools: `describe_schema`, `query` (SELECT-only)
- One high-frequency shortcut tool: `get_user_full_context`
- Strong safety guardrails: read-only DB role, SQL guard, auto-LIMIT, statement_timeout, sensitive column masking, audit log
- Connection: local MCP process → SSH tunnel → VPS Postgres (reuses existing `Host daodao` SSH alias)

**Tech stack**: TypeScript + `@modelcontextprotocol/sdk` + `pg` + pnpm

**Out of scope (v1)**: HTTP/SSE transport, remote MCP on VPS, write tools, prompt-confirmation flows, multi-DB support.

---

## 2. Acceptance Criteria

- [ ] **AC1** — New **private** repo `daodao-mcp/` exists at `~/Projects/daodao-mcp` with `package.json`, `tsconfig.json`, `.env.example`, `README.md`. GitHub visibility verified as private (README contains laptop paths, VPS hostname, DB name).
- [ ] **AC2** — `pnpm build` produces `dist/server.js` runnable via `node dist/server.js` as MCP stdio server. (Removed shebang/executable-bit requirement — `.mcp.json` invokes via `node` command, so executable bit is irrelevant.)
- [ ] **AC3** — DB connection sets `statement_timeout = '10s'` and `default_transaction_read_only = on` per session. **Verifiable by smoke test** running `SELECT current_setting('statement_timeout'), current_setting('transaction_read_only')` through the MCP `query` tool — must return `'10s'` and `'on'`.
- [ ] **AC4** — `describe_schema()` returns array of `{table, columns:[{name,type,nullable,pk,fk?}]}` for all `public.*` BASE tables (excludes views, materialized views, partitions); `describe_schema({table:"users"})` returns single-table detail. Tool description tells Claude that views/partitions are not exposed.
- [ ] **AC5** — `query({sql, params?})` uses `pgsql-parser` to AST-validate input. Accepts: `SelectStmt` only (covers `SELECT`, `WITH ... SELECT`, parenthesized SELECT, `TABLE`, `VALUES`). Rejects: any other statement kind. Forbidden function allowlist also enforced at AST level: `pg_read_server_files`, `pg_read_binary_file`, `lo_export`, `lo_import`, `dblink*`, `pg_terminate_backend`, `pg_cancel_backend`, `pg_sleep` (rejected to prevent timeout abuse on top of `statement_timeout`).
- [ ] **AC6** — `query()` auto-injects `LIMIT 1000` at the **outermost SelectStmt** via AST mutation when no top-level limit exists; subquery/CTE inner LIMITs do NOT count. Explicit top-level limits respected up to 5000.
- [ ] **AC7** — `get_user_full_context({userId, days=30})` accepts **`userId` as `users.external_id` UUID**. Returns: user row (joined to `contacts`, `basic_info`, `location`) + recent practices + practice_checkins + notifications + comments authored, each LIMITed to 50 within `days` window. PII fields redacted per AC8.
- [ ] **AC8** — **PII-focused masking** (rewritten per critic C1):
  - Email columns (`contacts.email`, `temp_users.email`): partial redact `xx***@gmail.com` (visible domain, first 2 chars of local-part) — full mask makes debug unusable
  - OAuth subject IDs (`google_id`, `apple_id`): full mask `[MASKED]`
  - Tracking tokens (`email_logs.tracking_token`): full mask
  - `birth_date`: returned as year only (`YYYY-XX-XX`)
  - **JSONB columns** (`notifications.payload`, `ai_generations.input/output`, `ai_query_logs.usage_detail`, `ai_query_logs.error_message`, `notification_events.payload`, `roles.metadata`, `contacts.contact_info`): default behavior is **return as `[JSONB:omitted]`**; explicit opt-in via `query({sql, includeJsonb: true})` for cases where Claude needs to inspect payload contents
  - Naming-convention safety net: any column ending in `_token`, `_secret`, `_hash`, `_key` (with `key` not being part of `_id_key` PK names) — full mask
  - Full mask list documented in `src/mask.ts` with source reference (which `schema/` or `migrate/sql/` file defined it)
- [ ] **AC9** — Every tool invocation appends a JSON-line entry to `~/.daodao-mcp/audit.log` (file mode `0600`) containing `{ts, tool, sql, params?, rowCount, durationMs, error?}`. SQL truncated to **4000** chars (raised from 500 per critic Mn1). When `params` provided, recorded separately so the SQL template stays grep-able.
- [ ] **AC10** — `sql/create-readonly-user.sql` script creates `daodao_readonly` Postgres role with `GRANT SELECT` on all current and future `public.*` tables. Running any non-SELECT as that role returns `permission denied`. **The role is NOT a member of `pg_read_server_files`, `pg_write_server_files`, `pg_execute_server_program`** — verified by `\du+ daodao_readonly` showing empty `Member of` column.
- [ ] **AC11** — README contains a copy-pastable `.mcp.json` snippet (with `<USER>`/`<HOST>` placeholders, not hardcoded paths) that registers `daodao-mcp` in Claude Code, plus the SSH tunnel command (`ssh -L 5433:localhost:5432 daodao`).
- [ ] **AC12** — Smoke test (`pnpm test`) passes against local `pg-dev` docker container: validates AST guard (accepts SELECT/WITH/parens, rejects INSERT/UPDATE/DELETE/multi-statement/forbidden-functions), validates PII mask (email redaction, OAuth ID full mask, JSONB omit/include toggle), validates outermost-limit injection on CTE/subquery cases, and runs a real SELECT roundtrip including `current_setting` verification for AC3.
- [ ] **AC13** — Server refuses to start when `DATABASE_URL` is unset. On startup, runs `SELECT current_database(), current_user, inet_server_addr()` and **refuses to start unless `current_user = 'daodao_readonly'`** (per critic M4). Prints connected DB+user+host to stderr for operator confirmation.
- [ ] **AC14** — `query` tool accepts optional `params: unknown[]` for parameterized queries (`$1, $2, ...`). Audit log records SQL template and params separately. Tool description instructs Claude when to prefer parameterized form (untrusted/variable values like emails or external IDs).

---

## 3. File Structure

```
daodao-mcp/
├── src/
│   ├── server.ts              # MCP entry; registers tools; stdio transport
│   ├── db.ts                  # pg.Pool; per-connection SET statement_timeout + read-only
│   ├── sql-guard.ts           # validateSelect() + ensureLimit()
│   ├── mask.ts                # SENSITIVE_COLUMNS list + maskRows()
│   ├── audit.ts               # appendAuditEntry() — JSON lines to ~/.daodao-mcp/audit.log
│   ├── introspect.ts          # getAllTables() + getTableSchema() via information_schema
│   └── tools/
│       ├── describe-schema.ts
│       ├── query.ts
│       └── get-user-full-context.ts
├── sql/
│   └── create-readonly-user.sql
├── test/
│   └── smoke.test.ts          # node --test, runs against pg-dev
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## 4. Implementation Steps

### Step 1 — Repo bootstrap
- `mkdir ~/Projects/daodao-mcp && cd $_ && git init`
- **Create as private GitHub repo** (`gh repo create --private daodao-mcp` after first commit)
- `pnpm init`; set `"type": "module"`
- `pnpm add @modelcontextprotocol/sdk pg dotenv pgsql-parser` (pgsql-parser added per critic C2 — AST-based SQL validation)
- `pnpm add -D typescript tsx @types/node @types/pg`
- Pin MCP SDK to a specific version (not `^latest`) per critic finding
- `tsconfig.json`: `target: ES2022`, `module: NodeNext`, `moduleResolution: NodeNext`, `strict: true`, `outDir: dist`
- `package.json` scripts: `build` (tsc), `dev` (tsx watch src/server.ts), `start` (node dist/server.js), `test` (node --test test/*.test.ts)
- Add `bin: {"daodao-mcp": "./dist/server.js"}` for global linking
- File: `daodao-mcp/package.json`, `daodao-mcp/tsconfig.json`, `daodao-mcp/.gitignore` (node_modules, dist, .env)

### Step 2 — Connection layer
- File: `daodao-mcp/src/db.ts`
- Export singleton `pg.Pool` reading `DATABASE_URL`
- Pool option `min: 0, max: 3, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000` (connectionTimeout added per critic finding to prevent infinite hangs on pool exhaustion)
- Use `pool.on('connect', async (client) => { await client.query("SET statement_timeout = '10s'"); await client.query("SET default_transaction_read_only = on"); await client.query("SET TIMEZONE = 'Asia/Taipei'"); })` — separate queries (not one multi-statement string) to avoid foot-gun appearance, and TZ added per critic finding
- Export `runQuery(sql, params?)` returning `{rows, rowCount, durationMs}` — passes `params` straight to `pg.Client.query()` for parameterized support (AC14)
- Throw typed errors (`DBError`) so server can format MCP error responses
- **Startup self-check** (per critic M4): on first connection, verify `current_user = 'daodao_readonly'` and refuse to start otherwise; log `current_database()`, `current_user`, `inet_server_addr()` to stderr

### Step 3 — SQL guard (AST-based, rewritten per critic C2)
- File: `daodao-mcp/src/sql-guard.ts`
- Use `pgsql-parser` (`parse()` returns AST array; one element per statement)
- `validateReadOnly(sql)`:
  1. Parse; reject if parse error → return descriptive message
  2. Reject if `ast.length !== 1` (multi-statement)
  3. Reject if root node kind is not `SelectStmt` (covers `SELECT`, `WITH ... SELECT`, parenthesized SELECT, `VALUES`, `TABLE` — all of which parse as SelectStmt or compatible read forms)
  4. Walk the AST collecting all `FuncCall` nodes; reject if any function name in forbidden list: `pg_read_server_files`, `pg_read_binary_file`, `lo_export`, `lo_import`, `dblink`, `dblink_exec`, `pg_terminate_backend`, `pg_cancel_backend`, `pg_sleep`, `pg_sleep_for`, `pg_sleep_until`
- `injectOuterLimit(ast, defaultLimit=1000, maxLimit=5000)`:
  1. Inspect outermost `SelectStmt.limitCount`
  2. If null → set to `{kind: 'A_Const', val: {ival: defaultLimit}}` (or whatever pgsql-parser AST shape requires — verify on first run)
  3. If present and > maxLimit → reject with clear error
  4. **Inner subquery/CTE LIMITs are NOT touched** — only the outermost query's limit matters (fixes M1)
- `deparse(ast)` → safe SQL string (pgsql-parser ships a deparser)
- Export `prepareSql(sql, opts?)` that runs validate → injectLimit → deparse and returns the safe SQL
- **Documentation in code**: "Defense-in-depth. The DB-level `daodao_readonly` role is the load-bearing guard. This AST validation provides clear error messages and reduces wasted DB roundtrips."

**Why AST over regex** (decision rationale for future readers): regex approach was ~2-3h of work fighting edge cases (CTE rejection, dollar-quote string literals, escaped strings, function-name-as-substring), and produced a guard that still had documented bypasses. pgsql-parser is ~50 lines of code with no edge cases.

### Step 4 — PII masking (rewritten per critic C1)
- File: `daodao-mcp/src/mask.ts`
- **Threat model** (documented at top of file): this DB has no password/token storage (Google/Apple OAuth — tokens live with IdP). Real PII surface is **email, OAuth subject IDs, JSONB payloads, IP/login history, birth_date**. Mask design targets these.
- Three handling categories:

  **A. Full mask** → return `"[MASKED]"`:
  - `google_id`, `apple_id` (any table — these are OAuth subject identifiers; possessing one can enable account takeover via OAuth bug)
  - `tracking_token` (`email_logs`)
  - any column matching suffix `_token`, `_secret`, `_hash`, `_api_key` (naming-convention safety net for future migrations)

  **B. Partial redact** → return `xx***@domain.com`-style preview:
  - `email` (`contacts.email`, `temp_users.email`): keep first 2 chars of local-part + domain → `jo***@gmail.com`
  - `birth_date`: keep year only → `1990-XX-XX`
  - `ip_address` / `ip_hash` (if exists in `user_login_history`): keep first octet only → `192.x.x.x`
  - Rationale: full mask makes "find user by email X" debug case unusable

  **C. JSONB omission with opt-in**:
  - `notifications.payload`, `ai_generations.input`, `ai_generations.output`, `ai_generations.user_interaction`, `ai_query_logs.usage_detail`, `ai_query_logs.error_message` (TEXT but log-shaped), `notification_events.payload`, `roles.metadata`, `contacts.contact_info`
  - Default: replace value with string `"[JSONB:omitted, set includeJsonb:true to view]"`
  - When tool called with `includeJsonb: true`: return raw value (Claude consciously opting in)
  - Audit log records `includeJsonb` flag separately so JSONB exposure is traceable

- API surface:
  - `maskRows(rows, columnTypes, opts)` where `columnTypes` is `{name → pgType}` from result metadata so JSONB columns can be detected by type, not just name
  - `opts: {includeJsonb?: boolean}`
  - Implementation: walk rows; for each cell, look up `columnName.toLowerCase()` in mask config; apply A/B/C handler
  - **Deep clone, not shallow** (per critic Mn3) for JSONB cells if returning raw — avoid mutating shared pg result references

- File: `daodao-mcp/test/mask.test.ts` covers each category with fixtures

### Step 4a — PII column audit (corrected scope per critic C1)
- **Source of truth is SQL, not Prisma**: this project is SQL-first. Audit must read both:
  - `daodao-storage/schema/*.sql` — base DDL
  - `daodao-storage/migrate/sql/*.sql` — incremental migrations
- **Expected result**: per critic, password/token columns are nearly absent (~1 hit on `ip_hash`). The real targets are **PII**, not auth secrets.
- One-off audit script (`scripts/audit-pii-columns.sh`):
  ```bash
  # PII naming patterns (the actual threat surface)
  grep -rhEi '\b(email|google_id|apple_id|mongo_id|external_id|phone|birth_date|ip_address|ip_hash|tracking_token|nickname|personal_slogan)\b' \
    daodao-storage/schema/ daodao-storage/migrate/sql/ \
    | grep -iE '^\s*\S+\s+(varchar|text|char|uuid|date|inet|bytea)'

  # JSONB columns (potential prompt/payload leakage)
  grep -rEn 'JSONB' daodao-storage/schema/ daodao-storage/migrate/sql/

  # Naming-convention safety net (rare, but catch any future additions)
  grep -rhEi '\b\w+(_token|_secret|_hash|_api_key)\b' \
    daodao-storage/schema/ daodao-storage/migrate/sql/
  ```
- Cross-check with `daodao-server/prisma/schema.prisma` to catch anything bypassing SQL files
- Populate `src/mask.ts` config with audit results
- Document the categorized list (A: full mask, B: partial redact, C: JSONB) in README with source file references so reviewers can extend it
- **Future-proofing**: suffix match in `mask.ts` catches new `*_token` / `*_secret` / `*_hash` columns automatically

### Step 5 — Audit log
- File: `daodao-mcp/src/audit.ts`
- On import, ensure dir `~/.daodao-mcp/` exists (`fs.mkdirSync(..., {recursive: true})`)
- Export `appendAudit(entry)`: write `JSON.stringify(entry) + "\n"` synchronously via `fs.appendFileSync` (small writes, no need for async stream)
- Entry shape: `{ts: ISO8601, tool: string, sql?: string (truncated 500), rowCount?: number, durationMs: number, error?: string}`
- README documents `logrotate` snippet for users who want rotation

### Step 6 — Schema introspection
- File: `daodao-mcp/src/introspect.ts`
- `getAllTables()`: query `information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'` (excludes views/materialized views/partitions per AC4)
- `getTableSchema(name)`:
  - `information_schema.columns` for `column_name, data_type, is_nullable, column_default`
  - `information_schema.table_constraints` + `key_column_usage` for PKs
  - `information_schema.referential_constraints` joined with `key_column_usage` for FKs (this query is finicky — budget extra time per critic; reference SQL recipe from Postgres docs)
- **No caching** (per critic Mn4) — single-user dev tool, schema introspection is cheap, and a stale cache during migration day is exactly the moment you want fresh data

### Step 7 — Tools

#### Step 7a — `describe_schema`
- File: `daodao-mcp/src/tools/describe-schema.ts`
- Input schema: `{table?: string}` (zod or hand-written JSON schema)
- If `table` provided → `getTableSchema(table)`; else → list of `{table, columnCount, pk}` summaries
- Audit + return MCP `content: [{type: "text", text: JSON.stringify(result, null, 2)}]`

#### Step 7b — `query`
- File: `daodao-mcp/src/tools/query.ts`
- Input: `{sql: string, params?: unknown[], limit?: number, includeJsonb?: boolean}`
- Pipeline: `prepareSql(sql, {limit})` → `runQuery(safeSql, params)` → `maskRows(rows, columnTypes, {includeJsonb})` → `audit({tool, sql, params, includeJsonb, ...})` → respond
- On guard rejection: return MCP `isError: true` with descriptive message naming the violated rule (multi-statement / non-SELECT / forbidden function / over max limit)
- Truncate response when **JSON-stringified payload > 50_000 chars** (per critic Mn7 — clarified from "rows × cols"); include `_truncated: true` and `_originalRowCount: N` in response so Claude knows
- **Tool description for Claude** (important — guides good tool use):
  ```
  Run a read-only SELECT against the daodao Postgres DB.

  Use parameterized form (`params: ["jo***@gmail.com"]` with `WHERE email = $1`) when:
  - Filtering by user-supplied or external values (emails, UUIDs, names)
  - Comparing against strings that may contain quotes or special chars

  Use raw SQL when:
  - The query has only literal/static filters

  JSONB columns are omitted by default. Pass `includeJsonb: true` to view payloads
  (e.g., notifications.payload, ai_generations.input/output).

  Auto-LIMIT 1000 is added if no top-level LIMIT. Subquery LIMITs do not count.
  ```

#### Step 7c — `get_user_full_context`
- File: `daodao-mcp/src/tools/get-user-full-context.ts`
- Input: `{userId: string, days?: number}` — `userId` is **`users.external_id` (UUID)**, not the internal SERIAL `id` (decided per user choice)
- First step: lookup `SELECT id, external_id, mongo_id FROM users WHERE external_id = $1` to get internal `id` for downstream joins
- Then run 5 parameterized queries (each `LIMIT 50`, all using `WHERE created_at > NOW() - INTERVAL '$days days'`):
  1. User row joined to `contacts` (basic profile, email gets partial-redacted by mask layer), `basic_info`, `location`
  2. Recent `practices` (only own)
  3. Recent `practice_checkins`
  4. Recent `notifications` (incoming) — JSONB `payload` follows default omit rule
  5. Recent `comments` authored by user
- Each query passed through `maskRows`
- Returns single combined object with named slices (`{user, practices, checkins, notifications, comments}`)
- **Note in tool description**: schema-coupled, may need updates after migrations to joined tables. Concrete SQL templates committed to file (not improvised) per critic Executor note.

### Step 8 — DB read-only user setup
- File: `daodao-mcp/sql/create-readonly-user.sql`
- Idempotent script using `psql` variable substitution (no committed default password — per critic Mn5):
  ```sql
  -- Run with: psql ... -v readonly_password="$(openssl rand -base64 32)" -f create-readonly-user.sql
  \if :{?readonly_password}
  \else
    \echo 'ERROR: -v readonly_password=... is required'
    \quit
  \endif

  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'daodao_readonly') THEN
      EXECUTE format('CREATE ROLE daodao_readonly LOGIN PASSWORD %L', :'readonly_password');
    ELSE
      EXECUTE format('ALTER ROLE daodao_readonly PASSWORD %L', :'readonly_password');
    END IF;
  END $$;
  GRANT CONNECT ON DATABASE daodao TO daodao_readonly;
  GRANT USAGE ON SCHEMA public TO daodao_readonly;
  GRANT SELECT ON ALL TABLES IN SCHEMA public TO daodao_readonly;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO daodao_readonly;

  -- Verify role is NOT in privileged groups (per AC10)
  -- Manual check: \du+ daodao_readonly  → "Member of" should be empty
  ```
- README walks through running on VPS as superuser; password generated, stored in 1Password, not committed
- README also documents `pg_hba.conf` requirement: VPS Postgres must accept `md5`/`scram-sha-256` for `daodao_readonly` from `127.0.0.1` (the SSH-tunneled connection arrives as localhost — verify before assuming password auth works)

### Step 9 — Server entry
- File: `daodao-mcp/src/server.ts`
- Standard MCP boilerplate: `Server` from `@modelcontextprotocol/sdk/server/index.js`, `StdioServerTransport`
- Register three tools with their input schemas
- `setRequestHandler(CallToolRequestSchema, ...)` dispatches by name
- Top-level `try/catch` around `server.connect(transport)`; log to stderr on fatal errors (stdout is reserved for MCP protocol)
- Validate `DATABASE_URL` at startup; refuse to start if missing

### Step 10 — Smoke tests
- File: `daodao-mcp/test/smoke.test.ts` (node --test built-in)
- Tests:
  - `validateSelect("SELECT 1")` passes
  - `validateSelect("INSERT INTO ...")` throws
  - `validateSelect("SELECT 1; DROP TABLE x")` throws
  - `ensureLimit("SELECT * FROM users")` includes `LIMIT 1000`
  - `maskRows([{password_hash: "abc", name: "x"}])` returns `[{password_hash: "[MASKED]", name: "x"}]`
  - Real SELECT roundtrip against `pg-dev` (skip if `SKIP_DB_TESTS=1`)

### Step 11 — README + Claude Code integration
- File: `daodao-mcp/README.md`
- Sections:
  1. **Why** — debug VPS DB from Claude Code
  2. **Setup** — clone, install, build
  3. **Create read-only role** — run `sql/create-readonly-user.sql` on VPS
  4. **SSH tunnel** — `ssh -L 5433:localhost:5432 daodao` (uses existing `Host daodao` alias)
  5. **`.env`** — `DATABASE_URL=postgresql://daodao_readonly:PWD@localhost:5433/daodao`
  6. **Register in Claude Code** — `.mcp.json` snippet:
     ```json
     {
       "mcpServers": {
         "daodao-db": {
           "command": "node",
           "args": ["/Users/xiaoxu/Projects/daodao-mcp/dist/server.js"],
           "env": {"DATABASE_URL": "postgresql://..."}
         }
       }
     }
     ```
  7. **Tools reference** — usage examples for each
  8. **Security model** — read-only role, guard, mask, audit (and what each protects against)
  9. **Limitations** — no writes, no DDL, no `pg_*` system tables exposed via shortcuts
- File: `daodao-mcp/.env.example`

---

## 5. Risks and Mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|------------|--------|------------|
| R1 | Prompt injection makes Claude run destructive SQL | High | High | **Primary**: DB-level `daodao_readonly` role with no write grants. **Secondary**: SQL regex guard. **Tertiary**: `default_transaction_read_only = on`. Three independent layers. |
| R2 | Long-running query degrades prod DB | Medium | Medium | `SET statement_timeout = '10s'` per connection. Auto-LIMIT on missing limits. |
| R3 | Sensitive data leaks into LLM context | High | High | Hardcoded `SENSITIVE_COLUMNS` mask list. Step 4a audits Prisma schema for exhaustive coverage. Audit log enables post-hoc review. |
| R4 | SSH tunnel drops mid-debug | Low | Low | pg pool reconnects on `ECONNREFUSED`. Error message instructs user to restart tunnel. |
| R5 | Schema migration breaks `get_user_full_context` shortcut | Low | Low | Use defensive joins (LEFT JOIN), tolerate missing columns. Document that shortcut tools may need updates after large migrations. |
| R6 | Connecting to wrong DB (e.g., prod tunnel running on port matching dev .env) | Medium | High | **Fixed per critic M4**: startup self-check runs `SELECT current_database(), current_user, inet_server_addr()` and refuses to start unless `current_user = 'daodao_readonly'`. Prints DB name + host to stderr for operator confirmation. Host-based check ineffective because SSH tunnel always presents as `localhost`. |
| R7 | Audit log fills disk over months | Low | Low | README documents `logrotate` snippet. Default location `~/.daodao-mcp/audit.log` (mode `0600`) on user's laptop. |
| R8 | (Resolved) Multi-statement / string-literal edge cases in regex guard | — | — | Eliminated by switching to `pgsql-parser` AST validation (Step 3) — no longer doing manual SQL parsing. |
| R9 | New PII column added in migration but mask config not updated | Medium | High | Suffix safety net catches `*_token`/`*_secret`/`*_hash`. JSONB default-omit covers new JSONB additions. For named PII (new email-shaped columns), document in `daodao-storage/migrate/README.md`: "PII-bearing columns require updating `daodao-mcp/src/mask.ts`". Future: CI check that diffs schema PII candidates vs mask config. |
| R10 | Threat model misunderstood — guard layers don't stop a determined adversary | Low | Low | Documented explicitly in README "Security model" section (per critic M6): threat is bug-driven Claude misuse, not adversarial pentesting. Read-only role + statement_timeout are the real boundaries; guard + mask reduce surface, not eliminate it. |
| R11 | Pool exhaustion when Claude bursts queries | Low | Medium | `connectionTimeoutMillis: 5_000` on pool prevents infinite hang. `max: 3` connections is enough for serial debug use. |
| R12 | Validating mask correctness against pg-dev (which has no real-shape data) gives false confidence | Medium | Medium | Step 0 added: `pg_dump` from VPS into a local restored copy at least once during initial development; validate mask end-to-end against real-shape data. Per critic gap-finding. |

---

## 6. Verification Steps

Run in this order before declaring done:

1. **Build clean**: `cd daodao-mcp && pnpm install && pnpm build` → no TS errors
2. **Smoke tests pass**: `pnpm test` → all green against pg-dev
3. **Read-only role enforced**:
   ```bash
   psql -U daodao_readonly -d daodao -c "INSERT INTO users (id) VALUES ('x')"
   # Expect: ERROR: permission denied for table users
   ```
4. **Statement timeout enforced**:
   ```bash
   psql -U daodao_readonly -d daodao -c "SELECT pg_sleep(15)"
   # Expect: ERROR: canceling statement due to statement timeout
   ```
5. **Mask works end-to-end**: Via Claude Code, ask "show me the first user row including all columns" → response shows `password_hash: "[MASKED]"` (assuming such column exists)
6. **Guard rejects writes**: Via Claude Code, ask "delete user with id=1" → MCP returns guard error, no DB query made (verify via audit log)
7. **Audit log populated**: After above, `tail ~/.daodao-mcp/audit.log` shows the rejected and successful queries
8. **End-to-end debug scenario**: Reproduce one of the existing troubleshooting docs (e.g., `docs/troubleshooting/practice-checkin-cards-empty-when-mood-null/`) using only the MCP tools; confirm Claude can navigate the schema and find the relevant rows

---

## 7. daodao-storage Integration Strategy

- **No code coupling**: `daodao-mcp` does not import from `daodao-storage`. Independent deployment lifecycle.
- **Schema source of truth**: Live `information_schema` introspection. Rationale: auto-adapts to migrations without re-deploying MCP server. `daodao-server/prisma/schema.prisma` is consulted only once during Step 4a (sensitive column enumeration).
- **Connection convention**: MCP server reuses `DAO_POSTGRES_*` naming convention compatible with `daodao-storage/docker-compose.dev.yml`, so dev and MCP share one mental model.
- **VPS access**: Reuses existing `Host daodao` SSH alias (already used by `daodao-storage/fetch_data_vps_postgre.sh`). No new SSH credentials.
- **Post-migration workflow**: After any new migration in `daodao-storage/migrate/sql/`, the MCP picks up new tables automatically. Manual review only needed if (a) shortcut tool semantics need updating, or (b) new sensitive columns were added — capture both as a checklist item in `daodao-storage/migrate/README.md`.

---

## 8. Future Extensions (out of scope, captured for memory)

- Additional MCP servers in same repo: `daodao-logs-mcp` (tail VPS logs), `daodao-metrics-mcp` (Grafana queries) → would warrant a pnpm workspace
- `explain_query(sql)` tool wrapping `EXPLAIN ANALYZE` for perf debugging
- Optional HTTP/SSE transport so MCP can run on VPS itself, eliminating SSH tunnel
- CI check that diffs Prisma schema vs mask list (R9)
- Telemetry: anonymized counts of which tools Claude invokes most, to inform future shortcut tool additions

---

## 9. Effort Estimate (revised per critic M3)

| Phase | Steps | Time |
|-------|-------|------|
| Bootstrap (private repo, deps, tsconfig) | 1 | 30m |
| Connection layer + startup self-check | 2 | 1h |
| AST-based SQL guard (pgsql-parser) | 3 | 1.5h (was 2-3h with regex; AST cuts this) |
| PII mask redesign + JSONB strategy + tests | 4, 4a | 2h |
| Audit log | 5 | 30m |
| Schema introspection (FK query is finicky) | 6 | 1h |
| Tools — `describe_schema` | 7a | 30m |
| Tools — `query` (params + JSONB toggle) | 7b | 1h |
| Tools — `get_user_full_context` (5 SQL templates) | 7c | 1.5h |
| DB read-only role + pg_hba check | 8 | 30m |
| Server entry + MCP boilerplate | 9 | 45m |
| Smoke tests covering new AST/mask/limit cases | 10 | 1.5h |
| README + Claude Code first-time wiring | 11 | 1.5h |
| End-to-end verification against real-shape data | §6 + Step 0 | 1.5h |
| **Total** | | **~14 hours** |

**Realistic split**: 2 sessions of 6-8h each, not single sitting.

Plus one-time VPS tasks: run `create-readonly-user.sql` + verify `pg_hba.conf` (~15 min).

**Step 0 (added per critic gap)**: Before any production-targeted work, take a fresh `pg_dump` from VPS, restore into a separate local DB, and validate mask layer against real-shape data. ~30m.
