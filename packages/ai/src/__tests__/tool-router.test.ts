/**
 * Tool Router Tests
 *
 * Unit tests for the tool routing system.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ToolRouter,
  ToolRegistry,
  BaseTool,
  ToolDefinition,
  ToolParams,
  ToolResult,
  IntentCategory,
  UrgencyLevel,
  Permission,
  UserContext,
  ClassifiedIntent,
  EscalationReason,
} from '@schoolos/ai';

// Mock OpenAI client
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  })),
}));

// Create mock tools for testing
class MockKnowledgeTool extends BaseTool {
  readonly definition: ToolDefinition = {
    name: 'knowledge_retrieval',
    description: 'Search knowledge base',
    requiredPermissions: [],
    handlesIntents: [IntentCategory.POLICY_QUESTION, IntentCategory.GENERAL],
    requiresStudentContext: false,
    timeoutMs: 5000,
  };

  protected async executeImpl(
    params: ToolParams,
  ): Promise<Omit<ToolResult, 'toolName' | 'executionTimeMs'>> {
    return {
      success: true,
      content: 'Knowledge base results...',
      confidence: 0.9,
    };
  }
}

class MockCalendarTool extends BaseTool {
  readonly definition: ToolDefinition = {
    name: 'calendar_query',
    description: 'Query calendar events',
    requiredPermissions: [],
    handlesIntents: [IntentCategory.CALENDAR_QUERY],
    requiresStudentContext: false,
    timeoutMs: 5000,
  };

  protected async executeImpl(
    params: ToolParams,
  ): Promise<Omit<ToolResult, 'toolName' | 'executionTimeMs'>> {
    return {
      success: true,
      content: 'Calendar events...',
      confidence: 0.95,
    };
  }
}

class MockEscalationTool extends BaseTool {
  readonly definition: ToolDefinition = {
    name: 'escalation',
    description: 'Escalate to human',
    requiredPermissions: [],
    handlesIntents: [IntentCategory.EMERGENCY, IntentCategory.HUMAN_AGENT_REQUEST],
    requiresStudentContext: false,
    timeoutMs: 5000,
  };

  protected async executeImpl(
    params: ToolParams,
  ): Promise<Omit<ToolResult, 'toolName' | 'executionTimeMs'>> {
    return {
      success: true,
      content: 'Escalation created',
      confidence: 0.9,
      requiresFollowUp: true,
    };
  }
}

describe('ToolRouter', () => {
  let router: ToolRouter;
  let registry: ToolRegistry;
  let mockCreate: ReturnType<typeof vi.fn>;

  const mockUserContext: UserContext = {
    userId: 'user-123',
    districtId: 'district-456',
    role: 'PARENT',
    childIds: ['student-789'],
  };

  const createMockIntent = (
    category: IntentCategory,
    options: Partial<ClassifiedIntent> = {},
  ): ClassifiedIntent => ({
    category,
    confidence: 0.9,
    urgencyLevel: UrgencyLevel.LOW,
    entities: {},
    originalQuery: 'test query',
    shouldEscalate: false,
    ...options,
  });

  beforeEach(() => {
    registry = new ToolRegistry();
    registry.register(new MockKnowledgeTool());
    registry.register(new MockCalendarTool());
    registry.register(new MockEscalationTool());

    router = new ToolRouter(registry, {
      openaiApiKey: 'test-api-key',
    });

    const OpenAI = require('openai').default;
    mockCreate = OpenAI.mock.results[0].value.chat.completions.create;
  });

  describe('route', () => {
    it('should route calendar queries to calendar tool', async () => {
      const intent = createMockIntent(IntentCategory.CALENDAR_QUERY);

      const result = await router.route(intent, mockUserContext);

      expect(result.selectedTools).toHaveLength(1);
      expect(result.selectedTools[0].toolName).toBe('calendar_query');
      expect(result.requiresEscalation).toBe(false);
    });

    it('should route policy questions to knowledge tool', async () => {
      const intent = createMockIntent(IntentCategory.POLICY_QUESTION);

      const result = await router.route(intent, mockUserContext);

      expect(result.selectedTools[0].toolName).toBe('knowledge_retrieval');
    });

    it('should automatically escalate emergency intents', async () => {
      const intent = createMockIntent(IntentCategory.EMERGENCY, {
        urgencyLevel: UrgencyLevel.CRITICAL,
      });

      const result = await router.route(intent, mockUserContext);

      expect(result.requiresEscalation).toBe(true);
      expect(result.escalationReason).toBe(EscalationReason.EMERGENCY);
    });

    it('should escalate human agent requests', async () => {
      const intent = createMockIntent(IntentCategory.HUMAN_AGENT_REQUEST);

      const result = await router.route(intent, mockUserContext);

      expect(result.requiresEscalation).toBe(true);
      expect(result.escalationReason).toBe(EscalationReason.USER_REQUEST);
    });

    it('should escalate low confidence intents', async () => {
      const intent = createMockIntent(IntentCategory.GENERAL, {
        confidence: 0.2,
      });

      const result = await router.route(intent, mockUserContext);

      expect(result.requiresEscalation).toBe(true);
      expect(result.escalationReason).toBe(EscalationReason.LOW_CONFIDENCE);
    });

    it('should use LLM for complex routing decisions', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              selectedTools: [
                { toolName: 'knowledge_retrieval', reasoning: 'test', priority: 1 },
              ],
              overallReasoning: 'Selected knowledge tool',
              shouldEscalate: false,
            }),
          },
        ],
      });

      // Register another tool to make routing complex
      registry.register(
        new (class extends BaseTool {
          readonly definition: ToolDefinition = {
            name: 'another_tool',
            description: 'Another tool',
            requiredPermissions: [],
            handlesIntents: [IntentCategory.GENERAL],
            requiresStudentContext: false,
            timeoutMs: 5000,
          };
          protected async executeImpl() {
            return { success: true, content: '', confidence: 0.9 };
          }
        })(),
      );

      const intent = createMockIntent(IntentCategory.GENERAL);
      const result = await router.route(intent, mockUserContext);

      expect(result.selectedTools.length).toBeGreaterThan(0);
    });
  });

  describe('execute', () => {
    it('should execute selected tools and return results', async () => {
      const routing = {
        selectedTools: [
          { toolName: 'calendar_query', reasoning: 'test', priority: 1, parameters: {} },
        ],
        reasoning: 'test',
        requiresEscalation: false,
      };

      const intent = createMockIntent(IntentCategory.CALENDAR_QUERY);
      const result = await router.execute(routing, intent, mockUserContext);

      expect(result.toolResults).toHaveLength(1);
      expect(result.toolResults[0].success).toBe(true);
      expect(result.allSuccessful).toBe(true);
    });

    it('should handle tool not found gracefully', async () => {
      const routing = {
        selectedTools: [
          { toolName: 'nonexistent_tool', reasoning: 'test', priority: 1, parameters: {} },
        ],
        reasoning: 'test',
        requiresEscalation: false,
      };

      const intent = createMockIntent(IntentCategory.GENERAL);
      const result = await router.execute(routing, intent, mockUserContext);

      expect(result.toolResults[0].success).toBe(false);
      expect(result.toolResults[0].error).toContain('not found');
    });

    it('should execute escalation when required', async () => {
      const routing = {
        selectedTools: [],
        reasoning: 'Emergency escalation',
        requiresEscalation: true,
        escalationReason: EscalationReason.EMERGENCY,
      };

      const intent = createMockIntent(IntentCategory.EMERGENCY);
      const result = await router.execute(routing, intent, mockUserContext);

      expect(result.requiresFollowUp).toBe(true);
    });

    it('should calculate combined confidence correctly', async () => {
      const routing = {
        selectedTools: [
          { toolName: 'calendar_query', reasoning: 'test', priority: 1, parameters: {} },
          { toolName: 'knowledge_retrieval', reasoning: 'test', priority: 2, parameters: {} },
        ],
        reasoning: 'test',
        requiresEscalation: false,
      };

      const intent = createMockIntent(IntentCategory.GENERAL);
      const result = await router.execute(routing, intent, mockUserContext);

      expect(result.combinedConfidence).toBeGreaterThan(0);
      expect(result.combinedConfidence).toBeLessThanOrEqual(1);
    });
  });
});

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  it('should register and retrieve tools', () => {
    const tool = new MockKnowledgeTool();
    registry.register(tool);

    const retrieved = registry.getTool('knowledge_retrieval');
    expect(retrieved).toBe(tool);
  });

  it('should get tools by intent', () => {
    registry.register(new MockKnowledgeTool());
    registry.register(new MockCalendarTool());

    const tools = registry.getToolsForIntent(IntentCategory.CALENDAR_QUERY);
    expect(tools).toHaveLength(1);
    expect(tools[0].definition.name).toBe('calendar_query');
  });

  it('should return all accessible tools for user', () => {
    registry.register(new MockKnowledgeTool());
    registry.register(new MockCalendarTool());

    const tools = registry.getAccessibleTools(mockUserContext);
    expect(tools.length).toBeGreaterThanOrEqual(2);
  });

  it('should return undefined for non-existent tool', () => {
    const tool = registry.getTool('nonexistent');
    expect(tool).toBeUndefined();
  });
});

const mockUserContext: UserContext = {
  userId: 'user-123',
  districtId: 'district-456',
  role: 'PARENT',
  childIds: ['student-789'],
};
