"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  className = "button",
  pendingLabel,
  name,
  value
}) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-busy={pending}
      className={`${className} submit-button`.trim()}
      disabled={pending}
      name={name}
      type="submit"
      value={value}
    >
      {pending ? <span aria-hidden="true" className="button-spinner" /> : null}
      <span>{pending ? pendingLabel ?? `${children}...` : children}</span>
    </button>
  );
}
