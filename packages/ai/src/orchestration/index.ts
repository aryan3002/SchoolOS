/**
 * Orchestration Module Index
 *
 * Exports the tool router and response generator components.
 *
 * @module @schoolos/ai/orchestration
 */

export {
  ToolRouter,
  type ToolRouterConfig,
  type RoutingResult,
  type ExecutionResult,
} from './tool-router';

export {
  ResponseGenerator,
  type ResponseGeneratorConfig,
  type GenerationContext,
} from './response-generator';
