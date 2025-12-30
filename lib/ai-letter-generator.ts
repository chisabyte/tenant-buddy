/**
 * Communication Draft Helper
 *
 * Helps users draft plain-language communications.
 * This is NOT a legal document generator.
 *
 * IMPORTANT SAFETY RULES:
 * - No legal language or formal legal terminology
 * - No legislation references
 * - No deadlines or threats
 * - No assessment of rights or entitlements
 * - All drafts include disclaimer that this is not a legal document
 */

import { getStateRules } from './state-rules';

// Keywords that should trigger refusal or require special handling
const LEGAL_ADVICE_KEYWORDS = [
  'entitled',
  'illegal',
  'breach',
  'compliant',
  'violation',
  'unlawful',
  'rights',
  'sue',
  'lawyer',
  'solicitor',
  'tribunal',
  'court',
  'legislation',
  'act',
  'section',
  'regulation',
];

export interface DraftRequest {
  draftType:
    | 'Repair Request'
    | 'General Query'
    | 'Follow Up'
    | 'Information Request'
    | 'Other';
  recipient: string;
  subject: string;
  contextDetails: string;
  state: string;
  tenantName?: string;
  propertyAddress?: string;
  landlordName?: string;
  agentName?: string;
}

// Legacy type alias
export type LetterGenerationRequest = DraftRequest;

export interface GeneratedDraft {
  content: string;
  subject: string;
  disclaimer: string;
  suggestions?: string[];
}

// Legacy type alias
export type GeneratedLetter = GeneratedDraft;

/**
 * Standard disclaimer for all generated drafts
 */
const DRAFT_DISCLAIMER = `
---
IMPORTANT: This is a plain-language draft and not a legal document.
It does not constitute legal advice. Before sending any communication
about your tenancy, consider seeking advice from your local Tenants' Union
or a qualified professional.
---`;

/**
 * Refusal message for legal advice requests
 */
const LEGAL_ADVICE_REFUSAL =
  "I can't help with legal advice, but I can help you organise your evidence and draft a plain-language message to communicate with your landlord or agent.";

/**
 * Checks if content requests legal advice
 */
function containsLegalAdviceRequest(text: string): boolean {
  const lowerText = text.toLowerCase();
  return LEGAL_ADVICE_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

/**
 * Generates a plain-language communication draft
 */
export async function generateDraft(
  request: DraftRequest
): Promise<GeneratedDraft> {
  // Check for legal advice requests
  if (containsLegalAdviceRequest(request.contextDetails)) {
    return {
      content: LEGAL_ADVICE_REFUSAL + '\n\n' + generatePlainDraft(request),
      subject: request.subject,
      disclaimer: DRAFT_DISCLAIMER,
      suggestions: [
        'Contact your local Tenants\' Union for advice',
        'Keep a copy of any communication you send',
        'Log this communication in the app after sending',
      ],
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const aiEnabled = process.env.ENABLE_AI_FEATURES === 'true';

  if (!apiKey || !aiEnabled) {
    // Use template-based generation
    return {
      content: generatePlainDraft(request),
      subject: request.subject,
      disclaimer: DRAFT_DISCLAIMER,
      suggestions: getInAppSuggestions(),
    };
  }

  try {
    const systemPrompt = buildSafeSystemPrompt(request);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1500,
        temperature: 0.5,
        system: getSafetySystemPrompt(),
        messages: [
          {
            role: 'user',
            content: systemPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error('API error:', await response.text());
      return {
        content: generatePlainDraft(request),
        subject: request.subject,
        disclaimer: DRAFT_DISCLAIMER,
        suggestions: getInAppSuggestions(),
      };
    }

    const data = await response.json();
    let content = data.content[0].text;

    // Post-process to remove any legal language that slipped through
    content = sanitizeContent(content);

    return {
      content,
      subject: request.subject,
      disclaimer: DRAFT_DISCLAIMER,
      suggestions: getInAppSuggestions(),
    };
  } catch (error) {
    console.error('Error generating draft:', error);
    return {
      content: generatePlainDraft(request),
      subject: request.subject,
      disclaimer: DRAFT_DISCLAIMER,
      suggestions: getInAppSuggestions(),
    };
  }
}

/**
 * Legacy function name for backwards compatibility
 */
export async function generateLetter(
  request: LetterGenerationRequest
): Promise<GeneratedLetter> {
  return generateDraft(request);
}

/**
 * System prompt with safety guards
 */
function getSafetySystemPrompt(): string {
  return `You are a helpful assistant that helps users draft plain-language messages to communicate with their landlord or property agent.

CRITICAL RULES - YOU MUST FOLLOW THESE:
1. NEVER provide legal advice or interpret laws
2. NEVER reference specific legislation, acts, or sections
3. NEVER use legal terminology (entitled, breach, violation, unlawful, etc.)
4. NEVER include deadlines with threats or consequences
5. NEVER assess rights, entitlements, or legal standing
6. NEVER suggest the user is entitled to anything or that anyone has breached anything
7. If asked for legal advice, respond: "I can't help with legal advice, but I can help you organise your evidence."

YOUR ROLE:
- Help draft polite, clear, plain-language messages
- Focus on describing the situation factually
- Ask for responses or action in a friendly way
- Keep the tone conversational and non-confrontational
- Use simple everyday language

The output should be a message the user could send via email or letter.`;
}

/**
 * Builds a safe prompt for drafting
 */
function buildSafeSystemPrompt(request: DraftRequest): string {
  const today = new Date().toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return `Please help me draft a plain-language ${request.draftType.toLowerCase()} message.

To: ${request.recipient}
Subject: ${request.subject}
Date: ${today}

What I want to communicate:
${request.contextDetails}

${request.tenantName ? `My name: ${request.tenantName}` : ''}
${request.propertyAddress ? `Property: ${request.propertyAddress}` : ''}

Please write a polite, clear message using everyday language. Do not include any legal terminology or references to laws. Keep it friendly and straightforward.`;
}

/**
 * Sanitizes content to remove legal language
 */
function sanitizeContent(content: string): string {
  // Remove common legal phrases
  const legalPhrases = [
    /under (the )?(\w+ )?act/gi,
    /section \d+/gi,
    /residential tenancies act/gi,
    /breach of (duty|contract|agreement)/gi,
    /legally (required|obligated|entitled)/gi,
    /your (legal )?obligation/gi,
    /tenant('s)? rights/gi,
    /landlord('s)? obligations/gi,
    /I am entitled/gi,
    /you are required by law/gi,
    /failure to comply/gi,
    /in accordance with/gi,
    /pursuant to/gi,
  ];

  let sanitized = content;
  for (const pattern of legalPhrases) {
    sanitized = sanitized.replace(pattern, '');
  }

  // Clean up any double spaces or empty lines created
  sanitized = sanitized.replace(/\n\s*\n\s*\n/g, '\n\n');
  sanitized = sanitized.replace(/  +/g, ' ');

  return sanitized;
}

/**
 * Returns in-app only suggestions (no legal actions)
 */
function getInAppSuggestions(): string[] {
  return [
    'Keep a copy of this message for your records',
    'Log this communication in the app after sending',
    'Upload any response you receive as evidence',
    'Take photos of any relevant issues',
  ];
}

/**
 * Generates a plain-language draft without AI
 */
function generatePlainDraft(request: DraftRequest): string {
  const today = new Date().toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const greeting = `Dear ${request.recipient || '[Recipient]'},`;
  const subject = `Re: ${request.subject}`;

  let body = '';

  switch (request.draftType) {
    case 'Repair Request':
      body = `I'm writing about an issue at the property${request.propertyAddress ? ` (${request.propertyAddress})` : ''}.

${request.contextDetails}

I would appreciate it if you could look into this and let me know when it might be addressed.

Please let me know if you need any more information or would like to arrange a time to inspect the issue.`;
      break;

    case 'Follow Up':
      body = `I'm following up on my previous message regarding the issue at the property${request.propertyAddress ? ` (${request.propertyAddress})` : ''}.

${request.contextDetails}

I would appreciate an update when you have a chance.`;
      break;

    case 'Information Request':
      body = `I'm writing to ask about the following:

${request.contextDetails}

I would appreciate any information you can provide.`;
      break;

    default:
      body = `${request.contextDetails}

I look forward to hearing from you.`;
  }

  const closing = `Best regards,

${request.tenantName || '[Your Name]'}`;

  return `${today}

${subject}

${greeting}

${body}

${closing}`;
}
