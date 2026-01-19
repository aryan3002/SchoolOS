/**
 * Button Component
 *
 * Primary interaction element with multiple variants
 * Follows iOS HIG with haptic feedback
 */

import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Text } from './Text';
import { useTheme } from '@/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<TouchableOpacityProps, 'children'> {
  /** Button text */
  title: string;
  /** Button variant */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Loading state */
  loading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Left icon component */
  leftIcon?: React.ReactNode;
  /** Right icon component */
  rightIcon?: React.ReactNode;
  /** Full width button */
  fullWidth?: boolean;
  /** Enable haptic feedback */
  haptic?: boolean;
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  haptic = true,
  onPress,
  style,
  ...props
}: ButtonProps) {
  const theme = useTheme();

  const handlePress = async (event: any) => {
    if (haptic && !disabled && !loading) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.(event);
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          container: {
            backgroundColor: disabled
              ? theme.colors.neutral[300]
              : theme.colors.primary[500],
          },
          text: { color: theme.colors.text.inverse },
        };
      case 'secondary':
        return {
          container: {
            backgroundColor: disabled
              ? theme.colors.neutral[200]
              : theme.colors.primary[100],
          },
          text: {
            color: disabled
              ? theme.colors.neutral[500]
              : theme.colors.primary[700],
          },
        };
      case 'outline':
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderColor: disabled
              ? theme.colors.neutral[300]
              : theme.colors.primary[500],
          },
          text: {
            color: disabled
              ? theme.colors.neutral[500]
              : theme.colors.primary[500],
          },
        };
      case 'ghost':
        return {
          container: {
            backgroundColor: 'transparent',
          },
          text: {
            color: disabled
              ? theme.colors.neutral[500]
              : theme.colors.primary[500],
          },
        };
      case 'danger':
        return {
          container: {
            backgroundColor: disabled
              ? theme.colors.neutral[300]
              : theme.colors.error[500],
          },
          text: { color: theme.colors.text.inverse },
        };
      default:
        return {
          container: {},
          text: {},
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          container: {
            height: theme.layout.buttonHeightSmall,
            paddingHorizontal: theme.spacing[3],
            borderRadius: theme.borderRadius.md,
          },
          text: theme.textStyles.buttonSmall,
        };
      case 'lg':
        return {
          container: {
            height: 56,
            paddingHorizontal: theme.spacing[6],
            borderRadius: theme.borderRadius.xl,
          },
          text: theme.textStyles.button,
        };
      default:
        return {
          container: {
            height: theme.layout.buttonHeight,
            paddingHorizontal: theme.spacing[5],
            borderRadius: theme.borderRadius.lg,
          },
          text: theme.textStyles.button,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[
        styles.container,
        sizeStyles.container,
        variantStyles.container,
        fullWidth && styles.fullWidth,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variantStyles.text.color}
        />
      ) : (
        <View style={styles.content}>
          {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
          <Text
            variant={size === 'sm' ? 'buttonSmall' : 'button'}
            style={[sizeStyles.text, variantStyles.text]}
          >
            {title}
          </Text>
          {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },
});
