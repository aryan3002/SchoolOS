/**
 * Safety Guardrails Tests
 *
 * Unit tests for the safety and compliance system.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SafetyGuardrails,
  SafetyViolationType,
  UserContext,
} from '@schoolos/ai';

describe('SafetyGuardrails', () => {
  let guardrails: SafetyGuardrails;

  const mockUserContext: UserContext = {
    userId: 'user-123',
    districtId: 'district-456',
    role: 'PARENT',
    childIds: ['student-789'],
  };

  beforeEach(() => {
    guardrails = new SafetyGuardrails({
      enablePiiDetection: true,
      enableContentFilter: true,
      enableFerpaCompliance: true,
      customBlockedTerms: ['badword'],
    });
  });

  describe('PII Detection', () => {
    it('should detect SSN in text', async () => {
      const result = await guardrails.checkInput(
        'My SSN is 123-45-6789',
        mockUserContext,
      );

      expect(result.passed).toBe(false);
      expect(result.violations).toContainEqual(
        expect.objectContaining({
          type: SafetyViolationType.PII_DETECTED,
        }),
      );
    });

    it('should detect phone numbers', async () => {
      const result = await guardrails.checkInput(
        'Call me at (555) 123-4567',
        mockUserContext,
      );

      expect(result.violations.some((v) => v.type === SafetyViolationType.PII_DETECTED)).toBe(true);
    });

    it('should detect email addresses', async () => {
      const result = await guardrails.checkInput(
        'Email me at john.doe@example.com',
        mockUserContext,
      );

      expect(result.violations.some((v) => v.type === SafetyViolationType.PII_DETECTED)).toBe(true);
    });

    it('should detect credit card numbers', async () => {
      const result = await guardrails.checkInput(
        'My card is 4111-1111-1111-1111',
        mockUserContext,
      );

      expect(result.violations.some((v) => v.type === SafetyViolationType.PII_DETECTED)).toBe(true);
    });

    it('should not flag normal text', async () => {
      const result = await guardrails.checkInput(
        'What are the school hours?',
        mockUserContext,
      );

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should provide sanitized content with PII redacted', async () => {
      const result = await guardrails.checkInput(
        'My SSN is 123-45-6789',
        mockUserContext,
      );

      expect(result.sanitizedContent).toContain('[REDACTED]');
      expect(result.sanitizedContent).not.toContain('123-45-6789');
    });
  });

  describe('Content Filtering', () => {
    it('should flag harmful content', async () => {
      const result = await guardrails.checkInput(
        'How to make a bomb',
        mockUserContext,
      );

      expect(result.violations.some((v) => v.type === SafetyViolationType.HARMFUL_CONTENT)).toBe(
        true,
      );
    });

    it('should flag custom blocked terms', async () => {
      const result = await guardrails.checkInput(
        'This contains badword in it',
        mockUserContext,
      );

      expect(result.passed).toBe(false);
    });

    it('should pass appropriate content', async () => {
      const result = await guardrails.checkInput(
        'When is parent-teacher conference?',
        mockUserContext,
      );

      expect(result.passed).toBe(true);
    });
  });

  describe('FERPA Compliance', () => {
    it('should flag unauthorized student data access', async () => {
      const otherStudentContext: UserContext = {
        ...mockUserContext,
        childIds: ['different-student'],
      };

      const result = await guardrails.checkOutput(
        {
          content: "Student John's grades are: A in Math, B in English",
          citations: [],
          confidence: 0.9,
          suggestedFollowUps: [],
          requiresFollowUp: false,
          metadata: { intent: 'STUDENT_SPECIFIC', toolsUsed: [], processingTimeMs: 0 },
        },
        otherStudentContext,
        {
          category: 'STUDENT_SPECIFIC' as any,
          confidence: 0.9,
          urgencyLevel: 'LOW' as any,
          entities: { studentId: 'student-789' },
          originalQuery: 'test',
          shouldEscalate: false,
        },
      );

      expect(
        result.violations.some((v) => v.type === SafetyViolationType.UNAUTHORIZED_DATA_ACCESS),
      ).toBe(true);
    });

    it('should allow parent to access own child data', async () => {
      const result = await guardrails.checkOutput(
        {
          content: 'Your child has an A in Math',
          citations: [],
          confidence: 0.9,
          suggestedFollowUps: [],
          requiresFollowUp: false,
          metadata: { intent: 'STUDENT_SPECIFIC', toolsUsed: [], processingTimeMs: 0 },
        },
        mockUserContext,
        {
          category: 'STUDENT_SPECIFIC' as any,
          confidence: 0.9,
          urgencyLevel: 'LOW' as any,
          entities: { studentId: 'student-789' },
          originalQuery: 'test',
          shouldEscalate: false,
        },
      );

      expect(
        result.violations.some((v) => v.type === SafetyViolationType.UNAUTHORIZED_DATA_ACCESS),
      ).toBe(false);
    });

    it('should flag sensitive medical information', async () => {
      const result = await guardrails.checkOutput(
        {
          content: 'The student has a medical record showing...',
          citations: [],
          confidence: 0.9,
          suggestedFollowUps: [],
          requiresFollowUp: false,
          metadata: { intent: 'STUDENT_SPECIFIC', toolsUsed: [], processingTimeMs: 0 },
        },
        mockUserContext,
      );

      expect(result.violations.some((v) => v.description.includes('sensitive information'))).toBe(
        true,
      );
    });
  });

  describe('detectPii', () => {
    it('should return detailed PII locations', () => {
      const result = guardrails.detectPii(
        'Contact: 555-123-4567, email: test@example.com',
      );

      expect(result.hasPii).toBe(true);
      expect(result.piiTypes).toContain('PHONE_NUMBER');
      expect(result.piiTypes).toContain('EMAIL');
      expect(result.locations.length).toBeGreaterThanOrEqual(2);
    });

    it('should return empty for clean text', () => {
      const result = guardrails.detectPii('Hello, how are you today?');

      expect(result.hasPii).toBe(false);
      expect(result.piiTypes).toHaveLength(0);
      expect(result.locations).toHaveLength(0);
    });
  });

  describe('checkConversationThread', () => {
    it('should flag conversations with violations', async () => {
      const messages = [
        { id: '1', role: 'user' as const, content: 'My SSN is 123-45-6789', timestamp: new Date() },
        { id: '2', role: 'assistant' as const, content: 'I cannot process SSN information', timestamp: new Date() },
      ];

      const result = await guardrails.checkConversationThread(messages, mockUserContext);

      expect(result.needsModeration).toBe(true);
      expect(result.flaggedMessageIds).toContain('1');
    });

    it('should pass clean conversations', async () => {
      const messages = [
        { id: '1', role: 'user' as const, content: 'What are school hours?', timestamp: new Date() },
        { id: '2', role: 'assistant' as const, content: 'School hours are 8am to 3pm', timestamp: new Date() },
      ];

      const result = await guardrails.checkConversationThread(messages, mockUserContext);

      expect(result.needsModeration).toBe(false);
      expect(result.flaggedMessageIds).toHaveLength(0);
    });
  });
});
