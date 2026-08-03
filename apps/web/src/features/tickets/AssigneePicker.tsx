"use client";

import { useCallback } from "react";
import { browserApi } from "@/services/browser";
import { techniciansService } from "@/services/technicians.service";
import DirectoryPicker, { type DirectoryOption } from "@/components/ui/DirectoryPicker";

/**
 * "Who handled this?" — ONE field, however many people (ADR-0017).
 *
 * A thin binding of `DirectoryPicker` to the technician directory. The registered technicians
 * open on focus so the encoder picks a known person rather than inventing a near-duplicate;
 * an unregistered name is still one keystroke away, flagged as new, and resolve-or-created by
 * the API inside the encode transaction — so IT Staff never wait on an admin.
 */
interface AssigneePickerProps {
  value: string[];
  onChange: (names: string[]) => void;
  disabled?: boolean;
  hint?: string;
  invalid?: boolean;
}

export default function AssigneePicker({
  value,
  onChange,
  disabled = false,
  hint,
  invalid = false,
}: AssigneePickerProps) {
  // Stable identity — DirectoryPicker refetches whenever `search` changes.
  const search = useCallback(async (q: string): Promise<DirectoryOption[]> => {
    const found = await techniciansService(browserApi()).search(q);
    return found.map((t) => ({ id: t.technicianId, name: t.name }));
  }, []);

  return (
    <DirectoryPicker
      value={value}
      onChange={onChange}
      search={search}
      multiple
      max={5} // matches the shared schema's `.max(5)`
      disabled={disabled}
      invalid={invalid}
      hint={hint}
      placeholder={value.length ? "Add another…" : "Select a technician…"}
    />
  );
}
