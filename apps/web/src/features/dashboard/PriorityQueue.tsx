import Link from "next/link";

interface PriorityTicket {
  id: string;
  title: string;
  department: string;
  timeAgo: string;
  status: "critical" | "high" | "medium";
}

const mockPriorityQueue: PriorityTicket[] = [
  {
    id: "TCK-8992",
    title: "VPN Authentication Failure",
    department: "Finance Dept",
    timeAgo: "18s ago",
    status: "critical",
  },
  {
    id: "TCK-8991",
    title: "Server Outage: DB-Main",
    department: "Infrastructure",
    timeAgo: "25m ago",
    status: "critical",
  },
  {
    id: "TCK-8985",
    title: "License Renewal Warning",
    department: "Procurement",
    timeAgo: "1h ago",
    status: "high",
  },
];

const statusColorMap: Record<PriorityTicket["status"], string> = {
  critical: "bg-red-500",
  high: "bg-amber-500",
  medium: "bg-blue-500",
};

export default function PriorityQueue() {
  return (
    <div className="space-y-4">
      {mockPriorityQueue.map((ticket) => (
        <div
          key={ticket.id}
          className="flex items-start md:items-center justify-between gap-4 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors duration-150"
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Status dot indicator */}
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusColorMap[ticket.status]}`} />
            
            <div className="min-w-0">
              <Link
                href={`/tickets/${ticket.id}`}
                className="font-bold text-sm text-primary-700 hover:text-primary-800 hover:underline truncate block"
              >
                {ticket.title}
              </Link>
              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-400 font-semibold">
                <span>{ticket.id}</span>
                <span>•</span>
                <span>{ticket.department}</span>
              </div>
            </div>
          </div>
          
          <span className="text-xs text-gray-400 font-bold flex-shrink-0">{ticket.timeAgo}</span>
        </div>
      ))}
    </div>
  );
}
