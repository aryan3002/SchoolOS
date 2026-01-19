/**
 * Card Component
 *
 * Container component with gentle shadows
 * Creates depth and aids scanning
 */

import React from 'react';
import {
  View,
  ViewProps,
  StyleSheet,
  Pressable,
  PressableProps,
} from 'react-native';
import { useTheme, ShadowKey } from '@/theme';

export interface CardProps extends ViewProps {
  /** Shadow depth */
  shadow?: ShadowKey;
  /** Padding variant */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Border radius variant */
  radius?: 'sm' | 'md' | 'lg' | 'xl';
  /** Card variant */
  variant?: 'default' | 'outlined' | 'elevated';
  /** Background color override */
  backgroundColor?: string;
  /** Children content */
  children: React.ReactNode;
}

export function Card({
  shadow = 'md',
  padding = 'md',
  radius = 'xl',
  variant = 'default',
  backgroundColor,
  style,
  children,
  ...props
}: CardProps) {
  const theme = useTheme();

  const getPadding = () => {
    switch (padding) {
      case 'none':
        return 0;
      case 'sm':
        return theme.spacing[3];
      case 'lg':
        return theme.spacing[5];
      default:
        return theme.spacing[4];
    }
  };

  const getRadius = () => {
    return theme.borderRadius[radius];
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'outlined':
        return {
          borderWidth: 1,
          borderColor: theme.colors.border.light,
          ...theme.shadows.none,
        };
      case 'elevated':
        return theme.shadows.lg;
      default:
        return theme.shadows[shadow];
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: backgroundColor || theme.colors.background.primary,
          padding: getPadding(),
          borderRadius: getRadius(),
        },
        getVariantStyles(),
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

// Pressable Card variant
export interface PressableCardProps extends CardProps {
  onPress?: PressableProps['onPress'];
  onLongPress?: PressableProps['onLongPress'];
}

export function PressableCard({
  onPress,
  onLongPress,
  style,
  children,
  ...cardProps
}: PressableCardProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
      ]}
    >
      <Card style={style} {...cardProps}>
        {children}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
});
