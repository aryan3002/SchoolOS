/**
 * Chat End-to-End Smoke Test
 * 
 * PURPOSE: Lock Phase 0 as "done" - this test guarantees the entire chat pipeline works.
 * 
 * WHAT IT TESTS:
 * - Full HTTP request/response cycle through chat endpoint
 * - Authentication and authorization
 * - Intent classification (stub mode)
 * - Tool routing (stub mode)
 * - Response generation (stub mode)
 * - Schema compliance for ClassifiedIntent, ToolResult, GeneratedResponse
 * 
 * WHAT IT GUARANTEES:
 * ✓ Chat works end-to-end without real AI API keys
 * ✓ Response matches ToolResult schema exactly
 * ✓ All contracts remain stable (breaking changes fail loudly)
 * ✓ Auth flow works correctly
 * ✓ Database integration works
 * 
 * WHEN IT FAILS:
 * - Intent classification contract breaks
 * - Tool routing contract breaks
 * - Response format changes
 * - Database schema changes break conversation storage
 * - Auth/authorization breaks
 * 
 * RUN: npm test -- chat.e2e-spec.ts
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { hashPassword } from '@schoolos/auth';
import { UserRole, UserStatus } from '@prisma/client';

describe('Chat E2E Smoke Test (Phase 0 Lock)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  // Test fixtures
  let testDistrict: any;
  let testSchool: any;
  let testParent: any;
  let testStudent: any;
  let authToken: string;

  beforeAll(async () => {
    // Force stub mode by removing the API key BEFORE loading any modules
    delete process.env.OPENAI_API_KEY;
    
    // Bootstrap the full app
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('THROTTLER:MODULE_OPTIONS')
      .useValue({ throttlers: [] }) // Disable throttling in tests
      .compile();

    app = moduleFixture.createNestApplication();
    
    // Enable API versioning (same as main.ts)
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
      prefix: 'api/v',
    });
    
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    // Create test data
    await setupTestData();
  });

  afterAll(async () => {
    // Clean up test data
    if (testParent) {
      await prismaService.user.delete({ where: { id: testParent.id } }).catch(() => {});
    }
    if (testStudent) {
      await prismaService.user.delete({ where: { id: testStudent.id } }).catch(() => {});
    }
    if (testSchool) {
      await prismaService.school.delete({ where: { id: testSchool.id } }).catch(() => {});
    }
    if (testDistrict) {
      await prismaService.district.delete({ where: { id: testDistrict.id } }).catch(() => {});
    }

    await app.close();
  });

  /**
   * Setup test data: district, school, parent, student
   */
  async function setupTestData() {
    // Create district
    testDistrict = await prismaService.district.create({
      data: {
        name: 'Test District - E2E Chat',
        slug: `test-district-chat-${Date.now()}`,
      },
    });

    // Create school
    testSchool = await prismaService.school.create({
      data: {
        name: 'Test School - E2E Chat',
        code: `TEST-CHAT-${Date.now()}`,
        type: 'elementary',
        districtId: testDistrict.id,
      },
    });

    // Create parent user
    const hashedPassword = await hashPassword('TestPassword123!');
    testParent = await prismaService.user.create({
      data: {
        email: `test-parent-chat-${Date.now()}@example.com`,
        passwordHash: hashedPassword,
        firstName: 'Test',
        lastName: 'Parent',
        role: UserRole.PARENT,
        status: UserStatus.ACTIVE,
        districtId: testDistrict.id,
        schoolId: testSchool.id,
      },
    });

    // Create student user
    testStudent = await prismaService.user.create({
      data: {
        email: `test-student-chat-${Date.now()}@example.com`,
        passwordHash: hashedPassword,
        firstName: 'Test',
        lastName: 'Student',
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
        districtId: testDistrict.id,
        schoolId: testSchool.id,
      },
    });

    // Create relationship between parent and student
    await prismaService.userRelationship.create({
      data: {
        districtId: testDistrict.id,
        userId: testParent.id,
        relatedUserId: testStudent.id,
        relationshipType: 'PARENT_OF',
        status: 'ACTIVE',
      },
    });

    // Authenticate and get token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: testParent.email,
        password: 'TestPassword123!',
        districtId: testDistrict.id,
      })
      .expect(200);

    authToken = loginResponse.body.tokens.accessToken;
  }

  describe('🔥 CRITICAL: Chat Pipeline End-to-End', () => {
    let conversationId: string;

    it('should create a new conversation and send first message (STUB MODE)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'What is the school policy on attendance?',
        });

      // Debug: print response if it's not 200
      if (response.status !== 200) {
        console.log('Response status:', response.status);
        console.log('Response body:', JSON.stringify(response.body, null, 2));
      }

      expect(response.status).toBe(200);

      // CRITICAL: Response structure validation
      expect(response.body).toHaveProperty('conversationId');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('intent');
      expect(response.body).toHaveProperty('toolResult');
      expect(response.body).toHaveProperty('response');
      expect(response.body).toHaveProperty('conversationTitle');

      conversationId = response.body.conversationId;

      // Validate conversation ID is a UUID
      expect(conversationId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );

      // CRITICAL: Validate Intent Classification Contract
      const intent = response.body.intent;
      expect(intent).toHaveProperty('category');
      expect(intent).toHaveProperty('confidence');
      expect(intent).toHaveProperty('urgency');
      expect(intent).toHaveProperty('requiresTools');
      
      // Validate stub values
      expect(intent.category).toBe('general');
      expect(intent.confidence).toBe(0.5);
      expect(intent.urgency).toBe('low');
      expect(typeof intent.requiresTools).toBe('boolean');

      // CRITICAL: Validate ToolResult Contract
      const toolResult = response.body.toolResult;
      expect(toolResult).toHaveProperty('success');
      expect(toolResult).toHaveProperty('content');
      expect(toolResult).toHaveProperty('citations');
      
      // Validate types
      expect(typeof toolResult.success).toBe('boolean');
      expect(typeof toolResult.content).toBe('string');
      expect(Array.isArray(toolResult.citations)).toBe(true);

      // Validate each citation has required fields
      toolResult.citations.forEach((citation: any) => {
        expect(citation).toHaveProperty('sourceId');
        expect(citation).toHaveProperty('title');
        expect(typeof citation.sourceId).toBe('string');
        expect(typeof citation.title).toBe('string');
      });

      // CRITICAL: Validate Response Generation Contract
      const generatedResponse = response.body.response;
      expect(generatedResponse).toHaveProperty('content');
      expect(generatedResponse).toHaveProperty('citations');
      expect(typeof generatedResponse.content).toBe('string');
      expect(Array.isArray(generatedResponse.citations)).toBe(true);

      // Validate stub mode response contains expected message
      expect(generatedResponse.content).toContain('AI Limited Mode');

      // Validate message was persisted
      expect(response.body.message).toHaveProperty('id');
      expect(response.body.message.content).toBe('What is the school policy on attendance?');
      expect(response.body.message.role).toBe('USER');
    });

    it('should continue conversation with existing conversationId', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          conversationId,
          message: 'Can you tell me more about that?',
        })
        .expect(200);

      // Should return same conversation ID
      expect(response.body.conversationId).toBe(conversationId);

      // Should still have valid intent, toolResult, response
      expect(response.body.intent).toBeDefined();
      expect(response.body.toolResult).toBeDefined();
      expect(response.body.response).toBeDefined();

      // Validate contracts still hold
      expect(response.body.toolResult).toHaveProperty('success');
      expect(response.body.toolResult).toHaveProperty('content');
      expect(response.body.toolResult).toHaveProperty('citations');
    });

    it('should retrieve conversation by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/chat/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', conversationId);
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('messages');
      expect(response.body).toHaveProperty('status');
      
      // Should have 2 user messages and 2 assistant messages
      expect(response.body.messages.length).toBeGreaterThanOrEqual(4);

      // Validate message structure
      response.body.messages.forEach((msg: any) => {
        expect(msg).toHaveProperty('id');
        expect(msg).toHaveProperty('content');
        expect(msg).toHaveProperty('role');
        expect(msg).toHaveProperty('createdAt');
        expect(['USER', 'ASSISTANT']).toContain(msg.role);
      });
    });

    it('should list all conversations for authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/chat/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('conversations');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.conversations)).toBe(true);
      expect(response.body.conversations.length).toBeGreaterThanOrEqual(1);
      expect(response.body.total).toBeGreaterThanOrEqual(1);

      // Find our test conversation
      const testConversation = response.body.conversations.find(
        (c: any) => c.id === conversationId,
      );
      expect(testConversation).toBeDefined();
    });
  });

  describe('🛡️ CRITICAL: Schema Compliance', () => {
    it('should FAIL LOUDLY if ClassifiedIntent schema changes', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Test message for schema validation',
        })
        .expect(200);

      const intent = response.body.intent;

      // CANONICAL FIELDS - must never change without updating this test
      const requiredFields = ['category', 'confidence', 'urgency', 'requiresTools'];
      requiredFields.forEach((field) => {
        expect(intent).toHaveProperty(field);
      });

      // Type validation
      expect(typeof intent.category).toBe('string');
      expect(typeof intent.confidence).toBe('number');
      expect(typeof intent.urgency).toBe('string');
      expect(typeof intent.requiresTools).toBe('boolean');

      // Value validation
      expect(intent.confidence).toBeGreaterThanOrEqual(0);
      expect(intent.confidence).toBeLessThanOrEqual(1);
      expect(['low', 'medium', 'high', 'critical']).toContain(intent.urgency);
    });

    it('should FAIL LOUDLY if ToolResult schema changes', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Test message for ToolResult validation',
        })
        .expect(200);

      const toolResult = response.body.toolResult;

      // CANONICAL FIELDS - must never change without updating this test
      const requiredFields = ['success', 'content', 'citations'];
      requiredFields.forEach((field) => {
        expect(toolResult).toHaveProperty(field);
      });

      // Type validation
      expect(typeof toolResult.success).toBe('boolean');
      expect(typeof toolResult.content).toBe('string');
      expect(Array.isArray(toolResult.citations)).toBe(true);

      // Citation structure validation
      if (toolResult.citations.length > 0) {
        toolResult.citations.forEach((citation: any) => {
          expect(citation).toHaveProperty('sourceId');
          expect(citation).toHaveProperty('title');
          expect(typeof citation.sourceId).toBe('string');
          expect(typeof citation.title).toBe('string');
          
          // Optional fields
          if (citation.excerpt !== undefined) {
            expect(typeof citation.excerpt).toBe('string');
          }
        });
      }
    });

    it('should FAIL LOUDLY if GeneratedResponse schema changes', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Test message for GeneratedResponse validation',
        })
        .expect(200);

      const generatedResponse = response.body.response;

      // CANONICAL FIELDS
      const requiredFields = ['content', 'citations'];
      requiredFields.forEach((field) => {
        expect(generatedResponse).toHaveProperty(field);
      });

      // Type validation
      expect(typeof generatedResponse.content).toBe('string');
      expect(Array.isArray(generatedResponse.citations)).toBe(true);

      // Content should not be empty
      expect(generatedResponse.content.length).toBeGreaterThan(0);
    });
  });

  describe('🔒 CRITICAL: Authorization & Security', () => {
    it('should reject requests without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/chat/message')
        .send({
          message: 'Unauthorized request',
        })
        .expect(401);
    });

    it('should reject requests with invalid token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/chat/message')
        .set('Authorization', 'Bearer invalid-token-12345')
        .send({
          message: 'Invalid token request',
        })
        .expect(401);
    });

    it('should reject empty messages', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: '',
        })
        .expect(400);
    });

    it('should reject messages exceeding max length', async () => {
      const longMessage = 'a'.repeat(4001); // Max is 4000
      await request(app.getHttpServer())
        .post('/api/v1/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: longMessage,
        })
        .expect(400);
    });
  });

  describe('📊 CRITICAL: Database Persistence', () => {
    it('should persist conversation in database', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Testing database persistence',
        })
        .expect(200);

      const conversationId = response.body.conversationId;

      // Query database directly
      const conversation = await prismaService.conversation.findUnique({
        where: { id: conversationId },
        include: { messages: true },
      });

      expect(conversation).toBeDefined();
      expect(conversation!.userId).toBe(testParent.id);
      expect(conversation!.districtId).toBe(testDistrict.id);
      expect(conversation!.messages.length).toBeGreaterThanOrEqual(2); // User + Assistant

      // Validate message persistence
      const userMessage = conversation!.messages.find((m) => m.role === 'USER');
      const assistantMessage = conversation!.messages.find((m) => m.role === 'ASSISTANT');

      expect(userMessage).toBeDefined();
      expect(userMessage!.content).toBe('Testing database persistence');

      expect(assistantMessage).toBeDefined();
      expect(assistantMessage!.content).toContain('AI Limited Mode');
    });

    it('should persist intent metadata in message', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Testing intent metadata persistence',
        })
        .expect(200);

      const messageId = response.body.message.id;

      // Query message with metadata
      const message = await prismaService.message.findUnique({
        where: { id: messageId },
      });

      expect(message).toBeDefined();
      expect(message!.metadata).toBeDefined();

      // Validate metadata structure (stored as JSON)
      const metadata = message!.metadata as any;
      expect(metadata).toHaveProperty('intent');
      expect(metadata).toHaveProperty('confidence');
    });
  });});