import type { DepartmentDto, MainIssueDto } from "@11ftc/shared";
import { serverApi } from "@/services/server";
import { lookupsService } from "@/services/lookups.service";
import EncodeTicketForm from "@/features/tickets/EncodeTicketForm";

/**
 * Encode a ticket (M5). Server-fetches the M2 lookups that populate the dropdowns; the form
 * itself is a client component because of the employee and technician typeaheads.
 *
 * The lists are NEVER hardcoded — their real contents are OPEN-4 and come from the IT team.
 *
 * Technicians are deliberately NOT fetched here: the picker searches `/technicians` on its
 * own, which every authenticated role may call. The old form pre-loaded the admin-only
 * `/users`, so IT Staff got a 403 and an empty, unusable "Assigned To" dropdown (ADR-0017).
 */
export default async function EncodeTicketPage() {
  const api = serverApi();

  let departments: DepartmentDto[] = [];
  let mainIssues: MainIssueDto[] = [];
  try {
    [departments, mainIssues] = await Promise.all([
      lookupsService(api).listDepartments(),
      lookupsService(api).listMainIssues(),
    ]);
  } catch {
    // The form renders a "configure lookups first" notice rather than crashing.
  }

  return (
    <EncodeTicketForm
      departments={departments.filter((d) => d.isActive)}
      mainIssues={mainIssues.filter((mi) => mi.isActive)}
    />
  );
}
