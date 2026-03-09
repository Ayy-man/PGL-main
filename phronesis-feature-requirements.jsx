import { useState } from "react";

const features = [
  {
    id: "persona-builder",
    phase: "MVP",
    category: "Core",
    title: "Persona Builder",
    status: "built",
    description: "Reusable saved filter combinations (industry, title, location, seniority). Users create and name personas instead of running ad-hoc searches.",
    source: "Adrian on call: 'There's one where we can suggest a couple but then making that easy for them to do.'",
    notes: "Starter personas needed: Finance Elite, Tech Execs, Startup Founders, BigLaw Partners, Crypto/Web3. Client should be able to create custom ones too.",
  },
  {
    id: "lead-search",
    phase: "MVP",
    category: "Core",
    title: "Lead Search via Apollo.io",
    status: "built",
    description: "Execute persona filters against Apollo API. Return paginated results with name, title, company, location, wealth tier badge, LinkedIn link, and contact icons.",
    source: "Adrian: 'What is powering the front end here is simply the fields that are available through the data source, which is Apollo.'",
    notes: "Filtering must cover: industry, title/seniority, company, location (all 50 US states), contact availability. Results cached in Supabase.",
  },
  {
    id: "prospect-profile",
    phase: "MVP",
    category: "Core",
    title: "Prospect Profile View",
    status: "built",
    description: "Click a prospect to see full profile: contact info, career history, wealth signals, SEC transactions, AI summary, tenant-specific notes, and activity log (who viewed).",
    source: "Adrian: 'They need to know who viewed what prospect so they know Camila already looked at Adrian's profile.'",
    notes: "Profile should show enrichment status. On-demand enrichment triggers on first view.",
  },
  {
    id: "enrichment-contactout",
    phase: "MVP",
    category: "Enrichment",
    title: "ContactOut Personal Email/Phone",
    status: "built",
    description: "Enrich prospects with personal email and phone numbers via ContactOut API. Triggered on-demand when prospect profile is viewed.",
    source: "Call consensus: ContactOut chosen for personal email enrichment over PDL and Lusha.",
    notes: "Personal emails are critical — UHNW individuals don't use work email for personal matters.",
  },
  {
    id: "enrichment-sec",
    phase: "MVP",
    category: "Enrichment",
    title: "SEC EDGAR Insider Transactions",
    status: "built",
    description: "Pull Form 4 insider trading data as wealth signals. Show transaction date, security, type (buy/sell/grant), shares, value, and filing link.",
    source: "Spec: 'SEC EDGAR — Insider transactions, IPO filings, 13F holdings (FREE)'",
    notes: "Only relevant for public company execs. Requires XML parsing. Free API.",
  },
  {
    id: "enrichment-exa",
    phase: "MVP",
    category: "Enrichment",
    title: "Exa.ai Semantic Web Enrichment",
    status: "built",
    description: "Use Exa's semantic search to find deeper context on prospects — news, M&A, promotions, fund closings. Enriches beyond what Apollo provides.",
    source: "Eamon pitched Exa on the call. Adrian: 'I don't know what Exa is.' After demo: approved.",
    notes: "Exa returns web results, not structured contacts. This is the enrichment/insight layer, not the lead source.",
  },
  {
    id: "enrichment-claude",
    phase: "MVP",
    category: "Enrichment",
    title: "AI 'Why Recommended' Summary",
    status: "built",
    description: "Claude generates 2-3 sentence prospect summary explaining match quality. Uses profile data + search criteria as input.",
    source: "Spec: 'VP Engineering at Stripe, 6 years tenure. Company IPO in 2024 suggests significant equity. Based in SF but company expanding NYC.'",
    notes: "Use claude-3-haiku for cost efficiency. Track token usage for billing.",
  },
  {
    id: "list-management",
    phase: "MVP",
    category: "Core",
    title: "List Management + Status Tracking",
    status: "built",
    description: "Create named lists, add/remove prospects, track status (New, Contacted, Responded, Not Interested). Lists are tenant-isolated.",
    source: "Adrian: 'They can add the prospects or click the link to LinkedIn.'",
    notes: "Export to CSV is the primary output mechanism. Lists are per-tenant, never shared across clients.",
  },
  {
    id: "csv-export",
    phase: "MVP",
    category: "Core",
    title: "CSV Export",
    status: "built",
    description: "Export prospect lists to CSV for use in external CRMs (Monday.com, HubSpot) or email tools.",
    source: "Adrian: 'Level one is CSV. The lowest level is you import a CSV or text and then you export CSV.'",
    notes: "This is the CRM bridge for now. Track export events as the key value metric.",
  },
  {
    id: "lookalike-search",
    phase: "MVP",
    category: "Core",
    title: "Lookalike Persona Generation",
    status: "built",
    description: "Given a prospect profile, AI generates a matching persona query and searches for similar prospects. 'Find more people like this person.'",
    source: "Eamon's idea on the call. Adrian: 'Generate personas off of a prospect profile and then search for that persona. That's cool. That's smart.'",
    notes: "Uses AI to extract tags (location, industry, position) from a prospect and generates a new search query.",
  },
  {
    id: "multi-tenant",
    phase: "MVP",
    category: "Platform",
    title: "Multi-Tenant Architecture + RLS",
    status: "built",
    description: "PGL is parent tenant. Child tenants (real estate teams) get isolated data, custom branding (logo, colors), and user management. Row-Level Security on every table.",
    source: "Adrian: 'PGL is going to be the parent, the child tenants are going to be the different teams. We're not just going to limit this to real estate.'",
    notes: "Tenant slug routing (/[orgId]/). Super admin can see all tenants. Future verticals: PE, wealth managers.",
  },
  {
    id: "rbac",
    phase: "MVP",
    category: "Platform",
    title: "Role-Based Access Control",
    status: "built",
    description: "Four roles: Super Admin (PGL), Tenant Admin, Agent (full access), Assistant (view only, no export/modify).",
    source: "Spec + call confirmed. Maggie = Admin, other W Team members = Agents.",
    notes: "Roles stored in JWT app_metadata. RLS policies enforce per-role permissions.",
  },
  {
    id: "admin-panel",
    phase: "MVP",
    category: "Platform",
    title: "Super Admin Panel",
    status: "built",
    description: "PGL admin dashboard to create/manage tenants, manage users, view analytics across all tenants, and monitor enrichment API health.",
    source: "Spec: 'Admin Panel for PGL to manage tenants and users.'",
    notes: "Includes tenant heatmap, funnel chart, error feed, enrichment health, and platform pulse components.",
  },
  {
    id: "activity-tracking",
    phase: "MVP",
    category: "Platform",
    title: "Activity Logging + Usage Metrics",
    status: "built",
    description: "Track all user actions: logins, searches, profile views, enrichments, list additions, CSV exports, persona creation. Daily aggregated metrics per user.",
    source: "Adrian: 'The number one thing is to look at the internal metrics of utility. Clicks are time spent, not time value.'",
    notes: "Export/download count is the key value metric, not just page views. Surface this prominently in admin analytics.",
  },
  {
    id: "ai-outreach",
    phase: "MVP",
    category: "Core",
    title: "AI Email Draft Generation",
    status: "unknown",
    description: "Select a prospect, enter a prompt ('Hey Rich, we found this amazing condo in Soho'), and Claude drafts a personalized outreach email using the prospect's enriched data.",
    source: "Adrian demoed this on the call: 'It's really just Claude API. You choose a prospect, enter a prompt, and it drafts an email. Pretty easy to do.'",
    notes: "Low effort, high perceived value. Uses existing Claude integration. Check if this is in the codebase — wasn't visible in file tree.",
  },
  {
    id: "viewed-contacted",
    phase: "MVP",
    category: "Core",
    title: "Viewed vs Contacted Indicator",
    status: "unknown",
    description: "Show not just who viewed a prospect, but distinguish between 'viewed' and 'contacted'. Prevents duplicate outreach across team members.",
    source: "Adrian: 'There should be a different ticker — viewed and contacted. That way they know who's going after what.'",
    notes: "Activity log tracks views. Need a 'contacted' status on the prospect or list member level.",
  },
  {
    id: "new-prospect-alerts",
    phase: "Post-MVP",
    category: "Stickiness",
    title: "New Prospect Notifications / Insights",
    status: "not_built",
    description: "When Apollo refreshes data (every 30 days) or Exa finds new matches for saved personas, surface 'New prospects found' alerts on the dashboard.",
    source: "Adrian: 'An additional feature was a way to trigger when there's new leads. Surface some insights. They'll feel more connection to use the tool.'",
    notes: "This is what makes it feel 'alive' vs static lead lists. Use Inngest scheduled jobs to re-run persona searches periodically.",
  },
  {
    id: "natural-language-search",
    phase: "MVP",
    category: "Core",
    title: "Natural Language Search",
    status: "not_built",
    description: "Freeform natural language query → Claude parses into structured Apollo filters → Apollo search → Exa semantic enrichment. Users type 'Director in Finance, Crypto in New York City' and the system handles the rest.",
    source: "Ayman's direction during UI review: 'This is an Exa feature — natural search query → fill Apollo fields → get leads → Exa enrichments.'",
    notes: "Key differentiator. Claude interprets the NL query, maps it to Apollo filter fields (title, industry, location, seniority), executes the search, then runs Exa enrichment on results. Search bar should be prominent in the Lead Search view.",
  },
  {
    id: "crm-push",
    phase: "Out of Scope",
    category: "Integration",
    title: "CRM API Push (Monday.com / HubSpot)",
    status: "not_built",
    description: "Level 2 integration: API key connection to push selected prospects directly into the client's CRM.",
    source: "Adrian: 'The true metric would be for every lead that they search or scrape, they push to their CRM. That enough is for me to know there's value.'",
    notes: "Explicitly out of scope per Ayman. CSV export is the CRM bridge. API push may be revisited after proving tool value.",
  },
  {
    id: "pwa",
    phase: "Post-MVP",
    category: "Platform",
    title: "Progressive Web App (Mobile-Friendly)",
    status: "not_built",
    description: "Make the platform installable as a PWA with responsive design for mobile use. Agents prospect on the go.",
    source: "Adrian: 'Can you make this mobile-friendly?' Eamon: 'Yes, I can have a progressive web app for now.'",
    notes: "Needs manifest.json, service worker, and responsive Tailwind. No evidence of PWA setup in current codebase.",
  },
  {
    id: "white-label-branding",
    phase: "MVP",
    category: "Platform",
    title: "Tenant White-Label Branding",
    status: "built",
    description: "Each tenant gets custom logo, primary color, and secondary color. Dark theme with gold accent as default (#0a0a0a bg, #d4af37 gold).",
    source: "Spec: 'Dark theme, Playfair Display headings, Inter body. Tenant logo/branding displayed in header.'",
    notes: "tenant_logo component exists. Colors stored in tenants table (primary_color, secondary_color).",
  },
];

const statusColors = {
  built: { bg: "bg-emerald-500/15", text: "text-emerald-400", label: "Built" },
  unknown: { bg: "bg-amber-500/15", text: "text-amber-400", label: "Verify" },
  not_built: { bg: "bg-red-500/15", text: "text-red-400", label: "Not Built" },
};

const phaseColors = {
  MVP: { bg: "bg-blue-500/15", text: "text-blue-400" },
  "Post-MVP": { bg: "bg-purple-500/15", text: "text-purple-400" },
  "Out of Scope": { bg: "bg-gray-500/15", text: "text-gray-500" },
};

const categoryIcons = {
  Core: "\u2B50",
  Enrichment: "\uD83D\uDD0D",
  Platform: "\u2699\uFE0F",
  Stickiness: "\uD83D\uDD14",
  Integration: "\uD83D\uDD17",
};

export default function PhronesisFeatures() {
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);

  const filtered = filter === "all" ? features : features.filter((f) => {
    if (filter === "mvp") return f.phase === "MVP";
    if (filter === "post-mvp") return f.phase === "Post-MVP";
    if (filter === "needs-work") return f.status !== "built";
    return true;
  });

  const counts = {
    total: features.length,
    built: features.filter((f) => f.status === "built").length,
    verify: features.filter((f) => f.status === "unknown").length,
    notBuilt: features.filter((f) => f.status === "not_built").length,
    mvp: features.filter((f) => f.phase === "MVP").length,
    postMvp: features.filter((f) => f.phase === "Post-MVP").length,
    outOfScope: features.filter((f) => f.phase === "Out of Scope").length,
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">Phronesis Growth Labs</h1>
          <p className="text-gray-500 text-sm">Feature Requirements — sourced from PRD, project docs, and kickoff call</p>
        </div>

        <div className="grid grid-cols-4 md:grid-cols-7 gap-2 mb-6">
          {[
            { label: "Total", value: counts.total, color: "text-gray-300" },
            { label: "Built", value: counts.built, color: "text-emerald-400" },
            { label: "Verify", value: counts.verify, color: "text-amber-400" },
            { label: "Not Built", value: counts.notBuilt, color: "text-red-400" },
            { label: "MVP", value: counts.mvp, color: "text-blue-400" },
            { label: "Post-MVP", value: counts.postMvp, color: "text-purple-400" },
            { label: "Cut", value: counts.outOfScope, color: "text-gray-500" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/5 rounded-lg p-3 text-center">
              <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { key: "all", label: "All" },
            { key: "mvp", label: "MVP Only" },
            { key: "post-mvp", label: "Post-MVP" },
            { key: "needs-work", label: "Needs Work" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                filter === f.key
                  ? "bg-[#d4af37] text-black font-medium"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {filtered.map((feature) => {
            const s = statusColors[feature.status];
            const p = phaseColors[feature.phase];
            const isExpanded = expandedId === feature.id;

            return (
              <div
                key={feature.id}
                className="bg-white/[0.03] border border-white/[0.06] rounded-lg overflow-hidden hover:border-white/10 transition-colors"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : feature.id)}
                  className="w-full text-left p-4 flex items-start gap-3"
                >
                  <span className="text-lg mt-0.5 shrink-0">{categoryIcons[feature.category]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-white text-sm">{feature.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>{s.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.bg} ${p.text}`}>{feature.phase}</span>
                    </div>
                    <p className="text-gray-500 text-xs leading-relaxed line-clamp-1">{feature.description}</p>
                  </div>
                  <span className="text-gray-600 text-xs mt-1 shrink-0">{isExpanded ? "\u25B2" : "\u25BC"}</span>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 ml-9 space-y-3 border-t border-white/[0.04]">
                    <div className="pt-3">
                      <p className="text-gray-300 text-sm leading-relaxed">{feature.description}</p>
                    </div>
                    <div className="bg-white/[0.03] rounded-md p-3">
                      <div className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wider">Source</div>
                      <p className="text-gray-400 text-xs italic leading-relaxed">{feature.source}</p>
                    </div>
                    {feature.notes && (
                      <div className="bg-[#d4af37]/5 border border-[#d4af37]/10 rounded-md p-3">
                        <div className="text-xs text-[#d4af37]/70 mb-1 font-medium uppercase tracking-wider">Notes</div>
                        <p className="text-gray-400 text-xs leading-relaxed">{feature.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
          <h2 className="text-sm font-medium text-white mb-2">Key Decisions from Kickoff Call</h2>
          <div className="space-y-2 text-xs text-gray-400 leading-relaxed">
            <p><span className="text-[#d4af37]">Data sources:</span> Apollo (lead source) + ContactOut (personal email) + Exa (semantic enrichment) + SEC EDGAR (wealth signals) + Claude (AI summaries). Clay ruled out — restrictive API.</p>
            <p><span className="text-[#d4af37]">CRM integration:</span> CSV export only. HubSpot/Monday.com API push explicitly out of scope. CSV is the bridge.</p>
            <p><span className="text-[#d4af37]">Natural Language Search:</span> Key differentiator. Freeform query → Claude parses → Apollo filters → Exa enrichment. Not yet built.</p>
            <p><span className="text-[#d4af37]">Scope killed:</span> MLS property lookup, LLC unmasking, off-market property finder, full CRM rebuild, buyer box matching. All explicitly cut by Adrian.</p>
            <p><span className="text-[#d4af37]">Success metric:</span> Adrian needs to prove utility in 6 months. Key proxy: export/download count, not just page views. One closed deal from this tool pays for itself.</p>
            <p><span className="text-[#d4af37]">Future verticals:</span> Not just real estate. PE firms, wealth managers, private equity. Multi-tenant built for this.</p>
          </div>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          Hexona Systems — compiled from PRD, Google Drive specs, and kickoff call transcript
        </p>
      </div>
    </div>
  );
}