# Shared island scope and membership authority audit

Date: 2026-09-12 (Asia/Taipei)

## Evidence boundary

This is a bounded static audit of the current local `daodao-server`, `daodao-storage`, and `daodao-f2e` source. It does not prove that a route, migration, UI, or authorization behavior is deployed or live in any environment. No production data or private membership records were queried.

The realtime room must not treat the isolated spike's caller-supplied room name as authority. A server-side ticket issuer must resolve one of the canonical scopes below, check current membership, and put the resolved room key in a short-lived signed ticket.

## Canonical identifiers and room keys

Integration decision: retain the existing design's `island:<ownerExternalId>`,
`cohort:<cohortId>` and `space:<spaceExternalId>` keys. The alternatives below are
audit suggestions, not an adopted migration or protocol. The nullable user UUID
finding requires fail-closed ticket minting when no stable external ID exists;
never derive a room from an empty string. Personal-island visitors must retain
the existing owner/connections policy rather than become self-only.

| Product scope | Current canonical record | Current API-facing identifier | Recommended Durable Object name input | Why |
|---|---|---|---|---|
| Personal island | `users.id` (`Int`) | JWT authorization uses `req.user.id`; `users.external_id` is a nullable UUID | `island:v1:personal:user:<users.id>` | The authenticated internal ID is always required by current contracts. Do not key on nullable `external_id`, nickname, or custom ID. Only that same active user is the owner/member. |
| Shared challenge or cohort activity instance | `cohorts.id` (`Int`) | `challengeId` and `cohortId` are both the cohort row ID | `island:v1:cohort:<cohorts.id>` | A challenge is not a separate identifier type: it is a cohort whose `program.kind === 'challenge'`. The instance, not the program, defines dates and enrollment. |
| Event/course space | `spaces.external_id` (`UUID`) | `/api/v1/spaces/{id}` validates the UUID external ID | `island:v1:space:<lowercase spaces.external_id>` | This matches the existing space URL/API boundary and avoids exposing the internal `spaces.id`. Server authorization still resolves the UUID to the internal ID before checking `space_members`. |

Evidence: the user model has an integer primary key and nullable UUID at `daodao-server/prisma/schema.prisma:830-833`; JWT middleware assigns the decoded payload to `req.user` at `daodao-server/src/middleware/auth.ts:30-55`, and `UserJwtPayload.id` is required at `daodao-server/src/types/auth.types.ts:93-104`. Cohort IDs are integers and carry the instance dates/status at `daodao-server/prisma/schema.prisma:2061-2088`; challenge request/response contracts explicitly call `challengeId` a cohort ID at `daodao-server/src/validators/challenge.validator.ts:3-5,37-41`. Space external IDs are UUIDs at `daodao-server/prisma/schema.prisma:2199-2209` and the route validator uses that UUID at `daodao-server/src/validators/space.validators.ts:13-21`.

## Current membership authorities

### Shared challenge

The reusable authority is a `cohort_enrollments` row matching `(cohort_id, user_id, status='joined')`. `challengeAclService.isChallengeParticipant()` already expresses this exact check at `daodao-server/src/services/challenge-acl.service.ts:42-48`. Challenge summaries and participant counts use the same `joined` predicate at `daodao-server/src/services/challenge.service.ts:53-76`.

Joining a challenge creates or reactivates the enrollment as `role='member'`, `status='joined'` at `daodao-server/src/services/challenge.service.ts:137-175`. The service explicitly states that challenges have no host/coach role at `daodao-server/src/services/challenge.service.ts:133-136`. Therefore a challenge room must not infer that its program organization's owner is a participant. Default challenge-room admission should be joined participants only unless product requirements add a separately named moderator/admin capability.

Public discovery is not room admission: list/detail routes use optional auth, while join requires authentication at `daodao-server/src/routes/challenge.routes.ts:13-26`.

### Lighthouse/activity cohort

Learner authority is also `cohort_enrollments(cohort_id, user_id, status='joined')`; member-home and list-my-cohorts enforce it at `daodao-server/src/services/cohort-join.service.ts:127-136,175-202`.

Coach/host authority is currently hybrid, not a single table:

1. `requireCohortRole` first accepts a joined cohort enrollment with role `owner` or `assistant` (`daodao-server/src/middleware/cohort-role.middleware.ts:5-23`).
2. For older cohorts without coach enrollments, it falls back through cohort → program → organization membership. Organization role `owner` becomes cohort `owner`; any other organization role becomes `assistant` (`daodao-server/src/middleware/cohort-role.middleware.ts:25-60`).
3. The Lighthouse cohort route subtree applies `requireCohortCoach` at `daodao-server/src/routes/organization.routes.ts:141-169`.

In the current organization API contract, organization members can only be `owner` (`daodao-server/src/validators/organization.validators.ts:33-36,51-56`). Other cohort services still contain direct “any organization member” checks, for example the feed determines coach perspective from organization membership at `daodao-server/src/services/cohort-feed.service.ts:49-65`. A realtime ticket issuer should not copy one of those ad hoc queries. First extract one canonical `resolveCohortAccess(cohortId, userId)` service that returns `learner | assistant | owner | none`, validates the cohort/program relationship, and is shared by HTTP middleware and ticket minting.

### Event/course space

Space admission is a `space_members` row keyed by `(space_id, user_id)`, with role `host | member`. `findViewerRole`, `requireMemberSpace`, and `requireHostSpace` implement member and host checks at `daodao-server/src/services/space.service.ts:126-155`. The DB relationship and role constraint source are `daodao-storage/schema/433_create_table_space_members.sql:10-33`.

There are two host signals today: `spaces.owner_user_id` and `space_members.role='host'` (`daodao-server/prisma/schema.prisma:2202-2235`). Access uses the membership role, but the list's `isHost` field compares `owner_user_id` (`daodao-server/src/services/space.service.ts:185-200`). The database has no shown constraint ensuring those signals stay aligned. Ticket minting should require a membership row, return its role, and separately enforce/repair the invariant that the owner has exactly one host membership. `owner_user_id` alone must not grant room admission.

`requireSpace` currently excludes only soft-deleted rows, while the aggregate list filters `status='active'` (`daodao-server/src/services/space.service.ts:126-130,161-180`). The spatial policy must explicitly decide whether a non-active but non-deleted space remains enterable. The current source has read/detail/block routes but no production service path that creates spaces or adds/removes `space_members`; this negative finding is from a bounded `rg` over `daodao-server/src` and must be rechecked when membership management is implemented.

## Login and existing entry routes

- Product web login source route: `/{locale}/auth/login?redirect=<encoded path>`; the page opens the non-dismissible login dialog and returns to the redirect after auth (`daodao-f2e/apps/product/src/app/[locale]/auth/login/page.tsx:8-36`).
- Challenge discovery source route: `/{locale}/challenges`. It is readable without login and sends an unauthenticated join click to `/auth/login?redirect=...` (`daodao-f2e/apps/product/src/app/[locale]/challenges/page.tsx:11-16,58-64`).
- Joined cohort member source route: `/{locale}/cohorts/{cohortId}` (`daodao-f2e/apps/product/src/app/[locale]/(with-layout)/cohorts/[cohortId]/page.tsx:1-8`).
- Event/course space source route: `/{locale}/spaces/{space UUID}` (`daodao-f2e/apps/product/src/app/[locale]/(with-layout)/spaces/[id]/page.tsx:26-37`).
- Google OAuth begins at server `/api/v1/auth/google`; the client builds that URL with a redirect-bearing state at `daodao-f2e/packages/auth/src/lib/auth-client.ts:110-140`. Password login is registered at `/api/v1/auth/login` in `daodao-server/src/routes/auth.routes.ts:45-85`.

These are repository route definitions only, not deployment verification.

## Reusable code and required authorization boundary

Reuse or extract:

- JWT cookie/Bearer authentication from `daodao-server/src/middleware/auth.ts:23-75`; do not let the unauthenticated Worker independently trust a client user ID.
- Challenge participant predicate from `daodao-server/src/services/challenge-acl.service.ts:42-48`.
- Cohort learner predicate from `daodao-server/src/services/cohort-join.service.ts:127-136` and the effective coach fallback from `daodao-server/src/middleware/cohort-role.middleware.ts:16-60`, after moving the latter into a service usable outside Express middleware.
- Space UUID resolution and membership-role predicate from `daodao-server/src/services/space.service.ts:126-155`, after extracting the currently private helpers.
- Cohort lifecycle calculation (`writable`, `read_only`, `gone`) at `daodao-server/src/middleware/cohort-content-lifecycle.middleware.ts:5-24`; spatial presence needs its own explicit mapping rather than silently inheriting content behavior.

An alternative considered by this audit was a common `POST /api/v1/island/realtime-ticket`
endpoint. Integration retains the design's existing personal-island endpoint and
adds domain-specific cohort/space endpoints, backed by a shared resolver. Signed
claims retain the full original issuer/audience/purpose/time/key/session/replay
contract and additionally bind scope kind/id and canonical room. Never accept
`role` or a raw room key as client authority.

No new membership table is required to mint a first ticket because all three authorities exist. A persistent revocation/outbox or membership-version field may be required once immediate cross-service socket eviction is chosen; that schema decision belongs in `daodao-storage` first.

## Lifecycle, termination, and revocation gaps to close before development

1. **User/session:** ticket minting must reject inactive or temporary users as product policy requires. Logging out or expiring the web JWT does not automatically close an already-upgraded socket; tickets need a short TTL plus socket reauthentication or a server-to-room revoke signal.
2. **Challenge/cohort member:** `exit()` changes `joined → exited`, and coach removal changes enrollment to `removed` (`daodao-server/src/services/cohort-membership.service.ts:8-15,17-39`). Those transitions must prevent new tickets and evict an existing socket. Rejoining can reactivate an enrollment, so revocation cannot be cached indefinitely.
3. **Challenge end:** run status is derived from dates, while `cohorts.status` is only edit status (`daodao-server/src/services/challenge.service.ts:32-50`). Existing joined rows can remain joined after the end date. Product must decide whether an ended challenge room closes, becomes read-only/social-only, or remains enterable.
4. **Activity cohort end/archive:** current content policy is writable through end date, read-only for 90 days, then gone (`daodao-server/src/middleware/cohort-content-lifecycle.middleware.ts:5-24`). Define the spatial equivalent and whether archived/draft cohorts admit coaches or learners.
5. **Coach revocation:** removal from `organization_members`, organization suspension, or a coach enrollment status/role change must revoke effective coach access. Because the current fallback is hybrid, test every source and precedence explicitly.
6. **Space member:** deleting a `space_members` row must revoke immediately. Also define behavior for `spaces.status != 'active'`, `deleted_at`, owner transfer, and disagreement between `owner_user_id` and the host membership row. There is no membership status/timestamp for exit beyond deleting the row.
7. **Room isolation:** the Worker must derive its Durable Object ID only from the verified ticket's canonical room key. Namespace the key as above so equal numeric IDs across personal/cohort/space cannot collide.

## Minimum pre-development verification matrix

- Ticket unit tests: personal self/other; challenge joined/invited/exited/removed; normal cohort learner; enrollment owner/assistant; organization-owner fallback; suspended organization; space host/member/non-member; inactive/deleted space.
- Mutation regression tests: cohort exit/removal, organization member removal/suspension, and space-member deletion both deny refresh and trigger or are bounded by the documented socket revocation SLA.
- Boundary tests: a challenge participant cannot enter another cohort with the same program; an organization owner is not silently admitted to a challenge participant room; a space owner without the host membership invariant fails closed and emits an integrity signal.
- Route tests: preserve `/auth/login?redirect=...` return behavior for challenge/cohort/space island entries.
- Preview evidence remains separate: local membership tests, local Worker handshake, deployed preview auth handshake, real hibernation/resume, and production observation are distinct gates.
