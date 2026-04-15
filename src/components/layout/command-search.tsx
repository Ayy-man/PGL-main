"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Search, User, List, Bookmark } from "lucide-react";

// ---- Types ----
interface Prospect {
  id: string;
  full_name: string;
  company: string | null;
  title: string | null;
}
interface ListResult {
  id: string;
  name: string;
}
interface SavedSearchResult {
  id: string;
  name: string;
}
interface SearchResults {
  prospects: Prospect[];
  lists: ListResult[];
  savedSearches: SavedSearchResult[];
}

// ---- Inner component (always called with orgId) ----
function CommandSearchInner({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({
    prospects: [],
    lists: [],
    savedSearches: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build flat list of navigable items for keyboard nav
  const flatItems: { type: "prospect" | "list" | "savedSearch"; id: string; label: string; sub?: string }[] = [];
  for (const p of results.prospects) {
    flatItems.push({ type: "prospect", id: p.id, label: p.full_name, sub: [p.title, p.company].filter(Boolean).join(" at ") });
  }
  for (const l of results.lists) {
    flatItems.push({ type: "list", id: l.id, label: l.name });
  }
  for (const s of results.savedSearches) {
    flatItems.push({ type: "savedSearch", id: s.id, label: s.name });
  }

  // Global Cmd+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Listen for mobile search:open event
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("command-search:open", handler);
    return () => window.removeEventListener("command-search:open", handler);
  }, []);

  // Clear state when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults({ prospects: [], lists: [], savedSearches: [] });
      setActiveIndex(0);
    }
  }, [open]);

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults({ prospects: [], lists: [], savedSearches: [] });
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const resp = await fetch(`/api/global-search?q=${encodeURIComponent(q)}`);
      if (resp.ok) {
        const data = await resp.json();
        setResults(data);
        setActiveIndex(0);
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 250);
  };

  // Navigation
  const navigate = (item: (typeof flatItems)[number]) => {
    setOpen(false);
    switch (item.type) {
      case "prospect":
        router.push(`/${orgId}/prospects/${item.id}`);
        break;
      case "list":
        router.push(`/${orgId}/lists/${item.id}`);
        break;
      case "savedSearch":
        router.push(`/${orgId}/search?persona=${item.id}`);
        break;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % Math.max(flatItems.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + flatItems.length) % Math.max(flatItems.length, 1));
    } else if (e.key === "Enter" && flatItems[activeIndex]) {
      e.preventDefault();
      navigate(flatItems[activeIndex]);
    }
  };

  const iconForType = (type: string) => {
    switch (type) {
      case "prospect":
        return <User className="h-4 w-4 shrink-0" style={{ color: "var(--text-tertiary)" }} />;
      case "list":
        return <List className="h-4 w-4 shrink-0" style={{ color: "var(--text-tertiary)" }} />;
      case "savedSearch":
        return <Bookmark className="h-4 w-4 shrink-0" style={{ color: "var(--text-tertiary)" }} />;
      default:
        return null;
    }
  };

  const categoryLabel = (type: string) => {
    switch (type) {
      case "prospect": return "Prospects";
      case "list": return "Lists";
      case "savedSearch": return "Saved Searches";
      default: return "";
    }
  };

  // Group items by type for section headers
  const renderResults = () => {
    if (query.length < 2) return null;
    if (isLoading) {
      return (
        <div className="px-4 py-8 text-center text-[13px]" style={{ color: "var(--text-tertiary)" }}>
          Searching...
        </div>
      );
    }
    if (flatItems.length === 0) {
      return (
        <div className="px-4 py-8 text-center text-[13px]" style={{ color: "var(--text-tertiary)" }}>
          No results for &ldquo;{query}&rdquo;
        </div>
      );
    }

    let globalIdx = 0;
    const sections: React.ReactNode[] = [];
    const types: Array<"prospect" | "list" | "savedSearch"> = ["prospect", "list", "savedSearch"];

    for (const type of types) {
      const items = flatItems.filter((i) => i.type === type);
      if (items.length === 0) continue;

      sections.push(
        <div key={type}>
          <div
            className="px-4 py-1.5 text-[11px] font-medium uppercase tracking-wider"
            style={{ color: "var(--text-ghost)" }}
          >
            {categoryLabel(type)}
          </div>
          {items.map((item) => {
            const idx = globalIdx++;
            return (
              <button
                key={`${item.type}-${item.id}`}
                className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--border-gold)] focus-visible:ring-inset"
                style={{
                  background: idx === activeIndex ? "rgba(var(--gold-primary-rgb), 0.08)" : "transparent",
                  color: idx === activeIndex ? "var(--gold-primary)" : "var(--text-primary-ds)",
                }}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => navigate(item)}
              >
                {iconForType(item.type)}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium">{item.label}</div>
                  {item.sub && (
                    <div className="truncate text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                      {item.sub}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      );
    }
    return sections;
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      {/* Trigger — styled like the old search input */}
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          className="relative text-left w-full max-w-[320px] cursor-pointer"
        >
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 shrink-0"
            style={{ color: "var(--text-tertiary)" }}
          />
          <div
            className="h-9 w-full rounded-[8px] pl-9 pr-16 text-[13px] font-sans flex items-center"
            style={{
              background: "var(--bg-input)",
              border: "1px solid var(--border-default)",
              color: "var(--text-tertiary)",
            }}
          >
            Search prospects, lists...
          </div>
          <kbd
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border px-1.5 py-0.5 text-[10px] font-mono"
            style={{
              color: "var(--text-ghost)",
              borderColor: "var(--border-subtle)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            Cmd+K
          </kbd>
        </button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-black/70 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-[20%] z-50 w-full max-w-[520px] -translate-x-1/2 rounded-xl shadow-2xl overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          style={{
            background: "var(--bg-card, #141416)",
            border: "1px solid var(--border-default)",
          }}
          onKeyDown={handleKeyDown}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <DialogPrimitive.Title className="sr-only">Global Search</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Search across prospects, lists, and saved searches. Use arrow keys to navigate, Enter to select.
          </DialogPrimitive.Description>

          {/* Search input */}
          <div
            className="flex items-center gap-3 px-4"
            style={{ borderBottom: "1px solid var(--border-subtle)" }}
          >
            <Search className="h-4 w-4 shrink-0" style={{ color: "var(--text-tertiary)" }} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search prospects, lists, saved searches..."
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              className="h-12 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
              style={{ color: "var(--text-primary-ds)" }}
            />
          </div>

          {/* Results */}
          <div className="max-h-[320px] overflow-y-auto py-2">
            {renderResults()}
          </div>

          {/* Footer hint bar */}
          <div
            className="flex items-center gap-4 px-4 py-2 text-[11px]"
            style={{
              borderTop: "1px solid var(--border-subtle)",
              color: "var(--text-ghost)",
            }}
          >
            <span className="flex items-center gap-1">
              <kbd className="rounded border px-1 py-0.5 font-mono text-[10px]" style={{ borderColor: "var(--border-subtle)" }}>↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border px-1 py-0.5 font-mono text-[10px]" style={{ borderColor: "var(--border-subtle)" }}>Enter</kbd>
              open
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border px-1 py-0.5 font-mono text-[10px]" style={{ borderColor: "var(--border-subtle)" }}>Esc</kbd>
              close
            </span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ---- Public wrapper ----
export function CommandSearch({ orgId }: { orgId?: string }) {
  if (!orgId) {
    // Admin layout — return null; no functional search in admin shell
    return null;
  }

  return <CommandSearchInner orgId={orgId} />;
}
