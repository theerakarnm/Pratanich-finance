# Code Conventions

## Naming Conventions

### Backend (API)

- **Files**: Use kebab-case with descriptive suffixes
  - Domain logic: `*.domain.ts`
  - Repository/data access: `*.repository.ts`
  - Type definitions: `*.types.ts`
  - Error classes: `*.errors.ts`
  - Utilities: `*.utils.ts`
  - Routes: `*.routes.ts`
  - Middleware: `*.middleware.ts`
  - Tests: `*.test.ts` or `*.property.test.ts`

- **Classes**: PascalCase with descriptive names
  - Domain classes: `PaymentDomain`, `ConnectDomain`
  - Repository classes: `PaymentRepository`, `ClientsRepository`
  - Error classes: `PaymentValidationError`, `LoanNotFoundError`
  - Service classes: `ReceiptGenerator`, `PaymentNotificationService`

- **Instances**: camelCase, exported as singleton
  ```typescript
  export const paymentDomain = new PaymentDomain();
  export const paymentRepository = new PaymentRepository();
  ```

- **Database fields**: snake_case (matches PostgreSQL convention)
  - `client_id`, `created_at`, `line_user_id`, `outstanding_balance`

- **TypeScript interfaces**: PascalCase
  - `ProcessPaymentRequest`, `PaymentAllocation`, `TransactionInsert`

### Frontend (Web)

- **Components**: PascalCase with `.tsx` extension
  - `ClientManagement.tsx`, `ClientForm.tsx`, `LoanCard.tsx`

- **Utilities**: kebab-case
  - `api-client.ts`, `auth-client.ts`, `formatter.ts`

- **Hooks**: kebab-case with `use-` prefix
  - `use-mobile.ts`

- **Props interfaces**: Component name + `Props`
  - `ClientFormProps`, `LoanCardProps`

## Code Organization

### Backend Layered Architecture

Follow strict 3-layer separation:

1. **Route/Controller Layer** (`*.routes.ts`)
   - HTTP request/response handling
   - Request validation with Zod
   - Call domain layer methods
   - Use `ResponseBuilder` for responses

2. **Domain Layer** (`*.domain.ts`)
   - Business logic and orchestration
   - Coordinate between repositories
   - Handle business rules and calculations
   - Throw domain-specific errors
   - Extensive logging with structured data

3. **Repository Layer** (`*.repository.ts`)
   - Database operations only
   - Use Drizzle ORM
   - Return raw database results
   - Handle transactions with `db.transaction()`

### Error Handling

- **Custom error classes**: Extend `AppError` base class
  ```typescript
  export class PaymentValidationError extends AppError {
    constructor(message: string, details?: any) {
      super(message, 400, 'PAYMENT_VALIDATION_ERROR', details);
    }
  }
  ```

- **Error naming**: Descriptive with `Error` suffix
  - `DuplicateTransactionError`, `LoanNotFoundError`, `RateLimitExceededError`

- **Throw specific errors**: Use domain-specific error classes, not generic `Error`

### Logging

- Use structured logging with Pino
- Include context in every log:
  ```typescript
  logger.info({
    event: "payment_processing_started",
    transactionRefId: request.transactionRefId,
    loanId: request.loanId,
    amount: request.amount,
  }, "Starting payment processing");
  ```

- Log levels:
  - `info`: Normal operations, state changes
  - `warn`: Recoverable issues, rate limits, duplicates
  - `error`: Failures requiring attention

### Database Operations

- **Primary keys**: Use UUIDv7 via `uuidv7()` function
- **Timestamps**: Always include `created_at`, `updated_at`
- **Soft deletes**: Use `deleted_at` timestamp, filter with `WHERE deleted_at IS NULL`
- **Decimals**: Financial amounts as `decimal(12,2)`, stored as strings in TypeScript
- **Transactions**: Use `db.transaction()` for ACID operations
- **Row locking**: Use `.for("update")` for pessimistic locking

### API Response Format

Always use `ResponseBuilder`:
```typescript
// Success
return ResponseBuilder.success(c, data);
return ResponseBuilder.created(c, data);

// Error
return ResponseBuilder.error(c, message, statusCode, code, details);
```

Response structure:
```typescript
{
  success: boolean,
  data?: T,
  error?: { message, code, details },
  meta: { timestamp, requestId }
}
```

## Frontend Conventions

### Component Structure

- Use functional components with hooks
- Props interface defined above component
- Destructure props in function signature
- Use Preact hooks: `useState`, `useEffect` from `preact/hooks`

### Forms

- Use React Hook Form + Zod validation
- Define schema with `z.object()`
- Use `zodResolver` for form validation
- Wrap in shadcn/ui `Form` components

### API Calls

- Import functions from `@/lib/api-client.ts`
- Handle loading, error, and success states
- Use try-catch for error handling
- Display errors in UI with appropriate styling

### Styling

- Use Tailwind CSS utility classes
- Use shadcn/ui components for consistency
- Responsive design with `md:`, `lg:` breakpoints
- Thai language for user-facing text

## TypeScript Conventions

- **Strict mode**: Always enabled
- **Type imports**: Use `type` keyword for type-only imports
  ```typescript
  import type { PaymentAllocation } from "./payments.types";
  ```

- **Inference**: Prefer type inference over explicit types where clear
- **Return types**: Explicit return types on public methods
- **Async/await**: Use async/await over promises

## Documentation

### JSDoc Comments

Use JSDoc for public methods in domain and repository layers:
```typescript
/**
 * Process a payment for a loan contract
 * Orchestrates the full payment processing workflow
 * 
 * @param request - Payment processing request
 * @returns PaymentResult with transaction details
 * @throws PaymentValidationError if validation fails
 * @throws DuplicateTransactionError if transaction already processed
 */
async processPayment(request: ProcessPaymentRequest): Promise<PaymentResult>
```

Include:
- Brief description
- Parameter descriptions
- Return value description
- Thrown errors

## Testing

- Test files: `*.test.ts` or `*.property.test.ts`
- Property-based tests for business logic
- Unit tests for repositories
- Mock external dependencies

## Import Organization

Order imports:
1. External packages (Node.js, npm packages)
2. Internal core modules (config, database, logger)
3. Feature modules (domain, repository)
4. Types and interfaces
5. Utilities

Use path aliases:
- Backend: Relative imports
- Frontend: `@/` alias for `/src`
