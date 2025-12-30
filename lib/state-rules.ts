/**
 * State-based Labels and Information
 *
 * This module provides state-specific LABELS and HEADINGS only.
 * It is used for formatting exports and display purposes.
 *
 * IMPORTANT DISCLAIMER:
 * This information is general and may not apply to your specific situation.
 * This is NOT legal advice. The information provided here may be outdated
 * or incorrect. Always verify information with official sources and consult
 * with a qualified professional or your local Tenants' Union.
 *
 * This data is used ONLY for:
 * - Labels and headings in exports
 * - Tribunal names for reference
 * - Export formatting
 *
 * This data is NOT used to:
 * - Provide legal advice
 * - Calculate deadlines
 * - Assess rights or entitlements
 * - Make legal determinations
 */

export type AustralianState = 'VIC' | 'NSW' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'ACT' | 'NT';

/**
 * State information - for labels and reference only
 * Note: noticePeriods and formNames are retained for backwards compatibility
 * but should NOT be used to provide legal advice or assess compliance
 */
export interface StateInfo {
  state: AustralianState;
  tribunalName: string;
  regulatorName: string;
  // Legacy fields - retained for compatibility but not used for legal assessment
  noticePeriods: {
    rentIncrease: number;
    breachRemedy: number;
  };
  formNames: {
    breachNotice: string;
    rentIncrease: string;
  };
}

// Legacy type alias
export type StateRules = StateInfo;

/**
 * Standard disclaimer to show wherever state info is displayed
 */
export const STATE_INFO_DISCLAIMER =
  'This information is general and may not apply to your situation. Always verify with official sources.';

/**
 * State-specific information for labels and headings
 * Note: Period values are indicative only and should not be relied upon
 */
export const STATE_RULES: Record<AustralianState, StateInfo> = {
  VIC: {
    state: 'VIC',
    tribunalName: 'VCAT',
    regulatorName: 'Consumer Affairs Victoria',
    noticePeriods: {
      rentIncrease: 60,
      breachRemedy: 14,
    },
    formNames: {
      breachNotice: 'Notice of Breach of Duty',
      rentIncrease: 'Notice of Rent Increase',
    },
  },
  NSW: {
    state: 'NSW',
    tribunalName: 'NCAT',
    regulatorName: 'NSW Fair Trading',
    noticePeriods: {
      rentIncrease: 60,
      breachRemedy: 14,
    },
    formNames: {
      breachNotice: 'Notice to Remedy Breach',
      rentIncrease: 'Notice of Rent Increase',
    },
  },
  QLD: {
    state: 'QLD',
    tribunalName: 'QCAT',
    regulatorName: 'Residential Tenancies Authority (RTA)',
    noticePeriods: {
      rentIncrease: 60,
      breachRemedy: 7,
    },
    formNames: {
      breachNotice: 'Form 11 - Notice to Remedy Breach',
      rentIncrease: 'Form 12 - Notice of Rent Increase',
    },
  },
  WA: {
    state: 'WA',
    tribunalName: 'SAT',
    regulatorName: 'Department of Mines, Industry Regulation and Safety',
    noticePeriods: {
      rentIncrease: 60,
      breachRemedy: 14,
    },
    formNames: {
      breachNotice: 'Notice of Breach',
      rentIncrease: 'Notice of Rent Increase',
    },
  },
  SA: {
    state: 'SA',
    tribunalName: 'SACAT',
    regulatorName: 'Consumer and Business Services',
    noticePeriods: {
      rentIncrease: 60,
      breachRemedy: 14,
    },
    formNames: {
      breachNotice: 'Notice to Remedy Breach',
      rentIncrease: 'Notice of Rent Increase',
    },
  },
  TAS: {
    state: 'TAS',
    tribunalName: 'RTT',
    regulatorName: 'Consumer, Building and Occupational Services',
    noticePeriods: {
      rentIncrease: 60,
      breachRemedy: 14,
    },
    formNames: {
      breachNotice: 'Notice to Remedy Breach',
      rentIncrease: 'Notice of Rent Increase',
    },
  },
  ACT: {
    state: 'ACT',
    tribunalName: 'ACAT',
    regulatorName: 'Access Canberra',
    noticePeriods: {
      rentIncrease: 60,
      breachRemedy: 14,
    },
    formNames: {
      breachNotice: 'Notice to Remedy Breach',
      rentIncrease: 'Notice of Rent Increase',
    },
  },
  NT: {
    state: 'NT',
    tribunalName: 'NTCAT',
    regulatorName: 'Consumer Affairs NT',
    noticePeriods: {
      rentIncrease: 60,
      breachRemedy: 14,
    },
    formNames: {
      breachNotice: 'Notice to Remedy Breach',
      rentIncrease: 'Notice of Rent Increase',
    },
  },
};

/**
 * Get state information for labels and headings
 */
export function getStateRules(state: AustralianState): StateInfo {
  return STATE_RULES[state];
}

/**
 * Get tribunal name for a given state (for labels only)
 */
export function getTribunalName(state: AustralianState): string {
  return STATE_RULES[state].tribunalName;
}

/**
 * Get regulator name for a given state (for reference only)
 */
export function getRegulatorName(state: AustralianState): string {
  return STATE_RULES[state].regulatorName;
}
