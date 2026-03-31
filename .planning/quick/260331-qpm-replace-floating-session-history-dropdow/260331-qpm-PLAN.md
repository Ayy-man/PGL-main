---
phase: quick
plan: 260331-qpm
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/prospect/research-panel.tsx
autonomous: true
must_haves:
  truths:
    - "Clock icon toggles an inline session list between header and chat area"
    - "Session list is part of the card layout, not a floating dropdown"
    - "Clicking a session loads it; clicking + New starts fresh"
    - "Clicking clock icon again hides the session list"
  artifacts:
    - path: "src/components/prospect/research-panel.tsx"
      provides: "Inline session history panel replacing floating dropdown"
  key_links:
    - from: "clock button onClick"
      to: "showSessionHistory toggle"
      via: "setShowSessionHistory((v) => !v)"
    - from: "inline session panel"
      to: "loadSession / startNewSession"
      via: "onClick handlers on session rows and + New button"
---

<objective>
Replace the absolutely-positioned floating session history dropdown in the research panel with an inline panel that renders between the header strip and the chat messages area, making it feel like a native part of the card.

Purpose: The floating dropdown (absolute, z-50, w-72) feels detached and causes z-index issues. An inline panel is more consistent with the card's layout.
Output: Updated research-panel.tsx with inline session list.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/prospect/research-panel.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace floating dropdown with inline session panel</name>
  <files>src/components/prospect/research-panel.tsx</files>
  <action>
Make the following surgical changes to research-panel.tsx:

1. **Remove the floating dropdown** (lines ~503-585): Delete the entire `{showSessionHistory && (...)}` block that is INSIDE the `<div className="relative flex-shrink-0">` wrapper around the clock button. This is the div with classes `absolute right-0 top-10 z-50 w-72`.

2. **Remove the `relative` class** from the clock button's parent wrapper div (line ~480). Change `<div className="relative flex-shrink-0">` to just `<div className="flex-shrink-0">` since we no longer need relative positioning for an absolute child.

3. **Remove the X button close icon import**: The `X` import from lucide-react is no longer needed (it was only used in the floating dropdown close button). Remove it from the import line.

4. **Add inline session panel BETWEEN the header and messages area**: After the closing `</div>` of the "Prospect Context Strip" (the header bar ending around line ~587) and BEFORE the "Messages Area" `<div className="flex-1 overflow-y-auto ...">`, insert a new conditionally-rendered block:

```tsx
{/* Inline Session History */}
{showSessionHistory && (
  <div
    className="flex-shrink-0 overflow-y-auto"
    style={{
      background: "#1a1a1a",
      borderBottom: "1px solid var(--border-subtle, rgba(255,255,255,0.08))",
      maxHeight: "220px",
    }}
  >
    <button
      onClick={startNewSession}
      className="flex items-center gap-1.5 w-full px-4 py-2 text-sm font-medium transition-colors"
      style={{
        color: "var(--gold-primary, #d4af37)",
        borderBottom: "1px solid var(--border-subtle, rgba(255,255,255,0.08))",
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.background =
          "rgba(212,175,55,0.08)")
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.background = "transparent")
      }
    >
      + New
    </button>
    {loadingSessions ? (
      <div
        className="px-4 py-2.5 text-sm"
        style={{ color: "var(--text-tertiary, rgba(232,228,220,0.4))" }}
      >
        Loading...
      </div>
    ) : sessions.length === 0 ? (
      <div
        className="px-4 py-2.5 text-sm"
        style={{ color: "var(--text-tertiary, rgba(232,228,220,0.4))" }}
      >
        No sessions yet
      </div>
    ) : (
      sessions.map((session) => (
        <button
          key={session.id}
          onClick={() => loadSession(session.id)}
          className="flex items-center gap-2 w-full px-4 py-2 text-left transition-colors"
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background =
              "rgba(255,255,255,0.04)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background = "transparent")
          }
        >
          <span
            className="text-sm truncate flex-1"
            style={{ color: "var(--text-primary, #e8e4dc)" }}
          >
            {session.first_query}
          </span>
          <span
            className="font-mono text-[11px] shrink-0"
            style={{ color: "var(--text-tertiary, rgba(232,228,220,0.4))" }}
          >
            {new Date(session.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </button>
      ))
    )}
  </div>
)}
```

Key design details:
- **No absolute positioning, no z-50** — it is a normal flex child with `flex-shrink-0`
- **Solid #1a1a1a background** with subtle border-bottom to separate from chat area
- **maxHeight 220px** with overflow-y-auto so it doesn't push the chat area off screen
- **Compact single-line rows**: `[query text]` left-aligned, `[date]` right-aligned on same line using flex
- **"+ New" button** at top of list (first item), gold text, subtle hover
- **No X button** — clock icon toggle handles open/close
- Session rows omit the "N results" count for compactness — just query + date
  </action>
  <verify>
    <automated>cd /Users/aymanbaig/Desktop/Manual\ Library.noSync/PGL-main && npx next lint --file src/components/prospect/research-panel.tsx 2>&1 | tail -5</automated>
  </verify>
  <done>
    - Floating dropdown (absolute/z-50) is completely removed from the clock button area
    - X import removed from lucide-react imports
    - Inline session panel renders between header and messages area as a normal flow element
    - Clock icon toggles the inline panel on/off
    - "+ New" button and session rows work identically to before
    - No visual regressions in the rest of the research panel
  </done>
</task>

</tasks>

<verification>
1. Lint passes: `npx next lint --file src/components/prospect/research-panel.tsx`
2. Build check: `npx next build` completes without errors
3. Visual: Session history panel appears inline below the header, not floating
</verification>

<success_criteria>
- Clock icon toggles inline session list between header and chat area
- No absolute positioning or z-index on session list
- Session list has #1a1a1a background with border separators
- Each session is a single compact row: query text + date
- "+ New" button at top of list
- No X close button — clock icon toggles off
- All existing session load/new session logic preserved
</success_criteria>

<output>
After completion, create `.planning/quick/260331-qpm-replace-floating-session-history-dropdow/260331-qpm-SUMMARY.md`
</output>
