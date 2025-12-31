"use client";

import { Shield, AlertTriangle, AlertCircle, CheckCircle } from "lucide-react";
import type { CaseHealth, CaseHealthStatus } from "@/lib/case-health";

interface CaseHealthCardProps {
  health: CaseHealth;
  className?: string;
}

const statusConfig: Record<
  CaseHealthStatus,
  {
    icon: typeof Shield;
    bgColor: string;
    borderColor: string;
    textColor: string;
    ringColor: string;
    progressColor: string;
    // Dark text for light backgrounds
    headerText: string;
    bodyText: string;
  }
> = {
  strong: {
    icon: CheckCircle,
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    textColor: "text-green-600 dark:text-green-400",
    ringColor: "ring-green-500/20",
    progressColor: "bg-green-500",
    headerText: "text-slate-700 dark:text-white/90",
    bodyText: "text-slate-700 dark:text-white/80",
  },
  adequate: {
    icon: Shield,
    bgColor: "bg-primary/10",
    borderColor: "border-primary/30",
    textColor: "text-primary dark:text-primary",
    ringColor: "ring-primary/20",
    progressColor: "bg-primary",
    headerText: "text-slate-700 dark:text-white/90",
    bodyText: "text-slate-700 dark:text-white/80",
  },
  weak: {
    icon: AlertCircle,
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    textColor: "text-amber-600 dark:text-amber-400",
    ringColor: "ring-amber-500/20",
    progressColor: "bg-amber-500",
    headerText: "text-slate-700 dark:text-white/90",
    bodyText: "text-slate-700 dark:text-white/80",
  },
  "at-risk": {
    icon: AlertTriangle,
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    textColor: "text-red-600 dark:text-red-400",
    ringColor: "ring-red-500/20",
    progressColor: "bg-red-500",
    headerText: "text-slate-700 dark:text-white/90",
    bodyText: "text-slate-700 dark:text-white/80",
  },
};

export function CaseHealthCard({ health, className = "" }: CaseHealthCardProps) {
  const config = statusConfig[health.status];
  const Icon = config.icon;

  return (
    <div
      className={`rounded-xl ${config.bgColor} border ${config.borderColor} p-5 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${config.bgColor}`}>
            <Icon className={`h-5 w-5 ${config.textColor}`} />
          </div>
          <div>
            <p className={`text-xs font-medium ${config.headerText} uppercase tracking-wide`}>
              Case Health
            </p>
            <p className={`text-lg font-bold ${config.textColor}`}>
              {health.statusLabel}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-3xl font-black ${config.textColor}`}>
            {health.score}%
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-card-lighter rounded-full overflow-hidden mb-4">
        <div
          className={`h-full ${config.progressColor} rounded-full transition-all duration-500`}
          style={{ width: `${health.score}%` }}
        />
      </div>

      {/* Description */}
      <p className={`text-sm ${config.bodyText} mb-4`}>{health.statusDescription}</p>

      {/* Critical factors */}
      {health.factors.length > 0 && (
        <div className="space-y-2">
          {health.factors
            .filter((f) => f.recommendation)
            .slice(0, 2)
            .map((factor, index) => (
              <div
                key={index}
                className="flex items-start gap-2 text-xs"
              >
                <span
                  className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${
                    factor.status === "critical"
                      ? "bg-red-400"
                      : factor.status === "warning"
                      ? "bg-amber-400"
                      : "bg-green-400"
                  }`}
                />
                <span className={config.bodyText}>{factor.recommendation}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
