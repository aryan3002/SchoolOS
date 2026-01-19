/**
 * Chat Bubble Components
 *
 * Conversation interface following design system:
 * - User messages: Right-aligned, subtle background
 * - AI responses: Left-aligned, clearly from "District"
 * - Citation chips inline (tap to expand source)
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Text, Caption } from './Text';
import { useTheme } from '@/theme';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface Citation {
  sourceId: string;
  sourceTitle: string;
  quote?: string;
  pageNumber?: number;
}

export interface ChatBubbleProps {
  /** Message content */
  message: string;
  /** Message role */
  role: 'user' | 'assistant';
  /** Timestamp */
  timestamp?: Date;
  /** Citations for assistant messages */
  citations?: Citation[];
  /** Loading state */
  isLoading?: boolean;
  /** Confidence level for assistant */
  confidence?: 'high' | 'medium' | 'low';
  /** Suggested follow-ups */
  suggestedFollowUps?: string[];
  /** Callback for follow-up selection */
  onFollowUpPress?: (question: string) => void;
  /** Callback for citation tap */
  onCitationPress?: (citation: Citation) => void;
}

export function ChatBubble({
  message,
  role,
  timestamp,
  citations,
  isLoading,
  confidence,
  suggestedFollowUps,
  onFollowUpPress,
  onCitationPress,
}: ChatBubbleProps) {
  const theme = useTheme();
  const isUser = role === 'user';

  return (
    <View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.assistantContainer,
      ]}
    >
      {/* District avatar for assistant messages */}
      {!isUser && (
        <View
          style={[
            styles.avatar,
            { backgroundColor: theme.colors.primary[100] },
          ]}
        >
          <Text
            variant="caption"
            color={theme.colors.primary[700]}
            style={styles.avatarText}
          >
            S
          </Text>
        </View>
      )}

      <View
        style={[
          styles.bubbleWrapper,
          isUser ? styles.userBubbleWrapper : styles.assistantBubbleWrapper,
        ]}
      >
        {/* Assistant label */}
        {!isUser && (
          <Caption
            color={theme.colors.text.tertiary}
            style={styles.senderLabel}
          >
            SchoolOS Assistant
          </Caption>
        )}

        {/* Message bubble */}
        <View
          style={[
            styles.bubble,
            isUser
              ? {
                  backgroundColor: theme.colors.primary[500],
                  borderBottomRightRadius: theme.borderRadius.sm,
                }
              : {
                  backgroundColor: theme.colors.background.secondary,
                  borderBottomLeftRadius: theme.borderRadius.sm,
                },
            { borderRadius: theme.borderRadius.xl },
          ]}
        >
          {isLoading ? (
            <TypingIndicator />
          ) : (
            <Text
              variant="body"
              color={isUser ? theme.colors.text.inverse : theme.colors.text.primary}
            >
              {message}
            </Text>
          )}
        </View>

        {/* Citations */}
        {citations && citations.length > 0 && (
          <View style={styles.citationsContainer}>
            {citations.map((citation, index) => (
              <CitationChip
                key={citation.sourceId}
                citation={citation}
                onPress={() => onCitationPress?.(citation)}
              />
            ))}
          </View>
        )}

        {/* Confidence indicator */}
        {!isUser && confidence && confidence !== 'high' && (
          <View style={styles.confidenceContainer}>
            <Caption color={theme.colors.text.tertiary}>
              {confidence === 'medium'
                ? 'Based on available information'
                : 'I found this, but please verify with the office'}
            </Caption>
          </View>
        )}

        {/* Suggested follow-ups */}
        {suggestedFollowUps && suggestedFollowUps.length > 0 && (
          <View style={styles.followUpsContainer}>
            {suggestedFollowUps.map((question, index) => (
              <FollowUpChip
                key={index}
                question={question}
                onPress={() => onFollowUpPress?.(question)}
              />
            ))}
          </View>
        )}

        {/* Timestamp */}
        {timestamp && (
          <Caption
            color={theme.colors.text.tertiary}
            style={styles.timestamp}
          >
            {formatTime(timestamp)}
          </Caption>
        )}
      </View>
    </View>
  );
}

// Citation Chip Component
export interface CitationChipProps {
  citation: Citation;
  onPress?: () => void;
}

export function CitationChip({ citation, onPress }: CitationChipProps) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  const handlePress = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
    if (!expanded) {
      onPress?.();
    }
  };

  return (
    <Pressable onPress={handlePress}>
      <View
        style={[
          styles.citationChip,
          {
            backgroundColor: theme.colors.primary[50],
            borderColor: theme.colors.primary[200],
          },
        ]}
      >
        <Caption color={theme.colors.primary[700]}>
          📄 {citation.sourceTitle}
          {citation.pageNumber && ` (p.${citation.pageNumber})`}
        </Caption>
        {expanded && citation.quote && (
          <Text
            variant="bodySmall"
            color={theme.colors.text.secondary}
            style={styles.citationQuote}
          >
            "{citation.quote}"
          </Text>
        )}
      </View>
    </Pressable>
  );
}

// Follow-up Chip Component
interface FollowUpChipProps {
  question: string;
  onPress?: () => void;
}

function FollowUpChip({ question, onPress }: FollowUpChipProps) {
  const theme = useTheme();

  return (
    <Pressable onPress={onPress}>
      <View
        style={[
          styles.followUpChip,
          {
            backgroundColor: theme.colors.background.primary,
            borderColor: theme.colors.primary[300],
          },
        ]}
      >
        <Text variant="bodySmall" color={theme.colors.primary[600]}>
          {question}
        </Text>
      </View>
    </Pressable>
  );
}

// Suggested Question Component (used in header empty state)
export interface SuggestedQuestionProps {
  question: string;
  onPress?: () => void;
}

export function SuggestedQuestion({ question, onPress }: SuggestedQuestionProps) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress}>
      <View
        style={[
          styles.suggestedQuestion,
          {
            borderColor: theme.colors.neutral[200],
            backgroundColor: theme.colors.background.secondary,
          },
        ]}
      >
        <Text variant="bodySmall" color={theme.colors.text.primary}>
          {question}
        </Text>
      </View>
    </Pressable>
  );
}

// Typing Indicator Component
export interface TypingIndicatorProps {
  size?: 'small' | 'medium';
}

export function TypingIndicator({ size = 'medium' }: TypingIndicatorProps) {
  const theme = useTheme();
  const dotSize = size === 'small' ? 6 : 8;

  return (
    <View style={styles.typingIndicator}>
      <View style={[styles.dot, { width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: theme.colors.neutral[400] }]} />
      <View style={[styles.dot, { width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: theme.colors.neutral[400] }]} />
      <View style={[styles.dot, { width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: theme.colors.neutral[400] }]} />
    </View>
  );
}

// Helper function to format time
function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// Convenience exports for user/assistant bubbles
export function UserBubble(props: Omit<ChatBubbleProps, 'role'>) {
  return <ChatBubble {...props} role="user" />;
}

export function AssistantBubble(props: Omit<ChatBubbleProps, 'role'>) {
  return <ChatBubble {...props} role="assistant" />;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  assistantContainer: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarText: {
    fontWeight: '600',
  },
  bubbleWrapper: {
    maxWidth: '80%',
  },
  userBubbleWrapper: {
    alignItems: 'flex-end',
  },
  assistantBubbleWrapper: {
    alignItems: 'flex-start',
  },
  senderLabel: {
    marginBottom: 4,
    marginLeft: 12,
  },
  bubble: {
    padding: 12,
    paddingHorizontal: 16,
  },
  citationsContainer: {
    marginTop: 8,
    gap: 4,
  },
  citationChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  citationQuote: {
    marginTop: 4,
    fontStyle: 'italic',
  },
  confidenceContainer: {
    marginTop: 6,
    marginLeft: 4,
  },
  followUpsContainer: {
    marginTop: 12,
    gap: 6,
  },
  followUpChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  suggestedQuestion: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  timestamp: {
    marginTop: 4,
    marginLeft: 12,
  },
  typingIndicator: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
