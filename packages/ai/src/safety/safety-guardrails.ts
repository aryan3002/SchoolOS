/**
 * Safety Guardrails
 *
 * Implements safety checks for AI-generated content including
 * PII detection, content filtering, and compliance validation.
 *
 * @module @schoolos/ai/safety
 */

import {
  SafetyCheckResult,
  SafetyViolationType,
  UserContext,
  ClassifiedIntent,
  GeneratedResponse,
  ConversationMessage,
} from '../types';

// ============================================================
// CONFIGURATION
// ============================================================

export interface SafetyGuardrailsConfig {
  /** Enable PII detection */
  enablePiiDetection?: boolean;

  /** Enable content filtering */
  enableContentFilter?: boolean;

  /** Enable FERPA compliance checks */
  enableFerpaCompliance?: boolean;

  /** Custom blocked terms */
  customBlockedTerms?: string[];

  /** Terms that require special handling but aren't blocked */
  sensitiveTerms?: string[];

  /** Maximum allowed response length */
  maxResponseLength?: number;
}

// ============================================================
// TYPES
// ============================================================

export interface PiiDetectionResult {
  hasPii: boolean;
  piiTypes: PiiType[];
  locations: Array<{
    type: PiiType;
    start: number;
    end: number;
    confidence: number;
  }>;
}

export type PiiType =
  | 'SSN'
  | 'PHONE_NUMBER'
  | 'EMAIL'
  | 'ADDRESS'
  | 'DOB'
  | 'STUDENT_ID'
  | 'MEDICAL_INFO'
  | 'FINANCIAL_INFO'
  | 'PASSWORD'
  | 'CREDIT_CARD';

export interface ContentFilterResult {
  isApproved: boolean;
  violations: Array<{
    type: 'PROFANITY' | 'HARMFUL_CONTENT' | 'INAPPROPRIATE' | 'BLOCKED_TERM';
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    context?: string;
  }>;
}

export interface FerpaCheckResult {
  isCompliant: boolean;
  violations: Array<{
    type: 'UNAUTHORIZED_DISCLOSURE' | 'EXCESSIVE_INFO' | 'MISSING_CONSENT';
    description: string;
  }>;
}

// ============================================================
// SAFETY GUARDRAILS
// ============================================================

export class SafetyGuardrails {
  private readonly enablePiiDetection: boolean;
  private readonly enableContentFilter: boolean;
  private readonly enableFerpaCompliance: boolean;
  private readonly customBlockedTerms: Set<string>;
  private readonly sensitiveTerms: Set<string>;
  private readonly maxResponseLength: number;

  // PII detection patterns
  private readonly piiPatterns: Map<PiiType, RegExp[]> = new Map([
    [
      'SSN',
      [
        /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g,
        /\bssn\s*[:\-]?\s*\d{9}\b/gi,
      ],
    ],
    [
      'PHONE_NUMBER',
      [
        /\b\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
        /\b\d{3}[-.\s]\d{4}\b/g,
      ],
    ],
    [
      'EMAIL',
      [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g],
    ],
    [
      'ADDRESS',
      [
        /\b\d{1,5}\s+[\w\s]{1,30}\s+(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|court|ct)\b/gi,
      ],
    ],
    [
      'DOB',
      [
        /\b(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])[\/\-](19|20)\d{2}\b/g,
        /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+(19|20)\d{2}\b/gi,
      ],
    ],
    [
      'STUDENT_ID',
      [
        /\bstudent\s*id\s*[:\-]?\s*\d{5,10}\b/gi,
        /\bid\s*#?\s*\d{6,}\b/gi,
      ],
    ],
    [
      'CREDIT_CARD',
      [
        /\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b/g,
        /\b\d{16}\b/g,
      ],
    ],
    [
      'PASSWORD',
      [
        /\bpassword\s*[:\-]?\s*\S+/gi,
        /\bpwd\s*[:\-]?\s*\S+/gi,
      ],
    ],
  ]);

  // Harmful content patterns
  private readonly harmfulPatterns: RegExp[] = [
    /\b(kill|murder|suicide|self[- ]?harm)\b/gi,
    /\b(bomb|weapon|gun|explosive)\s+(make|build|create|how\s+to)\b/gi,
    /\b(abuse|molest|assault)\b/gi,
  ];

  constructor(config: SafetyGuardrailsConfig = {}) {
    this.enablePiiDetection = config.enablePiiDetection ?? true;
    this.enableContentFilter = config.enableContentFilter ?? true;
    this.enableFerpaCompliance = config.enableFerpaCompliance ?? true;
    this.customBlockedTerms = new Set(
      (config.customBlockedTerms || []).map((t) => t.toLowerCase()),
    );
    this.sensitiveTerms = new Set(
      (config.sensitiveTerms || []).map((t) => t.toLowerCase()),
    );
    this.maxResponseLength = config.maxResponseLength || 10000;
  }

  /**
   * Run all safety checks on a message
   */
  async checkMessage(
    message: string,
    direction: 'inbound' | 'outbound',
    context?: {
      userContext?: UserContext;
      intent?: ClassifiedIntent;
    },
  ): Promise<SafetyCheckResult> {
    const violations: SafetyCheckResult['violations'] = [];
    const recommendations: string[] = [];

    // PII Detection
    if (this.enablePiiDetection) {
      const piiResult = this.detectPii(message);
      if (piiResult.hasPii) {
        for (const location of piiResult.locations) {
          // For outbound messages, PII is more serious
          const severity = direction === 'outbound' ? 'HIGH' : 'MEDIUM';
          violations.push({
            type: SafetyViolationType.PII_DETECTED,
            severity,
            description: `Detected ${location.type} in message`,
            position: { start: location.start, end: location.end },
          });
        }

        if (direction === 'outbound') {
          recommendations.push('Remove or mask PII before sending response');
        } else {
          recommendations.push('Consider whether PII in query is necessary');
        }
      }
    }

    // Content Filtering
    if (this.enableContentFilter) {
      const contentResult = this.filterContent(message);
      if (!contentResult.isApproved) {
        for (const violation of contentResult.violations) {
          violations.push({
            type:
              violation.type === 'HARMFUL_CONTENT'
                ? SafetyViolationType.HARMFUL_CONTENT
                : SafetyViolationType.INAPPROPRIATE_CONTENT,
            severity: violation.severity,
            description: `${violation.type}${violation.context ? `: ${violation.context}` : ''}`,
          });
        }

        if (contentResult.violations.some((v) => v.severity === 'HIGH')) {
          recommendations.push('Block this content and escalate to admin');
        } else {
          recommendations.push('Review content for appropriateness');
        }
      }
    }

    // FERPA Compliance (for outbound)
    if (this.enableFerpaCompliance && direction === 'outbound' && context?.userContext) {
      const ferpaResult = this.checkFerpaCompliance(message, context.userContext, context.intent);
      if (!ferpaResult.isCompliant) {
        for (const violation of ferpaResult.violations) {
          violations.push({
            type: SafetyViolationType.UNAUTHORIZED_DATA_ACCESS,
            severity: 'HIGH',
            description: `FERPA: ${violation.description}`,
          });
        }
        recommendations.push('Review response for FERPA compliance');
      }
    }

    // Length check
    if (message.length > this.maxResponseLength) {
      violations.push({
        type: SafetyViolationType.INAPPROPRIATE_CONTENT,
        severity: 'LOW',
        description: `Response exceeds maximum length (${message.length}/${this.maxResponseLength})`,
      });
      recommendations.push('Truncate or summarize response');
    }

    // Determine overall pass/fail
    const highSeverityCount = violations.filter((v) => v.severity === 'HIGH').length;
    const mediumSeverityCount = violations.filter((v) => v.severity === 'MEDIUM').length;

    const passed = highSeverityCount === 0 && mediumSeverityCount <= 1;

    return {
      passed,
      violations,
      sanitizedContent: passed ? message : this.sanitizeMessage(message, violations),
      recommendations,
    };
  }

  /**
   * Check input message before processing
   */
  async checkInput(
    message: string,
    context?: UserContext,
  ): Promise<SafetyCheckResult> {
    return this.checkMessage(message, 'inbound', { userContext: context });
  }

  /**
   * Check generated response before sending
   */
  async checkOutput(
    response: GeneratedResponse,
    context: UserContext,
    intent?: ClassifiedIntent,
  ): Promise<SafetyCheckResult> {
    return this.checkMessage(response.content, 'outbound', {
      userContext: context,
      intent,
    });
  }

  /**
   * Detect PII in text
   */
  detectPii(text: string): PiiDetectionResult {
    const locations: PiiDetectionResult['locations'] = [];
    const piiTypes: PiiType[] = [];

    for (const [type, patterns] of this.piiPatterns) {
      for (const pattern of patterns) {
        const regex = new RegExp(pattern.source, pattern.flags);
        let match;
        while ((match = regex.exec(text)) !== null) {
          locations.push({
            type,
            start: match.index,
            end: match.index + match[0].length,
            confidence: this.getPiiConfidence(type, match[0]),
          });
          if (!piiTypes.includes(type)) {
            piiTypes.push(type);
          }
        }
      }
    }

    return {
      hasPii: locations.length > 0,
      piiTypes,
      locations,
    };
  }

  /**
   * Get confidence score for PII detection
   */
  private getPiiConfidence(type: PiiType, match: string): number {
    // Higher confidence for certain patterns
    switch (type) {
      case 'SSN':
        return match.replace(/\D/g, '').length === 9 ? 0.95 : 0.7;
      case 'EMAIL':
        return 0.9;
      case 'CREDIT_CARD':
        return this.isValidCreditCard(match) ? 0.95 : 0.5;
      case 'PHONE_NUMBER':
        return 0.8;
      default:
        return 0.7;
    }
  }

  /**
   * Basic credit card validation (Luhn algorithm)
   */
  private isValidCreditCard(number: string): boolean {
    const digits = number.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) return false;

    let sum = 0;
    let isEven = false;

    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i], 10);
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  /**
   * Filter content for harmful or inappropriate material
   */
  filterContent(text: string): ContentFilterResult {
    const violations: ContentFilterResult['violations'] = [];
    const lowerText = text.toLowerCase();

    // Check harmful patterns
    for (const pattern of this.harmfulPatterns) {
      if (pattern.test(text)) {
        violations.push({
          type: 'HARMFUL_CONTENT',
          severity: 'HIGH',
        });
        break;
      }
    }

    // Check custom blocked terms
    for (const term of this.customBlockedTerms) {
      if (lowerText.includes(term)) {
        violations.push({
          type: 'BLOCKED_TERM',
          severity: 'MEDIUM',
          context: `Contains blocked term`,
        });
      }
    }

    // Check sensitive terms (warning only)
    for (const term of this.sensitiveTerms) {
      if (lowerText.includes(term)) {
        violations.push({
          type: 'INAPPROPRIATE',
          severity: 'LOW',
          context: `Contains sensitive term`,
        });
      }
    }

    return {
      isApproved: violations.filter((v) => v.severity !== 'LOW').length === 0,
      violations,
    };
  }

  /**
   * Check FERPA compliance for response
   */
  checkFerpaCompliance(
    content: string,
    userContext: UserContext,
    intent?: ClassifiedIntent,
  ): FerpaCheckResult {
    const violations: FerpaCheckResult['violations'] = [];

    // Check if response contains student info for unauthorized users
    const containsStudentInfo =
      /\b(grade|gpa|attendance|behavior|iep|504|special\s+education|disciplin)/gi.test(content);

    if (containsStudentInfo) {
      // Verify user has rights to see this info
      if (userContext.role === 'STUDENT') {
        // Students can only see their own info
        if (intent?.entities.studentId && intent.entities.studentId !== userContext.userId) {
          violations.push({
            type: 'UNAUTHORIZED_DISCLOSURE',
            description: 'Student attempting to access another student\'s records',
          });
        }
      } else if (userContext.role === 'PARENT') {
        // Parents can only see their children's info
        if (
          intent?.entities.studentId &&
          !userContext.childIds?.includes(intent.entities.studentId)
        ) {
          violations.push({
            type: 'UNAUTHORIZED_DISCLOSURE',
            description: 'Parent attempting to access non-child student records',
          });
        }
      }
    }

    // Check for excessive information disclosure
    const sensitiveFields = [
      'social security',
      'ssn',
      'home address',
      'medical record',
      'psychological',
      'therapy',
      'medication',
    ];

    for (const field of sensitiveFields) {
      if (content.toLowerCase().includes(field)) {
        violations.push({
          type: 'EXCESSIVE_INFO',
          description: `Response contains sensitive information: ${field}`,
        });
      }
    }

    return {
      isCompliant: violations.length === 0,
      violations,
    };
  }

  /**
   * Sanitize message by removing/masking violations
   */
  sanitizeMessage(
    message: string,
    violations: SafetyCheckResult['violations'],
  ): string {
    let sanitized = message;

    // Sort violations by position (descending) to avoid offset issues
    const piiViolations = violations
      .filter((v) => v.type === SafetyViolationType.PII_DETECTED && v.position)
      .sort((a, b) => (b.position?.start || 0) - (a.position?.start || 0));

    // Mask PII
    for (const violation of piiViolations) {
      if (violation.position) {
        const { start, end } = violation.position;
        const masked = '[REDACTED]';
        sanitized = sanitized.substring(0, start) + masked + sanitized.substring(end);
      }
    }

    // Remove blocked terms
    for (const term of this.customBlockedTerms) {
      const regex = new RegExp(term, 'gi');
      sanitized = sanitized.replace(regex, '[REMOVED]');
    }

    return sanitized;
  }

  /**
   * Check if a conversation thread needs moderation
   */
  async checkConversationThread(
    messages: ConversationMessage[],
    userContext: UserContext,
  ): Promise<{
    needsModeration: boolean;
    reasons: string[];
    flaggedMessageIds: string[];
  }> {
    const reasons: string[] = [];
    const flaggedMessageIds: string[] = [];

    for (const message of messages) {
      const result = await this.checkMessage(
        message.content,
        message.role === 'user' ? 'inbound' : 'outbound',
        { userContext },
      );

      if (!result.passed) {
        flaggedMessageIds.push(message.id || 'unknown');
        for (const violation of result.violations) {
          if (!reasons.includes(violation.description)) {
            reasons.push(violation.description);
          }
        }
      }
    }

    return {
      needsModeration: flaggedMessageIds.length > 0,
      reasons,
      flaggedMessageIds,
    };
  }
}
