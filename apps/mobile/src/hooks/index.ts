/**
 * Hooks Index
 *
 * Export all API hooks
 */

// Conversation hooks
export {
  useConversation,
  useConversations,
  useSendMessage,
  useStreamingMessage,
} from './useConversation';
export type {
  Message,
  Citation,
  Conversation,
  SendMessageInput,
  SendMessageResponse,
} from './useConversation';

// Children hooks
export {
  useChildren,
  useChild,
  useGrades,
  useAssignments,
  useAttendance,
  useChildDashboard,
} from './useChildren';
export type {
  Child,
  Grade,
  Assignment,
  Attendance,
  AttendanceRecord,
} from './useChildren';

// Calendar hooks
export {
  useCalendarEvents,
  useCalendarEvent,
  useUpcomingEvents,
  useTodayEvents,
  useWeekEvents,
  useMonthEvents,
} from './useCalendar';
export type { CalendarEvent, CalendarFilters } from './useCalendar';

// Actions hooks
export {
  useActions,
  useAction,
  usePendingActions,
  useUrgentActions,
  useCompleteAction,
  useDismissAction,
  useHomeActions,
} from './useActions';
export type {
  ActionItem,
  ActionUrgency,
  ActionType,
  ActionStatus,
  QuickAction,
  ActionFilters,
} from './useActions';
