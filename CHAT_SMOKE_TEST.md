# Chat E2E Smoke Test - Phase 0 Lock

## Purpose

This test **locks Phase 0 as "done"** by providing end-to-end validation that the entire chat pipeline functions correctly without requiring real AI API keys.

## What It Tests

### 1. Full HTTP Request/Response Cycle
- ✅ POST `/api/v1/chat/message` with authentication
- ✅ GET `/api/v1/chat/conversations` listing
- ✅ GET `/api/v1/chat/conversations/:id` retrieval
- ✅ Conversation continuation (multi-turn chat)

### 2. Authentication & Authorization
- ✅ JWT token authentication
- ✅ Rejection of unauthenticated requests
- ✅ Rejection of invalid tokens
- ✅ User context propagation to conversation service

### 3. Schema Compliance (CRITICAL)
- ✅ **ClassifiedIntent** contract validation
  - Fields: `category`, `confidence`, `urgency`, `requiresTools`
  - Types: string, number (0-1), enum, boolean
  - Stub values: `category='general'`, `confidence=0.5`, `urgency='low'`

- ✅ **ToolResult** contract validation
  - Fields: `success`, `content`, `citations`
  - Types: boolean, string, array
  - Citations: `[{ sourceId, title, excerpt? }]`

- ✅ **GeneratedResponse** contract validation
  - Fields: `content`, `citations`
  - Types: string, array
  - Content: non-empty string

### 4. Database Persistence
- ✅ Conversations stored with correct user/district association
- ✅ Messages persisted with role (USER/ASSISTANT)
- ✅ Intent metadata stored as JSON
- ✅ Conversation retrieval returns full message history

### 5. Input Validation
- ✅ Rejects empty messages
- ✅ Rejects messages exceeding 4000 characters
- ✅ Validates required fields

## How to Run

### Prerequisites
```bash
# Ensure PostgreSQL is running
docker-compose up -d postgres

# Ensure database is migrated
cd packages/database
npx prisma migrate deploy
```

### Run the Test
```bash
# From repository root
npm test -- chat.e2e-spec.ts

# Or from apps/api
cd apps/api
npm run test:e2e -- chat.e2e-spec.ts

# Run with coverage
npm run test:e2e -- chat.e2e-spec.ts --coverage

# Run in watch mode during development
npm run test:e2e -- chat.e2e-spec.ts --watch
```

### Expected Output
```
Chat E2E Smoke Test (Phase 0 Lock)
  🔥 CRITICAL: Chat Pipeline End-to-End
    ✓ should create a new conversation and send first message (STUB MODE) (XXXms)
    ✓ should continue conversation with existing conversationId (XXXms)
    ✓ should retrieve conversation by ID (XXXms)
    ✓ should list all conversations for authenticated user (XXXms)
  🛡️ CRITICAL: Schema Compliance
    ✓ should FAIL LOUDLY if ClassifiedIntent schema changes (XXXms)
    ✓ should FAIL LOUDLY if ToolResult schema changes (XXXms)
    ✓ should FAIL LOUDLY if GeneratedResponse schema changes (XXXms)
  🔒 CRITICAL: Authorization & Security
    ✓ should reject requests without authentication (XXXms)
    ✓ should reject requests with invalid token (XXXms)
    ✓ should reject empty messages (XXXms)
    ✓ should reject messages exceeding max length (XXXms)
  📊 CRITICAL: Database Persistence
    ✓ should persist conversation in database (XXXms)
    ✓ should persist intent metadata in message (XXXms)

Test Suites: 1 passed, 1 total
Tests:       13 passed, 13 total
```

## What It Guarantees

### ✅ Contract Stability
If this test passes, you can be confident that:
- **Intent classification interface** (`ClassifiedIntent`) has not changed
- **Tool routing interface** (`ToolResult`) has not changed
- **Response generation interface** (`GeneratedResponse`) has not changed

Any breaking changes to these contracts will **fail loudly** with clear error messages.

### ✅ Stub Mode Works
The test validates that the entire chat pipeline functions correctly **without real AI API keys**, using the stub implementations:
- `StubIntentClassifier` returns deterministic intent
- `StubToolRouter` returns empty tool selection
- `StubResponseGenerator` returns "AI Limited Mode" message
- `StubSafetyGuardrails` passes all checks

### ✅ Database Integration
Conversations, messages, and metadata are correctly persisted and retrievable from PostgreSQL.

### ✅ Authentication Flow
JWT authentication, token validation, and user context extraction work end-to-end.

### ✅ HTTP Layer
NestJS controllers, DTOs, validation pipes, and API versioning are correctly configured.

## When It Fails

### Intent Classification Breaks
```
Error: expect(received).toHaveProperty(expected)
Expected property: "category"
Received object: {"intent": "unknown"}
```
**Action**: Check if `ClassifiedIntent` interface changed in `packages/ai/src/types.ts`

### Tool Result Breaks
```
Error: expect(received).toHaveProperty(expected)
Expected property: "citations"
Received object: {"success": true, "data": "..."}
```
**Action**: Check if `ToolResult` interface changed or if stub implementation is incorrect

### Response Format Changes
```
Error: Property 'content' of type 'string' expected
Received: undefined
```
**Action**: Check if `GeneratedResponse` interface changed in response generator

### Database Schema Changes
```
Error: Invalid `prisma.conversation.findUnique()` invocation
Unknown field: userId
```
**Action**: Run `prisma migrate dev` to update database schema

### Authentication Breaks
```
Error: expected 201 "Created", got 401 "Unauthorized"
```
**Action**: Check JWT configuration, guards, or token generation logic

## Test Maintenance

### When to Update This Test
- ✅ When adding new **required** fields to `ClassifiedIntent`, `ToolResult`, or `GeneratedResponse`
- ✅ When changing database schema (update queries and expectations)
- ✅ When changing authentication mechanism
- ✅ When adding new validation rules to message input

### When NOT to Update This Test
- ❌ When adding optional/metadata fields (test should still pass)
- ❌ When changing stub response messages (only validate structure, not content)
- ❌ When adding new endpoints (this tests core pipeline only)
- ❌ When changing AI model parameters (doesn't affect contract)

## Integration with CI/CD

### GitHub Actions Example
```yaml
name: Phase 0 Lock - Chat Smoke Test
on: [push, pull_request]

jobs:
  smoke-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run database migrations
        run: |
          cd packages/database
          npx prisma migrate deploy
      
      - name: Run chat smoke test
        run: npm test -- chat.e2e-spec.ts
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/schoolos_test
          JWT_PRIVATE_KEY: ${{ secrets.TEST_JWT_PRIVATE_KEY }}
          JWT_PUBLIC_KEY: ${{ secrets.TEST_JWT_PUBLIC_KEY }}
```

## Troubleshooting

### Test Times Out
- Check PostgreSQL connection: `psql $DATABASE_URL`
- Ensure database is migrated: `npx prisma migrate status`
- Increase Jest timeout: `jest.setTimeout(30000)`

### Database Conflicts
- Ensure test uses unique slugs/emails (includes timestamp)
- Check cleanup in `afterAll` runs correctly
- Reset test database: `npx prisma migrate reset --skip-seed`

### Token Issues
- Verify JWT keys in `.env` are valid
- Check token expiry settings
- Ensure `JwtAuthGuard` is properly configured

## Related Files

- **Test File**: [`apps/api/test/chat.e2e-spec.ts`](../apps/api/test/chat.e2e-spec.ts)
- **Stub Implementations**: [`apps/api/src/chat/conversation.service.ts`](../apps/api/src/chat/conversation.service.ts)
- **Type Definitions**: [`packages/ai/src/types.ts`](../packages/ai/src/types.ts)
- **Chat DTOs**: [`apps/api/src/chat/dto/index.ts`](../apps/api/src/chat/dto/index.ts)
- **Auth Setup**: [`apps/api/test/auth.e2e-spec.ts`](../apps/api/test/auth.e2e-spec.ts)

## Phase 0 Completion Checklist

- [x] Stub implementations work without API keys
- [x] All contracts validated with tests
- [x] Database integration verified
- [x] Authentication flow tested
- [x] End-to-end smoke test passes
- [x] **Phase 0 is LOCKED** ✅

---

**Status**: ✅ Phase 0 Complete  
**Last Updated**: January 19, 2026  
**Test Coverage**: 13 critical tests, 100% contract validation
