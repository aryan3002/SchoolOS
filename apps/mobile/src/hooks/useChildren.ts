/**
 * API Hooks - Children
 *
 * React Query hooks for child data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types
export interface Child {
  id: string;
  firstName: string;
  lastName: string;
  gradeLevel: string;
  schoolId: string;
  schoolName: string;
  avatarUrl?: string;
  dateOfBirth?: Date;
}

export interface Grade {
  id: string;
  subject: string;
  grade: string;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  previousGrade?: string;
  teacher: string;
  teacherEmail?: string;
  lastUpdated: Date;
}

export interface Assignment {
  id: string;
  title: string;
  description?: string;
  subject: string;
  dueDate: Date;
  status: 'pending' | 'submitted' | 'graded' | 'late' | 'missing';
  grade?: string;
  maxPoints?: number;
  earnedPoints?: number;
  teacherFeedback?: string;
}

export interface Attendance {
  present: number;
  absent: number;
  tardy: number;
  excused: number;
  total: number;
  rate: number;
  recentRecords: AttendanceRecord[];
}

export interface AttendanceRecord {
  id: string;
  date: Date;
  status: 'present' | 'absent' | 'tardy' | 'excused';
  note?: string;
}

// API base URL
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

// API functions
async function fetchChildren(): Promise<Child[]> {
  const response = await fetch(`${API_BASE}/students/children`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch children');
  }

  return response.json();
}

async function fetchChild(childId: string): Promise<Child> {
  const response = await fetch(`${API_BASE}/students/${childId}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch child');
  }

  return response.json();
}

async function fetchGrades(childId: string): Promise<Grade[]> {
  const response = await fetch(`${API_BASE}/students/${childId}/grades`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch grades');
  }

  return response.json();
}

async function fetchAssignments(
  childId: string,
  status?: Assignment['status']
): Promise<Assignment[]> {
  const url = status
    ? `${API_BASE}/students/${childId}/assignments?status=${status}`
    : `${API_BASE}/students/${childId}/assignments`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch assignments');
  }

  return response.json();
}

async function fetchAttendance(childId: string): Promise<Attendance> {
  const response = await fetch(`${API_BASE}/students/${childId}/attendance`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch attendance');
  }

  return response.json();
}

// Hooks
export function useChildren() {
  return useQuery({
    queryKey: ['children'],
    queryFn: fetchChildren,
  });
}

export function useChild(childId: string | undefined) {
  return useQuery({
    queryKey: ['child', childId],
    queryFn: () => fetchChild(childId!),
    enabled: !!childId,
  });
}

export function useGrades(childId: string | undefined) {
  return useQuery({
    queryKey: ['grades', childId],
    queryFn: () => fetchGrades(childId!),
    enabled: !!childId,
  });
}

export function useAssignments(
  childId: string | undefined,
  status?: Assignment['status']
) {
  return useQuery({
    queryKey: ['assignments', childId, status],
    queryFn: () => fetchAssignments(childId!, status),
    enabled: !!childId,
  });
}

export function useAttendance(childId: string | undefined) {
  return useQuery({
    queryKey: ['attendance', childId],
    queryFn: () => fetchAttendance(childId!),
    enabled: !!childId,
  });
}

// Combined hook for dashboard/home screen
export function useChildDashboard(childId: string | undefined) {
  const childQuery = useChild(childId);
  const gradesQuery = useGrades(childId);
  const assignmentsQuery = useAssignments(childId);
  const attendanceQuery = useAttendance(childId);

  return {
    child: childQuery.data,
    grades: gradesQuery.data,
    assignments: assignmentsQuery.data,
    attendance: attendanceQuery.data,
    isLoading:
      childQuery.isLoading ||
      gradesQuery.isLoading ||
      assignmentsQuery.isLoading ||
      attendanceQuery.isLoading,
    error:
      childQuery.error ||
      gradesQuery.error ||
      assignmentsQuery.error ||
      attendanceQuery.error,
    refetch: () => {
      childQuery.refetch();
      gradesQuery.refetch();
      assignmentsQuery.refetch();
      attendanceQuery.refetch();
    },
  };
}
