import { TicketStatus } from "@11ftc/shared";

/**
 * StatusBadge — displays one of the three documented ticket statuses.
 *
 * Per SRS Rev 4 §4.1: exactly three statuses — Open, Ongoing, Closed.
 * PENDING, RESOLVED, and Voided were removed in Rev 4 and are not valid.
 */

interface StatusBadgeProps {
  status: TicketStatus | string;
}

function getStatusStyle(status: string): { label: string; classes: string } {
  const normalized = status.toUpperCase();

  switch (normalized) {
    case "OPEN":
      return { label: "Open", classes: "bg-red-50 text-red-700 border-red-200" };
    case "ONGOING":
      return { label: "Ongoing", classes: "bg-amber-50 text-amber-700 border-amber-200" };
    case "CLOSED":
      return { label: "Closed", classes: "bg-green-50 text-green-700 border-green-200" };
    default:
      return { label: String(status), classes: "bg-gray-100 text-gray-700 border-gray-200" };
  }
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { label, classes } = getStatusStyle(String(status));

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${classes}`}>
      {label}
    </span>
  );
}
