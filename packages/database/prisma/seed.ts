/**
 * SchoolOS Database Seed Script
 *
 * Creates sample data for development and testing:
 * - Sample districts
 * - Users (admin, teachers, parents, students)
 * - Relationships (parent-child, teacher-student)
 * - Sample knowledge sources
 *
 * Run with: npm run db:seed
 */

import { PrismaClient, UserRole, UserStatus, RelationshipType, RelationshipStatus, KnowledgeSourceType, KnowledgeSourceStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function main(): Promise<void> {
  console.log('🌱 Starting database seed...\n');

  // ============================================================
  // DISTRICTS
  // ============================================================
  console.log('Creating districts...');
  
  const lincolnDistrict = await prisma.district.upsert({
    where: { slug: 'lincoln-unified' },
    update: {},
    create: {
      name: 'Lincoln Unified School District',
      slug: 'lincoln-unified',
      domain: 'lincoln.schoolos.dev',
      timezone: 'America/Los_Angeles',
      settings: {
        schoolYear: '2025-2026',
        gradingScale: 'standard',
        attendancePolicy: 'strict',
      },
      features: {
        aiChat: true,
        documentUpload: true,
        sisSync: true,
        lmsSync: true,
      },
      branding: {
        primaryColor: '#1a365d',
        logo: 'https://example.com/lincoln-logo.png',
      },
      maxUsers: 15000,
      maxStorageGb: 200,
    },
  });

  const jeffersonDistrict = await prisma.district.upsert({
    where: { slug: 'jefferson-county' },
    update: {},
    create: {
      name: 'Jefferson County Schools',
      slug: 'jefferson-county',
      domain: 'jefferson.schoolos.dev',
      timezone: 'America/Denver',
      settings: {
        schoolYear: '2025-2026',
        gradingScale: 'standards-based',
        attendancePolicy: 'flexible',
      },
      features: {
        aiChat: true,
        documentUpload: true,
        sisSync: false,
        lmsSync: true,
      },
      branding: {
        primaryColor: '#2d3748',
        logo: 'https://example.com/jefferson-logo.png',
      },
      maxUsers: 25000,
      maxStorageGb: 300,
    },
  });

  console.log(`  ✓ Created district: ${lincolnDistrict.name}`);
  console.log(`  ✓ Created district: ${jeffersonDistrict.name}`);

  // ============================================================
  // SCHOOLS
  // ============================================================
  console.log('\nCreating schools...');

  const lincolnHigh = await prisma.school.upsert({
    where: {
      districtId_code: {
        districtId: lincolnDistrict.id,
        code: 'LHS',
      },
    },
    update: {},
    create: {
      districtId: lincolnDistrict.id,
      name: 'Lincoln High School',
      code: 'LHS',
      type: 'high',
      address: {
        street: '1234 Main Street',
        city: 'Lincoln',
        state: 'CA',
        zip: '95648',
      },
      phone: '(555) 123-4567',
      principal: 'Dr. Sarah Martinez',
    },
  });

  const lincolnMiddle = await prisma.school.upsert({
    where: {
      districtId_code: {
        districtId: lincolnDistrict.id,
        code: 'LMS',
      },
    },
    update: {},
    create: {
      districtId: lincolnDistrict.id,
      name: 'Lincoln Middle School',
      code: 'LMS',
      type: 'middle',
      address: {
        street: '5678 Oak Avenue',
        city: 'Lincoln',
        state: 'CA',
        zip: '95648',
      },
      phone: '(555) 123-4568',
      principal: 'Mr. James Thompson',
    },
  });

  console.log(`  ✓ Created school: ${lincolnHigh.name}`);
  console.log(`  ✓ Created school: ${lincolnMiddle.name}`);

  // ============================================================
  // SECTIONS
  // ============================================================
  console.log('\nCreating sections...');

  const algebraSection = await prisma.section.upsert({
    where: {
      schoolId_code_schoolYear: {
        schoolId: lincolnHigh.id,
        code: 'ALG1-P3',
        schoolYear: '2025-2026',
      },
    },
    update: {},
    create: {
      schoolId: lincolnHigh.id,
      name: 'Algebra 1 - Period 3',
      code: 'ALG1-P3',
      subject: 'Mathematics',
      gradeLevel: '9',
      period: '3',
      room: '201',
      schoolYear: '2025-2026',
      semester: 'full-year',
      sisId: 'PS-12345',
      lmsId: 'CANVAS-67890',
    },
  });

  const englishSection = await prisma.section.upsert({
    where: {
      schoolId_code_schoolYear: {
        schoolId: lincolnHigh.id,
        code: 'ENG9-P2',
        schoolYear: '2025-2026',
      },
    },
    update: {},
    create: {
      schoolId: lincolnHigh.id,
      name: 'English 9 - Period 2',
      code: 'ENG9-P2',
      subject: 'English',
      gradeLevel: '9',
      period: '2',
      room: '105',
      schoolYear: '2025-2026',
      semester: 'full-year',
      sisId: 'PS-12346',
      lmsId: 'CANVAS-67891',
    },
  });

  console.log(`  ✓ Created section: ${algebraSection.name}`);
  console.log(`  ✓ Created section: ${englishSection.name}`);

  // ============================================================
  // USERS
  // ============================================================
  console.log('\nCreating users...');
  const defaultPassword = await hashPassword('SchoolOS2025!');

  // Admin user
  const adminUser = await prisma.user.upsert({
    where: {
      districtId_email: {
        districtId: lincolnDistrict.id,
        email: 'admin@lincoln.schoolos.dev',
      },
    },
    update: {},
    create: {
      districtId: lincolnDistrict.id,
      email: 'admin@lincoln.schoolos.dev',
      passwordHash: defaultPassword,
      firstName: 'System',
      lastName: 'Administrator',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      metadata: {
        title: 'District Administrator',
        department: 'Technology',
      },
    },
  });

  // Teacher users
  const teacherSmith = await prisma.user.upsert({
    where: {
      districtId_email: {
        districtId: lincolnDistrict.id,
        email: 'jsmith@lincoln.schoolos.dev',
      },
    },
    update: {},
    create: {
      districtId: lincolnDistrict.id,
      email: 'jsmith@lincoln.schoolos.dev',
      passwordHash: defaultPassword,
      firstName: 'Jennifer',
      lastName: 'Smith',
      phoneNumber: '(555) 234-5678',
      role: UserRole.TEACHER,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      sisId: 'T-001',
      metadata: {
        title: 'Mathematics Teacher',
        department: 'Mathematics',
        certifications: ['Secondary Math', 'AP Calculus'],
      },
    },
  });

  const teacherJohnson = await prisma.user.upsert({
    where: {
      districtId_email: {
        districtId: lincolnDistrict.id,
        email: 'mjohnson@lincoln.schoolos.dev',
      },
    },
    update: {},
    create: {
      districtId: lincolnDistrict.id,
      email: 'mjohnson@lincoln.schoolos.dev',
      passwordHash: defaultPassword,
      firstName: 'Michael',
      lastName: 'Johnson',
      phoneNumber: '(555) 234-5679',
      role: UserRole.TEACHER,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      sisId: 'T-002',
      metadata: {
        title: 'English Teacher',
        department: 'English',
        certifications: ['Secondary English', 'AP Literature'],
      },
    },
  });

  // Parent users
  const parentDavis = await prisma.user.upsert({
    where: {
      districtId_email: {
        districtId: lincolnDistrict.id,
        email: 'robert.davis@gmail.com',
      },
    },
    update: {},
    create: {
      districtId: lincolnDistrict.id,
      email: 'robert.davis@gmail.com',
      passwordHash: defaultPassword,
      firstName: 'Robert',
      lastName: 'Davis',
      phoneNumber: '(555) 345-6789',
      role: UserRole.PARENT,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      metadata: {
        occupation: 'Software Engineer',
        preferredContact: 'email',
      },
      preferences: {
        notifications: {
          email: true,
          sms: true,
          grades: true,
          attendance: true,
        },
      },
    },
  });

  const parentDavis2 = await prisma.user.upsert({
    where: {
      districtId_email: {
        districtId: lincolnDistrict.id,
        email: 'susan.davis@gmail.com',
      },
    },
    update: {},
    create: {
      districtId: lincolnDistrict.id,
      email: 'susan.davis@gmail.com',
      passwordHash: defaultPassword,
      firstName: 'Susan',
      lastName: 'Davis',
      phoneNumber: '(555) 345-6790',
      role: UserRole.PARENT,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      metadata: {
        occupation: 'Nurse',
        preferredContact: 'phone',
      },
      preferences: {
        notifications: {
          email: true,
          sms: true,
          grades: true,
          attendance: true,
        },
      },
    },
  });

  // Student users
  const studentEmma = await prisma.user.upsert({
    where: {
      districtId_email: {
        districtId: lincolnDistrict.id,
        email: 'emma.davis@student.lincoln.schoolos.dev',
      },
    },
    update: {},
    create: {
      districtId: lincolnDistrict.id,
      email: 'emma.davis@student.lincoln.schoolos.dev',
      passwordHash: defaultPassword,
      firstName: 'Emma',
      lastName: 'Davis',
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      sisId: 'S-10001',
      metadata: {
        gradeLevel: '9',
        homeroom: '201',
        studentId: '2025001',
        enrollmentDate: '2024-08-15',
      },
    },
  });

  const studentJacob = await prisma.user.upsert({
    where: {
      districtId_email: {
        districtId: lincolnDistrict.id,
        email: 'jacob.davis@student.lincoln.schoolos.dev',
      },
    },
    update: {},
    create: {
      districtId: lincolnDistrict.id,
      email: 'jacob.davis@student.lincoln.schoolos.dev',
      passwordHash: defaultPassword,
      firstName: 'Jacob',
      lastName: 'Davis',
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      sisId: 'S-10002',
      metadata: {
        gradeLevel: '7',
        homeroom: '105',
        studentId: '2025002',
        enrollmentDate: '2024-08-15',
      },
    },
  });

  console.log(`  ✓ Created admin: ${adminUser.firstName} ${adminUser.lastName}`);
  console.log(`  ✓ Created teacher: ${teacherSmith.firstName} ${teacherSmith.lastName}`);
  console.log(`  ✓ Created teacher: ${teacherJohnson.firstName} ${teacherJohnson.lastName}`);
  console.log(`  ✓ Created parent: ${parentDavis.firstName} ${parentDavis.lastName}`);
  console.log(`  ✓ Created parent: ${parentDavis2.firstName} ${parentDavis2.lastName}`);
  console.log(`  ✓ Created student: ${studentEmma.firstName} ${studentEmma.lastName}`);
  console.log(`  ✓ Created student: ${studentJacob.firstName} ${studentJacob.lastName}`);

  // ============================================================
  // RELATIONSHIPS
  // ============================================================
  console.log('\nCreating relationships...');

  // Delete existing relationships first to avoid conflicts with nullable sectionId
  await prisma.userRelationship.deleteMany({
    where: { districtId: lincolnDistrict.id }
  });

  // Create relationships using createMany
  await prisma.userRelationship.createMany({
    data: [
      // Parent-child: Robert Davis -> Emma
      {
        districtId: lincolnDistrict.id,
        userId: parentDavis.id,
        relatedUserId: studentEmma.id,
        relationshipType: RelationshipType.PARENT_OF,
        status: RelationshipStatus.ACTIVE,
        isPrimary: true,
        metadata: { canPickup: true, emergencyContact: true, relationship: 'father' },
        approvedBy: adminUser.id,
        approvedAt: new Date(),
      },
      // Parent-child: Susan Davis -> Emma
      {
        districtId: lincolnDistrict.id,
        userId: parentDavis2.id,
        relatedUserId: studentEmma.id,
        relationshipType: RelationshipType.PARENT_OF,
        status: RelationshipStatus.ACTIVE,
        isPrimary: false,
        metadata: { canPickup: true, emergencyContact: true, relationship: 'mother' },
        approvedBy: adminUser.id,
        approvedAt: new Date(),
      },
      // Parent-child: Robert Davis -> Jacob
      {
        districtId: lincolnDistrict.id,
        userId: parentDavis.id,
        relatedUserId: studentJacob.id,
        relationshipType: RelationshipType.PARENT_OF,
        status: RelationshipStatus.ACTIVE,
        isPrimary: true,
        metadata: { canPickup: true, emergencyContact: true, relationship: 'father' },
        approvedBy: adminUser.id,
        approvedAt: new Date(),
      },
      // Parent-child: Susan Davis -> Jacob
      {
        districtId: lincolnDistrict.id,
        userId: parentDavis2.id,
        relatedUserId: studentJacob.id,
        relationshipType: RelationshipType.PARENT_OF,
        status: RelationshipStatus.ACTIVE,
        isPrimary: false,
        metadata: { canPickup: true, emergencyContact: true, relationship: 'mother' },
        approvedBy: adminUser.id,
        approvedAt: new Date(),
      },
      // Teacher-student: Ms. Smith teaches Emma (Algebra)
      {
        districtId: lincolnDistrict.id,
        userId: teacherSmith.id,
        relatedUserId: studentEmma.id,
        relationshipType: RelationshipType.TEACHER_OF,
        status: RelationshipStatus.ACTIVE,
        sectionId: algebraSection.id,
        metadata: { role: 'lead' },
        approvedBy: adminUser.id,
        approvedAt: new Date(),
      },
      // Teacher-student: Mr. Johnson teaches Emma (English)
      {
        districtId: lincolnDistrict.id,
        userId: teacherJohnson.id,
        relatedUserId: studentEmma.id,
        relationshipType: RelationshipType.TEACHER_OF,
        status: RelationshipStatus.ACTIVE,
        sectionId: englishSection.id,
        metadata: { role: 'lead' },
        approvedBy: adminUser.id,
        approvedAt: new Date(),
      },
    ],
    skipDuplicates: true,
  });

  console.log('  ✓ Created parent-child relationships');
  console.log('  ✓ Created teacher-student relationships');

  // ============================================================
  // KNOWLEDGE SOURCES
  // ============================================================
  console.log('\nCreating knowledge sources...');

  const handbook = await prisma.knowledgeSource.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      districtId: lincolnDistrict.id,
      title: 'Lincoln Unified School District Student Handbook 2025-2026',
      description: 'Official student handbook containing policies, procedures, and guidelines for all students.',
      sourceType: KnowledgeSourceType.HANDBOOK,
      content: `
# Lincoln Unified School District Student Handbook 2025-2026

## Chapter 1: Attendance Policy

### 1.1 Attendance Requirements
Students are expected to attend all scheduled classes. Regular attendance is essential for academic success.

- Students must maintain a minimum 90% attendance rate
- Three unexcused absences may result in truancy proceedings
- Parents must notify the school within 24 hours of any absence

### 1.2 Excused Absences
The following are considered excused absences:
- Illness (with parent/guardian notification)
- Medical appointments (with documentation)
- Family emergencies
- Religious observances
- Court appearances

### 1.3 Tardy Policy
- Students arriving after the bell are considered tardy
- Three tardies equal one unexcused absence
- Chronic tardiness will result in parent conference

## Chapter 2: Academic Policies

### 2.1 Grading Scale
| Letter Grade | Percentage | GPA Points |
|-------------|------------|------------|
| A | 90-100% | 4.0 |
| B | 80-89% | 3.0 |
| C | 70-79% | 2.0 |
| D | 60-69% | 1.0 |
| F | Below 60% | 0.0 |

### 2.2 Homework Policy
- Homework is assigned to reinforce classroom learning
- Late homework may receive reduced credit
- Students should expect 1-2 hours of homework per night

## Chapter 3: Code of Conduct

### 3.1 Behavioral Expectations
All students are expected to:
- Treat others with respect and dignity
- Follow all school rules and policies
- Maintain academic integrity
- Respect school property

### 3.2 Disciplinary Actions
Violations may result in:
- Verbal warning
- Detention
- In-school suspension
- Out-of-school suspension
- Expulsion (for serious violations)

## Chapter 4: Technology Policy

### 4.1 Acceptable Use
Students may use school technology for educational purposes only.
- No accessing inappropriate content
- No cyberbullying
- Protect personal information
- Report suspicious activity

### 4.2 Personal Devices
Cell phones and personal devices must be:
- Turned off during class
- Stored in lockers or bags
- Used only during designated times
      `,
      status: KnowledgeSourceStatus.PUBLISHED,
      isPublic: true,
      publishedAt: new Date(),
      category: 'policies',
      tags: ['handbook', 'policies', 'attendance', 'grades', 'conduct'],
      createdBy: adminUser.id,
    },
  });

  const transportation = await prisma.knowledgeSource.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      districtId: lincolnDistrict.id,
      title: 'Transportation Services Guide',
      description: 'Information about school bus routes, schedules, and transportation policies.',
      sourceType: KnowledgeSourceType.POLICY_DOCUMENT,
      content: `
# Transportation Services Guide

## Bus Routes and Schedules

### Route Information
Bus routes are determined based on student addresses. To find your child's bus route:
1. Log in to the Parent Portal
2. Navigate to Transportation
3. Enter your address

### Schedule Times
- Morning pickup: Buses arrive 5-10 minutes before scheduled time
- Afternoon dropoff: Buses depart within 15 minutes of dismissal

### Bus Stop Safety
- Arrive at the stop 5 minutes early
- Stand back from the road
- Wait for the driver's signal to approach
- Always cross in front of the bus

## Transportation Policies

### Eligibility
Students living more than 1.5 miles from school are eligible for bus transportation.

### Behavior Expectations
- Remain seated while bus is moving
- Keep aisles clear
- Follow driver instructions
- No eating or drinking

### Consequences for Violations
1. First offense: Warning
2. Second offense: 3-day bus suspension
3. Third offense: 5-day bus suspension
4. Fourth offense: Loss of bus privileges

## Contact Information
Transportation Office: (555) 123-4599
Hours: 6:00 AM - 5:00 PM
Email: transportation@lincoln.schoolos.dev
      `,
      status: KnowledgeSourceStatus.PUBLISHED,
      isPublic: true,
      publishedAt: new Date(),
      category: 'transportation',
      tags: ['transportation', 'bus', 'routes', 'schedules'],
      createdBy: adminUser.id,
    },
  });

  const announcement = await prisma.knowledgeSource.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      districtId: lincolnDistrict.id,
      title: 'Winter Break Schedule 2025-2026',
      description: 'Important dates and information about winter break.',
      sourceType: KnowledgeSourceType.ANNOUNCEMENT,
      content: `
# Winter Break Schedule 2025-2026

## Important Dates
- Last day of school before break: Friday, December 19, 2025
- Winter break: December 22, 2025 - January 2, 2026
- School resumes: Monday, January 5, 2026

## Before the Break
- All textbooks should be taken home for study
- Clear out lockers of any perishable items
- Check lost and found for missing items

## During the Break
- School buildings will be closed
- Emergency contact: (555) 123-4500
- District office closed December 24-26 and January 1

## Returning to School
- Normal bell schedule resumes January 5
- Buses run on regular routes
- Second semester begins January 12
      `,
      status: KnowledgeSourceStatus.PUBLISHED,
      isPublic: true,
      publishedAt: new Date(),
      expiresAt: new Date('2026-01-06'),
      category: 'announcements',
      tags: ['winter break', 'schedule', 'announcement'],
      createdBy: adminUser.id,
    },
  });

  console.log(`  ✓ Created knowledge source: ${handbook.title}`);
  console.log(`  ✓ Created knowledge source: ${transportation.title}`);
  console.log(`  ✓ Created knowledge source: ${announcement.title}`);

  // ============================================================
  // SAMPLE CONVERSATION
  // ============================================================
  console.log('\nCreating sample conversation...');

  const conversation = await prisma.conversation.create({
    data: {
      districtId: lincolnDistrict.id,
      userId: parentDavis.id,
      childId: studentEmma.id,
      title: 'Question about attendance policy',
      metadata: {
        topic: 'attendance',
        sentiment: 'neutral',
      },
    },
  });

  await prisma.message.createMany({
    data: [
      {
        conversationId: conversation.id,
        userId: parentDavis.id,
        role: 'USER',
        content: 'How many absences is my daughter allowed before it becomes a problem?',
      },
      {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        content: `According to the Lincoln Unified School District Student Handbook, students must maintain a minimum 90% attendance rate. Three unexcused absences may result in truancy proceedings.

Here are the key attendance requirements:
- Students must maintain a minimum 90% attendance rate
- Three unexcused absences may result in truancy proceedings
- Parents must notify the school within 24 hours of any absence

If an absence is due to illness, medical appointments, family emergencies, religious observances, or court appearances, it can be excused with proper documentation.

Would you like more information about excused absences or the tardy policy?`,
        confidence: 0.95,
        modelUsed: 'claude-3-5-sonnet-20241022',
        promptTokens: 450,
        completionTokens: 180,
        latencyMs: 1250,
      },
    ],
  });

  console.log('  ✓ Created sample conversation');

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n✅ Database seed completed successfully!\n');
  console.log('Summary:');
  console.log(`  - Districts: 2`);
  console.log(`  - Schools: 2`);
  console.log(`  - Sections: 2`);
  console.log(`  - Users: 7 (1 admin, 2 teachers, 2 parents, 2 students)`);
  console.log(`  - Relationships: 5`);
  console.log(`  - Knowledge Sources: 3`);
  console.log(`  - Conversations: 1`);
  console.log('\nDefault credentials:');
  console.log(`  Email: admin@lincoln.schoolos.dev`);
  console.log(`  Password: SchoolOS2025!`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
