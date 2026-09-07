"use client";

import { useCallback } from "react";
import type { EmployeeDto } from "@11ftc/shared";
import { browserApi } from "@/services/browser";
import { employeesService } from "@/services/employees.service";
import DirectoryPicker, { type DirectoryOption } from "@/components/ui/DirectoryPicker";

/**
 * "Who reported this?" — the employee directory, same picker as the technician field.
 *
 * The list opens on focus showing registered employees WITH their department, which is what
 * makes the 16 same-first-name collisions in the real directory ("Karen (CED)" vs
 * "Karen (Finishing)") distinguishable at the moment of choosing rather than after the fact.
 *
 * Picking a known employee also pins their department (`onSelect`), so the encoder cannot
 * file a ticket against the wrong one — the single most likely data error on this form.
 */
interface EmployeePickerProps {
  value: string;
  onChange: (name: string) => void;
  /** Fired when a REGISTERED employee is picked, so the form can pin their department. */
  onSelect?: (employee: EmployeeDto) => void;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
}

export default function EmployeePicker({
  value,
  onChange,
  onSelect,
  disabled = false,
  invalid = false,
  id,
}: EmployeePickerProps) {
  // `/employees/search` returns [] for a blank query, so an empty box falls back to the full
  // directory — the roster must be visible before the encoder types anything.
  const search = useCallback(async (q: string): Promise<DirectoryOption[]> => {
    const api = employeesService(browserApi());
    const found = q ? await api.search(q) : (await api.list()).slice(0, 50);
    return found.map((e) => ({
      id: e.employeeId,
      name: e.name,
      detail: e.departmentName ?? "No department",
      employee: e,
    })) as DirectoryOption[];
  }, []);

  return (
    <DirectoryPicker
      id={id}
      value={value ? [value] : []}
      onChange={(names) => onChange(names[0] ?? "")}
      search={search}
      disabled={disabled}
      invalid={invalid}
      placeholder="Select an employee…"
      hint="Pick a registered employee, or type a new name to add them with this ticket."
      onPick={(option) => {
        const emp = (option as DirectoryOption & { employee?: EmployeeDto }).employee;
        if (emp) onSelect?.(emp);
      }}
    />
  );
}
