"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDebounce } from "@/hooks/useDebounce";

/**
 * Pick a registered person — with "add new" as a deliberate, visibly-secondary act.
 *
 * The encode form has two of these (who reported it, who handled it) and both had the same
 * problem: a plain text box gives no signal about who is ALREADY registered, so encoders
 * silently create near-duplicates ("Jhon" beside "John") that nobody notices until the
 * analytics split one person into two.
 *
 * So the registered list opens on focus, before any typing — the common case is picking, and
 * with a handful of technicians the list *is* the answer. Creating is still possible in one
 * keystroke, because blocking it entirely would just push encoders to pick the wrong person,
 * but it is visually separated under a divider and labelled as new. Match first, create second.
 *
 * Selection is by NAME, not id: a person who does not exist yet has no id, and the API
 * resolve-or-creates from the name inside the encode transaction either way.
 */
export interface DirectoryOption {
  id: string;
  name: string;
  /** Second line — department, linked account, etc. */
  detail?: string | null;
}

interface DirectoryPickerProps {
  /** Selected names. Single-select uses a 1-length array. */
  value: string[];
  onChange: (names: string[]) => void;
  /** Debounced lookup. Called with "" on focus, which must return the full list. */
  search: (query: string) => Promise<DirectoryOption[]>;
  multiple?: boolean;
  max?: number;
  disabled?: boolean;
  placeholder?: string;
  /** Set false to forbid unregistered names entirely (pick-only). */
  allowCreate?: boolean;
  /** Rendered under the field. */
  hint?: string;
  invalid?: boolean;
  id?: string;
  /** Picking a known option can carry extra data back (e.g. an employee's department). */
  onPick?: (option: DirectoryOption) => void;
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export default function DirectoryPicker({
  value,
  onChange,
  search,
  multiple = false,
  max = 5,
  disabled = false,
  placeholder,
  allowCreate = true,
  hint,
  invalid = false,
  id,
  onPick,
}: DirectoryPickerProps) {
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  // `null` = the first fetch hasn't landed yet. Doubling as the loading flag means the only
  // setState here happens AFTER an await, so it never fires synchronously inside the effect
  // (which would trigger a cascading render). Later searches keep the previous list on screen
  // rather than blanking it — no flicker between keystrokes.
  const [options, setOptions] = useState<DirectoryOption[] | null>(null);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const debounced = useDebounce(term, 250);

  /**
   * The dropdown renders in a PORTAL, positioned from the field's viewport rect.
   *
   * Absolutely-positioned, it was clipped by its ancestors: the encode form lives in a modal
   * whose body is `overflow-y-auto` inside an `overflow-hidden` panel, so a list opened from a
   * field low in the form was cut off — it looked like the modal was overlapping itself. A
   * portal escapes both clips; `position: fixed` keeps it pinned to the field.
   *
   * It also flips ABOVE the field when there isn't room below, so the last field in a form is
   * as usable as the first.
   */
  const [rect, setRect] = useState<{
    left: number;
    top: number;
    width: number;
    dropUp: boolean;
    maxHeight: number;
  } | null>(null);

  const measure = useCallback(() => {
    const el = fieldRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom;
    const above = r.top;
    const dropUp = below < 200 && above > below;
    setRect({
      left: r.left,
      top: dropUp ? r.top : r.bottom,
      width: r.width,
      dropUp,
      maxHeight: Math.max(140, Math.min(224, (dropUp ? above : below) - 12)),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    measure();
    // `true` = capture phase, so scrolling ANY ancestor (the modal body) repositions it.
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [open, measure]);

  // Runs with "" on mount, so the roster is ready the moment the field is focused.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const found = await search(debounced.trim());
        if (!cancelled) setOptions(found);
      } catch {
        if (!cancelled) setOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced, search]);

  const loading = options === null;
  const loaded = options ?? [];

  const full = multiple ? value.length >= max : value.length >= 1;
  const taken = new Set(value.map(norm));
  const matches = loaded.filter((o) => !taken.has(norm(o.name)));
  const typed = term.trim();
  const isNew =
    allowCreate &&
    typed.length > 0 &&
    !taken.has(norm(typed)) &&
    !loaded.some((o) => norm(o.name) === norm(typed));

  function add(name: string, option?: DirectoryOption) {
    const clean = name.trim();
    if (!clean || taken.has(norm(clean))) return;
    // Single-select replaces rather than refusing — retyping is the obvious way to correct it.
    onChange(multiple ? (value.length >= max ? value : [...value, clean]) : [clean]);
    if (option) onPick?.(option);
    setTerm("");
    setHighlight(0);
    setOpen(multiple);
    if (multiple) inputRef.current?.focus();
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  const rows: Array<{ key: string; name: string; detail?: string | null; isNew: boolean }> = [
    ...matches.map((m) => ({ key: m.id, name: m.name, detail: m.detail, isNew: false })),
    ...(isNew ? [{ key: "__new__", name: typed, isNew: true }] : []),
  ];

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault(); // never submit the form from this field
      const row = rows[highlight];
      if (row) add(row.name, row.isNew ? undefined : matches.find((m) => m.id === row.key));
      else if (allowCreate && typed) add(typed);
      return;
    }
    if (e.key === "Backspace" && term === "" && value.length > 0) {
      remove(value.length - 1);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, Math.max(rows.length - 1, 0)));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
      return;
    }
    if (e.key === "Escape") setOpen(false);
  }

  return (
    <div className="relative">
      <div
        ref={fieldRef}
        onClick={() => !disabled && inputRef.current?.focus()}
        className={`input w-full flex flex-wrap items-center gap-1.5 min-h-[2.6rem] py-1.5 ${
          invalid ? "border-red-500" : ""
        } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-text"}`}
      >
        {value.map((name, i) => (
          <span
            key={`${name}-${i}`}
            className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700"
          >
            {name}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  remove(i);
                }}
                aria-label={`Remove ${name}`}
                className="text-slate-400 hover:text-red-600 leading-none"
              >
                ×
              </button>
            )}
          </span>
        ))}
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={term}
          disabled={disabled || full}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          onChange={(e) => {
            setTerm(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          placeholder={
            full
              ? multiple
                ? `Maximum ${max}`
                : ""
              : (placeholder ?? "Select or type a name…")
          }
          className="flex-1 min-w-[9rem] border-0 bg-transparent p-0 text-sm focus:outline-none focus:ring-0 disabled:cursor-not-allowed"
        />
      </div>

      {hint && <p className="text-[10px] text-gray-400 font-medium mt-1">{hint}</p>}

      {open && !disabled && rect && createPortal(
        <div
          id={listboxId}
          role="listbox"
          onMouseDown={(e) => e.preventDefault()} // keep focus so onBlur doesn't close first
          style={{
            position: "fixed",
            left: rect.left,
            width: rect.width,
            maxHeight: rect.maxHeight,
            ...(rect.dropUp
              ? { bottom: window.innerHeight - rect.top + 4 }
              : { top: rect.top + 4 }),
          }}
          // z-index must clear the encode modal's own z-[9999].
          className="z-[10000] overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          {matches.length > 0 && (
            <p className="px-3 pt-2 pb-1 text-[9px] font-bold text-gray-400 uppercase tracking-wider">
              Registered
            </p>
          )}
          <ul>
            {rows.map((row, i) => (
              <li key={row.key} role="option" aria-selected={i === highlight} className={row.isNew ? "border-t border-gray-100" : ""}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() =>
                    add(row.name, row.isNew ? undefined : matches.find((m) => m.id === row.key))
                  }
                  className={`w-full text-left px-3 py-2 transition-colors ${
                    i === highlight ? "bg-slate-50" : "hover:bg-gray-50"
                  }`}
                >
                  {row.isNew ? (
                    <>
                      <span className="block text-sm font-semibold text-gray-900">
                        Add “{row.name}”
                      </span>
                      <span className="block text-[10px] text-amber-600 font-semibold">
                        Not registered yet — will be created with this ticket
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="block text-sm font-semibold text-gray-900">{row.name}</span>
                      {row.detail && (
                        <span className="block text-[10px] text-gray-400 font-medium">
                          {row.detail}
                        </span>
                      )}
                    </>
                  )}
                </button>
              </li>
            ))}
          </ul>
          {rows.length === 0 && (
            <p className="px-3 py-3 text-xs text-gray-400 font-medium">
              {loading
                ? "Loading…"
                : typed
                  ? allowCreate
                    ? "No match."
                    : "No match — this person must be registered first."
                  : "Nobody registered yet."}
            </p>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}
