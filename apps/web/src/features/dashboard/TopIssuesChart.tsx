export default function TopIssuesChart() {
  const issues = [
    { label: "Network", count: 42, color: "bg-blue-500", percentage: 40 },
    { label: "Hardware", count: 28, color: "bg-primary-700", percentage: 27 },
    { label: "Software", count: 19, color: "bg-amber-500", percentage: 18 },
    { label: "Printer", count: 15, color: "bg-green-500", percentage: 15 },
  ];

  return (
    <div className="space-y-4">
      {issues.map((issue) => (
        <div key={issue.label} className="flex items-center gap-3">
          {/* Indicator dot */}
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${issue.color}`} />
          
          <div className="flex-1 space-y-1">
            <div className="flex justify-between items-center text-xs md:text-sm">
              <span className="font-semibold text-gray-700">{issue.label}</span>
              <span className="text-gray-400 font-medium">{issue.count} ({issue.percentage}%)</span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${issue.color} transition-all duration-500`}
                style={{ width: `${issue.percentage}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
