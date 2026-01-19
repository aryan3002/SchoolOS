import { describe, it, expect } from 'vitest';

import { DistrictGraphNormalizer } from '../district-graph/normalizer';
import type { RawGuardian, RawStudent } from '../sis';

describe('DistrictGraphNormalizer', () => {
  const normalizer = new DistrictGraphNormalizer();

  it('normalizes student names, grade, and email', async () => {
    const raw: RawStudent = {
      id: 's-1',
      studentNumber: '1001',
      firstName: '  ada ',
      lastName: '  lovelace ',
      dateOfBirth: new Date('2001-01-01'),
      grade: '10',
      email: 'ADA@Example.com',
    };

    const normalized = await normalizer.normalizeStudent('vendor', raw, 'district');
    expect(normalized.profile.firstName).toBe('ada');
    expect(normalized.profile.grade).toBe(10);
    expect(normalized.profile.email).toBe('ada@example.com');
  });

  it('normalizes guardian contact info', async () => {
    const guardian: RawGuardian = {
      id: 'g-1',
      firstName: 'Alan',
      lastName: 'Turing',
      relationship: 'father',
      email: 'ALAN@Example.com',
      phone: '(555) 123-0000',
      isPrimary: true,
      canPickup: true,
      receiveCommunications: true,
    };

    const normalized = await normalizer.normalizeGuardian('vendor', guardian, 'district');
    expect(normalized.profile.email).toBe('alan@example.com');
    expect(normalized.profile.phone).toBe('+15551230000');
  });
});
