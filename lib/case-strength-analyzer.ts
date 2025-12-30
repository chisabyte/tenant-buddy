/**
 * Evidence Completeness Check
 *
 * Checks what information has been entered and what is missing.
 * This is a checklist-style tool - it does NOT assess case strength,
 * provide legal analysis, or predict outcomes.
 *
 * IMPORTANT: This tool only reports on user-entered data completeness.
 * It does not provide legal advice or assess the merits of any situation.
 */

export interface CompletenessCheckInput {
  issueTitle: string;
  issueDescription?: string;
  issueStatus: string;
  issueCreatedAt: Date;
  evidenceCount: number;
  evidenceItems: Array<{
    type: string;
    category?: string;
    hasHash: boolean;
    occurredAt: Date;
  }>;
  commsCount: number;
  commsItems: Array<{
    channel: string;
    summary: string;
    occurredAt: Date;
  }>;
  expenseTotal: number;
  expenseCount: number;
  state: string;
}

export interface ChecklistItem {
  category: string;
  item: string;
  status: 'added' | 'not_added' | 'partial';
  description: string;
}

export interface PreparationOverview {
  checklist: ChecklistItem[];
  suggestedSteps: string[];
  summary: {
    itemsAdded: number;
    itemsNotAdded: number;
    itemsPartial: number;
  };
}

/**
 * Checks completeness of user-entered information
 * Returns a checklist of what has been added and what is missing
 */
export function checkEvidenceCompleteness(
  input: CompletenessCheckInput
): PreparationOverview {
  const checklist: ChecklistItem[] = [];
  const suggestedSteps: string[] = [];

  // Check issue details
  checklist.push({
    category: 'Issue Details',
    item: 'Issue title',
    status: input.issueTitle ? 'added' : 'not_added',
    description: input.issueTitle ? 'Title has been entered' : 'Not yet added',
  });

  checklist.push({
    category: 'Issue Details',
    item: 'Issue description',
    status: input.issueDescription ? 'added' : 'not_added',
    description: input.issueDescription ? 'Description has been entered' : 'Not yet added',
  });

  // Check evidence
  if (input.evidenceCount === 0) {
    checklist.push({
      category: 'Evidence',
      item: 'Evidence items',
      status: 'not_added',
      description: 'No evidence items uploaded yet',
    });
    suggestedSteps.push('Upload photos, documents, or other evidence');
  } else {
    checklist.push({
      category: 'Evidence',
      item: 'Evidence items',
      status: 'added',
      description: `${input.evidenceCount} item(s) uploaded`,
    });
  }

  // Check evidence types variety
  const evidenceTypes = new Set(input.evidenceItems.map(e => e.type));
  if (evidenceTypes.size === 1 && input.evidenceCount > 0) {
    checklist.push({
      category: 'Evidence',
      item: 'Evidence variety',
      status: 'partial',
      description: 'Only one type of evidence added',
    });
    suggestedSteps.push('Consider adding different types of evidence (photos, documents, etc.)');
  } else if (evidenceTypes.size > 1) {
    checklist.push({
      category: 'Evidence',
      item: 'Evidence variety',
      status: 'added',
      description: `${evidenceTypes.size} different types of evidence`,
    });
  }

  // Check communications
  if (input.commsCount === 0) {
    checklist.push({
      category: 'Communications',
      item: 'Communication records',
      status: 'not_added',
      description: 'No communications logged yet',
    });
    suggestedSteps.push('Log any communications with your landlord or agent');
  } else {
    checklist.push({
      category: 'Communications',
      item: 'Communication records',
      status: 'added',
      description: `${input.commsCount} communication(s) logged`,
    });
  }

  // Check for written communications
  const writtenComms = input.commsItems.filter(c =>
    ['email', 'letter', 'app'].includes(c.channel)
  ).length;

  if (input.commsCount > 0 && writtenComms === 0) {
    checklist.push({
      category: 'Communications',
      item: 'Written communications',
      status: 'not_added',
      description: 'No written communications (email/letter) logged',
    });
    suggestedSteps.push('Log any email or written correspondence');
  } else if (writtenComms > 0) {
    checklist.push({
      category: 'Communications',
      item: 'Written communications',
      status: 'added',
      description: `${writtenComms} written communication(s) logged`,
    });
  }

  // Check expenses (optional)
  if (input.expenseCount === 0) {
    checklist.push({
      category: 'Expenses',
      item: 'Expense records',
      status: 'not_added',
      description: 'No expenses recorded (optional)',
    });
  } else {
    checklist.push({
      category: 'Expenses',
      item: 'Expense records',
      status: 'added',
      description: `${input.expenseCount} expense(s) totalling $${input.expenseTotal.toFixed(2)}`,
    });
  }

  // Check timeline gaps
  const hasTimelineGaps = checkTimelineGaps(input);
  if (hasTimelineGaps) {
    checklist.push({
      category: 'Timeline',
      item: 'Timeline completeness',
      status: 'partial',
      description: 'There may be gaps in your timeline',
    });
    suggestedSteps.push('Review your timeline for any missing dates or events');
  } else if (input.evidenceCount > 0 || input.commsCount > 0) {
    checklist.push({
      category: 'Timeline',
      item: 'Timeline completeness',
      status: 'added',
      description: 'Events are logged with dates',
    });
  }

  // Always add final suggestion
  if (input.evidenceCount > 0) {
    suggestedSteps.push('Generate an Evidence Pack when ready');
  }

  // Calculate summary
  const summary = {
    itemsAdded: checklist.filter(c => c.status === 'added').length,
    itemsNotAdded: checklist.filter(c => c.status === 'not_added').length,
    itemsPartial: checklist.filter(c => c.status === 'partial').length,
  };

  return {
    checklist,
    suggestedSteps,
    summary,
  };
}

/**
 * Check if there are significant gaps in the timeline
 */
function checkTimelineGaps(input: CompletenessCheckInput): boolean {
  const allDates: Date[] = [
    ...input.evidenceItems.map(e => new Date(e.occurredAt)),
    ...input.commsItems.map(c => new Date(c.occurredAt)),
  ];

  if (allDates.length < 2) return false;

  allDates.sort((a, b) => a.getTime() - b.getTime());

  // Check for gaps larger than 30 days
  for (let i = 1; i < allDates.length; i++) {
    const daysBetween = Math.floor(
      (allDates[i].getTime() - allDates[i - 1].getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysBetween > 30) {
      return true;
    }
  }

  return false;
}

// Legacy type aliases for backwards compatibility
export type CaseAnalysisInput = CompletenessCheckInput;

export interface EvidenceMetrics {
  totalItems: number;
  withIntegrityHash: number;
  coverageScore: number;
}

export interface CommunicationMetrics {
  totalLogs: number;
  writtenCommunications: number;
  timelinessScore: number;
}

export interface FinancialImpact {
  totalExpenses: number;
  documentedExpenses: number;
}

export interface TimeMetrics {
  daysSinceIssue: number;
  escalationTimeliness: number;
}

export interface CaseAnalysisResult {
  // Legacy fields - values are neutral/factual only
  strengthScore: number;
  strengthLevel: 'Weak' | 'Fair' | 'Good' | 'Strong' | 'Very Strong';
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  evidenceMetrics: EvidenceMetrics;
  communicationMetrics: CommunicationMetrics;
  financialImpact: FinancialImpact;
  timeMetrics: TimeMetrics;
  // New field with checklist-style output
  preparationOverview: PreparationOverview;
}

/**
 * @deprecated Use checkEvidenceCompleteness instead
 * This function is maintained for backwards compatibility but no longer
 * returns strength scores or legal assessments.
 */
export function analyzeCaseStrength(
  input: CaseAnalysisInput
): CaseAnalysisResult {
  const preparationOverview = checkEvidenceCompleteness(input);

  const daysSinceIssue = Math.floor(
    (Date.now() - new Date(input.issueCreatedAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  const writtenCommunications = input.commsItems.filter(c =>
    ['email', 'letter', 'app'].includes(c.channel)
  ).length;

  // Return neutral/zero values for legacy fields
  // The preparationOverview contains the actual useful information
  return {
    strengthScore: 0, // No longer calculated - not a legal assessment
    strengthLevel: 'Fair', // Neutral default - not a legal assessment
    strengths: [], // Removed - was implying legal assessment
    weaknesses: [], // Removed - was implying legal assessment
    recommendations: preparationOverview.suggestedSteps, // In-app actions only
    evidenceMetrics: {
      totalItems: input.evidenceCount,
      withIntegrityHash: input.evidenceItems.filter(e => e.hasHash).length,
      coverageScore: 0, // No longer calculated
    },
    communicationMetrics: {
      totalLogs: input.commsCount,
      writtenCommunications,
      timelinessScore: 0, // No longer calculated
    },
    financialImpact: {
      totalExpenses: input.expenseTotal,
      documentedExpenses: input.expenseCount,
    },
    timeMetrics: {
      daysSinceIssue,
      escalationTimeliness: 0, // No longer calculated
    },
    preparationOverview,
  };
}
