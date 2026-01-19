/**
 * Calendar Screen
 *
 * Unified calendar view with school events, assignments, and personal items
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/theme';
import {
  Text,
  WeekView,
  MonthSelector,
  EventItem,
  ChildChip,
} from '@/components/ui';
import type { CalendarEvent, Child } from '@/components/ui';

// Mock data
const mockChild: Child = {
  id: '1',
  firstName: 'Emma',
  lastName: 'Johnson',
  gradeLevel: '5th Grade',
  schoolName: 'Lincoln Elementary',
};

const mockEvents: CalendarEvent[] = [
  {
    id: '1',
    title: 'Math Test - Chapter 5',
    date: new Date(),
    startTime: '10:00 AM',
    type: 'class',
    location: 'Room 204',
    description: 'Covers fractions and decimals',
  },
  {
    id: '2',
    title: 'Early Dismissal',
    date: new Date(),
    startTime: '1:00 PM',
    type: 'school',
    description: 'Teacher professional development day',
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
  {
    id: '4',
    title: 'Science Museum Field Trip',
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    isAllDay: true,
    type: 'school',
    description: 'Permission slip required',
    requiresAction: true,
  },
  {
    id: '5',
    title: 'Spring Photos',
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    startTime: '9:00 AM',
    type: 'school',
    location: 'Gymnasium',
  },
  {
    id: '6',
    title: 'Parent-Teacher Conference',
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    startTime: '3:30 PM',
    endTime: '4:00 PM',
    type: 'meeting',
    location: 'Room 204',
    requiresAction: true,
  },
  {
    id: '7',
    title: 'Spring Break',
    date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    isAllDay: true,
    type: 'holiday',
    description: 'School closed March 25 - April 1',
  },
];

export function CalendarScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  // Get events for selected date
  const selectedDateEvents = mockEvents.filter(
    (event) => event.date.toDateString() === selectedDate.toDateString()
  );

  // Get all dates that have events (for week view indicators)
  const eventDates = mockEvents.map((event) => event.date);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const handleDateSelect = (date: Date) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDate(date);
  };

  const handlePrevMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentMonth(newDate);
    setSelectedDate(newDate);
  };

  const handleNextMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentMonth(newDate);
    setSelectedDate(newDate);
  };

  const handleEventPress = (event: CalendarEvent) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('Event pressed:', event.id);
    // Open event detail modal
  };

  const formatSelectedDate = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (selectedDate.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (selectedDate.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return selectedDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
    }
  };

  // Get upcoming events (next 7 days excluding selected date)
  const upcomingEvents = mockEvents
    .filter((event) => {
      const eventDate = event.date.toDateString();
      const selectedDateStr = selectedDate.toDateString();
      const now = new Date();
      const weekFromNow = new Date(now);
      weekFromNow.setDate(weekFromNow.getDate() + 7);

      return (
        eventDate !== selectedDateStr &&
        event.date >= now &&
        event.date <= weekFromNow
      );
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

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
            Calendar
          </Text>
          <ChildChip child={mockChild} />
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
        {/* Month Selector */}
        <MonthSelector
          currentDate={currentMonth}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
        />

        {/* Week View */}
        <View
          style={[
            styles.weekContainer,
            { backgroundColor: theme.colors.background.secondary },
          ]}
        >
          <WeekView
            selectedDate={selectedDate}
            onSelectDate={handleDateSelect}
            eventDates={eventDates}
          />
        </View>

        {/* Selected Date Events */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="h4" color={theme.colors.text.primary}>
              {formatSelectedDate()}
            </Text>
            <Text variant="bodySmall" color={theme.colors.text.tertiary}>
              {selectedDateEvents.length} event
              {selectedDateEvents.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {selectedDateEvents.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 40 }}>📅</Text>
              <Text
                variant="body"
                color={theme.colors.text.secondary}
                style={styles.emptyText}
              >
                No events scheduled
              </Text>
              <Text
                variant="bodySmall"
                color={theme.colors.text.tertiary}
                style={styles.emptySubtext}
              >
                Enjoy the free time!
              </Text>
            </View>
          ) : (
            <View style={styles.eventsList}>
              {selectedDateEvents.map((event) => (
                <EventItem
                  key={event.id}
                  event={event}
                  onPress={() => handleEventPress(event)}
                />
              ))}
            </View>
          )}
        </View>

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text variant="h4" color={theme.colors.text.primary}>
                Coming Up
              </Text>
            </View>
            <View style={styles.eventsList}>
              {upcomingEvents.map((event) => (
                <View key={event.id} style={styles.upcomingEvent}>
                  <Text
                    variant="caption"
                    color={theme.colors.text.tertiary}
                    style={styles.upcomingDate}
                  >
                    {event.date.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                  <EventItem
                    event={event}
                    onPress={() => handleEventPress(event)}
                    compact
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Legend */}
        <View style={styles.legend}>
          <Text
            variant="label"
            color={theme.colors.text.tertiary}
            style={styles.legendTitle}
          >
            Event Types
          </Text>
          <View style={styles.legendItems}>
            <LegendItem label="School" color={theme.colors.primary[500]} />
            <LegendItem label="Class" color={theme.colors.info[500]} />
            <LegendItem label="Meeting" color={theme.colors.accent[500]} />
            <LegendItem label="Deadline" color={theme.colors.error[500]} />
            <LegendItem label="Holiday" color={theme.colors.success[500]} />
          </View>
        </View>

        {/* Bottom spacing for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function LegendItem({ label, color }: { label: string; color: string }) {
  const theme = useTheme();

  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text variant="caption" color={theme.colors.text.secondary}>
        {label}
      </Text>
    </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  weekContainer: {
    marginHorizontal: 20,
    borderRadius: 16,
    marginBottom: 24,
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 12,
  },
  emptySubtext: {
    marginTop: 4,
  },
  eventsList: {
    gap: 12,
  },
  upcomingEvent: {
    marginBottom: 8,
  },
  upcomingDate: {
    marginBottom: 4,
    marginLeft: 4,
  },
  legend: {
    paddingHorizontal: 20,
    marginTop: 8,
  },
  legendTitle: {
    marginBottom: 12,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default CalendarScreen;
