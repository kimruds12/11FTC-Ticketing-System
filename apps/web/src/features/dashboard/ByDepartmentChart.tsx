export default function ByDepartmentChart() {
  const departments = [
    { name: "IT", volume: 42, percentage: 85, color: "bg-primary-700" },
    { name: "Accounting", volume: 28, percentage: 70, color: "bg-primary-700" },
    { name: "Warehouse", volume: 19, percentage: 55, color: "bg-primary-700" },
    { name: "Sales", volume: 12, percentage: 30, color: "bg-primary-700" },
    { name: "HR", volume: 8, percentage: 20, color: "bg-primary-700" },
  ];

  return (
    <div className="space-y-4">
      {departments.map((dept) => (
        <div key={dept.name} className="space-y-1">
          <div className="flex justify-between items-center text-xs md:text-sm">
            <span className="font-semibold text-gray-700">{dept.name}</span>
            <span className="text-gray-400 font-medium">{dept.volume} Tickets</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${dept.color} transition-all duration-500`}
              style={{ width: `${dept.percentage}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
