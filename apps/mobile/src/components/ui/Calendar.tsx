/**
 * Calendar Components
 *
 * Calendar view and event displays for school schedules
 */

import React from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Text, Caption } from './Text';
import { Card } from './Card';
import { useTheme } from '@/theme';

// Event types
export interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  startTime?: string;
  endTime?: string;
  type: 'school' | 'class' | 'meeting' | 'deadline' | 'holiday' | 'custom';
  description?: string;
  location?: string;
  childId?: string;
  isAllDay?: boolean;
  requiresAction?: boolean;
}

// Day summary for home screen
export interface DaySummaryProps {
  date: Date;
  events: CalendarEvent[];
  onEventPress?: (event: CalendarEvent) => void;
  onSeeAll?: () => void;
}

export function DaySummary({
  date,
  events,
  onEventPress,
  onSeeAll,
}: DaySummaryProps) {
  const theme = useTheme();
  const displayEvents = events.slice(0, 3);
  const hasMore = events.length > 3;

  const formatDate = (d: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (d.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (d.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
    }
  };

  return (
    <View style={styles.daySummary}>
      <View style={styles.daySummaryHeader}>
        <Text variant="h4" color={theme.colors.text.primary}>
          {formatDate(date)}
        </Text>
        {hasMore && onSeeAll && (
          <Pressable onPress={onSeeAll}>
            <Text variant="bodySmall" color={theme.colors.primary[600]}>
              See all ({events.length})
            </Text>
          </Pressable>
        )}
      </View>

      {events.length === 0 ? (
        <View style={styles.emptyDay}>
          <Text variant="body" color={theme.colors.text.tertiary}>
            No events scheduled
          </Text>
        </View>
      ) : (
        <View style={styles.eventsList}>
          {displayEvents.map((event) => (
            <EventItem
              key={event.id}
              event={event}
              onPress={() => onEventPress?.(event)}
              compact
            />
          ))}
        </View>
      )}
    </View>
  );
}

// Event item
export interface EventItemProps {
  event: CalendarEvent;
  onPress?: () => void;
  compact?: boolean;
}

export function EventItem({ event, onPress, compact }: EventItemProps) {
  const theme = useTheme();

  const typeColors: Record<CalendarEvent['type'], string> = {
    school: theme.colors.primary[500],
    class: theme.colors.info[500],
    meeting: theme.colors.accent[500],
    deadline: theme.colors.error[500],
    holiday: theme.colors.success[500],
    custom: theme.colors.neutral[500],
  };

  const typeIcons: Record<CalendarEvent['type'], string> = {
    school: '🏫',
    class: '📚',
    meeting: '👥',
    deadline: '⏰',
    holiday: '🎉',
    custom: '📌',
  };

  const formatTime = () => {
    if (event.isAllDay) return 'All day';
    if (!event.startTime) return '';
    if (event.endTime) {
      return `${event.startTime} - ${event.endTime}`;
    }
    return event.startTime;
  };

  if (compact) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.eventItemCompact,
          {
            backgroundColor: pressed
              ? theme.colors.neutral[100]
              : theme.colors.background.primary,
          },
        ]}
      >
        <View
          style={[
            styles.eventIndicator,
            { backgroundColor: typeColors[event.type] },
          ]}
        />
        <View style={styles.eventContentCompact}>
          <Text
            variant="bodySmall"
            color={theme.colors.text.primary}
            style={{ fontWeight: '500' }}
            numberOfLines={1}
          >
            {event.title}
          </Text>
          <Caption color={theme.colors.text.tertiary}>
            {formatTime()}
            {event.location && ` • ${event.location}`}
          </Caption>
        </View>
        {event.requiresAction && (
          <View
            style={[
              styles.actionBadge,
              { backgroundColor: theme.colors.accent[500] },
            ]}
          >
            <Text variant="caption" color={theme.colors.text.inverse}>
              Action
            </Text>
          </View>
        )}
      </Pressable>
    );
  }

  return (
    <Card variant="elevated" onPress={onPress} style={styles.eventItem}>
      <View style={styles.eventHeader}>
        <View
          style={[
            styles.eventTypeIcon,
            { backgroundColor: typeColors[event.type] + '20' },
          ]}
        >
          <Text style={{ fontSize: 20 }}>{typeIcons[event.type]}</Text>
        </View>
        <View style={styles.eventInfo}>
          <Text
            variant="body"
            color={theme.colors.text.primary}
            style={{ fontWeight: '600' }}
          >
            {event.title}
          </Text>
          <Caption color={theme.colors.text.secondary}>
            {formatTime()}
            {event.location && ` • ${event.location}`}
          </Caption>
        </View>
      </View>
      {event.description && (
        <Text
          variant="bodySmall"
          color={theme.colors.text.secondary}
          style={styles.eventDescription}
          numberOfLines={2}
        >
          {event.description}
        </Text>
      )}
    </Card>
  );
}

// Week view mini calendar
export interface WeekViewProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  eventDates: Date[];
}

export function WeekView({
  selectedDate,
  onSelectDate,
  eventDates,
}: WeekViewProps) {
  const theme = useTheme();

  // Get week days starting from Sunday
  const getWeekDays = () => {
    const days: Date[] = [];
    const start = new Date(selectedDate);
    start.setDate(start.getDate() - start.getDay());

    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const weekDays = getWeekDays();
  const today = new Date();
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const hasEvent = (date: Date) =>
    eventDates.some((d) => d.toDateString() === date.toDateString());

  return (
    <View style={styles.weekView}>
      {weekDays.map((day, index) => {
        const isToday = day.toDateString() === today.toDateString();
        const isSelected = day.toDateString() === selectedDate.toDateString();
        const hasEvents = hasEvent(day);

        return (
          <Pressable
            key={index}
            onPress={() => onSelectDate(day)}
            style={[
              styles.weekDay,
              isSelected && {
                backgroundColor: theme.colors.primary[500],
              },
              isToday &&
                !isSelected && {
                  borderColor: theme.colors.primary[500],
                  borderWidth: 2,
                },
            ]}
          >
            <Caption
              color={
                isSelected
                  ? theme.colors.text.inverse
                  : theme.colors.text.tertiary
              }
            >
              {dayLabels[index]}
            </Caption>
            <Text
              variant="body"
              color={
                isSelected
                  ? theme.colors.text.inverse
                  : theme.colors.text.primary
              }
              style={{ fontWeight: isToday || isSelected ? '600' : '400' }}
            >
              {day.getDate()}
            </Text>
            {hasEvents && (
              <View
                style={[
                  styles.eventDot,
                  {
                    backgroundColor: isSelected
                      ? theme.colors.text.inverse
                      : theme.colors.primary[500],
                  },
                ]}
              />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

// Month selector
export interface MonthSelectorProps {
  currentDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export function MonthSelector({
  currentDate,
  onPrevMonth,
  onNextMonth,
}: MonthSelectorProps) {
  const theme = useTheme();

  const monthYear = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <View style={styles.monthSelector}>
      <Pressable onPress={onPrevMonth} style={styles.monthArrow}>
        <Text variant="h4" color={theme.colors.primary[600]}>
          ‹
        </Text>
      </Pressable>
      <Text variant="h3" color={theme.colors.text.primary}>
        {monthYear}
      </Text>
      <Pressable onPress={onNextMonth} style={styles.monthArrow}>
        <Text variant="h4" color={theme.colors.primary[600]}>
          ›
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // Day summary
  daySummary: {
    marginBottom: 16,
  },
  daySummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyDay: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  eventsList: {
    gap: 8,
  },

  // Event item
  eventItem: {
    marginBottom: 12,
  },
  eventItemCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  eventIndicator: {
    width: 4,
    height: 36,
    borderRadius: 2,
    marginRight: 12,
  },
  eventContentCompact: {
    flex: 1,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventTypeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  eventInfo: {
    flex: 1,
  },
  eventDescription: {
    marginTop: 8,
  },
  actionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },

  // Week view
  weekView: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  weekDay: {
    width: 44,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    gap: 2,
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Month selector
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 16,
  },
  monthArrow: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
