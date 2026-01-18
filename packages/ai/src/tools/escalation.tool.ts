/**
 * Escalation Tool
 *
 * Handles requests that require human intervention or
 * cannot be handled by automated tools.
 *
 * @module @schoolos/ai/tools
 */

import {
  ToolDefinition,
  ToolParams,
  ToolResult,
  Permission,
  IntentCategory,
  EscalationReason,
  EscalationRequest,
  UrgencyLevel,
} from '../types';
import { BaseTool } from './base-tool';

// ============================================================
// TYPES
// ============================================================

export interface EscalationParams extends ToolParams {
  /** Reason for escalation */
  reason: EscalationReason;

  /** Override target role for escalation */
  targetRole?: string;

  /** Additional context for the human agent */
  additionalContext?: string;

  /** Whether this is a safety-related escalation */
  isSafetyEscalation?: boolean;
}

export interface EscalationTarget {
  role: string;
  departmentId?: string;
  userId?: string;
  queueName?: string;
}

export interface EscalationService {
  createEscalation(request: EscalationRequest): Promise<{
    ticketId: string;
    estimatedWaitTime?: number;
    contactInfo?: string;
  }>;
  getAvailableAgents(target: EscalationTarget, districtId: string): Promise<number>;
  notifyUrgent(ticketId: string): Promise<void>;
}

// ============================================================
// ESCALATION TOOL
// ============================================================

export class EscalationTool extends BaseTool {
  readonly definition: ToolDefinition = {
    name: 'escalation',
    description: 'Escalates requests to human agents when automated assistance is insufficient',
    requiredPermissions: [],
    handlesIntents: [
      IntentCategory.EMERGENCY,
      IntentCategory.COMPLAINT,
      IntentCategory.HUMAN_AGENT_REQUEST,
    ],
    requiresStudentContext: false,
    timeoutMs: 5000,
  };

  /**
   * Mapping of escalation reasons to target roles
   */
  private readonly escalationRoutes: Record<
    EscalationReason,
    { targetRole: string; priority: number }
  > = {
    LOW_CONFIDENCE: { targetRole: 'SUPPORT_STAFF', priority: 3 },
    SENSITIVE_TOPIC: { targetRole: 'COUNSELOR', priority: 2 },
    USER_REQUEST: { targetRole: 'SUPPORT_STAFF', priority: 3 },
    SAFETY_CONCERN: { targetRole: 'ADMIN', priority: 1 },
    COMPLEX_QUERY: { targetRole: 'SPECIALIST', priority: 3 },
    SYSTEM_ERROR: { targetRole: 'TECH_SUPPORT', priority: 2 },
    AUTHORIZATION_REQUIRED: { targetRole: 'ADMIN', priority: 2 },
    POLICY_EXCEPTION: { targetRole: 'ADMIN', priority: 2 },
    EMERGENCY: { targetRole: 'ADMIN', priority: 1 },
  };

  constructor(private readonly escalationService: EscalationService) {
    super();
  }

  protected async executeImpl(
    params: EscalationParams,
  ): Promise<Omit<ToolResult, 'toolName' | 'executionTimeMs'>> {
    const { context, intent, reason, additionalContext, isSafetyEscalation } = params;

    // Determine escalation target
    const target = this.determineEscalationTarget(reason, params.targetRole);

    // Determine urgency
    const urgency = this.determineUrgency(reason, intent.urgencyLevel, isSafetyEscalation);

    // Create escalation request
    const escalationRequest: EscalationRequest = {
      conversationId: params.conversationId || 'unknown',
      reason,
      targetRole: target.targetRole,
      context: {
        userQuery: intent.originalQuery,
        intentCategory: intent.category,
        additionalNotes: additionalContext,
        conversationHistory: params.conversationHistory?.slice(-5).map((m) => ({
          role: m.role,
          content: m.content.substring(0, 500),
        })),
      },
      urgency,
      studentId: intent.entities.studentId,
      createdAt: new Date(),
    };

    try {
      // Create the escalation ticket
      const result = await this.escalationService.createEscalation(escalationRequest);

      // For urgent cases, send immediate notification
      if (urgency === UrgencyLevel.CRITICAL || urgency === UrgencyLevel.HIGH) {
        await this.escalationService.notifyUrgent(result.ticketId);
      }

      // Check agent availability
      const availableAgents = await this.escalationService.getAvailableAgents(
        { role: target.targetRole },
        context.districtId,
      );

      // Format response based on situation
      const content = this.formatEscalationResponse({
        ticketId: result.ticketId,
        reason,
        urgency,
        estimatedWaitTime: result.estimatedWaitTime,
        contactInfo: result.contactInfo,
        availableAgents,
        isSafetyEscalation,
      });

      return this.createSuccessResult(content, {
        data: {
          ticketId: result.ticketId,
          targetRole: target.targetRole,
          urgency,
          estimatedWaitTime: result.estimatedWaitTime,
        },
        confidence: 0.9,
        requiresFollowUp: true,
        suggestedActions: this.getSuggestedActions(reason, urgency),
      });
    } catch (error) {
      // Even on error, provide helpful information
      return this.createSuccessResult(
        this.getEscalationFallbackMessage(reason, context.districtId),
        {
          data: { escalationFailed: true, reason },
          confidence: 0.7,
        },
      );
    }
  }

  /**
   * Determine the escalation target based on reason and overrides
   */
  private determineEscalationTarget(
    reason: EscalationReason,
    overrideRole?: string,
  ): { targetRole: string; priority: number } {
    if (overrideRole) {
      return { targetRole: overrideRole, priority: 2 };
    }

    return this.escalationRoutes[reason] || { targetRole: 'SUPPORT_STAFF', priority: 3 };
  }

  /**
   * Determine urgency level for the escalation
   */
  private determineUrgency(
    reason: EscalationReason,
    intentUrgency: UrgencyLevel,
    isSafetyEscalation?: boolean,
  ): UrgencyLevel {
    // Safety escalations are always high priority
    if (isSafetyEscalation) {
      return UrgencyLevel.CRITICAL;
    }

    // Emergency reasons are critical
    if (reason === 'EMERGENCY' || reason === 'SAFETY_CONCERN') {
      return UrgencyLevel.CRITICAL;
    }

    // Use intent urgency if available and higher
    if (intentUrgency === UrgencyLevel.CRITICAL || intentUrgency === UrgencyLevel.HIGH) {
      return intentUrgency;
    }

    // Default based on reason
    const reasonUrgencies: Partial<Record<EscalationReason, UrgencyLevel>> = {
      SENSITIVE_TOPIC: UrgencyLevel.HIGH,
      AUTHORIZATION_REQUIRED: UrgencyLevel.MEDIUM,
      POLICY_EXCEPTION: UrgencyLevel.MEDIUM,
      SYSTEM_ERROR: UrgencyLevel.MEDIUM,
      LOW_CONFIDENCE: UrgencyLevel.LOW,
      USER_REQUEST: UrgencyLevel.LOW,
      COMPLEX_QUERY: UrgencyLevel.LOW,
    };

    return reasonUrgencies[reason] || UrgencyLevel.MEDIUM;
  }

  /**
   * Format the escalation response message
   */
  private formatEscalationResponse(params: {
    ticketId: string;
    reason: EscalationReason;
    urgency: UrgencyLevel;
    estimatedWaitTime?: number;
    contactInfo?: string;
    availableAgents: number;
    isSafetyEscalation?: boolean;
  }): string {
    const { ticketId, reason, urgency, estimatedWaitTime, contactInfo, availableAgents, isSafetyEscalation } = params;

    const lines: string[] = [];

    // Header based on situation
    if (isSafetyEscalation) {
      lines.push(
        '🚨 **Your concern has been flagged as urgent and will receive immediate attention.**',
      );
    } else if (reason === 'USER_REQUEST') {
      lines.push('I\'m connecting you with a staff member who can help you further.');
    } else if (reason === 'LOW_CONFIDENCE') {
      lines.push(
        'I want to make sure you get the most accurate information, so I\'m connecting you with someone who can help.',
      );
    } else {
      lines.push('I\'m transferring your request to the appropriate person for assistance.');
    }

    lines.push('');

    // Ticket reference
    lines.push(`**Reference Number:** ${ticketId}`);

    // Wait time estimate
    if (estimatedWaitTime !== undefined) {
      if (urgency === UrgencyLevel.CRITICAL) {
        lines.push('**Priority:** Urgent - Someone will respond as soon as possible');
      } else if (estimatedWaitTime < 60) {
        lines.push(`**Estimated Wait:** Less than 1 minute`);
      } else if (estimatedWaitTime < 3600) {
        const minutes = Math.ceil(estimatedWaitTime / 60);
        lines.push(`**Estimated Wait:** About ${minutes} minutes`);
      } else {
        const hours = Math.ceil(estimatedWaitTime / 3600);
        lines.push(`**Estimated Response:** Within ${hours} hour${hours > 1 ? 's' : ''}`);
      }
    }

    // Agent availability
    if (availableAgents > 0) {
      lines.push(`\nA staff member is available to assist you.`);
    }

    // Contact info for urgent matters
    if (contactInfo && (urgency === UrgencyLevel.CRITICAL || urgency === UrgencyLevel.HIGH)) {
      lines.push(`\n**For immediate assistance:** ${contactInfo}`);
    }

    // Follow-up info
    lines.push(
      '\nYou can continue chatting here, and a staff member will join the conversation to help you.',
    );

    return lines.join('\n');
  }

  /**
   * Get suggested actions based on escalation reason
   */
  private getSuggestedActions(
    reason: EscalationReason,
    urgency: UrgencyLevel,
  ): string[] {
    const actions: string[] = [];

    if (urgency === UrgencyLevel.CRITICAL) {
      actions.push('Monitor for urgent response');
      actions.push('Check main office contact if needed');
    }

    switch (reason) {
      case 'AUTHORIZATION_REQUIRED':
        actions.push('Prepare relevant documentation');
        break;
      case 'POLICY_EXCEPTION':
        actions.push('Review the specific policy in question');
        break;
      case 'COMPLEX_QUERY':
        actions.push('Provide additional details if available');
        break;
      default:
        actions.push('Wait for staff response');
    }

    return actions;
  }

  /**
   * Fallback message when escalation system fails
   */
  private getEscalationFallbackMessage(reason: EscalationReason, districtId: string): string {
    const isUrgent =
      reason === 'EMERGENCY' || reason === 'SAFETY_CONCERN' || reason === 'SENSITIVE_TOPIC';

    if (isUrgent) {
      return (
        '**Important:** I\'m having trouble creating your support request, but your concern is important.\n\n' +
        'Please contact the main office directly:\n' +
        '- **Phone:** Call your school\'s main office\n' +
        '- **Email:** Contact school administration\n' +
        '- **In Person:** Visit the main office\n\n' +
        'If this is an emergency, please call 911 immediately.'
      );
    }

    return (
      'I\'m currently unable to connect you with a staff member through this system.\n\n' +
      'Please try:\n' +
      '- Visiting the school\'s main website for contact information\n' +
      '- Calling the main office during business hours\n' +
      '- Sending an email to your school\'s help desk\n\n' +
      'I apologize for the inconvenience.'
    );
  }
}
