/**
 * Profile Screen
 *
 * Child profile with grades, attendance, and parent settings
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/theme';
import {
  Text,
  Caption,
  Card,
  ChildSwitcher,
  GradeDisplay,
  ProgressBar,
  AttendanceIndicator,
  Badge,
} from '@/components/ui';
import type { Child } from '@/components/ui';

// Mock data
const mockChildren: Child[] = [
  {
    id: '1',
    firstName: 'Emma',
    lastName: 'Johnson',
    gradeLevel: '5th Grade',
    schoolName: 'Lincoln Elementary',
  },
  {
    id: '2',
    firstName: 'Lucas',
    lastName: 'Johnson',
    gradeLevel: '2nd Grade',
    schoolName: 'Lincoln Elementary',
  },
];

interface GradeInfo {
  subject: string;
  grade: string;
  trend: 'up' | 'down' | 'stable';
  previousGrade?: string;
  teacher: string;
}

const mockGrades: GradeInfo[] = [
  { subject: 'Math', grade: 'B+', trend: 'up', previousGrade: 'B', teacher: 'Ms. Peterson' },
  { subject: 'Reading', grade: 'A', trend: 'stable', teacher: 'Ms. Peterson' },
  { subject: 'Science', grade: 'A-', trend: 'up', previousGrade: 'B+', teacher: 'Mr. Chen' },
  { subject: 'Social Studies', grade: 'B', trend: 'stable', teacher: 'Ms. Rodriguez' },
  { subject: 'Art', grade: 'A', trend: 'stable', teacher: 'Mrs. Kim' },
];

interface Assignment {
  id: string;
  title: string;
  subject: string;
  dueDate: Date;
  status: 'pending' | 'submitted' | 'graded' | 'late';
  grade?: string;
}

const mockAssignments: Assignment[] = [
  {
    id: '1',
    title: 'Reading Response - Chapter 12',
    subject: 'Reading',
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    status: 'pending',
  },
  {
    id: '2',
    title: 'Fraction Worksheet',
    subject: 'Math',
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    status: 'pending',
  },
  {
    id: '3',
    title: 'Multiplication Test',
    subject: 'Math',
    dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    status: 'graded',
    grade: '89%',
  },
];

export function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [selectedChildId, setSelectedChildId] = useState(mockChildren[0].id);
  const [refreshing, setRefreshing] = useState(false);

  const selectedChild = mockChildren.find((c) => c.id === selectedChildId);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const handleSettingsPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/settings');
  };

  const handleGradePress = (grade: GradeInfo) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/grades/${encodeURIComponent(grade.subject)}`);
  };

  const handleAssignmentPress = (assignment: Assignment) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('Assignment pressed:', assignment.id);
  };

  const pendingAssignments = mockAssignments.filter((a) => a.status === 'pending');
  const recentGraded = mockAssignments.filter((a) => a.status === 'graded').slice(0, 3);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background.primary }]}
      edges={['top']}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { borderBottomColor: theme.colors.neutral[200] },
        ]}
      >
        <View style={styles.headerRow}>
          <Text variant="h3" color={theme.colors.text.primary}>
            Profile
          </Text>
          <Pressable
            onPress={handleSettingsPress}
            style={({ pressed }) => [
              styles.settingsButton,
              { backgroundColor: theme.colors.neutral[100] },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={{ fontSize: 20 }}>⚙️</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary[500]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Child Switcher */}
        {mockChildren.length > 1 && (
          <ChildSwitcher
            children={mockChildren}
            selectedChildId={selectedChildId}
            onSelectChild={setSelectedChildId}
          />
        )}

        {/* Child Profile Card */}
        <View style={styles.section}>
          <Card variant="elevated" padding="large">
            <View style={styles.profileCard}>
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: theme.colors.primary[500] },
                ]}
              >
                <Text variant="h2" color={theme.colors.text.inverse}>
                  {selectedChild?.firstName[0]}
                  {selectedChild?.lastName[0]}
                </Text>
              </View>
              <Text variant="h2" color={theme.colors.text.primary}>
                {selectedChild?.firstName} {selectedChild?.lastName}
              </Text>
              <View style={styles.profileDetails}>
                <Badge label={selectedChild?.gradeLevel || ''} variant="info" />
                <Text variant="bodySmall" color={theme.colors.text.secondary}>
                  {selectedChild?.schoolName}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Attendance */}
        <View style={styles.section}>
          <Card variant="elevated">
            <AttendanceIndicator
              present={45}
              absent={1}
              tardy={2}
              total={48}
            />
          </Card>
        </View>

        {/* Grades Overview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="h4" color={theme.colors.text.primary}>
              Current Grades
            </Text>
            <Pressable onPress={() => router.push('/grades')}>
              <Text variant="bodySmall" color={theme.colors.primary[600]}>
                View All
              </Text>
            </Pressable>
          </View>

          <View style={styles.gradesGrid}>
            {mockGrades.map((grade) => (
              <Pressable
                key={grade.subject}
                onPress={() => handleGradePress(grade)}
                style={({ pressed }) => [
                  styles.gradeCard,
                  { backgroundColor: theme.colors.background.secondary },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <GradeDisplay
                  grade={grade.grade}
                  subject={grade.subject}
                  trend={grade.trend}
                  previousGrade={grade.previousGrade}
                  size="small"
                />
              </Pressable>
            ))}
          </View>
        </View>

        {/* Pending Assignments */}
        {pendingAssignments.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text variant="h4" color={theme.colors.text.primary}>
                Upcoming Assignments
              </Text>
              <Badge
                label={`${pendingAssignments.length}`}
                variant="warning"
                size="small"
              />
            </View>

            <Card variant="default">
              {pendingAssignments.map((assignment, index) => (
                <Pressable
                  key={assignment.id}
                  onPress={() => handleAssignmentPress(assignment)}
                  style={({ pressed }) => [
                    styles.assignmentItem,
                    index < pendingAssignments.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: theme.colors.neutral[200],
                    },
                    pressed && { backgroundColor: theme.colors.neutral[100] },
                  ]}
                >
                  <View style={styles.assignmentInfo}>
                    <Text
                      variant="body"
                      color={theme.colors.text.primary}
                      numberOfLines={1}
                    >
                      {assignment.title}
                    </Text>
                    <Caption color={theme.colors.text.tertiary}>
                      {assignment.subject} • Due{' '}
                      {assignment.dueDate.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Caption>
                  </View>
                  <Text variant="h4" color={theme.colors.text.tertiary}>
                    ›
                  </Text>
                </Pressable>
              ))}
            </Card>
          </View>
        )}

        {/* Recent Grades */}
        {recentGraded.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text variant="h4" color={theme.colors.text.primary}>
                Recently Graded
              </Text>
            </View>

            <Card variant="default">
              {recentGraded.map((assignment, index) => (
                <Pressable
                  key={assignment.id}
                  onPress={() => handleAssignmentPress(assignment)}
                  style={({ pressed }) => [
                    styles.assignmentItem,
                    index < recentGraded.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: theme.colors.neutral[200],
                    },
                    pressed && { backgroundColor: theme.colors.neutral[100] },
                  ]}
                >
                  <View style={styles.assignmentInfo}>
                    <Text
                      variant="body"
                      color={theme.colors.text.primary}
                      numberOfLines={1}
                    >
                      {assignment.title}
                    </Text>
                    <Caption color={theme.colors.text.tertiary}>
                      {assignment.subject}
                    </Caption>
                  </View>
                  <Badge
                    label={assignment.grade || ''}
                    variant="success"
                  />
                </Pressable>
              ))}
            </Card>
          </View>
        )}

        {/* Quick Links */}
        <View style={styles.section}>
          <Text
            variant="h4"
            color={theme.colors.text.primary}
            style={styles.sectionTitle}
          >
            Quick Links
          </Text>
          <View style={styles.quickLinks}>
            <QuickLinkItem
              icon="📧"
              label="Message Teacher"
              onPress={() => router.push('/messages')}
            />
            <QuickLinkItem
              icon="📋"
              label="Report Card"
              onPress={() => router.push('/report-card')}
            />
            <QuickLinkItem
              icon="🎒"
              label="School Info"
              onPress={() => router.push('/school-info')}
            />
            <QuickLinkItem
              icon="🔔"
              label="Notifications"
              onPress={() => router.push('/notifications')}
            />
          </View>
        </View>

        {/* Bottom spacing for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickLinkItem({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.quickLink,
        { backgroundColor: theme.colors.background.secondary },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={{ fontSize: 24 }}>{icon}</Text>
      <Text
        variant="caption"
        color={theme.colors.text.secondary}
        style={{ textAlign: 'center' }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  profileCard: {
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  profileDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  gradesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gradeCard: {
    flex: 1,
    minWidth: '30%',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  assignmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  assignmentInfo: {
    flex: 1,
    marginRight: 12,
  },
  quickLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickLink: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
  },
});

export default ProfileScreen;
