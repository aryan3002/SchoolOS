/**
 * Conversation Service - No API Key Test
 *
 * Tests that the chat pipeline works safely when no LLM API keys are configured.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ConversationService } from './conversation.service';
import { PrismaService } from '../database/prisma.service';
import { HybridSearchService } from '../knowledge/search/hybrid-search.service';
import { UserContext } from '@schoolos/ai';

describe('ConversationService (No API Key)', () => {
  let service: ConversationService;
  let prismaService: PrismaService;
  let configService: ConfigService;

  beforeEach(async () => {
    const mockPrismaService = {
      conversation: {
        create: jest.fn().mockResolvedValue({
          id: 'test-conv-id',
          userId: 'user-123',
          districtId: 'district-123',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({
          id: 'test-conv-id',
          userId: 'user-123',
          districtId: 'district-123',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      },
      message: {
        create: jest.fn().mockResolvedValue({
          id: 'msg-123',
          conversationId: 'test-conv-id',
          role: 'user',
          content: 'Hello',
          metadata: {},
          createdAt: new Date(),
        }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'OPENAI_API_KEY') {
          return undefined; // Simulate no API key
        }
        return undefined;
      }),
    };

    const mockHybridSearchService = {
      search: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: HybridSearchService, useValue: mockHybridSearchService },
      ],
    }).compile();

    service = module.get<ConversationService>(ConversationService);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);

    // Initialize the service
    await service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize with stub components when no API key is present', () => {
    // Verify that the configService was called
    expect(configService.get).toHaveBeenCalledWith('OPENAI_API_KEY');
  });

  it('should handle chat request without API key and return valid response', async () => {
    const userContext: UserContext = {
      userId: 'user-123',
      districtId: 'district-123',
      role: 'parent',
      email: 'parent@example.com',
      displayName: 'Test Parent',
      childIds: ['student-1'],
      schoolIds: ['school-1'],
    };

    const result = await service.sendMessage({
      message: 'What is the lunch menu today?',
      userContext,
    });

    // Verify response structure
    expect(result).toBeDefined();
    expect(result.conversationId).toBe('test-conv-id');
    expect(result.messageId).toBeDefined();
    expect(result.response).toBeDefined();
    expect(typeof result.response).toBe('string');
    
    // Verify it indicates limited mode
    expect(result.response).toContain('Limited Mode');
    
    // Verify citations array exists (can be empty)
    expect(Array.isArray(result.citations)).toBe(true);
    
    // Verify suggested follow-ups exist
    expect(Array.isArray(result.suggestedFollowUps)).toBe(true);
    expect(result.suggestedFollowUps.length).toBeGreaterThan(0);
    
    // Verify metadata
    expect(result.metadata).toBeDefined();
    expect(result.metadata.intentCategory).toBeDefined();
    expect(result.metadata.confidence).toBeDefined();
    expect(Array.isArray(result.metadata.toolsUsed)).toBe(true);
    expect(result.metadata.processingTimeMs).toBeGreaterThanOrEqual(0);
    
    // Verify no errors were thrown
    expect(result.requiresFollowUp).toBeDefined();
  });

  it('should not crash on multiple requests without API key', async () => {
    const userContext: UserContext = {
      userId: 'user-123',
      districtId: 'district-123',
      role: 'parent',
      email: 'parent@example.com',
      displayName: 'Test Parent',
      childIds: ['student-1'],
      schoolIds: ['school-1'],
    };

    // Make multiple requests
    const promises = [
      service.sendMessage({ message: 'Question 1', userContext }),
      service.sendMessage({ message: 'Question 2', userContext }),
      service.sendMessage({ message: 'Question 3', userContext }),
    ];

    const results = await Promise.all(promises);

    // All requests should succeed
    expect(results).toHaveLength(3);
    results.forEach((result) => {
      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
      expect(result.response).toContain('Limited Mode');
    });
  });

  it('should return valid ToolResult structure in stub mode', async () => {
    const userContext: UserContext = {
      userId: 'user-123',
      districtId: 'district-123',
      role: 'parent',
      email: 'parent@example.com',
      displayName: 'Test Parent',
      childIds: ['student-1'],
      schoolIds: ['school-1'],
    };

    const result = await service.sendMessage({
      message: 'What time does school start?',
      userContext,
    });

    // Verify the response indicates tools would normally be used
    expect(result.metadata.toolsUsed).toBeDefined();
    
    // In stub mode, no tools should be used
    expect(result.metadata.toolsUsed.length).toBe(0);
  });

  it('should handle safety checks in stub mode', async () => {
    const userContext: UserContext = {
      userId: 'user-123',
      districtId: 'district-123',
      role: 'parent',
      email: 'parent@example.com',
      displayName: 'Test Parent',
      childIds: ['student-1'],
      schoolIds: ['school-1'],
    };

    // Send a message that might trigger safety checks
    const result = await service.sendMessage({
      message: 'Tell me about student John Doe',
      userContext,
    });

    // Should not crash and should return a response
    expect(result).toBeDefined();
    expect(result.response).toBeDefined();
  });
});
