# API Contract Standardization

## Overview
Standardized API paths and authentication between backend and mobile apps.

## API Base Path

### Backend Configuration
- **Base URL**: `/api/v1`
- **Implementation**: NestJS URI versioning with `defaultVersion: '1'` and `prefix: 'api/v'`
- **All endpoints**: Automatically prefixed with `/api/v1`

Example endpoints:
- `POST /api/v1/chat/message` - Send chat message
- `GET /api/v1/chat/conversations` - List conversations
- `GET /api/v1/students/children` - Get user's children
- `GET /api/v1/calendar/events` - Get calendar events

### Mobile Configuration
- **Base URL**: `${EXPO_PUBLIC_API_URL}/api/v1`
- **Default**: `http://localhost:3001/api/v1`
- **Implementation**: Centralized API client in `src/lib/api.ts`

## Authentication

### Backend Requirements
- **Protected Endpoints**: All endpoints except health check require JWT authentication
- **Header**: `Authorization: Bearer <token>`
- **Guard**: `JwtAuthGuard` enforces authentication
- **User Context**: Extracted from JWT and passed to services

### Mobile Implementation

**API Client** (`src/lib/api.ts`):
```typescript
// Automatic auth header injection
const token = useAppStore.getState().token;
requestHeaders['Authorization'] = `Bearer ${token}`;

// 401 handling - triggers logout
if (response.status === 401) {
  useAppStore.getState().logout();
  throw new ApiError('Session expired. Please log in again.', 401);
}
```

**API Methods**:
- `apiGet<T>(endpoint, options?)` - GET with auth
- `apiPost<T>(endpoint, data?, options?)` - POST with auth
- `apiPut<T>(endpoint, data?, options?)` - PUT with auth
- `apiPatch<T>(endpoint, data?, options?)` - PATCH with auth
- `apiDelete<T>(endpoint, options?)` - DELETE with auth

**Skip Auth** (for login/public endpoints):
```typescript
apiPost('/auth/login', credentials, { skipAuth: true });
```

## Chat API Contract

### Send Message
**Endpoint**: `POST /api/v1/chat/message`

**Request**:
```typescript
{
  message: string;
  conversationId?: string;  // Optional - creates new if omitted
  metadata?: Record<string, unknown>;
}
```

**Response**:
```typescript
{
  conversationId: string;
  messageId: string;
  response: string;
  citations: Array<{
    sourceId: string;
    sourceTitle: string;
    quote?: string;
  }>;
  suggestedFollowUps: string[];
  requiresFollowUp: boolean;
  metadata: {
    intentCategory: string;
    confidence: number;
    toolsUsed: string[];
    processingTimeMs: number;
  };
}
```

### Mobile Usage
```typescript
import { useSendMessage } from '../hooks/useConversation';

const sendMessage = useSendMessage();

await sendMessage.mutateAsync({
  content: 'What is the lunch menu?',
  childId: selectedChildId,
});
```

**Features**:
- ✅ Auto auth header injection
- ✅ 401 auto-logout
- ✅ Type-safe requests/responses
- ✅ React Query integration
- ✅ Error handling

## Updated Hooks

All mobile API hooks now use the centralized API client:

1. **useConversation** - Chat interactions
   - `useSendMessage()` - Send messages
   - `useConversations()` - List conversations
   - `useStreamingMessage()` - Streaming responses

2. **useChildren** - Student data
   - `useChildren()` - List children
   - `useGrades(childId)` - Get grades
   - `useAssignments(childId)` - Get assignments
   - `useAttendance(childId)` - Get attendance

3. **useCalendar** - Events
   - `useCalendarEvents(filters)` - List events
   - `useUpcomingEvents(childId)` - Upcoming events

4. **useActions** - Action items
   - `useActions(filters)` - List actions
   - `useCompleteAction()` - Complete action
   - `useDismissAction()` - Dismiss action

## Error Handling

### API Client Errors
```typescript
try {
  const data = await apiGet('/some/endpoint');
} catch (error) {
  if (error instanceof ApiError) {
    console.log(error.status);  // 401, 404, 500, etc.
    console.log(error.message); // Error message
    console.log(error.data);    // Server response data
  }
}
```

### Automatic 401 Handling
When a 401 response is received:
1. User is logged out automatically
2. Token is cleared from storage
3. Error is thrown with "Session expired" message
4. App can redirect to login screen

## Streaming Support

For streaming endpoints, the API client provides direct fetch access with auth:

```typescript
const { useAppStore } = await import('../store/appStore');
const token = useAppStore.getState().token;
const { API_BASE } = await import('../lib/api');

const response = await fetch(`${API_BASE}/chat/message/stream`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  },
  body: JSON.stringify(input),
});
```

## Testing

### Backend
```bash
cd apps/api
npm test -- conversation.service.no-api-key.spec.ts
```

### Mobile
```bash
cd apps/mobile
npm run typecheck
```

### Full Build
```bash
npm run build
```

## Migration Checklist

✅ Backend uses `/api/v1` consistently  
✅ Mobile uses `/api/v1` base path  
✅ Mobile injects `Authorization: Bearer <token>` on all protected calls  
✅ Mobile handles 401 with logout  
✅ Chat API works end-to-end  
✅ All API hooks updated  
✅ Full monorepo build passes  

## Environment Variables

### Backend (.env)
```bash
# No changes needed - already configured
```

### Mobile (.env)
```bash
EXPO_PUBLIC_API_URL=http://localhost:3001
# For production: https://api.schoolos.com
```

## Next Steps for Mobile Development

1. **Implement Login Flow**: Use `apiPost('/auth/login', ...)` with `skipAuth: true`
2. **Store Token**: Save JWT to `useAppStore.getState().setToken(token)`
3. **Test Chat**: Use `useSendMessage()` hook in chat screen
4. **Handle Logout**: App will auto-logout on 401, redirect to login
