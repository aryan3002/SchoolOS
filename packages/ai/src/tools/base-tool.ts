/**
 * Base Tool Interface and Abstract Class
 *
 * Defines the contract that all tools must implement and provides
 * common functionality for tool execution, logging, and error handling.
 *
 * @module @schoolos/ai/tools
 */

import {
  ToolDefinition,
  ToolParams,
  ToolResult,
  UserContext,
  Permission,
  IntentCategory,
  Citation,
} from '../types';

// ============================================================
// TOOL INTERFACE
// ============================================================

/**
 * Interface that all tools must implement
 */
export interface ITool {
  /** Tool definition metadata */
  readonly definition: ToolDefinition;

  /**
   * Execute the tool with the given parameters
   *
   * @param params - Tool parameters including intent and context
   * @returns Promise resolving to the tool result
   */
  execute(params: ToolParams): Promise<ToolResult>;

  /**
   * Check if the user has permission to use this tool
   *
   * @param context - User context
   * @returns True if user can use this tool
   */
  canExecute(context: UserContext): boolean;
}

// ============================================================
// ABSTRACT BASE TOOL
// ============================================================

/**
 * Abstract base class for all tools
 * Provides common functionality and enforces the tool contract
 */
export abstract class BaseTool implements ITool {
  abstract readonly definition: ToolDefinition;

  /**
   * Execute the tool with error handling and timing
   */
  async execute(params: ToolParams): Promise<ToolResult> {
    const startTime = Date.now();

    // Permission check
    if (!this.canExecute(params.context)) {
      return this.createErrorResult(
        'PERMISSION_DENIED',
        `User does not have permission to use ${this.definition.name}`,
        startTime,
      );
    }

    // Student context check
    if (this.definition.requiresStudentContext && !this.hasStudentContext(params)) {
      return this.createErrorResult(
        'MISSING_STUDENT_CONTEXT',
        'This operation requires student context but none was provided',
        startTime,
      );
    }

    try {
      // Execute the actual tool logic
      const result = await this.executeImpl(params);

      return {
        success: result.success,
        content: result.content,
        citations: result.citations || [],
        metadata: {
          toolName: this.definition.name,
          executionTimeMs: Date.now() - startTime,
          confidence: result.confidence,
          ...result.metadata,
        },
      };
    } catch (error) {
      return this.createErrorResult(
        'EXECUTION_ERROR',
        error instanceof Error ? error.message : 'Unknown error occurred',
        startTime,
      );
    }
  }

  /**
   * Check if user has permission to execute this tool
   */
  canExecute(context: UserContext): boolean {
    const { requiredPermissions } = this.definition;

    // If no permissions required, allow
    if (requiredPermissions.length === 0) {
      return true;
    }

    // Admin can do anything
    if (context.permissions?.includes(Permission.ADMIN)) {
      return true;
    }

    // Check if user has at least one required permission
    const userPermissions = new Set(context.permissions || []);
    const rolePermissions = this.getRolePermissions(context.role);

    return requiredPermissions.some(
      (perm) => userPermissions.has(perm) || rolePermissions.has(perm),
    );
  }

  /**
   * Get default permissions for a role
   */
  protected getRolePermissions(role: string): Set<Permission> {
    const rolePermissionMap: Record<string, Permission[]> = {
      PARENT: [Permission.READ_OWN_STUDENT, Permission.READ_KNOWLEDGE, Permission.READ_CALENDAR],
      TEACHER: [
        Permission.READ_ALL_STUDENTS,
        Permission.READ_KNOWLEDGE,
        Permission.READ_CALENDAR,
        Permission.SEND_MESSAGES,
      ],
      STUDENT: [Permission.READ_OWN_STUDENT, Permission.READ_KNOWLEDGE, Permission.READ_CALENDAR],
      ADMIN: [
        Permission.READ_ALL_STUDENTS,
        Permission.READ_KNOWLEDGE,
        Permission.READ_CALENDAR,
        Permission.SEND_MESSAGES,
        Permission.CREATE_TICKETS,
        Permission.ADMIN,
      ],
      STAFF: [
        Permission.READ_KNOWLEDGE,
        Permission.READ_CALENDAR,
        Permission.SEND_MESSAGES,
        Permission.CREATE_TICKETS,
      ],
    };

    return new Set(rolePermissionMap[role] || []);
  }

  /**
   * Check if params include required student context
   */
  protected hasStudentContext(params: ToolParams): boolean {
    const { context, intent } = params;

    // Check for active child context (for parents)
    if (context.childIds && context.childIds.length > 0) {
      return true;
    }

    // Check for student ID in intent entities
    if (intent.entities.studentId || intent.entities.studentName) {
      return true;
    }

    // Teachers and admins can access student data without explicit context
    if (context.role === 'TEACHER' || context.role === 'ADMIN') {
      return true;
    }

    return false;
  }

  /**
   * Create an error result
   */
  protected createErrorResult(code: string, message: string, startTime: number): ToolResult {
    return {
      success: false,
      content: '',
      citations: [],
      metadata: {
        toolName: this.definition.name,
        executionTimeMs: Date.now() - startTime,
        confidence: 0,
        error: `${code}: ${message}`,
      },
    };
  }

  /**
   * Create a successful result
   */
  protected createSuccessResult(
    content: string,
    options: {
      citations?: Array<{ sourceId: string; title: string; excerpt?: string }>;
      confidence?: number;
      data?: Record<string, unknown>;
      sourceType?: string;
      relevanceScore?: number;
    } = {},
  ): Omit<ToolResult, 'metadata'> {
    return {
      success: true,
      content,
      citations: options.citations || [],
      metadata: {
        confidence: options.confidence ?? 0.9,
        data: options.data,
        sourceType: options.sourceType,
        relevanceScore: options.relevanceScore,
      },
    };
  }

  /**
   * Abstract method that subclasses must implement
   */
  protected abstract executeImpl(
    params: ToolParams,
  ): Promise<Omit<ToolResult, 'metadata'> & { confidence?: number; metadata?: Record<string, unknown> }>;
}

// ============================================================
// TOOL REGISTRY
// ============================================================

/**
 * Registry for managing and accessing tools
 */
export class ToolRegistry {
  private tools: Map<string, ITool> = new Map();

  /**
   * Register a tool
   */
  register(tool: ITool): void {
    if (this.tools.has(tool.definition.name)) {
      throw new Error(`Tool ${tool.definition.name} is already registered`);
    }
    this.tools.set(tool.definition.name, tool);
  }

  /**
   * Get a tool by name
   */
  get(name: string): ITool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tools
   */
  getAll(): ITool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools that handle a specific intent
   */
  getToolsForIntent(intent: IntentCategory): ITool[] {
    return this.getAll().filter((tool) => tool.definition.handlesIntents.includes(intent));
  }

  /**
   * Get tools that a user can execute
   */
  getAccessibleTools(context: UserContext): ITool[] {
    return this.getAll().filter((tool) => tool.canExecute(context));
  }

  /**
   * Check if a tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get tool definitions (for documentation/debugging)
   */
  getDefinitions(): ToolDefinition[] {
    return this.getAll().map((tool) => tool.definition);
  }
}
