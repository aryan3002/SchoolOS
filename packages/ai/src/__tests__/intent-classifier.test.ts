/**
 * Intent Classifier Tests
 *
 * Unit tests for the intent classification system.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IntentClassifier, IntentCategory, UrgencyLevel, UserContext } from '@schoolos/ai';

// Mock Anthropic client
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn(),
    },
  })),
}));

describe('IntentClassifier', () => {
  let classifier: IntentClassifier;
  let mockCreate: ReturnType<typeof vi.fn>;

  const mockUserContext: UserContext = {
    userId: 'user-123',
    districtId: 'district-456',
    role: 'PARENT',
    childIds: ['student-789'],
  };

  beforeEach(() => {
    classifier = new IntentClassifier({
      anthropicApiKey: 'test-api-key',
      model: 'claude-sonnet-4-20250514',
    });

    // Access the mock
    const Anthropic = require('@anthropic-ai/sdk').default;
    mockCreate = Anthropic.mock.results[0].value.messages.create;
  });

  describe('classify', () => {
    it('should classify calendar queries correctly', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              category: 'CALENDAR_QUERY',
              confidence: 0.92,
              urgencyLevel: 'LOW',
              entities: {
                dateReferences: ['next week'],
                eventTypes: ['general'],
              },
              reasoning: 'User asking about upcoming events',
              shouldEscalate: false,
            }),
          },
        ],
      });

      const result = await classifier.classify(
        'What events are happening next week?',
        mockUserContext,
      );

      expect(result.category).toBe(IntentCategory.CALENDAR_QUERY);
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.urgencyLevel).toBe(UrgencyLevel.LOW);
    });

    it('should classify policy questions correctly', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              category: 'POLICY_QUESTION',
              confidence: 0.88,
              urgencyLevel: 'LOW',
              entities: {
                policyTopics: ['attendance', 'tardiness'],
              },
              reasoning: 'User asking about school policy',
              shouldEscalate: false,
            }),
          },
        ],
      });

      const result = await classifier.classify(
        'What is the school policy on tardiness?',
        mockUserContext,
      );

      expect(result.category).toBe(IntentCategory.POLICY_QUESTION);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should detect emergency intents and set high urgency', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              category: 'EMERGENCY',
              confidence: 0.95,
              urgencyLevel: 'CRITICAL',
              entities: {},
              reasoning: 'Emergency situation detected',
              shouldEscalate: true,
              escalationReason: 'EMERGENCY',
            }),
          },
        ],
      });

      const result = await classifier.classify(
        'There is an emergency at the school!',
        mockUserContext,
      );

      expect(result.category).toBe(IntentCategory.EMERGENCY);
      expect(result.urgencyLevel).toBe(UrgencyLevel.CRITICAL);
      expect(result.shouldEscalate).toBe(true);
    });

    it('should flag low confidence results for escalation', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              category: 'GENERAL',
              confidence: 0.25,
              urgencyLevel: 'LOW',
              entities: {},
              reasoning: 'Unclear intent',
              shouldEscalate: true,
              escalationReason: 'LOW_CONFIDENCE',
            }),
          },
        ],
      });

      const result = await classifier.classify(
        'xyzzy foobar gibberish',
        mockUserContext,
      );

      expect(result.confidence).toBeLessThan(0.5);
      expect(result.shouldEscalate).toBe(true);
    });

    it('should extract student entities from queries', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              category: 'STUDENT_SPECIFIC',
              confidence: 0.9,
              urgencyLevel: 'LOW',
              entities: {
                studentId: 'student-789',
                subjects: ['math'],
              },
              reasoning: 'Parent asking about child grades',
              shouldEscalate: false,
            }),
          },
        ],
      });

      const result = await classifier.classify(
        "How is my son doing in math class?",
        mockUserContext,
      );

      expect(result.category).toBe(IntentCategory.STUDENT_SPECIFIC);
      expect(result.entities.subjects).toContain('math');
    });

    it('should handle API errors gracefully', async () => {
      mockCreate.mockRejectedValueOnce(new Error('API Error'));

      const result = await classifier.classify('Hello', mockUserContext);

      // Should return a fallback classification
      expect(result.category).toBe(IntentCategory.GENERAL);
      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe('getToolMapping', () => {
    it('should return correct tools for calendar queries', () => {
      const tools = IntentClassifier.getToolMapping(IntentCategory.CALENDAR_QUERY);
      expect(tools).toContain('calendar_query');
    });

    it('should return correct tools for policy questions', () => {
      const tools = IntentClassifier.getToolMapping(IntentCategory.POLICY_QUESTION);
      expect(tools).toContain('knowledge_retrieval');
    });

    it('should return correct tools for student-specific queries', () => {
      const tools = IntentClassifier.getToolMapping(IntentCategory.STUDENT_SPECIFIC);
      expect(tools).toContain('student_data_fetch');
    });

    it('should return escalation for human agent requests', () => {
      const tools = IntentClassifier.getToolMapping(IntentCategory.HUMAN_AGENT_REQUEST);
      expect(tools).toContain('escalation');
    });
  });
});
