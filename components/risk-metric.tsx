import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface RiskMetricProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  status: "critical" | "warning" | "neutral" | "good";
  href?: string;
}

const statusConfig = {
  critical: {
    iconBg: "bg-red-500/20",
    iconColor: "text-red-400",
    valueColor: "text-red-400",
    border: "border-red-500/30 hover:border-red-500/50",
  },
  warning: {
    iconBg: "bg-amber-500/20",
    iconColor: "text-amber-400",
    valueColor: "text-amber-400",
    border: "border-amber-500/30 hover:border-amber-500/50",
  },
  neutral: {
    iconBg: "bg-card-lighter",
    iconColor: "text-text-subtle",
    valueColor: "text-white",
    border: "border-card-lighter hover:border-primary/30",
  },
  good: {
    iconBg: "bg-green-500/20",
    iconColor: "text-green-400",
    valueColor: "text-green-400",
    border: "border-green-500/30 hover:border-green-500/50",
  },
};

export function RiskMetric({
  label,
  value,
  subtext,
  icon: Icon,
  status,
}: RiskMetricProps) {
  const config = statusConfig[status];

  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 rounded-xl bg-card-dark border transition-colors",
        config.border
      )}
    >
      <div className={cn("p-2.5 rounded-lg shrink-0", config.iconBg)}>
        <Icon className={cn("h-5 w-5", config.iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-subtle font-medium">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className={cn("text-xl font-bold", config.valueColor)}>{value}</p>
          {subtext && (
            <span className="text-xs text-text-subtle">{subtext}</span>
          )}
        </div>
      </div>
    </div>
  );
}
