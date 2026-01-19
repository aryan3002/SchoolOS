/**
 * Action Card Component
 *
 * Visually distinct "Action Required" cards
 * Deadline countdown, one-tap actions
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, Caption } from './Text';
import { Button } from './Button';
import { Card } from './Card';
import { useTheme } from '@/theme';
import { Ionicons } from '@expo/vector-icons';

export type ActionUrgency = 'low' | 'medium' | 'high' | 'critical';
export type ActionType = 'form' | 'payment' | 'permission' | 'meeting' | 'document' | 'other';

export interface ActionItem {
  id: string;
  title: string;
  description?: string;
  type: ActionType;
  urgency: ActionUrgency;
  /** Preferred due date field */
  dueDate?: Date | string;
  /** Some mock data uses deadline instead of dueDate; accept either */
  deadline?: Date | string;
  childName?: string;
  quickAction?: {
    label: string;
    onPress: () => void;
  };
  quickActions?: Array<{
    id: string;
    label: string;
    variant?: 'primary' | 'outline';
  }>;
}

export interface ActionCardProps {
  action: ActionItem;
  onPress?: () => void;
  onQuickAction?: (quickActionId?: string) => void;
}

export function ActionCard({ action, onPress, onQuickAction }: ActionCardProps) {
  const theme = useTheme();

  const resolvedDueDate = (() => {
    const dateValue = action.dueDate ?? action.deadline;
    if (!dateValue) return null;
    if (dateValue instanceof Date) return dateValue;
    const parsed = new Date(dateValue);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  })();

  const getUrgencyColor = () => {
    switch (action.urgency) {
      case 'critical':
        return theme.colors.error[500];
      case 'high':
        return theme.colors.accent[500];
      case 'medium':
        return theme.colors.warning[500];
      default:
        return theme.colors.primary[500];
    }
  };

  const getTypeIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (action.type) {
      case 'form':
        return 'document-text-outline';
      case 'payment':
        return 'card-outline';
      case 'permission':
        return 'checkmark-circle-outline';
      case 'meeting':
        return 'calendar-outline';
      case 'document':
        return 'folder-outline';
      default:
        return 'ellipse-outline';
    }
  };

  const getTimeRemaining = () => {
    if (!resolvedDueDate) {
      return { text: 'No due date', isOverdue: false };
    }

    const now = new Date();
    const diff = resolvedDueDate.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (diff < 0) {
      return { text: 'Overdue', isOverdue: true };
    }
    if (days === 0) {
      if (hours === 0) {
        return { text: 'Due now', isOverdue: false };
      }
      return { text: `${hours}h left`, isOverdue: false };
    }
    if (days === 1) {
      return { text: 'Tomorrow', isOverdue: false };
    }
    if (days <= 7) {
      return { text: `${days} days left`, isOverdue: false };
    }
    return { text: formatDate(resolvedDueDate), isOverdue: false };
  };

  const timeRemaining = getTimeRemaining();
  const urgencyColor = getUrgencyColor();

  return (
    <Pressable onPress={onPress}>
      <Card
        variant="elevated"
        shadow="md"
        style={[
          styles.card,
          {
            borderLeftWidth: 4,
            borderLeftColor: urgencyColor,
          },
        ]}
      >
        <View style={styles.header}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${urgencyColor}15` },
            ]}
          >
            <Ionicons
              name={getTypeIcon()}
              size={20}
              color={urgencyColor}
            />
          </View>

          <View style={styles.headerText}>
            {action.childName && (
              <Caption color={theme.colors.text.tertiary}>
                For {action.childName}
              </Caption>
            )}
            <Text variant="h4" numberOfLines={2}>
              {action.title}
            </Text>
          </View>

          <View style={styles.deadline}>
            <Text
              variant="caption"
              color={timeRemaining.isOverdue ? theme.colors.error[500] : urgencyColor}
              style={{ fontWeight: '600' }}
            >
              {timeRemaining.text}
            </Text>
          </View>
        </View>

        {action.description && (
          <Text
            variant="bodySmall"
            color={theme.colors.text.secondary}
            numberOfLines={2}
            style={styles.description}
          >
            {action.description}
          </Text>
        )}

        {action.quickAction && (
          <View style={styles.quickActionContainer}>
            <Button
              title={action.quickAction.label}
              variant="primary"
              size="sm"
              onPress={() => {
                action.quickAction?.onPress();
                onQuickAction?.();
              }}
            />
          </View>
        )}

        {action.quickActions && action.quickActions.length > 0 && (
          <View style={styles.quickActionContainer}>
            {action.quickActions.map((qa) => (
              <View key={qa.id} style={{ marginRight: 8 }}>
                <Button
                  title={qa.label}
                  variant={qa.variant ?? 'primary'}
                  size="sm"
                  onPress={() => onQuickAction?.(qa.id)}
                />
              </View>
            ))}
          </View>
        )}
      </Card>
    </Pressable>
  );
}

// Compact Action List Item
export interface ActionListItemProps {
  action: ActionItem;
  onPress?: () => void;
}

export function ActionListItem({ action, onPress }: ActionListItemProps) {
  const theme = useTheme();

  const resolvedDueDate = (() => {
    const dateValue = action.dueDate ?? action.deadline;
    if (!dateValue) return null;
    if (dateValue instanceof Date) return dateValue;
    const parsed = new Date(dateValue);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  })();

  const getUrgencyColor = () => {
    switch (action.urgency) {
      case 'critical':
        return theme.colors.error[500];
      case 'high':
        return theme.colors.accent[500];
      default:
        return theme.colors.warning[500];
    }
  };

  const timeRemaining = getTimeRemaining(resolvedDueDate);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.listItem,
        pressed && { opacity: 0.7 },
      ]}
    >
      <View
        style={[
          styles.urgencyDot,
          { backgroundColor: getUrgencyColor() },
        ]}
      />
      <View style={styles.listItemContent}>
        <Text variant="body" numberOfLines={1}>
          {action.title}
        </Text>
        {action.childName && (
          <Caption color={theme.colors.text.tertiary}>
            {action.childName}
          </Caption>
        )}
      </View>
      <Text
        variant="caption"
        color={getUrgencyColor()}
        style={{ fontWeight: '600' }}
      >
        {timeRemaining}
      </Text>
      <Ionicons
        name="chevron-forward"
        size={16}
        color={theme.colors.text.tertiary}
      />
    </Pressable>
  );
}

// Helper functions
function formatDate(date: Date): string {
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
}

function getTimeRemaining(dueDate: Date | null): string {
  if (!dueDate) return 'No due date';
  const now = new Date();
  const diff = dueDate.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (diff < 0) return 'Overdue';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days <= 7) return `${days}d`;
  return formatDate(dueDate);
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  deadline: {
    marginLeft: 8,
  },
  description: {
    marginTop: 8,
    marginLeft: 52,
  },
  quickActionContainer: {
    marginTop: 12,
    alignItems: 'flex-start',
    marginLeft: 52,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  urgencyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  listItemContent: {
    flex: 1,
  },
});
