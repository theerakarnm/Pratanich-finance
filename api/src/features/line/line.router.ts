import { logger } from '../../core/logger';
import type { LineEvent, EventContext } from './line.types';

/**
 * Event Handler Interface
 * Defines the contract for all LINE event handlers using the Strategy Pattern
 */
export interface EventHandler {
  /**
   * Determines if this handler can process the given event
   * @param event - The LINE event to check
   * @returns true if this handler can process the event
   */
  canHandle(event: LineEvent): boolean;

  /**
   * Processes the LINE event
   * @param event - The LINE event to handle
   * @param context - Additional context for event processing
   */
  handle(event: LineEvent, context: EventContext): Promise<void>;
}

/**
 * LINE Event Router
 * Routes incoming LINE events to appropriate handlers using the Strategy Pattern
 * Implements DRY principles by centralizing event routing logic
 */
export class LineEventRouter {
  private handlers: EventHandler[] = [];

  /**
   * Registers an event handler
   * @param handler - The event handler to register
   */
  registerHandler(handler: EventHandler): void {
    this.handlers.push(handler);
    logger.info(`Registered event handler: ${handler.constructor.name}`);
  }

  /**
   * Routes an event to the appropriate handler
   * @param event - The LINE event to route
   * @param context - Additional context for event processing
   * @throws Error if no handler is found for the event
   */
  async routeEvent(event: LineEvent, context: EventContext): Promise<void> {
    const startTime = Date.now();
    
    logger.info({
      eventType: event.type,
      userId: context.userId,
      timestamp: context.timestamp,
    }, 'Routing LINE event');

    // Find the first handler that can handle this event
    const handler = this.handlers.find(h => h.canHandle(event));

    if (!handler) {
      logger.warn({
        eventType: event.type,
        userId: context.userId,
      }, 'No handler found for event type');
      
      throw new Error(`No handler registered for event type: ${event.type}`);
    }

    try {
      logger.debug({
        handler: handler.constructor.name,
        eventType: event.type,
      }, 'Handler found, processing event');

      await handler.handle(event, context);

      const duration = Date.now() - startTime;
      logger.info({
        handler: handler.constructor.name,
        eventType: event.type,
        duration,
      }, 'Event processed successfully');
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error({
        handler: handler.constructor.name,
        eventType: event.type,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Error processing event');
      
      throw error;
    }
  }

  /**
   * Gets the number of registered handlers
   * @returns The count of registered handlers
   */
  getHandlerCount(): number {
    return this.handlers.length;
  }

  /**
   * Clears all registered handlers (useful for testing)
   */
  clearHandlers(): void {
    this.handlers = [];
    logger.debug('Cleared all event handlers');
  }
}

/**
 * Common Event Processing Utilities
 * Shared functions to extract common data from LINE events (DRY principle)
 */

/**
 * Extracts event context from a LINE event
 * @param event - The LINE event
 * @returns EventContext object with common event data
 */
export function extractEventContext(event: LineEvent): EventContext {
  return {
    replyToken: event.replyToken,
    userId: event.source.userId,
    timestamp: event.timestamp,
  };
}

/**
 * Checks if an event is from a user (not group or room)
 * @param event - The LINE event
 * @returns true if the event is from a user
 */
export function isUserEvent(event: LineEvent): boolean {
  return event.source.type === 'user';
}

/**
 * Gets the source ID from an event (userId, groupId, or roomId)
 * @param event - The LINE event
 * @returns The appropriate source ID
 */
export function getSourceId(event: LineEvent): string {
  const { source } = event;
  
  if (source.type === 'group' && source.groupId) {
    return source.groupId;
  }
  
  if (source.type === 'room' && source.roomId) {
    return source.roomId;
  }
  
  return source.userId;
}

/**
 * Validates that an event has a valid reply token
 * @param event - The LINE event
 * @returns true if the event has a valid reply token
 */
export function hasValidReplyToken(event: LineEvent): boolean {
  return typeof event.replyToken === 'string' && event.replyToken.length > 0;
}

/**
 * Logs event details for debugging
 * @param event - The LINE event
 * @param additionalInfo - Additional information to log
 */
export function logEventDetails(event: LineEvent, additionalInfo?: Record<string, any>): void {
  logger.debug({
    eventType: event.type,
    sourceType: event.source.type,
    userId: event.source.userId,
    timestamp: event.timestamp,
    mode: event.mode,
    ...additionalInfo,
  }, 'LINE event details');
}
