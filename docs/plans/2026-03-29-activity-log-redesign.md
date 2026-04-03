# Activity Log UI Redesign

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the broken timeline (misaligned dots, vertical line, giant Log button) with a clean, dense, icon-based activity list.

**Architecture:** Rewrite `timeline-feed.tsx` to remove all timeline ornaments (dots, lines, left accents). Each event becomes a single row: `[icon] [text] · [time]`. Move "Log Activity" from a full-width button to a small `+ Log` text button in the card header. Keep QuickActionBar and ActivityFilter logic intact — only change how they're placed.

**Tech Stack:** React, Tailwind, Lucide icons, existing activity types

---

### Task 1: Rewrite TimelineFeed — kill timeline, use icon rows

**Files:**
- Rewrite: `src/components/prospect/timeline-feed.tsx`

**Step 1: Replace the entire EventCard component**

Remove: dots, vertical line, left accent borders, hover background cards.

New EventCard renders a single flex row:

```tsx
function EventCard({ event, users, prospectId, onEventDeleted, onEventUpdated }: EventCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editNote, setEditNote] = useState(event.note ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const Icon = EVENT_ICONS[event.event_type] ?? Activity;
  const iconColor = ICON_COLORS[event.category];
  const userName = event.user_id ? (users[event.user_id]?.full_name?.split(" ")[0] ?? null) : null;

  // ... keep existing edit/delete handlers unchanged ...

  return (
    <div
      className="group flex items-start gap-2.5 py-1.5 px-1 -mx-1 rounded-md transition-colors"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setShowMenu(false); }}
      style={{ background: isHovered ? "rgba(255,255,255,0.02)" : "transparent" }}
    >
      {/* Icon */}
      <div className="mt-0.5 shrink-0">
        <Icon className="h-3.5 w-3.5" style={{ color: iconColor }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          {userName && (
            <span className="text-xs font-medium" style={{ color: "var(--text-foreground, rgba(232,228,220,0.8))" }}>
              {userName}
            </span>
          )}
          <span className="text-xs truncate" style={{ color: "var(--text-secondary, rgba(232,228,220,0.55))" }}>
            {event.title}
          </span>
          <span className="text-[10px] shrink-0 ml-auto" style={{ color: "var(--text-secondary, rgba(232,228,220,0.3))" }}>
            {formatRelativeTime(event.event_at)}
          </span>
          {/* Three-dot menu */}
          {isHovered && !isEditing && (
            <div className="relative shrink-0">
              {/* ... keep existing menu/delete confirm dropdown unchanged ... */}
            </div>
          )}
        </div>

        {/* Note (if present) */}
        {event.note && !isEditing && (
          <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--text-secondary, rgba(232,228,220,0.4))" }}>
            {event.note}
          </p>
        )}

        {/* Inline edit (keep existing) */}
        {isEditing && (/* ... existing edit UI unchanged ... */)}
      </div>
    </div>
  );
}
```

**Step 2: Add icon and color maps at the top of the file**

```tsx
import {
  Activity, Phone, Mail, Users, Linkedin, Eye, Zap, FileText,
  MessageSquare, ListPlus, ListMinus, Download, Edit3, Tag,
  UserPlus, Camera, RefreshCw, TrendingUp, Pin, Search,
} from "lucide-react";

const EVENT_ICONS: Record<string, React.ElementType> = {
  call: Phone,
  email: Mail,
  met: Users,
  linkedin: Linkedin,
  profile_viewed: Eye,
  enrichment_started: Zap,
  enrichment_complete: Zap,
  enrichment_failed: Zap,
  contactout_updated: RefreshCw,
  exa_updated: Search,
  sec_updated: FileText,
  ai_summary_updated: Zap,
  market_data_updated: TrendingUp,
  new_signal: TrendingUp,
  research_scrapbook_search: Search,
  research_scrapbook_pin: Pin,
  note_added: MessageSquare,
  added_to_list: ListPlus,
  removed_from_list: ListMinus,
  exported_csv: Download,
  profile_edited: Edit3,
  status_changed: RefreshCw,
  tag_added: Tag,
  tag_removed: Tag,
  assigned_to: UserPlus,
  photo_uploaded: Camera,
  custom: Activity,
};

const ICON_COLORS: Record<string, string> = {
  outreach: "var(--gold-primary)",
  data: "var(--info, #3b82f6)",
  team: "rgba(255,255,255,0.3)",
  custom: "#a855f7",
};
```

**Step 3: Simplify date group headers**

Replace the current group header (which uses flex-gap-3 with a line spacer) with a simple label:

```tsx
{/* Date group header */}
<p
  className="text-[10px] uppercase tracking-wider pt-3 pb-1 first:pt-0"
  style={{ color: "var(--text-secondary, rgba(232,228,220,0.3))" }}
>
  {group.label}
</p>
```

**Step 4: Remove the vertical timeline line from the main render**

In the `TimelineFeed` return, remove:
- The `<div className="absolute left-[4px] top-0 bottom-0 w-px" .../>` (the vertical line)
- The `<div className="flex flex-col gap-4 pl-2">` wrapper (the indentation for the line)

Replace with a flat `<div className="flex flex-col">` with no padding or line.

**Step 5: Remove CollapsedGroup component entirely**

Delete the `CollapsedGroup` component and the `collapseTeamEvents` function. Profile views should just show as normal rows — they're already compact with the new design. Remove the `collapseTeamEvents(group.events)` call and just iterate `group.events` directly.

**Step 6: Verify it renders**

Run: `pnpm dev` and visit a prospect profile page. Activity log should show clean icon rows with no dots/lines.

**Step 7: Commit**

```bash
git add src/components/prospect/timeline-feed.tsx
git commit -m "refactor: replace timeline dots/lines with clean icon-based activity rows"
```

---

### Task 2: Move "Log Activity" to header, shrink QuickActionBar trigger

**Files:**
- Modify: `src/components/prospect/profile-view.tsx` (activity log section, ~lines 743-778)
- Modify: `src/components/prospect/quick-action-bar.tsx` (trigger button only)

**Step 1: Change QuickActionBar trigger from full-width button to compact `+ Log`**

In `quick-action-bar.tsx`, replace the large button (lines 133-156) with:

```tsx
{!activeMode ? (
  <button
    onClick={() => setMenuOpen(!menuOpen)}
    className="flex items-center gap-1 text-xs font-medium transition-colors cursor-pointer"
    style={{ color: "var(--gold-primary)" }}
    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.7"; }}
    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
  >
    <Plus className="h-3.5 w-3.5" />
    Log
  </button>
) : (
  /* ... keep existing active mode label ... */
)}
```

**Step 2: Restructure the activity log card header in profile-view.tsx**

Replace the current header layout (~lines 744-764) with a single-row header:

```tsx
{/* Activity Log */}
<div className="surface-card rounded-[14px] flex flex-col overflow-hidden">
  <div className="flex items-center justify-between p-4 pb-3">
    <div className="flex items-center gap-2">
      <h3 className="text-foreground text-sm font-bold font-serif">Activity</h3>
      {activityEntries.length > 0 && (
        <span className="text-[10px]" style={{ color: "var(--text-secondary, rgba(232,228,220,0.4))" }}>
          {activityEntries.length}
        </span>
      )}
    </div>
    <div className="flex items-center gap-3">
      {activityEntries.length > 0 && (
        <ActivityFilter
          activeCategories={activeCategories}
          showSystemEvents={showSystemEvents}
          eventCount={activityEntries.length}
          onCategoriesChange={setActiveCategories}
          onShowSystemEventsChange={setShowSystemEvents}
        />
      )}
      <QuickActionBar
        prospectId={prospect.id}
        onActivityCreated={handleActivityCreated}
      />
    </div>
  </div>
  <div
    className="overflow-y-auto px-4 pb-4"
    style={{ maxHeight: activityEntries.length > 0 ? "400px" : "auto" }}
  >
    <TimelineFeed
      prospectId={prospect.id}
      initialEvents={activityEntries}
      initialUsers={activityUsers}
      activeCategories={activeCategories}
      showSystemEvents={showSystemEvents}
      refreshTrigger={refreshTrigger}
    />
  </div>
</div>
```

**Step 3: Verify layout**

Run dev server. Header should show: `Activity  3    [Filter v]  [+ Log]` all in one row. QuickActionBar dropdown still opens below.

**Step 4: Commit**

```bash
git add src/components/prospect/quick-action-bar.tsx src/components/prospect/profile-view.tsx
git commit -m "refactor: compact activity log header with inline Log button"
```

---

### Task 3: Clean up ActivityFilter to match new density

**Files:**
- Modify: `src/components/prospect/activity-filter.tsx`

**Step 1: Remove the event count from ActivityFilter**

Since the count is now shown in the card header, remove the `eventCount` display from the filter component (lines 198-204) and the `eventCount` prop. Just keep the filter button and dropdown.

Update the interface:
```tsx
interface ActivityFilterProps {
  activeCategories: ActivityCategory[];
  showSystemEvents: boolean;
  onCategoriesChange: (categories: ActivityCategory[]) => void;
  onShowSystemEventsChange: (show: boolean) => void;
}
```

Remove the outer `<div className="flex flex-col gap-2">` wrapper and the active filter pills section (lines 208-238). The filter dropdown alone is enough — pills add clutter in a sidebar widget.

**Step 2: Update profile-view.tsx to remove eventCount prop**

Remove `eventCount={activityEntries.length}` from the `<ActivityFilter>` call.

**Step 3: Commit**

```bash
git add src/components/prospect/activity-filter.tsx src/components/prospect/profile-view.tsx
git commit -m "refactor: simplify activity filter, remove redundant count and pills"
```
