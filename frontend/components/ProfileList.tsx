"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronRight, Trash2 } from "lucide-react";
import { getInitials, relativeTime } from "@frontend/lib/formatters";
import { useDataStore } from "@frontend/lib/store/StoreProvider";
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
  /** Called after a profile is successfully deleted via swipe so the parent can reload. */
  onDelete?: () => void;
}

/**
 * Searchable, client-side-filtered profile list for the dashboard.
 *
 * Each card supports an Apple-style swipe-left gesture that reveals a red
 * delete zone on the right. A short tap (no horizontal movement) navigates
 * to the profile detail page. Swiping past the threshold snaps the card open;
 * tapping the red zone deletes the profile without a confirmation dialog.
 */
export default function ProfileList({ profiles, onDelete }: Props) {
  const [query, setQuery] = useState("");

  const filtered = profiles.filter((p) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    if (p.full_name.toLowerCase().includes(q)) return true;
    return p.facts.some((f) => f.category?.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-5">
      {/* Search bar */}
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
            return (
              <SwipeableProfileCard
                key={profile.id}
                profile={profile}
                tags={tags}
                onDelete={onDelete}
              />
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

// ── SwipeableProfileCard ──────────────────────────────────────────────────────

/** Width of the red delete zone revealed on swipe, in pixels. */
const DELETE_ZONE_WIDTH = 80;

/** Horizontal distance (px) after which the card snaps to the revealed state. */
const SNAP_THRESHOLD = 40;

/** Minimum horizontal movement (px) to classify a gesture as a swipe vs a tap. */
const MOVE_THRESHOLD = 6;

interface CardProps {
  profile: ProfileWithFacts;
  tags: string[];
  onDelete?: () => void;
}

/**
 * A single profile card that supports swipe-to-delete.
 *
 * Pointer events are used (works for both touch and mouse). During the drag the
 * card transform is applied directly to the DOM element — bypassing React state
 * — for a smooth, jank-free feel. State is only updated on pointer-up to snap
 * the card to its final position.
 */
function SwipeableProfileCard({ profile, tags, onDelete }: CardProps) {
  const { store } = useDataStore();
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const visibleTag = tags[0];
  const overflow = tags.length - 1;

  /** Mutable drag state — kept in a ref to avoid triggering re-renders during move. */
  const drag = useRef({
    active: false,
    startX: 0,
    startOffset: 0,
    hasMoved: false,
  });

  /**
   * Applies a CSS transform directly to the card element.
   * When `animate` is true, a CSS transition is added so the snap feels smooth.
   */
  function applyTransform(offset: number, animate: boolean) {
    const el = cardRef.current;
    if (!el) return;
    el.style.transition = animate ? "transform 0.2s ease" : "none";
    el.style.transform = `translateX(${offset}px)`;
  }

  /** Initiates drag tracking and captures the pointer for the element. */
  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    drag.current = {
      active: true,
      startX: e.clientX,
      startOffset: isRevealed ? -DELETE_ZONE_WIDTH : 0,
      hasMoved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    applyTransform(drag.current.startOffset, false);
  }

  /** Moves the card in real-time while the pointer is dragging. */
  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current.active) return;
    const delta = e.clientX - drag.current.startX;
    if (Math.abs(delta) > MOVE_THRESHOLD) drag.current.hasMoved = true;
    const offset = Math.max(
      -DELETE_ZONE_WIDTH,
      Math.min(0, drag.current.startOffset + delta)
    );
    applyTransform(offset, false);
  }

  /**
   * On release: if it was a tap (no significant movement), navigate or close
   * the revealed state. If it was a swipe, snap to open or closed based on
   * the distance covered.
   */
  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current.active) return;
    drag.current.active = false;

    if (!drag.current.hasMoved) {
      if (isRevealed) {
        setIsRevealed(false);
        applyTransform(0, true);
      } else {
        router.push(`/profile/${profile.id}`);
      }
      return;
    }

    const finalOffset =
      drag.current.startOffset + (e.clientX - drag.current.startX);

    if (finalOffset < -SNAP_THRESHOLD) {
      setIsRevealed(true);
      applyTransform(-DELETE_ZONE_WIDTH, true);
    } else {
      setIsRevealed(false);
      applyTransform(0, true);
    }
  }

  /** Deletes the profile via the store and notifies the parent to reload. */
  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setIsDeleting(true);
    const err = await store.deleteProfile(profile.id);
    if (err) {
      setIsDeleting(false);
      setIsRevealed(false);
      applyTransform(0, true);
    } else {
      onDelete?.();
    }
  }

  return (
    <li className="relative overflow-hidden rounded-3xl shadow-sm">
      {/* Red delete zone — revealed behind the card when swiped */}
      <div
        className="absolute inset-y-0 right-0 flex flex-col items-center justify-center gap-1 bg-red-500 rounded-r-3xl"
        style={{ width: DELETE_ZONE_WIDTH }}
      >
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          aria-label={`Delete ${profile.full_name}`}
          className="flex flex-col items-center gap-1 text-white disabled:opacity-60"
        >
          <Trash2 size={18} />
          <span className="text-[10px] font-semibold leading-none">
            {isDeleting ? "…" : "Delete"}
          </span>
        </button>
      </div>

      {/* Swipeable white card — sits above the red zone */}
      <div
        ref={cardRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative z-10 flex items-center gap-4 p-4 bg-white cursor-pointer select-none"
        style={{ touchAction: "pan-y" }}
      >
        {/* Initials avatar */}
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
      </div>
    </li>
  );
}
