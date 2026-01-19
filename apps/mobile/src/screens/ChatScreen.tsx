/**
 * Chat Screen - Conversation Interface
 *
 * "Conversation replaces navigation"
 * - Answer first, source second
 * - Every AI answer shows sources as clickable chips
 * - Progressive disclosure of complexity
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/theme';
import {
  Text,
  ChatInput,
  ChatBubble,
  TypingIndicator,
  SuggestedQuestion,
  ChildChip,
} from '@/components/ui';
import type { Citation, Child } from '@/components/ui';

// Message type
interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  citations?: Citation[];
  followUpQuestions?: string[];
  confidenceScore?: number;
}

// Mock data
const mockChild: Child = {
  id: '1',
  firstName: 'Emma',
  lastName: 'Johnson',
  gradeLevel: '5th Grade',
  schoolName: 'Lincoln Elementary',
};

const suggestedQuestions = [
  'How is Emma doing in math this week?',
  "What's coming up on the calendar?",
  'Does Emma have any missing assignments?',
  "How's her attendance this semester?",
];

export function ChatScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  // Handle initial question from params
  useEffect(() => {
    if (params.question && typeof params.question === 'string') {
      handleSendMessage(params.question);
    }
  }, [params.question]);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const handleSendMessage = async (text?: string) => {
    const messageText = text || inputValue.trim();
    if (!messageText || isLoading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageText,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setShowSuggestions(false);
    setIsLoading(true);
    scrollToEnd();

    // Simulate AI response
    await simulateAIResponse(messageText);
    setIsLoading(false);
    scrollToEnd();
  };

  const simulateAIResponse = async (query: string) => {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000));

    // Generate mock response based on query
    const response = generateMockResponse(query);

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      content: response.content,
      role: 'assistant',
      timestamp: new Date(),
      citations: response.citations,
      followUpQuestions: response.followUpQuestions,
      confidenceScore: response.confidenceScore,
    };

    setMessages((prev) => [...prev, assistantMessage]);
  };

  const generateMockResponse = (query: string): Omit<Message, 'id' | 'timestamp' | 'role'> => {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('math') || lowerQuery.includes('grade')) {
      return {
        content:
          "Emma is doing well in math! Her current grade is a B+ (87%). She's shown improvement in her multiplication facts and is now working on fractions. Her most recent test on Wednesday was an 89%.",
        citations: [
          { id: '1', title: 'Math Gradebook', source: 'Ms. Peterson - Math' },
          { id: '2', title: 'Test: Multiplication', source: 'March 6, 2024' },
        ],
        followUpQuestions: [
          'What topics is she struggling with?',
          'When is her next math test?',
          'How can I help her with fractions at home?',
        ],
        confidenceScore: 0.95,
      };
    }

    if (lowerQuery.includes('calendar') || lowerQuery.includes('coming up') || lowerQuery.includes('schedule')) {
      return {
        content:
          "Here's what's coming up for Emma:\n\n📅 **This Week:**\n• Math Test - Friday, March 15\n• Science Museum Field Trip - Monday, March 18\n• Spring Photos - Wednesday, March 20\n\n📋 **Action Needed:**\n• Field trip permission slip due by March 13",
        citations: [
          { id: '1', title: 'School Calendar', source: 'Lincoln Elementary' },
          { id: '2', title: 'Class Schedule', source: 'Ms. Peterson' },
        ],
        followUpQuestions: [
          'What should Emma bring for the field trip?',
          "How's she preparing for the math test?",
          'Are spring photos mandatory?',
        ],
        confidenceScore: 0.98,
      };
    }

    if (lowerQuery.includes('missing') || lowerQuery.includes('assignment') || lowerQuery.includes('homework')) {
      return {
        content:
          'Great news! Emma has no missing assignments. All her work is turned in and up to date. She has 3 assignments due this week that she can work on:\n\n• Reading Response - Due Tuesday\n• Math Worksheet (Fractions) - Due Thursday\n• Science Journal Entry - Due Friday',
        citations: [
          { id: '1', title: 'Assignment Tracker', source: 'All Classes' },
        ],
        followUpQuestions: [
          "What's the reading assignment about?",
          'How long should the science journal be?',
        ],
        confidenceScore: 0.99,
      };
    }

    if (lowerQuery.includes('attendance')) {
      return {
        content:
          "Emma's attendance this semester is excellent at 98%. She has been present for 45 out of 46 school days. The one absence was on February 12th (excused - sick day).",
        citations: [
          { id: '1', title: 'Attendance Record', source: 'Spring 2024' },
        ],
        followUpQuestions: [
          'How does this compare to last semester?',
          'What happens if attendance drops?',
        ],
        confidenceScore: 0.97,
      };
    }

    // Default response
    return {
      content:
        "I can help you with information about Emma's academics, schedule, attendance, and school activities. What would you like to know?",
      followUpQuestions: [
        "How is she doing in her classes?",
        "What's on the calendar this week?",
        'Does she have any missing work?',
      ],
      confidenceScore: 0.85,
    };
  };

  const handleSuggestionPress = (question: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleSendMessage(question);
  };

  const handleFollowUpPress = (question: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleSendMessage(question);
  };

  const handleCitationPress = (citation: Citation) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('Citation pressed:', citation);
    // Open source detail modal or navigate
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => (
    <View style={styles.messageContainer}>
      <ChatBubble
        content={item.content}
        role={item.role}
        timestamp={item.timestamp}
        citations={item.citations}
        followUpQuestions={item.followUpQuestions}
        confidenceScore={item.confidenceScore}
        onCitationPress={handleCitationPress}
        onFollowUpPress={handleFollowUpPress}
      />
    </View>
  );

  const renderHeader = () => (
    <View style={styles.headerContent}>
      {/* Context indicator */}
      <View style={styles.contextBar}>
        <Text variant="bodySmall" color={theme.colors.text.secondary}>
          Asking about:
        </Text>
        <ChildChip child={mockChild} />
      </View>

      {/* Welcome message for empty state */}
      {messages.length === 0 && !isLoading && (
        <View style={styles.welcomeSection}>
          <Text
            variant="h2"
            color={theme.colors.text.primary}
            style={styles.welcomeTitle}
          >
            Hi! How can I help with {mockChild.firstName} today?
          </Text>
          <Text
            variant="body"
            color={theme.colors.text.secondary}
            style={styles.welcomeSubtitle}
          >
            I can answer questions about grades, schedules, assignments, and more.
          </Text>
        </View>
      )}

      {/* Suggested questions */}
      {showSuggestions && messages.length === 0 && (
        <View style={styles.suggestions}>
          <Text
            variant="label"
            color={theme.colors.text.tertiary}
            style={styles.suggestionsLabel}
          >
            Try asking:
          </Text>
          <View style={styles.suggestionsList}>
            {suggestedQuestions.map((question, index) => (
              <SuggestedQuestion
                key={index}
                question={question}
                onPress={() => handleSuggestionPress(question)}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );

  const renderFooter = () => (
    <View style={styles.footerContent}>
      {isLoading && (
        <View style={styles.typingContainer}>
          <TypingIndicator />
        </View>
      )}
    </View>
  );

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
            Ask SchoolOS
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => {
            if (messages.length > 0) {
              scrollToEnd();
            }
          }}
        />

        <ChatInput
          value={inputValue}
          onChangeText={setInputValue}
          onSend={() => handleSendMessage()}
          isLoading={isLoading}
          placeholder="Ask anything about Emma..."
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    justifyContent: 'center',
  },
  keyboardAvoid: {
    flex: 1,
  },
  messagesList: {
    paddingBottom: 16,
  },
  headerContent: {
    paddingTop: 16,
  },
  contextBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  welcomeSection: {
    paddingHorizontal: 32,
    paddingVertical: 24,
    alignItems: 'center',
  },
  welcomeTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    textAlign: 'center',
  },
  suggestions: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  suggestionsLabel: {
    marginBottom: 12,
    textAlign: 'center',
  },
  suggestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  messageContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  footerContent: {
    paddingHorizontal: 16,
  },
  typingContainer: {
    paddingVertical: 8,
  },
});

export default ChatScreen;
