import { describe, it, expect } from 'vitest';

import { SkywardMapper } from '../sis/connectors/skyward/skyward.mapper';

describe('SkywardMapper', () => {
  it('normalizes student payloads', () => {
    const mapper = new SkywardMapper();
    const student = mapper.mapStudent({
      StudentID: '42',
      StudentNumber: '42',
      FirstName: 'Grace',
      LastName: 'Hopper',
      BirthDate: '1990-12-09',
      GradeLevel: '11',
      Email: 'grace@example.com',
      SchoolId: 'school-1',
    });

    expect(student.id).toBe('42');
    expect(student.firstName).toBe('Grace');
    expect(student.grade).toBe('11');
    expect(student.schoolId).toBe('school-1');
  });
});
