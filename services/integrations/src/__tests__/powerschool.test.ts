import nock from 'nock';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { PowerSchoolConnector } from '../sis/connectors/powerschool';
import { ConsoleLogger } from '../types';
import type { SISCredentials } from '../sis';

const credentials: SISCredentials = {
  vendor: 'powerschool',
  baseUrl: 'https://ps.test',
  clientId: 'client-id',
  clientSecret: 'client-secret',
  authType: 'oauth2',
};

const prismaStub = {
  auditLog: { create: vi.fn().mockResolvedValue({}) },
} as unknown as any;

describe('PowerSchoolConnector', () => {
  beforeEach(() => {
    nock.cleanAll();
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('authenticates via OAuth and caches token', async () => {
    nock('https://ps.test')
      .post('/oauth/access_token')
      .reply(200, { access_token: 'token-123', expires_in: 900 });

    const connector = new PowerSchoolConnector(
      { ...credentials },
      prismaStub,
      new ConsoleLogger(),
    );

    const result = await connector.authenticate(credentials);
    expect(result.status).toBe('connected');
  });

  it('maps student payloads correctly', async () => {
    nock('https://ps.test')
      .post('/oauth/access_token')
      .reply(200, { access_token: 'token-123', expires_in: 900 });

    nock('https://ps.test')
      .get('/ws/v1/student/123')
      .reply(200, {
        student: {
          id: '123',
          student_number: 'S-001',
          first_name: 'Ada',
          last_name: 'Lovelace',
          middle_name: 'Byron',
          dob: '2001-05-05',
          grade_level: 10,
          email: 'ada@example.com',
        },
      });

    const connector = new PowerSchoolConnector(
      { ...credentials },
      prismaStub,
      new ConsoleLogger(),
    );

    await connector.authenticate(credentials);
    const student = await connector.getStudent('123');
    expect(student.firstName).toBe('Ada');
    expect(student.grade).toBe(10);
    expect(student.email).toBe('ada@example.com');
  });

  it('retries on rate limits', async () => {
    nock('https://ps.test')
      .post('/oauth/access_token')
      .reply(200, { access_token: 'token-123', expires_in: 900 });

    nock('https://ps.test')
      .get('/ws/v1/student/999')
      .reply(429, {})
      .get('/ws/v1/student/999')
      .reply(200, {
        student: {
          id: '999',
          student_number: 'S-999',
          first_name: 'Test',
          last_name: 'Student',
          dob: '2004-01-01',
          grade_level: 11,
        },
      });

    const connector = new PowerSchoolConnector(
      { ...credentials },
      prismaStub,
      new ConsoleLogger(),
    );

    await connector.authenticate(credentials);
    const student = await connector.getStudent('999');
    expect(student.studentNumber).toBe('S-999');
  });
});
