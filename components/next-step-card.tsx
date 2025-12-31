"use client";

import Link from "next/link";
import { Upload, MessageSquare, FileText, Calendar, CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NextStep } from "@/lib/case-health";

interface NextStepCardProps {
  step: NextStep;
  issueTitle?: string;
}

const iconMap = {
  upload: Upload,
  message: MessageSquare,
  document: FileText,
  calendar: Calendar,
  check: CheckCircle,
};

const urgencyConfig = {
  critical: {
    bg: "bg-red-500/10",
    border: "border-red-500/40",
    badge: "bg-red-500/20 text-red-700 dark:text-red-400",
    badgeText: "Immediate Action Required",
    button: "bg-red-500 hover:bg-red-600 text-white",
    // Dark text for light backgrounds
    headerText: "text-slate-700 dark:text-white/90",
    titleText: "text-slate-900 dark:text-white",
    bodyText: "text-slate-700 dark:text-white/80",
    iconText: "text-red-600 dark:text-red-400",
  },
  high: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/40",
    badge: "bg-amber-500/20 text-amber-700 dark:text-amber-400",
    badgeText: "Action Needed",
    button: "bg-amber-500 hover:bg-amber-600 text-background-dark",
    // Dark text for light backgrounds
    headerText: "text-slate-700 dark:text-white/90",
    titleText: "text-slate-900 dark:text-white",
    bodyText: "text-slate-700 dark:text-white/80",
    iconText: "text-amber-600 dark:text-amber-400",
  },
  medium: {
    bg: "bg-primary/10",
    border: "border-primary/40",
    badge: "bg-primary/20 text-primary dark:text-primary",
    badgeText: "Recommended",
    button: "bg-primary hover:bg-primary/90 text-background-dark",
    // Dark text for light backgrounds
    headerText: "text-slate-700 dark:text-white/90",
    titleText: "text-slate-900 dark:text-white",
    bodyText: "text-slate-700 dark:text-white/80",
    iconText: "text-primary dark:text-primary",
  },
  low: {
    bg: "bg-green-500/10",
    border: "border-green-500/40",
    badge: "bg-green-500/20 text-green-700 dark:text-green-400",
    badgeText: "Optional",
    button: "bg-green-500 hover:bg-green-600 text-background-dark",
    // Dark text for light backgrounds
    headerText: "text-slate-700 dark:text-white/90",
    titleText: "text-slate-900 dark:text-white",
    bodyText: "text-slate-700 dark:text-white/80",
    iconText: "text-green-600 dark:text-green-400",
  },
};

export function NextStepCard({ step }: NextStepCardProps) {
  const config = urgencyConfig[step.urgency];
  const Icon = iconMap[step.icon];

  return (
    <div className={`rounded-xl ${config.bg} border ${config.border} p-5`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className={`text-xs font-medium ${config.headerText} uppercase tracking-wide`}>
          Recommended Next Step
        </p>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.badge}`}>
          {config.badgeText}
        </span>
      </div>

      {/* Content */}
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${config.bg} shrink-0`}>
          <Icon className={`h-6 w-6 ${config.iconText}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`text-lg font-bold ${config.titleText} mb-1`}>{step.action}</h3>
          <p className={`text-sm ${config.bodyText} leading-relaxed mb-4`}>
            {step.description}
          </p>
          <Button asChild className={`${config.button} font-bold`}>
            <Link href={step.href}>
              {step.action}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function NoActionNeededCard() {
  return (
    <div className="rounded-xl bg-green-500/10 border border-green-500/30 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-slate-700 dark:text-white/90 uppercase tracking-wide">
          Recommended Next Step
        </p>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-500/20 text-green-700 dark:text-green-400">
          All Clear
        </span>
      </div>

      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-green-500/10 shrink-0">
          <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">You&apos;re Protected</h3>
          <p className="text-sm text-slate-700 dark:text-white/80 leading-relaxed">
            No urgent actions needed. Continue documenting any new issues or communications as they arise.
          </p>
        </div>
      </div>
    </div>
  );
}
