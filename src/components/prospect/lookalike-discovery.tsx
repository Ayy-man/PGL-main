"use client";

import { useState } from "react";
import { Users, Loader2, Search } from "lucide-react";

/**
 * Lookalike Discovery Component
 *
 * AI-powered "Find Similar People" feature:
 * 1. Claude extracts attributes from current prospect
 * 2. Generates Apollo-compatible search filters
 * 3. Searches Apollo API for similar people
 * 4. Displays generated persona + search results
 * 5. Allows saving persona for reuse
 *
 * Covers: LIKE-01 through LIKE-06
 */

interface LookalikeDiscoveryProps {
  prospectId: string;
  prospectName?: string; // Optional for future use
}

interface Persona {
  name: string;
  jobTitles: string[];
  seniority: string;
  industries: string[];
  companySize: string;
  locations?: string[];
  keywords: string[];
  reasoning: string;
}

interface SearchResult {
  id: string;
  name: string;
  title: string;
  organization_name: string;
  city: string;
  state: string;
  country: string;
  linkedin_url: string;
  email: string;
}

interface LookalikeResult {
  persona: Persona;
  searchResults: SearchResult[];
  totalResults: number;
  savedPersonaId?: string;
}

export function LookalikeDiscovery({
  prospectId,
}: LookalikeDiscoveryProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<LookalikeResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [saveChecked, setSaveChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFindSimilar = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/search/lookalike", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectId, savePersona: saveChecked }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate lookalike search");
      }

      const data = await response.json();
      setResult(data);
      setShowResults(true);
    } catch (err) {
      console.error("Lookalike search error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePersona = async () => {
    if (!result) return;

    setIsLoading(true);
    try {
      // Re-run with savePersona flag if not already saved
      const response = await fetch("/api/search/lookalike", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectId, savePersona: true }),
      });

      if (!response.ok) {
        throw new Error("Failed to save persona");
      }

      const data = await response.json();
      setResult(data);
      alert(`Persona "${data.persona.name}" saved successfully!`);
    } catch (err) {
      console.error("Save persona error:", err);
      alert("Failed to save persona");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Initial State: Find Similar Button */}
      {!showResults && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleFindSimilar}
              disabled={isLoading}
              className="flex items-center gap-2 bg-gold text-gold-foreground px-6 py-3 rounded-lg font-semibold hover:bg-gold-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing prospect and searching...
                </>
              ) : (
                <>
                  <Users className="w-5 h-5" />
                  Find Similar People
                </>
              )}
            </button>

            {!isLoading && (
              <label className="flex items-center gap-2 text-foreground">
                <input
                  type="checkbox"
                  checked={saveChecked}
                  onChange={(e) => setSaveChecked(e.target.checked)}
                  className="w-4 h-4 rounded border bg-muted text-gold focus:ring-gold focus:ring-offset-card"
                />
                Save generated persona for reuse
              </label>
            )}
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
        </div>
      )}

      {/* Results State */}
      {showResults && result && (
        <div className="space-y-6">
          {/* Generated Persona Card */}
          <div className="bg-card border rounded-lg p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {result.persona.name}
                </h3>
                <p className="text-muted-foreground italic">{result.persona.reasoning}</p>
              </div>
              {!result.savedPersonaId && (
                <button
                  onClick={handleSavePersona}
                  disabled={isLoading}
                  className="bg-muted hover:bg-accent text-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Save Persona
                </button>
              )}
              {result.savedPersonaId && (
                <span className="bg-success-muted text-success px-3 py-1 rounded-full text-sm">
                  Saved
                </span>
              )}
            </div>

            {/* Persona Attributes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Job Titles</h4>
                <div className="flex flex-wrap gap-2">
                  {result.persona.jobTitles.map((title, i) => (
                    <span
                      key={i}
                      className="bg-muted text-foreground rounded-full px-3 py-1 text-sm"
                    >
                      {title}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Seniority</h4>
                <span className="bg-muted text-foreground rounded-full px-3 py-1 text-sm">
                  {result.persona.seniority}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Industries</h4>
                <div className="flex flex-wrap gap-2">
                  {result.persona.industries.map((industry, i) => (
                    <span
                      key={i}
                      className="bg-muted text-foreground rounded-full px-3 py-1 text-sm"
                    >
                      {industry}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Company Size</h4>
                <span className="bg-muted text-foreground rounded-full px-3 py-1 text-sm">
                  {result.persona.companySize}
                </span>
              </div>

              {result.persona.locations && result.persona.locations.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Locations</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.persona.locations.map((location, i) => (
                      <span
                        key={i}
                        className="bg-muted text-foreground rounded-full px-3 py-1 text-sm"
                      >
                        {location}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Keywords</h4>
                <div className="flex flex-wrap gap-2">
                  {result.persona.keywords.map((keyword, i) => (
                    <span
                      key={i}
                      className="bg-muted text-foreground rounded-full px-3 py-1 text-sm"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Similar Prospects Table */}
          <div className="bg-card border rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Search className="w-5 h-5" />
                Similar Prospects ({result.totalResults} found)
              </h3>
            </div>

            {result.searchResults.length === 0 ? (
              <div className="px-6 py-12 text-center text-muted-foreground">
                No similar prospects found. Try adjusting the search criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {result.searchResults.slice(0, 20).map((prospect) => (
                      <tr
                        key={prospect.id}
                        className="hover:bg-muted/50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-white">
                            {prospect.name}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-foreground">{prospect.title}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-foreground">
                            {prospect.organization_name}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-foreground">
                            {[prospect.city, prospect.state, prospect.country]
                              .filter(Boolean)
                              .join(", ")}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {prospect.linkedin_url && (
                              <a
                                href={prospect.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gold hover:text-gold text-sm font-medium"
                              >
                                LinkedIn
                              </a>
                            )}
                            {prospect.email && (
                              <a
                                href={`mailto:${prospect.email}`}
                                className="text-muted-foreground hover:text-foreground text-sm"
                              >
                                Email
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setShowResults(false);
                setResult(null);
              }}
              className="bg-muted hover:bg-accent text-foreground px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Search Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
