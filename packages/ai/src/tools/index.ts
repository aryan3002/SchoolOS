/**
 * Tools Module Index
 *
 * Exports all tools and the tool registry for the AI orchestration system.
 *
 * @module @schoolos/ai/tools
 */

// Base classes
export { BaseTool, ToolRegistry } from './base-tool';

// Tool implementations
export {
  KnowledgeRetrievalTool,
  type KnowledgeRetrievalParams,
  type KnowledgeSource,
} from './knowledge-retrieval.tool';

export {
  CalendarQueryTool,
  type CalendarQueryParams,
  type CalendarEvent,
  type CalendarService,
} from './calendar-query.tool';

export {
  StudentDataFetchTool,
  type StudentDataFetchParams,
  type StudentDataService,
  type StudentInfo,
  type StudentGrade,
  type StudentAttendance,
  type StudentAssignment,
} from './student-data.tool';

export {
  EscalationTool,
  type EscalationParams,
  type EscalationService,
  type EscalationTarget,
} from './escalation.tool';
