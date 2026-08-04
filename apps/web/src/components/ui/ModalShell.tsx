"use client";

import { useEffect, type ReactNode } from "react";

/**
 * The one overlay used by every modal in the app.
 *
 * It exists so the scroll geometry is written once. Putting `items-center` and
 * `overflow-y-auto` on the SAME element is what made the encode form unreachable: once the
 * panel is taller than the viewport, centring pushes its top ABOVE the scroll container's
 * origin, where nothing can scroll it back into view. Centring therefore happens in an inner
 * `min-h-full` wrapper, and the panel caps at the viewport and scrolls its own body so the
 * header and the action row never drift off screen.
 *
 * `dvh` rather than `vh`: on a phone `vh` is the tallest the viewport ever gets, so the
 * footer sits behind the browser chrome exactly when the keyboard is up and you need it.
 */
export default function ModalShell({
  title,
  eyebrow,
  onClose,
  footer,
  children,
  width = "max-w-lg",
}: {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
  /** Tailwind max-width class. Bulk needs more room than a single ticket. */
  width?: string;
}) {
  // Escape closes, and the page behind must not scroll while the overlay is up — otherwise
  // dismissing the modal leaves you somewhere else in the list than where you opened it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto overscroll-contain bg-slate-900/60 backdrop-blur-[2px] animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={`relative flex w-full ${width} max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl animate-scale-in`}
        >
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-100 px-6 py-4 md:px-8">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{title}</h2>
              {eyebrow && (
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  {eyebrow}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {children}

          {footer && (
            <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-100 bg-white px-6 py-4 md:px-8">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
