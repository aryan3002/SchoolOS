/**
 * API Contract Test
 * 
 * Verifies the mobile API client works with backend endpoints
 */

import { apiGet, apiPost, API_BASE } from '../lib/api';
import { useAppStore } from '../store/appStore';

// Mock token for testing
const TEST_TOKEN = 'test-jwt-token';

describe('API Contract', () => {
  beforeEach(() => {
    // Clear any existing token
    useAppStore.setState({ token: null, isAuthenticated: false });
  });

  describe('API Base URL', () => {
    it('should use /api/v1 path', () => {
      expect(API_BASE).toContain('/api/v1');
    });

    it('should construct correct endpoint URLs', () => {
      const chatEndpoint = '/chat/message';
      const expectedUrl = `${API_BASE}${chatEndpoint}`;
      
      expect(expectedUrl).toContain('/api/v1/chat/message');
    });
  });

  describe('Authentication Headers', () => {
    it('should inject Authorization header when token exists', async () => {
      // Set token in store
      useAppStore.setState({ token: TEST_TOKEN, isAuthenticated: true });

      // Mock fetch to capture request
      const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
        headers: new Headers(),
      } as Response);

      await apiGet('/test-endpoint');

      // Verify Authorization header was included
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${TEST_TOKEN}`,
          }),
        })
      );

      mockFetch.mockRestore();
    });

    it('should not inject Authorization header when skipAuth is true', async () => {
      useAppStore.setState({ token: TEST_TOKEN, isAuthenticated: true });

      const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
        headers: new Headers(),
      } as Response);

      await apiPost('/auth/login', { email: 'test@test.com' }, { skipAuth: true });

      // Verify Authorization header was NOT included
      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs?.headers).not.toHaveProperty('Authorization');

      mockFetch.mockRestore();
    });
  });

  describe('401 Handling', () => {
    it('should logout on 401 response', async () => {
      useAppStore.setState({ 
        token: TEST_TOKEN, 
        isAuthenticated: true,
        user: { id: 'test-user', email: 'test@test.com' } as any,
      });

      // Mock 401 response
      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ message: 'Unauthorized' }),
        headers: new Headers(),
      } as Response);

      // Attempt API call
      try {
        await apiGet('/protected-endpoint');
      } catch (error) {
        // Expected to throw
      }

      // Verify logout was called
      const state = useAppStore.getState();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
    });
  });

  describe('Chat API Endpoints', () => {
    it('should construct correct chat message endpoint', () => {
      const endpoint = '/chat/message';
      const fullUrl = `${API_BASE}${endpoint}`;
      
      expect(fullUrl).toContain('/api/v1/chat/message');
    });

    it('should construct correct conversations list endpoint', () => {
      const endpoint = '/chat/conversations';
      const fullUrl = `${API_BASE}${endpoint}`;
      
      expect(fullUrl).toContain('/api/v1/chat/conversations');
    });

    it('should handle query parameters correctly', () => {
      const endpoint = '/chat/conversations?childId=123';
      const fullUrl = `${API_BASE}${endpoint}`;
      
      expect(fullUrl).toContain('/api/v1/chat/conversations?childId=123');
    });
  });

  describe('Request Methods', () => {
    beforeEach(() => {
      useAppStore.setState({ token: TEST_TOKEN, isAuthenticated: true });
    });

    it('should make GET requests', async () => {
      const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      await apiGet('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({ method: 'GET' })
      );

      mockFetch.mockRestore();
    });

    it('should make POST requests with body', async () => {
      const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      const testData = { message: 'Hello' };
      await apiPost('/test', testData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(testData),
        })
      );

      mockFetch.mockRestore();
    });
  });
});
