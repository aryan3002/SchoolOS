/**
 * UI Components Index
 *
 * Export all UI components for easy importing
 */

// Typography
export { Text, Heading1, Heading2, Heading3, Heading4, BodyText, Caption, Label } from './Text';

// Buttons & Inputs
export { Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';

export { TextInput, ChatInput, QuickAskInput } from './Input';
export type { TextInputProps, ChatInputProps, QuickAskInputProps } from './Input';

// Cards & Containers
export { Card, PressableCard } from './Card';
export type { CardProps, CardVariant, CardPadding } from './Card';

// Chat Components
export { 
  ChatBubble, 
  AssistantBubble, 
  UserBubble, 
  TypingIndicator,
  CitationChip,
  SuggestedQuestion,
} from './ChatBubble';
export type { 
  ChatBubbleProps, 
  Citation, 
  TypingIndicatorProps,
  CitationChipProps,
  SuggestedQuestionProps,
} from './ChatBubble';

// Action Components
export { ActionCard, ActionListItem } from './ActionCard';
export type { 
  ActionCardProps, 
  ActionItem, 
  ActionUrgency, 
  ActionType 
} from './ActionCard';

// Child & Profile
export { ChildSwitcher, ChildChip } from './ChildSwitcher';
export type { Child, ChildSwitcherProps, ChildChipProps } from './ChildSwitcher';

// Calendar
export { 
  DaySummary, 
  EventItem, 
  WeekView, 
  MonthSelector 
} from './Calendar';
export type { 
  CalendarEvent, 
  DaySummaryProps, 
  EventItemProps, 
  WeekViewProps, 
  MonthSelectorProps 
} from './Calendar';

// Status & Progress
export {
  GradeDisplay,
  ProgressBar,
  AttendanceIndicator,
  Badge,
  StatusDot,
  Skeleton,
} from './Status';
export type {
  GradeDisplayProps,
  ProgressBarProps,
  AttendanceIndicatorProps,
  BadgeProps,
  StatusDotProps,
  SkeletonProps,
} from './Status';
