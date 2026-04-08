"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  className = "button",
  pendingLabel
}) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-busy={pending}
      className={`${className} submit-button`.trim()}
      disabled={pending}
      type="submit"
    >
      {pending ? <span aria-hidden="true" className="button-spinner" /> : null}
      <span>{pending ? pendingLabel ?? `${children}...` : children}</span>
    </button>
  );
}
