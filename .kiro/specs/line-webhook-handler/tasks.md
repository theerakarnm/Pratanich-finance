# Implementation Plan

- [x] 1. Set up LINE configuration and types
  - Add LINE configuration to `api/src/core/config/index.ts` with channel access token, channel secret, and messaging API URL
  - Create `api/src/features/line/line.types.ts` with all TypeScript interfaces for LINE webhook events, messages, flex messages, and postback data
  - Add environment variables to `.env.example` for LINE credentials
  - _Requirements: 7.3, 7.4_

- [x] 2. Implement LINE Messaging API client
  - Create `api/src/features/line/line.client.ts` with `LineMessagingClient` class
  - Implement `replyMessage()` method to send reply messages using LINE API
  - Implement `getMessageContent()` method to download image content from LINE
  - Add proper error handling for LINE API responses with descriptive errors
  - _Requirements: 3.2, 6.3, 6.4_

- [ ] 3. Create LINE-specific error classes
  - Create `api/src/features/line/line.errors.ts` with custom error classes
  - Implement `LineApiError`, `LineSignatureError`, and `LineMessageError` extending `AppError`
  - _Requirements: 2.4, 3.5, 4.4_

- [ ] 4. Implement signature validation middleware
  - Create `api/src/middleware/line-signature.middleware.ts` with `validateLineSignature()` middleware
  - Implement HMAC-SHA256 signature verification using channel secret
  - Parse and attach webhook body to context when signature is valid
  - Return 401 response for invalid signatures
  - Log all signature validation attempts
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 5. Build Flex Message Builder utility
  - Create `api/src/features/line/utils/flex-message.builder.ts` with `FlexMessageBuilder` class
  - Implement fluent API methods: `createBubble()`, `setHeader()`, `setBody()`, `setFooter()`
  - Implement component creation methods: `addText()`, `addButton()`, `addImage()`, `addSeparator()`, `addSpacer()`, `createBox()`
  - Implement `build()` method with validation of flex message structure
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 6. Create LINE Reply utility
  - Create `api/src/features/line/utils/line-reply.util.ts` with `LineReplyUtil` class
  - Implement `replyText()` method for sending text messages
  - Implement `replyFlex()` method for sending flex messages
  - Implement `replyMessages()` method for sending multiple messages
  - Add logging for all outgoing messages with user context
  - _Requirements: 6.1, 6.2, 6.5_

- [ ] 7. Implement event router with strategy pattern
  - Create `api/src/features/line/line.router.ts` with `EventHandler` interface and `LineEventRouter` class
  - Implement `registerHandler()` method to register event handlers
  - Implement `routeEvent()` method to route events to appropriate handlers
  - Extract common event processing logic into shared functions
  - _Requirements: 7.1, 7.2, 7.5_

- [ ] 8. Create event handlers
- [ ] 8.1 Implement text message handler
  - Create `api/src/features/line/handlers/text-message.handler.ts` with `TextMessageHandler` class
  - Implement `canHandle()` to identify text message events
  - Implement `handle()` to extract message text and user ID, route to business logic, and send response
  - Add error handling with fallback messages
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 8.2 Implement image message handler
  - Create `api/src/features/line/handlers/image-message.handler.ts` with `ImageMessageHandler` class
  - Implement `canHandle()` to identify image message events
  - Implement `handle()` to extract message ID, download image content, validate size (max 10MB), and process image
  - Add error handling for image download failures
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 8.3 Implement postback handler
  - Create `api/src/features/line/handlers/postback.handler.ts` with `PostbackHandler` class
  - Implement `canHandle()` to identify postback events
  - Implement `handle()` to extract and parse postback data (JSON format), execute business logic, and send confirmation
  - Add error handling for invalid postback data
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 9. Implement LINE domain layer
  - Create `api/src/features/line/line.domain.ts` with `LineDomain` class
  - Implement `processWebhook()` method to process webhook body and route events
  - Implement `handleTextMessage()`, `handleImageMessage()`, and `handlePostback()` methods with business logic
  - Handle multiple events in a single webhook request sequentially
  - Use dependency injection for client, reply utility, and event router
  - _Requirements: 2.5, 7.5_

- [ ] 10. Create webhook route and controller
  - Create `api/src/routes/line.routes.ts` with webhook endpoint
  - Implement POST `/webhook` route with signature validation middleware
  - Integrate `LineDomain` to process webhook events
  - Return 200 OK response within 3 seconds
  - Add comprehensive error handling and logging
  - Register LINE routes in main application
  - _Requirements: 1.5, 1.4_

- [ ]* 11. Write unit tests for core utilities
  - Create test file for signature validation middleware with valid/invalid signature tests
  - Create test file for Flex Message Builder with component creation tests
  - Create test file for Reply Utility with message sending tests
  - Create test file for Event Router with handler selection tests
  - _Requirements: 5.5, 6.4, 7.1_

- [ ]* 12. Write integration tests for webhook flow
  - Create test file for complete webhook endpoint flow with mock LINE events
  - Test webhook with valid signature and multiple events
  - Test webhook rejection with invalid signature
  - Test LINE API client with mock responses
  - _Requirements: 1.1, 1.2, 1.5_
