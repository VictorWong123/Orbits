# Feature Request: Universal Swipe-to-Delete Component

Please introduce a universal "swipe left to delete" interaction across the app. This replaces traditional inline delete buttons for list items, fulfilling the design intent in `theme.json` while expanding it to all deletable entities (Profiles, Facts, Events, and Shareable Cards).

**CRITICAL:** Do not add heavy third-party animation libraries (like Framer Motion) unless absolutely necessary. Prefer native React pointer events combined with Tailwind CSS transforms and transitions.

## 1. Create a Reusable Wrapper Component
* Create a new client component: `frontend/components/ui/SwipeToDelete.tsx`.
* **Props:** It should accept at least `children: React.ReactNode` and `onDelete: () => void | Promise<void>`.
* **Structure:**
  * **Background Layer (Delete Zone):** A div sitting behind the children, anchored to the right. It should use `bg-red-500` (semantic destructive color), flex layout, and contain a `Trash2` icon (from `lucide-react`) centered on the right.
  * **Foreground Layer:** A div wrapping the `children`.

## 2. Interaction Logic (`SwipeToDelete.tsx`)
* Implement pointer event handlers (`onPointerDown`, `onPointerMove`, `onPointerUp`) to track horizontal drag distance. (Using pointer events ensures it works for both touch on mobile and mouse drag on desktop).
* **Clamping:** Only allow swiping to the *left* (negative X values). Clamp the maximum swipe distance (e.g., `-80px`) to reveal the background layer.
* **Snapping:** * If the user releases the swipe past a threshold (e.g., `-50px`), snap the foreground layer to the open position, fully revealing the delete button.
  * If they release before the threshold, snap it back to `0px`.
* **Animation:** Use Tailwind classes for the snap animation (`transition-transform duration-200 ease-in-out`), but *disable* or override this transition dynamically during the active drag so the element tracks exactly with the user's finger.

## 3. Delete Action Integration
* Clicking the revealed red background layer (or the trash icon) should trigger the `onDelete` prop.
* Ensure the component handles pending states gracefully if `onDelete` is an async action (e.g., showing a spinner replacing the Trash icon).

## 4. Apply to Existing Lists
Refactor the following areas to wrap their individual items in the new `<SwipeToDelete>` component, removing any old standalone delete buttons:
1.  **Profiles:** `ProfileList.tsx` (the main dashboard cards).
2.  **Facts & Events:** `ProfileTabs.tsx` (the items inside the Notes and Info tabs). Ensure this integrates correctly with your existing optimistic delete logic.
3.  **Shareable Cards:** The new Account/Settings cards list (if already implemented).

## 5. Stability & Styling
* Ensure horizontal swiping does not aggressively prevent vertical scrolling on mobile devices (apply `touch-action: pan-y` to the wrapper).
* Ensure that tapping an item normally still triggers its default click behavior (like navigating to a profile). Only horizontal drags should trigger the offset.