/**
 * Input Components
 *
 * Text input, search input, and chat input for the mobile app
 */

import React, { useState, useRef } from 'react';
import {
  View,
  TextInput as RNTextInput,
  StyleSheet,
  Pressable,
  TextInputProps as RNTextInputProps,
  Animated,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Text, Caption } from './Text';
import { useTheme } from '@/theme';

export interface TextInputProps extends Omit<RNTextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  disabled?: boolean;
}

export function TextInput({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  disabled,
  onFocus,
  onBlur,
  ...props
}: TextInputProps) {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  return (
    <View style={styles.inputContainer}>
      {label && (
        <Text
          variant="label"
          color={
            error
              ? theme.colors.error[600]
              : isFocused
                ? theme.colors.primary[600]
                : theme.colors.text.secondary
          }
          style={styles.label}
        >
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputWrapper,
          {
            borderColor: error
              ? theme.colors.error[500]
              : isFocused
                ? theme.colors.primary[500]
                : theme.colors.neutral[200],
            backgroundColor: disabled
              ? theme.colors.neutral[100]
              : theme.colors.background.primary,
          },
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <RNTextInput
          style={[
            styles.input,
            {
              color: theme.colors.text.primary,
              paddingLeft: leftIcon ? 0 : 16,
              paddingRight: rightIcon ? 0 : 16,
            },
          ]}
          placeholderTextColor={theme.colors.text.tertiary}
          editable={!disabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>
      {(error || hint) && (
        <Caption
          color={error ? theme.colors.error[600] : theme.colors.text.tertiary}
          style={styles.hint}
        >
          {error || hint}
        </Caption>
      )}
    </View>
  );
}

// Chat Input - Primary AI entry point
export interface ChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
}

export function ChatInput({
  value,
  onChangeText,
  onSend,
  placeholder = 'Ask anything about your child...',
  disabled,
  isLoading,
}: ChatInputProps) {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<RNTextInput>(null);

  const handleSend = () => {
    if (value.trim() && !disabled && !isLoading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onSend();
    }
  };

  const canSend = value.trim().length > 0 && !disabled && !isLoading;

  return (
    <View
      style={[
        styles.chatInputContainer,
        {
          backgroundColor: theme.colors.background.primary,
          borderTopColor: theme.colors.neutral[200],
        },
      ]}
    >
      <View
        style={[
          styles.chatInputWrapper,
          {
            backgroundColor: theme.colors.neutral[100],
            borderColor: isFocused
              ? theme.colors.primary[500]
              : 'transparent',
          },
        ]}
      >
        <RNTextInput
          ref={inputRef}
          style={[
            styles.chatInput,
            { color: theme.colors.text.primary },
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.text.tertiary}
          editable={!disabled}
          multiline
          maxLength={1000}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={handleSend}
        />
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          style={({ pressed }) => [
            styles.sendButton,
            {
              backgroundColor: canSend
                ? theme.colors.primary[500]
                : theme.colors.neutral[300],
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          {isLoading ? (
            <LoadingDots color={theme.colors.text.inverse} />
          ) : (
            <SendIcon color={theme.colors.text.inverse} />
          )}
        </Pressable>
      </View>
      <Caption
        color={theme.colors.text.tertiary}
        style={styles.chatHint}
      >
        AI responses are verified with district records
      </Caption>
    </View>
  );
}

// Mini floating input for home screen
export interface QuickAskInputProps {
  onPress: () => void;
  placeholder?: string;
}

export function QuickAskInput({
  onPress,
  placeholder = 'Ask anything about your child...',
}: QuickAskInputProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.quickAskContainer,
        {
          backgroundColor: theme.colors.background.primary,
          shadowColor: theme.colors.primary[900],
          borderColor: theme.colors.primary[100],
        },
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
    >
      <View
        style={[
          styles.quickAskIcon,
          { backgroundColor: theme.colors.primary[500] },
        ]}
      >
        <SearchIcon color={theme.colors.text.inverse} size={20} />
      </View>
      <Text variant="body" color={theme.colors.text.tertiary}>
        {placeholder}
      </Text>
    </Pressable>
  );
}

// Helper components
function SendIcon({ color }: { color: string }) {
  return (
    <View style={{ transform: [{ rotate: '-45deg' }] }}>
      <Text style={{ color, fontSize: 18 }}>➤</Text>
    </View>
  );
}

function SearchIcon({ color, size = 24 }: { color: string; size?: number }) {
  return <Text style={{ color, fontSize: size }}>🔍</Text>;
}

function LoadingDots({ color }: { color: string }) {
  const [dots] = useState(() => [
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]);

  React.useEffect(() => {
    const animations = dots.map((dot, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 150),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      )
    );

    Animated.parallel(animations).start();

    return () => {
      dots.forEach((dot) => dot.stopAnimation());
    };
  }, []);

  return (
    <View style={styles.loadingDots}>
      {dots.map((dot, index) => (
        <Animated.View
          key={index}
          style={[
            styles.dot,
            { backgroundColor: color },
            { opacity: dot },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 6,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    minHeight: 48,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    lineHeight: 22,
  },
  leftIcon: {
    paddingLeft: 12,
    paddingRight: 8,
  },
  rightIcon: {
    paddingRight: 12,
    paddingLeft: 8,
  },
  hint: {
    marginTop: 4,
    marginLeft: 4,
  },
  // Chat input styles
  chatInputContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    borderTopWidth: 1,
  },
  chatInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    borderWidth: 2,
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 4,
    minHeight: 48,
    maxHeight: 120,
  },
  chatInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  chatHint: {
    textAlign: 'center',
    marginTop: 8,
  },
  // Quick ask styles
  quickAskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    gap: 12,
  },
  quickAskIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Loading dots
  loadingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
