---
phase: 260416-vpr
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/ui/hover-card.tsx
  - src/components/prospect/lead-hover-preview.tsx
  - src/app/[orgId]/lists/components/list-member-table.tsx
  - package.json
autonomous: true
requirements:
  - FEAT-001
must_haves:
  truths:
    - "Hovering a lead's name on the lists page (desktop) opens a small popup within ~300ms"
    - "Popup surfaces name, title at company, location, enrichment status, and contact availability (email/phone presence) drawn solely from the already-fetched ListMember data"
    - "Popup closes when the cursor leaves both the trigger and the popup"
    - "Popup is wired into BOTH the desktop table row name link AND the mobile card name link in list-member-table.tsx"
    - "Touch devices receive no hover popup — pointer-only behavior is preserved by Radix HoverCard semantics"
    - "Popup styling matches the design system: var(--bg-floating-elevated) surface, var(--border-subtle) border, var(--gold-primary) accent text, backdrop blur, soft shadow — no hardcoded rgba(212,175,55,*)"
    - "No new API routes are introduced and no new DB queries are added — getListMembers is unchanged"
  artifacts:
    - path: "src/components/ui/hover-card.tsx"
      provides: "shadcn HoverCard primitive (Root/Trigger/Content) wrapping @radix-ui/react-hover-card with project floating-surface tokens"
      exports: ["HoverCard", "HoverCardTrigger", "HoverCardContent"]
    - path: "src/components/prospect/lead-hover-preview.tsx"
      provides: "LeadHoverPreview presentational card consuming ListMember.prospect fields and rendering the mini summary popup"
      exports: ["LeadHoverPreview"]
    - path: "src/app/[orgId]/lists/components/list-member-table.tsx"
      provides: "Desktop name <Link> AND mobile card name <Link> wrapped in HoverCardTrigger; LeadHoverPreview rendered inside HoverCardContent for both surfaces"
      contains: "HoverCard"
    - path: "package.json"
      provides: "@radix-ui/react-hover-card dependency"
      contains: "@radix-ui/react-hover-card"
  key_links:
    - from: "src/components/ui/hover-card.tsx"
      to: "@radix-ui/react-hover-card"
      via: "HoverCardPrimitive.Root/Trigger/Content + Portal"
      pattern: "@radix-ui/react-hover-card"
    - from: "src/app/[orgId]/lists/components/list-member-table.tsx"
      to: "src/components/prospect/lead-hover-preview.tsx"
      via: "<HoverCardContent><LeadHoverPreview prospect={member.prospect} /></HoverCardContent>"
      pattern: "LeadHoverPreview"
    - from: "src/components/prospect/lead-hover-preview.tsx"
      to: "ListMember.prospect (already-fetched data)"
      via: "props.prospect.{name,title,company,location,email,phone,enrichment_status,linkedin_url,photo_url}"
      pattern: "prospect\\.(name|title|company|location|email|phone|enrichment_status)"
---

<objective>
Add a hover-to-preview mini popup for lead name links on the lists page (FEAT-001 from the post-demo backlog).

Purpose: Let a user quickly inspect a lead's headline data — title, company, location, enrichment status, contact availability — without leaving the lists view. Reduces clicks for the demo flow and gives the lists page a luxurious "preview-on-hover" feel matching the dark-gold design system.

Output:
- shadcn HoverCard primitive added to the project (`src/components/ui/hover-card.tsx`)
- New `LeadHoverPreview` presentational component (`src/components/prospect/lead-hover-preview.tsx`)
- Both desktop table row AND mobile card name links in `list-member-table.tsx` wrapped to trigger the preview
- Zero new API routes, zero new DB queries — popup is fed entirely by data already on `ListMember.prospect`
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/app/[orgId]/lists/components/list-member-table.tsx
@src/lib/lists/types.ts
@src/lib/lists/queries.ts
@src/components/ui/popover.tsx
@src/components/ui/tooltip.tsx
@src/components/ui/wealth-tier-badge.tsx

<interfaces>
<!-- Key types and tokens the executor needs. Extracted from the codebase. -->
<!-- Use these directly — no further codebase exploration required. -->

From src/lib/lists/types.ts (the EXACT shape consumed by LeadHoverPreview — do not assume any other fields exist):
```typescript
export type ListMemberStatus = "new" | "contacted" | "responded" | "not_interested";

export interface ListMember {
  id: string;
  list_id: string;
  prospect_id: string;
  status: ListMemberStatus;
  notes: string | null;
  added_at: string;
  updated_at: string;
  prospect: {
    id: string;
    name: string;
    title: string | null;
    company: string | null;
    location: string | null;
    email: string | null;
    email_status: string | null;
    phone: string | null;
    linkedin_url: string | null;
    enrichment_status: string | null; // "complete" | "enriched" | "in_progress" | "failed" | "pending" | null
    photo_url: string | null;
  };
}
```

NOTE: There is NO `wealth_tier`, NO `signals`, NO `summary` field on `ListMember.prospect`. The existing `getListMembers` query (src/lib/lists/queries.ts) only selects `prospects(full_name, title, company, location, work_email, work_phone, linkedin_url, enrichment_status, contact_data, manual_photo_url)`. The user requirement says "any wealth tier / top signals if already on the prospect record" — they are NOT, so the popup MUST omit them rather than introduce a new query. Do not add a new DB query.

Floating-surface design tokens (mirror the existing Popover/Tooltip):
- Surface bg: `var(--bg-floating-elevated, #1a1a1e)` — opaque dark, NEVER var(--bg-elevated) which is transparent
- Border: `var(--border-subtle)` (or `var(--border-default)` for stronger separation)
- Primary text: `var(--text-primary-ds)` / accent: `var(--gold-primary)`
- Secondary text: `var(--text-secondary, rgba(232,228,220,0.55))`
- Tertiary text: `var(--text-tertiary, rgba(232,228,220,0.4))`
- Gold tint backgrounds: `rgba(var(--gold-primary-rgb), 0.08)` — NEVER hardcode `rgba(212,175,55,*)`
- Shadow: `shadow-xl` (Tailwind) or inline `var(--shadow-md, 0_2px_8px_rgba(0,0,0,0.3))`
- Backdrop: `backdrop-blur-sm`
- Radius: `rounded-lg` for cards, matches Popover

Mirror this exact Popover content className recipe (src/components/ui/popover.tsx lines 14-34) for the HoverCardContent default styling:
```
"z-50 w-[min(20rem,90vw)] rounded-lg border p-4 shadow-xl outline-none",
"bg-[var(--bg-floating-elevated,#1a1a1e)] backdrop-blur-sm text-foreground",
"border-[var(--border-subtle)]",
"data-[state=open]:animate-in data-[state=closed]:animate-out",
"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
```

Existing `EnrichmentDot` component (already exported as a function inside list-member-table.tsx, lines 83-130) — for the popup, REPLICATE the same color logic (success=green, in_progress=spinner gold, failed=red, pending=pulse white-40, default=ring) but DO NOT import EnrichmentDot from the table file (it's not exported). Either inline a tiny status pill in LeadHoverPreview or extract a shared helper if it stays clean. Inline pill is preferred to keep this PR minimal.

Mobile note: The user requirement says "mobile card name links should also be wrapped — on touch devices HoverCard does nothing (Radix HoverCard is pointer-only), so wiring both is harmless and lets a tablet user with a mouse see the preview." Wire both. Do NOT add `useMediaQuery` or device-detection — let Radix's pointer-only semantics handle it.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install shadcn HoverCard primitive and create LeadHoverPreview component</name>
  <files>package.json, src/components/ui/hover-card.tsx, src/components/prospect/lead-hover-preview.tsx</files>
  <action>
Per FEAT-001 user requirement #1 (use shadcn HoverCard, install if not present):

1. Install the Radix dependency (the shadcn CLI may not be wired into this repo — install the underlying Radix package directly, which is what the shadcn HoverCard wraps):
   ```
   pnpm add @radix-ui/react-hover-card
   ```
   This is the smallest valid install. Do NOT also run `pnpm dlx shadcn@latest add hover-card` — this codebase already vendors its own shadcn primitives in `src/components/ui/` with project-specific token overrides (see Popover.tsx for the canonical example) and the CLI would overwrite styles with shadcn defaults.

2. Create `src/components/ui/hover-card.tsx` — modeled DIRECTLY on `src/components/ui/popover.tsx` (read it as the template). Implementation:
   ```tsx
   "use client";

   import * as React from "react";
   import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
   import { cn } from "@/lib/utils";

   const HoverCard = HoverCardPrimitive.Root;
   const HoverCardTrigger = HoverCardPrimitive.Trigger;

   const HoverCardContent = React.forwardRef<
     React.ElementRef<typeof HoverCardPrimitive.Content>,
     React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content>
   >(({ className, align = "start", sideOffset = 8, ...props }, ref) => (
     <HoverCardPrimitive.Portal>
       <HoverCardPrimitive.Content
         ref={ref}
         align={align}
         sideOffset={sideOffset}
         className={cn(
           // Mirror Popover sizing — narrower for a "mini" preview.
           "z-50 w-[min(20rem,90vw)] rounded-lg border p-4 shadow-xl outline-none",
           // var(--bg-floating-elevated) is opaque (#1a1a1e) — DO NOT use --bg-elevated (transparent).
           // Same fix as the f087443 popover-bg memory note.
           "bg-[var(--bg-floating-elevated,#1a1a1e)] backdrop-blur-sm text-foreground",
           "border-[var(--border-subtle)]",
           "data-[state=open]:animate-in data-[state=closed]:animate-out",
           "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
           className
         )}
         {...props}
       />
     </HoverCardPrimitive.Portal>
   ));
   HoverCardContent.displayName = HoverCardPrimitive.Content.displayName;

   export { HoverCard, HoverCardTrigger, HoverCardContent };
   ```
   Note: Do NOT export HoverCardArrow, HoverCardPortal, etc. — keep the surface area minimal (Trigger/Root/Content) like Popover does. Project convention.

3. Create `src/components/prospect/lead-hover-preview.tsx` — pure presentational component. Props are a SUBSET of `ListMember["prospect"]` (so callers can pass `member.prospect` directly):
   ```tsx
   "use client";

   import { Mail, Phone, ExternalLink, Loader2 } from "lucide-react";
   import { ProspectAvatar } from "@/components/prospect/prospect-avatar";
   import type { ListMember } from "@/lib/lists/types";

   interface LeadHoverPreviewProps {
     prospect: ListMember["prospect"];
   }

   const ENRICHMENT_LABEL: Record<string, string> = {
     complete: "Enriched",
     enriched: "Enriched",
     in_progress: "Enriching…",
     failed: "Enrichment failed",
     pending: "Pending enrichment",
   };

   function StatusPill({ status }: { status: string | null }) {
     // Mirror the EnrichmentDot color system (list-member-table.tsx lines 83-130)
     // but render as label+dot so the popup reads at a glance.
     // var(--success) / var(--destructive) tokens with hardcoded fallbacks per existing pattern.
     const label = status ? (ENRICHMENT_LABEL[status] ?? "Not enriched") : "Not enriched";
     const styles = (() => {
       switch (status) {
         case "complete":
         case "enriched":
           return { bg: "rgba(34,197,94,0.12)", color: "var(--success, #22c55e)", dot: "var(--success, #22c55e)" };
         case "in_progress":
           return { bg: "rgba(var(--gold-primary-rgb), 0.10)", color: "var(--gold-primary)", dot: "var(--gold-primary)" };
         case "failed":
           return { bg: "rgba(239,68,68,0.10)", color: "var(--destructive, #ef4444)", dot: "var(--destructive, #ef4444)" };
         case "pending":
           return { bg: "rgba(255,255,255,0.06)", color: "var(--text-secondary)", dot: "rgba(255,255,255,0.4)" };
         default:
           return { bg: "rgba(255,255,255,0.04)", color: "var(--text-tertiary)", dot: "rgba(255,255,255,0.25)" };
       }
     })();
     return (
       <span
         className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
         style={{ background: styles.bg, color: styles.color }}
       >
         {status === "in_progress" ? (
           <Loader2 className="h-3 w-3 animate-spin" />
         ) : (
           <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: styles.dot }} />
         )}
         {label}
       </span>
     );
   }

   /** Short location: "Boston, MA, United States" → "Boston, MA". Inlined to keep this component self-contained. */
   function shortLocation(loc: string): string {
     const parts = loc.split(",").map((s) => s.trim());
     if (parts.length >= 3) {
       const last = parts[parts.length - 1].toLowerCase();
       if (["united states", "usa", "us", "uk", "united kingdom"].includes(last)) {
         return parts.slice(0, -1).join(", ");
       }
     }
     return loc;
   }

   export function LeadHoverPreview({ prospect }: LeadHoverPreviewProps) {
     // Null-guard per CLAUDE.md memory: list_members join can yield missing prospect data.
     // ListMember.prospect.name is non-nullable per the type, but title/company/location may be null.
     const titleLine = [prospect.title, prospect.company].filter(Boolean).join(" at ");
     const hasEmail = !!prospect.email;
     const hasPhone = !!prospect.phone;

     return (
       <div className="space-y-3">
         {/* Header: avatar + name + linkedin */}
         <div className="flex items-start gap-3">
           <ProspectAvatar
             name={prospect.name}
             photoUrl={prospect.photo_url}
             email={prospect.email}
             size="md"
           />
           <div className="min-w-0 flex-1">
             <div className="flex items-center gap-1.5 min-w-0">
               <p
                 className="text-[14px] font-semibold truncate"
                 style={{ color: "var(--gold-primary)" }}
               >
                 {prospect.name}
               </p>
               {prospect.linkedin_url && (
                 <a
                   href={prospect.linkedin_url}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="shrink-0"
                   style={{ color: "var(--text-tertiary)" }}
                   onClick={(e) => e.stopPropagation()}
                 >
                   <ExternalLink className="h-3 w-3" />
                 </a>
               )}
             </div>
             {titleLine && (
               <p
                 className="text-[12px] truncate mt-0.5"
                 style={{ color: "var(--text-secondary, rgba(232,228,220,0.55))" }}
               >
                 {titleLine}
               </p>
             )}
             {prospect.location && (
               <p
                 className="text-[11px] truncate mt-0.5"
                 style={{ color: "var(--text-tertiary, rgba(232,228,220,0.4))" }}
               >
                 {shortLocation(prospect.location)}
               </p>
             )}
           </div>
         </div>

         {/* Status + contact-availability row */}
         <div className="flex items-center justify-between gap-2 pt-1 border-t" style={{ borderColor: "var(--border-subtle)" }}>
           <StatusPill status={prospect.enrichment_status} />
           <div className="flex items-center gap-2" style={{ color: "var(--text-tertiary)" }}>
             <span
               className="inline-flex items-center gap-1 text-[11px]"
               style={{ color: hasEmail ? "var(--gold-primary)" : "var(--text-tertiary)", opacity: hasEmail ? 1 : 0.4 }}
               title={hasEmail ? "Email available" : "No email"}
             >
               <Mail className="h-3 w-3" />
               {hasEmail ? "Email" : "—"}
             </span>
             <span
               className="inline-flex items-center gap-1 text-[11px]"
               style={{ color: hasPhone ? "var(--gold-primary)" : "var(--text-tertiary)", opacity: hasPhone ? 1 : 0.4 }}
               title={hasPhone ? "Phone available" : "No phone"}
             >
               <Phone className="h-3 w-3" />
               {hasPhone ? "Phone" : "—"}
             </span>
           </div>
         </div>
       </div>
     );
   }
   ```

Constraints to honor:
- NO new API routes (constraint #1)
- NO new DB queries (constraint #2). LeadHoverPreview consumes only `ListMember["prospect"]` which is already fetched.
- NO hardcoded `rgba(212,175,55,*)` — gold uses `var(--gold-primary)` or `rgba(var(--gold-primary-rgb), N)` (per CSS-variable constraint). All other status colors mirror EnrichmentDot's existing pattern (success/destructive tokens with literal-rgba fallbacks for design-system parity).
- NO wealth tier / signal rendering — those fields are NOT on ListMember (would require a new DB query). Per the planner_authority_limits: this is a "missing information" constraint — fields are not in any source artifact. Do not invent them.
- ProspectAvatar component already exists at `src/components/prospect/prospect-avatar.tsx` and is used by list-member-table.tsx (lines 353, 514) — reuse it, don't roll a new avatar.
  </action>
  <verify>
    <automated>pnpm exec tsc --noEmit 2>&1 | grep -E "hover-card|lead-hover-preview" || echo "PASS: no TS errors in new files"</automated>
  </verify>
  <done>
- `pnpm add @radix-ui/react-hover-card` recorded in package.json + pnpm-lock.yaml
- `src/components/ui/hover-card.tsx` exists, exports `HoverCard`, `HoverCardTrigger`, `HoverCardContent`, uses `var(--bg-floating-elevated)` and `var(--border-subtle)`
- `src/components/prospect/lead-hover-preview.tsx` exists, exports `LeadHoverPreview`, props type is `{ prospect: ListMember["prospect"] }`, uses ProspectAvatar, no hardcoded `rgba(212,175,55,*)`
- `pnpm exec tsc --noEmit` reports zero new errors in either file
  </done>
</task>

<task type="auto">
  <name>Task 2: Wire HoverCard around BOTH desktop table row and mobile card name links in list-member-table.tsx</name>
  <files>src/app/[orgId]/lists/components/list-member-table.tsx</files>
  <action>
Per FEAT-001 user requirement #4 (wire BOTH desktop and mobile name links).

1. Add imports at the top of `src/app/[orgId]/lists/components/list-member-table.tsx`:
   ```tsx
   import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
   import { LeadHoverPreview } from "@/components/prospect/lead-hover-preview";
   ```

2. Wrap the DESKTOP table row name `<Link>` (currently at lines 368-374 in the existing file). Convert from:
   ```tsx
   <Link
     href={`/${orgId}/prospects/${member.prospect.id}${fromQuery}`}
     className="text-[15px] font-semibold truncate hover:underline transition-colors"
     style={{ color: "var(--gold-primary)" }}
   >
     {member.prospect.name}
   </Link>
   ```
   To:
   ```tsx
   <HoverCard openDelay={300} closeDelay={120}>
     <HoverCardTrigger asChild>
       <Link
         href={`/${orgId}/prospects/${member.prospect.id}${fromQuery}`}
         className="text-[15px] font-semibold truncate hover:underline transition-colors"
         style={{ color: "var(--gold-primary)" }}
       >
         {member.prospect.name}
       </Link>
     </HoverCardTrigger>
     <HoverCardContent align="start" side="right" sideOffset={12}>
       <LeadHoverPreview prospect={member.prospect} />
     </HoverCardContent>
   </HoverCard>
   ```

3. Wrap the MOBILE card name `<Link>` (currently at lines 527-533). Convert from:
   ```tsx
   <Link
     href={`/${orgId}/prospects/${member.prospect.id}${fromQuery}`}
     className="text-sm font-semibold truncate hover:underline"
     style={{ color: "var(--gold-primary)" }}
   >
     {member.prospect.name}
   </Link>
   ```
   To:
   ```tsx
   <HoverCard openDelay={300} closeDelay={120}>
     <HoverCardTrigger asChild>
       <Link
         href={`/${orgId}/prospects/${member.prospect.id}${fromQuery}`}
         className="text-sm font-semibold truncate hover:underline"
         style={{ color: "var(--gold-primary)" }}
       >
         {member.prospect.name}
       </Link>
     </HoverCardTrigger>
     <HoverCardContent align="start" side="bottom" sideOffset={8}>
       <LeadHoverPreview prospect={member.prospect} />
     </HoverCardContent>
   </HoverCard>
   ```

Notes / things to NOT change:
- Do NOT touch the skeleton-row branch (lines 287-343) — when `isEnriching` is true, the row is replaced by a skeleton and there is no name Link to wrap.
- Do NOT introduce any device-detection / `useMediaQuery` — Radix HoverCard is pointer-only by spec; touch devices naturally won't trigger it. The user explicitly noted "mobile card is a misnomer" — wiring both is correct and harmless.
- Use `asChild` so HoverCardTrigger does not inject an extra `<button>` wrapper that would break the existing `<div className="flex items-center gap-1.5">` flex layout (the Link must remain the direct child rendered).
- `openDelay={300}` matches the user's "~300ms" requirement; `closeDelay={120}` gives the user a forgiving cursor path between trigger and popup.
- `side="right"` on desktop opens the popup to the right of the name (away from the row content). `side="bottom"` on mobile opens below (more space available). Radix will auto-flip if there's no room.
- Truncation: the existing `<Link>` has `truncate` and lives inside `<div className="min-w-0 flex-1">` — wrapping in HoverCard/HoverCardTrigger does NOT change layout because asChild forwards refs/events directly onto the Link.
- Verify the `transition-colors` class on the desktop link does not conflict — HoverCard adds no className, and `asChild` forwards everything to the Link.

Constraints honored:
- BOTH surfaces wired (user req #4)
- Self-contained (user req #3): hover delay 300ms, closes on leave (Radix default behavior)
- No new API routes, no new queries (constraints #1, #2)
- Mirrors existing design patterns (`var(--gold-primary)` Link, popover floating-surface tokens) — constraint #3
  </action>
  <verify>
    <automated>pnpm build 2>&1 | tail -40</automated>
  </verify>
  <done>
- `import { HoverCard, HoverCardTrigger, HoverCardContent }` and `import { LeadHoverPreview }` added at top of list-member-table.tsx
- Desktop name `<Link>` (in TableCell, ~line 368-374) wrapped in `<HoverCard openDelay={300} closeDelay={120}><HoverCardTrigger asChild>…</HoverCardTrigger><HoverCardContent>…</HoverCardContent></HoverCard>`
- Mobile name `<Link>` (in mobile card div, ~line 527-533) wrapped in matching HoverCard structure
- `pnpm build` exits 0 (img-element warnings and Dynamic-server-usage messages remain — pre-existing per Phase 07-05 locked decision)
- Manual smoke (will happen post-deploy, no local dev env): hovering a name on the lists page after ~300ms shows a popup with name (gold), title at company, location, status pill, email/phone availability indicators; popup closes when the cursor leaves both trigger and popup; touching a name on a touch device does nothing extra (just navigates as before)
  </done>
</task>

</tasks>

<verification>
After both tasks complete:

1. **Build clean:** `pnpm build` exits 0 — no new TypeScript errors, no new lint errors. Pre-existing img-element warnings and Dynamic-server-usage informational messages are accepted (Phase 07-05 locked decision).

2. **No new queries:** `git diff src/lib/lists/queries.ts` shows zero changes. `git diff src/app/api/` shows zero new files.

3. **No design-system regressions:** `grep -r "rgba(212,175,55" src/components/ui/hover-card.tsx src/components/prospect/lead-hover-preview.tsx` returns nothing — gold is always `var(--gold-primary)` or `rgba(var(--gold-primary-rgb), N)`.

4. **Both surfaces wired:** `grep -c "HoverCard" src/app/[orgId]/lists/components/list-member-table.tsx` returns ≥6 (3 wrapper + 3 close tags × 2 surfaces; minimum 6 hits).

5. **Type-check:** `pnpm exec tsc --noEmit` exits 0.
</verification>

<success_criteria>
FEAT-001 complete when ALL of:
- [ ] `@radix-ui/react-hover-card` listed in package.json dependencies
- [ ] `src/components/ui/hover-card.tsx` exists with the three named exports
- [ ] `src/components/prospect/lead-hover-preview.tsx` exists, exports `LeadHoverPreview`, consumes only `ListMember["prospect"]` (no fetches)
- [ ] Desktop name link in `list-member-table.tsx` wrapped in HoverCard
- [ ] Mobile name link in `list-member-table.tsx` wrapped in HoverCard
- [ ] `pnpm build` exits 0
- [ ] Zero new files under `src/app/api/`
- [ ] Zero changes to `src/lib/lists/queries.ts`
- [ ] No hardcoded `rgba(212,175,55,*)` in any new file
- [ ] Hover delay ~300ms (open) / ~120ms (close) — Radix `openDelay`/`closeDelay` props set
</success_criteria>

<output>
After completion, create `.planning/quick/260416-vpr-hover-to-preview-mini-popup-on-lists-pag/260416-vpr-SUMMARY.md` with:
- What shipped (file list with brief description per file)
- Why each design choice (e.g., why `asChild` on Trigger, why no wealth tier in the popup, why no useMediaQuery)
- Smoke checks performed (or deferred to post-deploy if no local dev env)
- Any deviations from the plan and why
</output>
