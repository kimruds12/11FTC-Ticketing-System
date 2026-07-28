"use client";

interface UserTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function UserTabs({ activeTab, onTabChange }: UserTabsProps) {
  const tabs = [
    { id: "all", label: "All Users", count: "4" },
    { id: "admin", label: "IT Admin", count: "2" },
    { id: "staff", label: "IT Staff", count: "2" },
  ];

  return (
    <div className="flex items-center gap-2 p-1 bg-gray-50 border border-gray-200 rounded-lg overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === tab.id
              ? "bg-white text-gray-900 shadow-sm border border-gray-100"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-100/50"
          }`}
        >
          {tab.label}
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
              activeTab === tab.id ? "bg-gray-100 text-gray-600" : "bg-gray-200/50 text-gray-400"
            }`}
          >
            {tab.count}
          </span>
        </button>
      ))}
    </div>
  );
}
