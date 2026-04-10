---
phase: 33-tenant-issue-reporting-system
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/20260410_issue_reports.sql
  - src/types/database.ts
  - src/lib/activity-logger.ts
autonomous: false
requirements:
  - REQ-33-01  # issue_reports table schema (LOCKED CONTEXT.md)
  - REQ-33-02  # set_updated_at() trigger function definition
  - REQ-33-03  # IssueReport / IssueCategory / IssueStatus / TargetType TS types
  - REQ-33-04  # 'issue_reported' ActionType union entry
  - REQ-33-05  # issue-reports private storage bucket creation
  - REQ-33-06  # Dashboard RLS policies for issue_reports (INSERT only, no SELECT)

must_haves:
  truths:
    - "issue_reports table exists in database with all 18 columns, CHECK constraints, and 3 indexes"
    - "set_updated_at() Postgres function exists as CREATE OR REPLACE plpgsql definition"
    - "issue_reports_updated_at BEFORE UPDATE trigger fires set_updated_at() and bumps updated_at"
    - "Private storage bucket 'issue-reports' exists with INSERT policy scoped to {tenant_id}/* paths"
    - "RLS is enabled on issue_reports; tenants can INSERT rows but cannot SELECT any rows"
    - "TypeScript type IssueReport (and the 3 union types) are exported from src/types/database.ts"
    - "'issue_reported' is a valid member of the ActionType union in src/lib/activity-logger.ts"
  artifacts:
    - path: "supabase/migrations/20260410_issue_reports.sql"
      provides: "Table DDL + trigger fn + indexes + ENABLE ROW LEVEL SECURITY"
      contains: "CREATE OR REPLACE FUNCTION set_updated_at"
    - path: "src/types/database.ts"
      provides: "IssueReport, IssueCategory, IssueStatus, TargetType exports"
      contains: "export interface IssueReport"
    - path: "src/lib/activity-logger.ts"
      provides: "'issue_reported' added to ActionType union + ACTION_TYPES array"
      contains: "\"issue_reported\""
  key_links:
    - from: "supabase/migrations/20260410_issue_reports.sql"
      to: "set_updated_at() function"
      via: "CREATE OR REPLACE FUNCTION before CREATE TRIGGER"
      pattern: "CREATE OR REPLACE FUNCTION set_updated_at"
    - from: "src/lib/activity-logger.ts"
      to: "ACTION_TYPES array"
      via: "both union AND array include 'issue_reported'"
      pattern: "issue_reported"
---

<objective>
Create the database foundation for Phase 33: new `issue_reports` table migration (with the project-local `set_updated_at()` trigger function), TypeScript types for use by downstream plans, and a new `'issue_reported'` entry in the activity-logger ActionType union. Also provision the private `issue-reports` storage bucket and RLS policies in the Supabase dashboard.

Purpose: Plans 02 and 04 both write to this schema. They cannot run until the table exists and the TS types are available. This plan is Wave 1 and blocks everything else.

Output: Migration file, updated types, updated activity logger, a pushed live schema, a live storage bucket, and configured RLS policies.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/33-tenant-issue-reporting-system/33-CONTEXT.md
@.planning/phases/33-tenant-issue-reporting-system/33-RESEARCH.md
@supabase/migrations/20260407_activity_log_table.sql
@src/types/database.ts
@src/lib/activity-logger.ts

<interfaces>
<!-- Existing ActionType union (src/lib/activity-logger.ts lines 6-29). New value must be appended: -->

```typescript
// Current (abbreviated):
export type ActionType =
  | "login"
  | "search_executed"
  | ...
  | "lead_owner_assigned";

// After this plan:
export type ActionType =
  | "login"
  | ...
  | "lead_owner_assigned"
  | "issue_reported"; // ← ADDED
```

<!-- The ACTION_TYPES runtime array (lines 34-58) must also include "issue_reported". -->
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Create 20260410_issue_reports.sql migration with set_updated_at() + table DDL + indexes</name>
  <files>supabase/migrations/20260410_issue_reports.sql</files>
  <read_first>
    - .planning/phases/33-tenant-issue-reporting-system/33-CONTEXT.md (schema block lines 62-105)
    - .planning/phases/33-tenant-issue-reporting-system/33-RESEARCH.md (set_updated_at() finding lines 311-343)
    - supabase/migrations/20260407_activity_log_table.sql (reference for style: snake_case, uuid PK, timestamptz, CHECK enums, ENABLE ROW LEVEL SECURITY + in-dashboard policy comment)
  </read_first>
  <action>
    Create a new file at `supabase/migrations/20260410_issue_reports.sql` with EXACTLY the following contents:

    ```sql
    -- Phase 33: Tenant Issue Reporting System
    -- Adds issue_reports table for in-product tenant bug/data-quality reports.
    -- RLS policies are configured in the Supabase dashboard (per project convention), NOT here.
    -- See .planning/phases/33-tenant-issue-reporting-system/33-CONTEXT.md for full policy spec.

    -- Shared trigger function used to bump updated_at on UPDATE.
    -- Defined here as CREATE OR REPLACE so re-running is idempotent; if a later
    -- migration promotes this to a global helper, this definition remains safe.
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Core table
    CREATE TABLE issue_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      user_id   UUID          REFERENCES users(id)   ON DELETE SET NULL,

      category TEXT NOT NULL CHECK (category IN (
        'incorrect_data','missing_data','bad_source','bug','other'
      )),
      description TEXT NOT NULL CHECK (char_length(description) BETWEEN 1 AND 5000),

      page_url    TEXT NOT NULL,
      page_path   TEXT NOT NULL,
      user_agent  TEXT,
      viewport    JSONB,

      target_type     TEXT CHECK (target_type IN ('prospect','list','persona','search','none')),
      target_id       UUID,
      target_snapshot JSONB,

      screenshot_path TEXT,

      status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
        'open','investigating','resolved','wontfix','duplicate'
      )),
      admin_notes  TEXT,
      resolved_by  UUID REFERENCES users(id) ON DELETE SET NULL,
      resolved_at  TIMESTAMPTZ,

      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX idx_issue_reports_tenant_created ON issue_reports(tenant_id, created_at DESC);
    CREATE INDEX idx_issue_reports_status_created ON issue_reports(status, created_at DESC);
    CREATE INDEX idx_issue_reports_target ON issue_reports(target_type, target_id)
      WHERE target_id IS NOT NULL;

    ALTER TABLE issue_reports ENABLE ROW LEVEL SECURITY;

    CREATE TRIGGER issue_reports_updated_at
      BEFORE UPDATE ON issue_reports
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

    -- RLS policies configured in Supabase dashboard:
    -- 1. INSERT allowed where tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    -- 2. NO SELECT policy for tenants (cannot read); admin uses service-role client
    -- 3. NO UPDATE / DELETE policy for tenants; admin uses service-role client
    ```

    Do NOT add any SELECT/UPDATE/DELETE policies inside the migration — per project convention (confirmed in 20260407_activity_log_table.sql), RLS policies are configured in the Supabase dashboard after the migration is applied. The comment block at the bottom documents the required dashboard policies for the operator.

    Per RESEARCH finding: the `set_updated_at()` function does NOT exist in any prior migration. Prepending `CREATE OR REPLACE FUNCTION set_updated_at()` is REQUIRED or the `CREATE TRIGGER` line will fail with `ERROR: function set_updated_at() does not exist`.
  </action>
  <verify>
    <automated>test -f supabase/migrations/20260410_issue_reports.sql && grep -q "CREATE OR REPLACE FUNCTION set_updated_at" supabase/migrations/20260410_issue_reports.sql && grep -q "CREATE TABLE issue_reports" supabase/migrations/20260410_issue_reports.sql && grep -q "idx_issue_reports_tenant_created" supabase/migrations/20260410_issue_reports.sql && grep -q "idx_issue_reports_status_created" supabase/migrations/20260410_issue_reports.sql && grep -q "idx_issue_reports_target" supabase/migrations/20260410_issue_reports.sql && grep -q "ENABLE ROW LEVEL SECURITY" supabase/migrations/20260410_issue_reports.sql && grep -q "issue_reports_updated_at" supabase/migrations/20260410_issue_reports.sql</automated>
  </verify>
  <acceptance_criteria>
    - File `supabase/migrations/20260410_issue_reports.sql` exists
    - Contains `CREATE OR REPLACE FUNCTION set_updated_at()` (BEFORE the trigger)
    - Contains `CREATE TABLE issue_reports` with 18 columns matching CONTEXT.md exactly
    - Contains all 5 category CHECK values: `incorrect_data`, `missing_data`, `bad_source`, `bug`, `other`
    - Contains all 5 status CHECK values: `open`, `investigating`, `resolved`, `wontfix`, `duplicate`
    - Contains all 5 target_type CHECK values: `prospect`, `list`, `persona`, `search`, `none`
    - Contains `description` CHECK length `BETWEEN 1 AND 5000`
    - Contains all 3 indexes: `idx_issue_reports_tenant_created`, `idx_issue_reports_status_created`, `idx_issue_reports_target`
    - `idx_issue_reports_target` has partial `WHERE target_id IS NOT NULL` clause
    - Contains `ALTER TABLE issue_reports ENABLE ROW LEVEL SECURITY;`
    - Contains `CREATE TRIGGER issue_reports_updated_at BEFORE UPDATE ON issue_reports`
    - RLS policy spec is documented in a trailing SQL comment block (no `CREATE POLICY` statements inside the migration file)
  </acceptance_criteria>
  <done>Migration file exists and is ready for `supabase db push`.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Add IssueReport + IssueCategory + IssueStatus + TargetType exports to src/types/database.ts AND add 'issue_reported' to ActionType union in src/lib/activity-logger.ts</name>
  <files>src/types/database.ts, src/lib/activity-logger.ts</files>
  <read_first>
    - src/types/database.ts (full file — see how existing interfaces are formatted)
    - src/lib/activity-logger.ts (lines 6-58 — ActionType union + ACTION_TYPES array)
    - .planning/phases/33-tenant-issue-reporting-system/33-CONTEXT.md (schema block — field names/types must match column names exactly)
  </read_first>
  <action>
    **Edit `src/types/database.ts`:** Append the following four exports to the END of the file (after any existing interfaces), preserving existing file formatting style (the project uses `export type` + `export interface`, snake_case for DB column names since these mirror table columns):

    ```typescript
    // Phase 33: Issue Reports — mirrors issue_reports table schema
    // See supabase/migrations/20260410_issue_reports.sql

    export type IssueCategory =
      | "incorrect_data"
      | "missing_data"
      | "bad_source"
      | "bug"
      | "other";

    export type IssueStatus =
      | "open"
      | "investigating"
      | "resolved"
      | "wontfix"
      | "duplicate";

    export type TargetType = "prospect" | "list" | "persona" | "search" | "none";

    export interface IssueReport {
      id: string;
      tenant_id: string;
      user_id: string | null;

      category: IssueCategory;
      description: string;

      page_url: string;
      page_path: string;
      user_agent: string | null;
      viewport: { w: number; h: number } | null;

      target_type: TargetType | null;
      target_id: string | null;
      target_snapshot: Record<string, unknown> | null;

      screenshot_path: string | null;

      status: IssueStatus;
      admin_notes: string | null;
      resolved_by: string | null;
      resolved_at: string | null;

      created_at: string;
      updated_at: string;
    }
    ```

    **Edit `src/lib/activity-logger.ts`:**
    1. Append `| "issue_reported"` as the last member of the `ActionType` union (line 29, after `"lead_owner_assigned"`).
    2. Append `"issue_reported",` as the last entry of the `ACTION_TYPES` runtime array (after `"lead_owner_assigned",` near line 57).

    Both additions are required — the union is for TypeScript, the array is used by runtime validation code elsewhere in the project (confirmed by the existing parallel pattern).
  </action>
  <verify>
    <automated>grep -q "export interface IssueReport" src/types/database.ts && grep -q "export type IssueCategory" src/types/database.ts && grep -q "export type IssueStatus" src/types/database.ts && grep -q "export type TargetType" src/types/database.ts && grep -c "issue_reported" src/lib/activity-logger.ts | grep -q "^2$" && npx tsc --noEmit 2>&1 | tee /tmp/tsc-33-01.log && ! grep -q "src/types/database.ts\|src/lib/activity-logger.ts" /tmp/tsc-33-01.log</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "export interface IssueReport" src/types/database.ts` passes
    - `grep -q "export type IssueCategory" src/types/database.ts` passes
    - `grep -q "export type IssueStatus" src/types/database.ts` passes
    - `grep -q "export type TargetType" src/types/database.ts` passes
    - `IssueReport` interface has exactly these fields: id, tenant_id, user_id, category, description, page_url, page_path, user_agent, viewport, target_type, target_id, target_snapshot, screenshot_path, status, admin_notes, resolved_by, resolved_at, created_at, updated_at (19 fields)
    - `grep -c "issue_reported" src/lib/activity-logger.ts` returns exactly `2` (once in ActionType union, once in ACTION_TYPES array)
    - `npx tsc --noEmit` produces zero new errors in `src/types/database.ts` and `src/lib/activity-logger.ts`
  </acceptance_criteria>
  <done>Types + activity-logger additions compile cleanly. Downstream plans (02 and 04) can import `IssueReport`, `IssueCategory`, `IssueStatus`, `TargetType` from `@/types/database` and pass `actionType: 'issue_reported'` to `logActivity`.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: [BLOCKING] Push the 20260410_issue_reports.sql migration to the live Supabase database</name>
  <files>supabase/migrations/20260410_issue_reports.sql (reads; does not modify)</files>
  <read_first>
    - supabase/migrations/20260410_issue_reports.sql (the migration just created — confirm it exists)
  </read_first>
  <action>
    Run `supabase db push` to apply the new migration to the remote Supabase project.

    1. First confirm the file exists: `test -f supabase/migrations/20260410_issue_reports.sql || { echo "MISSING — Task 1 did not run"; exit 1; }`
    2. Run `supabase db push` — this will ask for confirmation before applying.
    3. If `supabase` CLI is not logged in or the project is not linked, surface the error immediately and do NOT attempt workarounds. The user must log in / link before continuing.
    4. On success, run `supabase migration list --linked 2>/dev/null || supabase migration list` and confirm `20260410_issue_reports` appears in the "Applied" column.

    This task is BLOCKING: it must complete before any subsequent plan (02 or 04) runs, because those plans make DB queries that will fail if the table does not exist.

    Do NOT skip this task. Do NOT assume the migration will be applied later. The Supabase CLI push is the canonical way to apply migrations in this project.

    Expected output: `Applied migration 20260410_issue_reports.sql` or equivalent success message from the CLI.
  </action>
  <verify>
    <automated>supabase migration list 2>&1 | grep -q "20260410_issue_reports" || echo "MANUAL VERIFY: confirm migration applied via Supabase dashboard SQL editor: SELECT 1 FROM information_schema.tables WHERE table_name = 'issue_reports';"</automated>
  </verify>
  <acceptance_criteria>
    - `supabase db push` exits with code 0
    - `supabase migration list` output contains `20260410_issue_reports`
    - A SELECT against `information_schema.tables` for `table_name = 'issue_reports'` returns 1 row (runnable via Supabase dashboard SQL editor if CLI verification is unavailable)
    - A SELECT against `pg_proc WHERE proname = 'set_updated_at'` returns 1 row
  </acceptance_criteria>
  <done>The `issue_reports` table exists in the live database with all columns, CHECK constraints, indexes, and the trigger wired up.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 4: Manual Supabase dashboard setup — create private bucket + configure RLS policies</name>
  <files>(Supabase dashboard — no local files modified)</files>
  <read_first>
    - .planning/phases/33-tenant-issue-reporting-system/33-CONTEXT.md (Manual Supabase dashboard tasks lines 257-262)
    - .planning/phases/33-tenant-issue-reporting-system/33-RESEARCH.md (Storage section lines 152-181)
    - supabase/migrations/20260410_issue_reports.sql (confirm ENABLE ROW LEVEL SECURITY line is present)
  </read_first>
  <action>
    Perform these Supabase dashboard steps manually — this is the only task in Phase 33 that cannot be automated (the Supabase JS/CLI does not expose bucket creation or RLS policy creation via a scriptable path that is already wired in this project).

    **Step 1 — Create the private storage bucket:**
    1. Open Supabase dashboard → Storage → New bucket
    2. Name: `issue-reports` (exact — hyphenated, not underscored)
    3. Public: OFF (private bucket)
    4. Click Create

    **Step 2 — Configure bucket RLS policy (storage.objects) for `issue-reports`:**
    1. Go to Storage → `issue-reports` bucket → Policies
    2. Add new policy for INSERT: "Authenticated users can upload to their own tenant folder"
       - Allowed operation: INSERT
       - Target roles: `authenticated`
       - WITH CHECK expression:
         ```sql
         bucket_id = 'issue-reports'
         AND (storage.foldername(name))[1] = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::text)
         ```
    3. Do NOT add any SELECT / UPDATE / DELETE policies — admin reads use the service role key which bypasses RLS.

    **Step 3 — Configure `issue_reports` table RLS policies:**
    1. Go to Authentication → Policies → issue_reports
    2. Confirm RLS is already enabled (from the migration `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
    3. Add policy: "Tenants can insert their own reports"
       - Operation: INSERT
       - Target role: `authenticated`
       - WITH CHECK expression:
         ```sql
         tenant_id = ((auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
         ```
    4. Do NOT add any SELECT / UPDATE / DELETE policies. Admin API routes use `createAdminClient()` which uses the service role key and bypasses RLS entirely.
  </action>
  <what-built>Migration has been applied (Task 3). The table exists. This task configures the private storage bucket and RLS policies in the Supabase dashboard — per project convention these live in the dashboard, not in migration files.</what-built>
  <how-to-verify>
    In the Supabase dashboard SQL Editor, run each of these three queries:

    ```sql
    -- Query 1: confirm only INSERT policy on issue_reports (expect exactly 1 row, polcmd = 'a')
    SELECT polname, polcmd FROM pg_policy WHERE polrelid = 'issue_reports'::regclass;

    -- Query 2: confirm the private bucket exists (expect exactly 1 row)
    SELECT name, public FROM storage.buckets WHERE name = 'issue-reports';

    -- Query 3: confirm bucket INSERT policy exists (expect at least 1 row)
    SELECT polname FROM pg_policy WHERE polrelid = 'storage.objects'::regclass AND polname ILIKE '%issue-reports%';
    ```

    Paste the results into the execution log. Expected shape:
    - Query 1: 1 row, `polcmd = 'a'`
    - Query 2: 1 row, `public = false`
    - Query 3: 1+ rows

    Then type `approved` to resume execution.
  </how-to-verify>
  <verify>
    <automated>echo "MANUAL: three SQL queries must be run in Supabase dashboard — see how-to-verify block. No automated command available because bucket creation + RLS policy creation is dashboard-only in this project."</automated>
  </verify>
  <acceptance_criteria>
    - Supabase dashboard SQL `SELECT polname, polcmd FROM pg_policy WHERE polrelid = 'issue_reports'::regclass` returns exactly 1 row with `polcmd = 'a'` (INSERT)
    - Supabase dashboard SQL `SELECT name, public FROM storage.buckets WHERE name = 'issue-reports'` returns exactly 1 row with `public = false`
    - Supabase dashboard SQL `SELECT polname FROM pg_policy WHERE polrelid = 'storage.objects'::regclass AND polname ILIKE '%issue-reports%'` returns 1 or more rows
    - User pastes all three query results into execution log
    - User types `approved` to unblock downstream plans
  </acceptance_criteria>
  <done>Private `issue-reports` bucket exists, INSERT-only RLS policies are in place on both `issue_reports` table and `storage.objects` for the bucket, verification SQL confirms the policies, user has typed `approved`. Plan 02 can now safely upload screenshots via the user-scoped client.</done>
  <resume-signal>Type "approved" with pasted SQL verification output, or describe issues encountered.</resume-signal>
</task>

</tasks>

<verification>
- `test -f supabase/migrations/20260410_issue_reports.sql` passes
- `grep -q "export interface IssueReport" src/types/database.ts` passes
- `grep -c "issue_reported" src/lib/activity-logger.ts` returns `2`
- `supabase migration list` contains `20260410_issue_reports`
- Dashboard: private bucket `issue-reports` exists
- Dashboard: RLS INSERT policy on `issue_reports` table exists (and only INSERT)
- Dashboard: Storage bucket INSERT policy on `issue-reports` exists
- `npx tsc --noEmit` is clean
</verification>

<success_criteria>
Downstream plans (02 and 04) can:
1. Import `IssueReport`, `IssueCategory`, `IssueStatus`, `TargetType` from `@/types/database`
2. Call `logActivity({ actionType: 'issue_reported', ... })` without TypeScript complaint
3. Insert rows into `issue_reports` via the user-scoped Supabase client (RLS passes for matching tenant_id)
4. Upload screenshots to `issue-reports/{tenant_id}/{report_id}.png` via the user-scoped client (bucket policy passes)
5. Read rows and generate signed URLs via `createAdminClient()` (service role bypasses RLS)
</success_criteria>

<output>
After completion, create `.planning/phases/33-tenant-issue-reporting-system/33-01-SUMMARY.md` documenting:
- Migration file path and actual DDL applied
- Dashboard policy SQL that was configured
- Any deviations from the CONTEXT.md schema (expected: none)
</output>
