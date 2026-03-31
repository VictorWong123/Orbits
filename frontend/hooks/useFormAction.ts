import { useActionState, useRef } from "react";

type ServerAction = (
  prevState: string | null,
  formData: FormData
) => Promise<string | null>;

/**
 * Wraps useActionState for server actions that return string | null as an
 * error message. Automatically resets the form on success (null return).
 *
 * @param action - The server action to invoke on form submission.
 *   IMPORTANT: Must be a stable reference — either a module-level server
 *   action or a useCallback-wrapped function. useActionState captures the
 *   action on mount and will not update if a new function reference is passed
 *   on a subsequent render, which would silently invoke the stale action.
 * @returns error string, the wrapped form action, the pending flag, and a ref
 *   to attach to the form element for auto-reset.
 */
export function useFormAction(action: ServerAction) {
  const formRef = useRef<HTMLFormElement>(null);

  const [error, formAction, isPending] = useActionState(
    async (prev: string | null, formData: FormData) => {
      const result = await action(prev, formData);
      if (!result) formRef.current?.reset();
      return result;
    },
    null
  );

  return { error, formAction, isPending, formRef };
}
