# Deferred Items — Phase 14.1

## Out-of-Scope Violations Found During Compliance Audit (Plan 05)

The following issues were found during the design system compliance audit but are outside the 11-file scope of Phase 14.1 Plans 01-04. They are logged here per the deviation scope boundary rule and should be addressed in a future polish/compliance pass.

### Tailwind hover: with CSS variable values

**Rule:** `hover:bg-[var(...)]` and `hover:border-[var(...)]` are design system violations. Must use `onMouseEnter`/`onMouseLeave` handlers instead. (Per Phase 05-03 decision.)

**Files affected (outside Phase 14.1 scope):**

1. `src/app/admin/tenants/tenant-status-toggle.tsx:35`
   - `hover:bg-[var(--success-muted)]` on active badge

2. `src/app/admin/tenants/new/page.tsx:135`
   - `hover:bg-[var(--gold-bg)]` on submit button

3. `src/app/admin/tenants/new/page.tsx:141`
   - `hover:border-[var(--border-hover)]` on cancel button

4. `src/app/admin/tenants/page.tsx:33`
   - `hover:bg-[var(--gold-bg)]` on New Tenant button

5. `src/app/admin/users/user-status-toggle.tsx:35`
   - `hover:bg-[var(--success-muted)]` on active badge

6. `src/app/admin/users/new/page.tsx:170`
   - `hover:bg-[var(--gold-bg)]` on submit button

7. `src/app/admin/users/new/page.tsx:176`
   - `hover:border-[var(--border-hover)]` on cancel button

8. `src/app/admin/users/page.tsx:38`
   - `hover:bg-[var(--gold-bg)]` on New User button

**Fix approach:** Replace with inline `onMouseEnter`/`onMouseLeave` handlers that set `style` state, following the pattern established in Phase 05-03 and used throughout admin-nav-links.tsx, tenant-heatmap.tsx, error-feed.tsx, system-actions.tsx, and export-activity-chart.tsx.
