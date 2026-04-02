"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, ChevronRight } from "lucide-react";
import { getInitials, relativeTime } from "@frontend/lib/formatters";
import PillInput from "@frontend/components/ui/PillInput";

interface ProfileFact {
  category: string;
}

interface ProfileWithFacts {
  id: string;
  full_name: string;
  birthday: string | null;
  created_at: string;
  facts: ProfileFact[];
}

interface Props {
  profiles: ProfileWithFacts[];
}

/**
 * Searchable, client-side-filtered profile list for the dashboard.
 * Renders each profile as a soft-shadow card with an initials avatar,
 * sage-green tag pills (with overflow count), an italic relative timestamp,
 * and a trailing chevron.
 */
export default function ProfileList({ profiles }: Props) {
  const [query, setQuery] = useState("");

  const filtered = profiles.filter((p) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    if (p.full_name.toLowerCase().includes(q)) return true;
    return p.facts.some((f) => f.category?.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-5">
      {/* Search bar — cream-green pill */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-accent)] pointer-events-none"
        />
        <PillInput
          variant="white"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, relationship, or tag..."
          className="w-full pl-10 pr-4 py-3"
        />
      </div>

      {/* Profile cards */}
      {filtered.length > 0 ? (
        <ul className="space-y-3">
          {filtered.map((profile) => {
            const tags = [
              ...new Set(
                profile.facts
                  .map((f) => f.category)
                  .filter((c): c is string => Boolean(c) && c !== "general")
              ),
            ];
            const visibleTag = tags[0];
            const overflow = tags.length - 1;

            return (
              <li key={profile.id}>
                <Link
                  href={`/profile/${profile.id}`}
                  className="flex items-center gap-4 p-4 bg-white rounded-3xl shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Soft green initials avatar */}
                  <div className="w-11 h-11 rounded-full bg-[var(--color-accent)] flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-[#1A3021] uppercase">
                      {getInitials(profile.full_name)}
                    </span>
                  </div>

                  {/* Name + tags + timestamp */}
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-[#1A3021] leading-tight">
                      {profile.full_name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {visibleTag && (
                        <span className="inline-flex items-center px-2.5 py-0.5 bg-[var(--color-accent)] text-white text-xs font-semibold rounded-full">
                          {visibleTag}
                        </span>
                      )}
                      {overflow > 0 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 bg-[var(--color-accent)] text-white text-xs font-semibold rounded-full">
                          +{overflow}
                        </span>
                      )}
                      <span className="text-xs italic text-[var(--color-accent)]">
                        Last edit {relativeTime(profile.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Trailing chevron */}
                  <ChevronRight size={18} className="text-[var(--color-accent)] shrink-0" />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm italic text-[var(--color-accent)] text-center py-4">
          {query.trim() ? "No results found." : "No people yet. Add someone above."}
        </p>
      )}
    </div>
  );
}
