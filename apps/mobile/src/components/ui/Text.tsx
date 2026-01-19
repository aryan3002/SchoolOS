/**
 * Text Component
 *
 * Typography component with pre-defined styles
 * Supports all text style variants from design system
 */

import React from 'react';
import {
  Text as RNText,
  TextProps as RNTextProps,
  StyleSheet,
  TextStyle,
} from 'react-native';
import { useTheme, TextStyleKey, textStyles } from '@/theme';

export interface TextProps extends RNTextProps {
  /** Text style variant */
  variant?: TextStyleKey;
  /** Text color override */
  color?: string;
  /** Text alignment */
  align?: TextStyle['textAlign'];
  /** Children text content */
  children: React.ReactNode;
}

export function Text({
  variant = 'body',
  color,
  align,
  style,
  children,
  ...props
}: TextProps) {
  const theme = useTheme();
  const textStyle = textStyles[variant];

  return (
    <RNText
      style={[
        textStyle,
        {
          color: color || theme.colors.text.primary,
          textAlign: align,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
}

// Convenience components
export function Heading1(props: Omit<TextProps, 'variant'>) {
  return <Text variant="h1" {...props} />;
}

export function Heading2(props: Omit<TextProps, 'variant'>) {
  return <Text variant="h2" {...props} />;
}

export function Heading3(props: Omit<TextProps, 'variant'>) {
  return <Text variant="h3" {...props} />;
}

export function Heading4(props: Omit<TextProps, 'variant'>) {
  return <Text variant="h4" {...props} />;
}

export function BodyText(props: Omit<TextProps, 'variant'>) {
  return <Text variant="body" {...props} />;
}

export function Caption(props: Omit<TextProps, 'variant'>) {
  return <Text variant="caption" color={props.color} {...props} />;
}

export function Label(props: Omit<TextProps, 'variant'>) {
  return <Text variant="label" {...props} />;
}
