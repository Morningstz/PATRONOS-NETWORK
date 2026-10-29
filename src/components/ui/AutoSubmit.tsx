"use client";

import { useEffect } from "react";

/** Progressive enhancement: submit the filter form when a select changes. */
export function AutoSubmit({ formId }: { formId: string }) {
  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    const onChange = (e: Event) => {
      if ((e.target as HTMLElement).tagName === "SELECT") form.requestSubmit();
    };
    form.addEventListener("change", onChange);
    return () => form.removeEventListener("change", onChange);
  }, [formId]);
  return <span className="text-[12px] text-faint">Filters update automatically</span>;
}
