import {
  AlertTriangle,
  Clock,
  DollarSign,
  Building2,
  FileWarning,
} from "lucide-react";

interface SummaryCardsProps {
  openViolations: number;
  inReviewViolations: number;
  totalFinesAmount: number;
  outstandingFines: number;
  propertiesWithViolations: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

function StatCard({
  title,
  value,
  icon,
  colorClass,
  bgClass,
  borderClass,
}: StatCardProps) {
  return (
    <div
      className={`bg-white rounded-xl border ${borderClass} shadow-sm p-6 flex items-start gap-4`}
    >
      <div className={`${bgClass} p-3 rounded-lg flex-shrink-0`}>
        <div className={colorClass}>{icon}</div>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900 truncate">
          {value}
        </p>
      </div>
    </div>
  );
}

export default function SummaryCards({
  openViolations,
  inReviewViolations,
  totalFinesAmount,
  outstandingFines,
  propertiesWithViolations,
}: SummaryCardsProps) {
  const cards: StatCardProps[] = [
    {
      title: "Open Violations",
      value: openViolations.toLocaleString(),
      icon: <AlertTriangle className="w-6 h-6" />,
      colorClass: "text-red-600",
      bgClass: "bg-red-50",
      borderClass: "border-red-100",
    },
    {
      title: "In-Review Violations",
      value: inReviewViolations.toLocaleString(),
      icon: <Clock className="w-6 h-6" />,
      colorClass: "text-amber-600",
      bgClass: "bg-amber-50",
      borderClass: "border-amber-100",
    },
    {
      title: "Total Fines Amount",
      value: formatCurrency(totalFinesAmount),
      icon: <DollarSign className="w-6 h-6" />,
      colorClass: "text-blue-600",
      bgClass: "bg-blue-50",
      borderClass: "border-blue-100",
    },
    {
      title: "Outstanding Fines",
      value: formatCurrency(outstandingFines),
      icon: <FileWarning className="w-6 h-6" />,
      colorClass: "text-orange-600",
      bgClass: "bg-orange-50",
      borderClass: "border-orange-100",
    },
    {
      title: "Properties with Violations",
      value: propertiesWithViolations.toLocaleString(),
      icon: <Building2 className="w-6 h-6" />,
      colorClass: "text-purple-600",
      bgClass: "bg-purple-50",
      borderClass: "border-purple-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {cards.map((card) => (
        <StatCard key={card.title} {...card} />
      ))}
    </div>
  );
}
