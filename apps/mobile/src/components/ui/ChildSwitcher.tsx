/**
 * Child Switcher Component
 *
 * Persistent, one-tap child switcher for parents with multiple children
 */

import React from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Text, Caption } from './Text';
import { useTheme } from '@/theme';

export interface Child {
  id: string;
  firstName: string;
  lastName: string;
  gradeLevel: string;
  schoolName: string;
  avatarUrl?: string;
  initials?: string;
}

export interface ChildSwitcherProps {
  children: Child[];
  selectedChildId: string;
  onSelectChild: (childId: string) => void;
}

export function ChildSwitcher({
  children: childrenList,
  selectedChildId,
  onSelectChild,
}: ChildSwitcherProps) {
  const theme = useTheme();

  if (childrenList.length <= 1) {
    return null; // No switcher needed for single child
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {childrenList.map((child) => {
        const isSelected = child.id === selectedChildId;
        const initials =
          child.initials ||
          `${child.firstName[0]}${child.lastName[0]}`.toUpperCase();

        return (
          <Pressable
            key={child.id}
            onPress={() => onSelectChild(child.id)}
            style={({ pressed }) => [
              styles.childItem,
              isSelected && {
                backgroundColor: theme.colors.primary[50],
                borderColor: theme.colors.primary[500],
              },
              !isSelected && {
                backgroundColor: theme.colors.background.secondary,
                borderColor: 'transparent',
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: isSelected
                    ? theme.colors.primary[500]
                    : theme.colors.neutral[300],
                },
              ]}
            >
              <Text
                variant="body"
                color={
                  isSelected
                    ? theme.colors.text.inverse
                    : theme.colors.text.secondary
                }
                style={{ fontWeight: '600' }}
              >
                {initials}
              </Text>
            </View>
            <View style={styles.childInfo}>
              <Text
                variant="bodySmall"
                color={
                  isSelected
                    ? theme.colors.primary[700]
                    : theme.colors.text.primary
                }
                style={{ fontWeight: isSelected ? '600' : '400' }}
              >
                {child.firstName}
              </Text>
              <Caption
                color={
                  isSelected
                    ? theme.colors.primary[600]
                    : theme.colors.text.tertiary
                }
              >
                {child.gradeLevel}
              </Caption>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// Compact variant for header
export interface ChildChipProps {
  child: Child;
  onPress?: () => void;
}

export function ChildChip({ child, onPress }: ChildChipProps) {
  const theme = useTheme();
  const initials =
    child.initials ||
    `${child.firstName[0]}${child.lastName[0]}`.toUpperCase();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: theme.colors.primary[50] },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View
        style={[
          styles.chipAvatar,
          { backgroundColor: theme.colors.primary[500] },
        ]}
      >
        <Text
          variant="caption"
          color={theme.colors.text.inverse}
          style={{ fontWeight: '600' }}
        >
          {initials}
        </Text>
      </View>
      <Text
        variant="bodySmall"
        color={theme.colors.primary[700]}
        style={{ fontWeight: '500' }}
      >
        {child.firstName}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  childItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    marginRight: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  childInfo: {
    minWidth: 60,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
    gap: 6,
  },
  chipAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
