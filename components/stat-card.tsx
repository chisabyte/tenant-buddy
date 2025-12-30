import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: "primary" | "orange" | "green" | "red" | "blue";
  badge?: string;
  badgeVariant?: "default" | "warning" | "success" | "info";
  subtitle?: string;
}

const iconColorClasses = {
  primary: "bg-primary/20 text-primary",
  orange: "bg-orange-500/20 text-orange-400",
  green: "bg-green-500/20 text-green-400",
  red: "bg-red-500/20 text-red-400",
  blue: "bg-blue-500/20 text-blue-400",
};

const badgeVariantClasses = {
  default: "bg-accent text-muted-foreground",
  warning: "bg-orange-500/10 text-orange-400",
  success: "bg-green-500/10 text-green-400",
  info: "bg-primary/10 text-primary",
};

export function StatCard({
  title,
  value,
  icon: Icon,
  iconColor = "primary",
  badge,
  badgeVariant = "default",
  subtitle,
}: StatCardProps) {
  return (
    <div className="flex flex-col p-5 rounded-xl bg-card-dark border border-card-lighter hover:border-primary/30 transition-colors group">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-2 rounded-lg", iconColorClasses[iconColor])}>
          <Icon className="h-5 w-5" />
        </div>
        {badge && (
          <span
            className={cn(
              "text-xs font-medium text-text-subtle bg-card-lighter px-2 py-1 rounded",
              badgeVariantClasses[badgeVariant]
            )}
          >
            {badge}
          </span>
        )}
      </div>
      <p className="text-text-subtle text-sm font-medium">{title}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-white text-3xl font-bold mt-1 group-hover:text-primary transition-colors">
          {value}
        </p>
        {subtitle && (
          <span className="text-xs text-text-subtle">{subtitle}</span>
        )}
      </div>
    </div>
  );
}
