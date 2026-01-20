/**
 * Manual Test Script - Chat Without API Key
 * 
 * Run this to verify the chat service works without API keys configured.
 * 
 * Usage:
 *   ts-node test-no-api-key.ts
 */

import { ConversationService } from './conversation.service';

async function main() {
  console.log('🧪 Testing Chat Service without API Keys\n');

  // Create mock services
  const mockPrisma = {
    conversation: {
      create: async () => ({
        id: 'test-conv-123',
        userId: 'test-user',
        districtId: 'test-district',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      findUnique: async () => null,
      update: async () => ({
        id: 'test-conv-123',
        userId: 'test-user',
        districtId: 'test-district',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    },
    message: {
      create: async (data: any) => ({
        id: `msg-${Date.now()}`,
        conversationId: data.data.conversationId,
        role: data.data.role,
        content: data.data.content,
        metadata: data.data.metadata || {},
        createdAt: new Date(),
      }),
      findMany: async () => [],
    },
  } as any;

  const mockConfig = {
    get: (key: string) => {
      if (key === 'OPENAI_API_KEY') {
        return undefined; // Simulate no API key
      }
      return undefined;
    },
  } as any;

  const mockHybridSearch = {
    search: async () => [],
  } as any;

  // Create service instance
  const service = new ConversationService(
    mockPrisma,
    mockConfig,
    mockHybridSearch,
  );

  // Initialize
  console.log('1️⃣  Initializing service...');
  await service.onModuleInit();
  console.log('✅ Service initialized with stub components\n');

  // Test a chat request
  console.log('2️⃣  Sending test message...');
  const result = await service.sendMessage({
    message: 'What is the lunch menu today?',
    userContext: {
      userId: 'test-user',
      districtId: 'test-district',
      role: 'parent',
      email: 'test@example.com',
      name: 'Test Parent',
      childrenIds: ['student-1'],
      schoolIds: ['school-1'],
    },
  });

  console.log('✅ Response received!\n');
  console.log('📝 Response Details:');
  console.log('   Conversation ID:', result.conversationId);
  console.log('   Conversation Title:', result.conversationTitle);
  console.log('   Message ID:', result.message.id);
  console.log('   Response:', result.response.content);
  console.log('   Citations:', result.response.citations.length);
  console.log('   Intent:', result.intent.category);
  console.log('   Confidence:', result.intent.confidence);

  console.log('\n✅ SUCCESS: Chat service works without API keys!');
}

main().catch(console.error);
