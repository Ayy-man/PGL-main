import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  rightContent?: React.ReactNode;
}

export function Breadcrumbs({ items, rightContent }: BreadcrumbsProps) {
  return (
    <div className="flex items-center justify-between">
      <nav className="flex items-center gap-1.5 text-[13px]" aria-label="Breadcrumb">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <span key={index} className="flex items-center gap-1.5">
              {index > 0 && (
                <ChevronRight
                  className="h-3.5 w-3.5 shrink-0"
                  style={{ color: "rgba(232,228,220,0.25)" }}
                />
              )}
              {isLast ? (
                <span style={{ color: "var(--text-primary-ds)" }}>
                  {item.label}
                </span>
              ) : item.href ? (
                <Link
                  href={item.href}
                  className="transition-colors cursor-pointer"
                  style={{ color: "var(--text-secondary-ds)" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.color = "var(--gold-primary)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-secondary-ds)";
                  }}
                >
                  {item.label}
                </Link>
              ) : (
                <span style={{ color: "var(--text-secondary-ds)" }}>
                  {item.label}
                </span>
              )}
            </span>
          );
        })}
      </nav>

      {rightContent && (
        <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          {rightContent}
        </div>
      )}
    </div>
  );
}
