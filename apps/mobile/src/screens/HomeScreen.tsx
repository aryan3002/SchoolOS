/**
 * Parent Home Screen - The "Clarity Screen"
 *
 * "What matters for MY child today"
 * - Not a feed, not a dashboard—a clarity screen
 * - Zero scrolling to see critical information
 * - Entry point must be prominent and inviting
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/theme';
import {
  Text,
  Caption,
  QuickAskInput,
  ActionCard,
  ActionListItem,
  ChildSwitcher,
  DaySummary,
  Badge,
  Skeleton,
} from '@/components/ui';
import type { Child, ActionItem, CalendarEvent } from '@/components/ui';

// Mock data - would come from API
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

const mockActions: ActionItem[] = [
  {
    id: '1',
    title: 'Permission Slip - Field Trip',
    description: 'Science museum visit on March 15th requires parent signature',
    urgency: 'high',
    type: 'permission',
    deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    childName: 'Emma',
    quickActions: [
      { id: 'approve', label: 'Approve', variant: 'primary' },
      { id: 'deny', label: 'Deny', variant: 'outline' },
    ],
  },
  {
    id: '2',
    title: 'Lunch Balance Low',
    description: 'Balance: $5.50 - Sufficient for 2 more lunches',
    urgency: 'medium',
    type: 'payment',
    childName: 'Emma',
    quickActions: [{ id: 'add', label: 'Add Funds', variant: 'primary' }],
  },
];

const mockEvents: CalendarEvent[] = [
  {
    id: '1',
    title: 'Math Test',
    date: new Date(),
    startTime: '10:00 AM',
    type: 'class',
    location: 'Room 204',
  },
  {
    id: '2',
    title: 'Early Dismissal',
    date: new Date(),
    startTime: '1:00 PM',
    type: 'school',
    isAllDay: false,
  },
  {
    id: '3',
    title: 'Soccer Practice',
    date: new Date(),
    startTime: '4:00 PM',
    endTime: '5:30 PM',
    type: 'custom',
    location: 'Sports Field',
  },
];

export function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [selectedChildId, setSelectedChildId] = useState(mockChildren[0].id);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  const selectedChild = mockChildren.find((c) => c.id === selectedChildId);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setRefreshing(false);
  }, []);

  const handleAskPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/chat');
  };

  const handleActionPress = (action: ActionItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('Action pressed:', action.id);
    // Navigate to action detail or handle inline
  };

  const handleQuickAction = (actionId: string, quickActionId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    console.log('Quick action:', actionId, quickActionId);
    // Handle quick action
  };

  const handleEventPress = (event: CalendarEvent) => {
    router.push(`/calendar?eventId=${event.id}`);
  };

  const handleSeeAllActions = () => {
    router.push('/actions');
  };

  const handleSeeAllEvents = () => {
    router.push('/calendar');
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const criticalActions = mockActions.filter(
    (a) => a.urgency === 'critical' || a.urgency === 'high'
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background.primary }]}
      edges={['top']}
    >
      <StatusBar barStyle="dark-content" />

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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text variant="bodySmall" color={theme.colors.text.secondary}>
                {getGreeting()}
              </Text>
              <Text variant="h2" color={theme.colors.text.primary}>
                {selectedChild?.firstName}'s Day
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/profile')}
              style={({ pressed }) => [
                styles.profileButton,
                { backgroundColor: theme.colors.neutral[100] },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text variant="body" color={theme.colors.text.primary}>
                👤
              </Text>
            </Pressable>
          </View>

          {/* Child Switcher */}
          {mockChildren.length > 1 && (
            <ChildSwitcher
              children={mockChildren}
              selectedChildId={selectedChildId}
              onSelectChild={setSelectedChildId}
            />
          )}
        </View>

        {/* AI Entry Point - Prominent and inviting */}
        <View style={styles.section}>
          <QuickAskInput
            onPress={handleAskPress}
            placeholder="Ask anything about your child..."
          />
        </View>

        {/* Critical Actions - Above the fold */}
        {criticalActions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Text variant="h4" color={theme.colors.text.primary}>
                  Needs Attention
                </Text>
                <Badge
                  label={`${criticalActions.length}`}
                  variant="error"
                  size="small"
                />
              </View>
              {mockActions.length > criticalActions.length && (
                <Pressable onPress={handleSeeAllActions}>
                  <Text variant="bodySmall" color={theme.colors.primary[600]}>
                    See all ({mockActions.length})
                  </Text>
                </Pressable>
              )}
            </View>

            {criticalActions.slice(0, 2).map((action) => (
              <ActionCard
                key={action.id}
                action={action}
                onPress={() => handleActionPress(action)}
                onQuickAction={(qaId) => handleQuickAction(action.id, qaId)}
              />
            ))}
          </View>
        )}

        {/* Other Actions */}
        {mockActions.filter((a) => a.urgency !== 'critical' && a.urgency !== 'high')
          .length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text variant="h4" color={theme.colors.text.primary}>
                Other Actions
              </Text>
            </View>
            <View
              style={[
                styles.actionsList,
                { backgroundColor: theme.colors.background.secondary },
              ]}
            >
              {mockActions
                .filter((a) => a.urgency !== 'critical' && a.urgency !== 'high')
                .map((action) => (
                  <ActionListItem
                    key={action.id}
                    action={action}
                    onPress={() => handleActionPress(action)}
                  />
                ))}
            </View>
          </View>
        )}

        {/* Today's Schedule */}
        <View style={styles.section}>
          <DaySummary
            date={new Date()}
            events={mockEvents}
            onEventPress={handleEventPress}
            onSeeAll={handleSeeAllEvents}
          />
        </View>

        {/* Quick Stats Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="h4" color={theme.colors.text.primary}>
              Quick Overview
            </Text>
          </View>
          <View style={styles.statsGrid}>
            <StatCard
              label="GPA"
              value="3.8"
              trend="up"
              icon="📊"
              color={theme.colors.success[500]}
            />
            <StatCard
              label="Attendance"
              value="98%"
              trend="stable"
              icon="✓"
              color={theme.colors.primary[500]}
            />
            <StatCard
              label="Missing Work"
              value="0"
              icon="📝"
              color={theme.colors.success[500]}
            />
            <StatCard
              label="Upcoming Tests"
              value="2"
              icon="📅"
              color={theme.colors.accent[500]}
            />
          </View>
        </View>

        {/* Bottom spacing for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Quick stat card component
interface StatCardProps {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'stable';
  icon: string;
  color: string;
}

function StatCard({ label, value, trend, icon, color }: StatCardProps) {
  const theme = useTheme();

  const trendIcons = {
    up: '↑',
    down: '↓',
    stable: '→',
  };

  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: theme.colors.background.secondary },
      ]}
    >
      <View style={styles.statHeader}>
        <Text style={{ fontSize: 20 }}>{icon}</Text>
        {trend && (
          <Text
            style={{
              color:
                trend === 'up'
                  ? theme.colors.success[500]
                  : trend === 'down'
                    ? theme.colors.error[500]
                    : theme.colors.neutral[400],
              fontSize: 14,
            }}
          >
            {trendIcons[trend]}
          </Text>
        )}
      </View>
      <Text variant="h3" color={color} style={{ marginTop: 4 }}>
        {value}
      </Text>
      <Caption color={theme.colors.text.tertiary}>{label}</Caption>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
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
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionsList: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 16,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export default HomeScreen;
