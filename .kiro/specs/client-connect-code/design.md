# Design Document: Client Connection System via Connect Code

## Overview

The Client Connection System enables secure onboarding of clients by allowing administrators to generate unique, time-limited connect codes that clients use to link their LINE accounts with the loan management system. This design integrates with the existing LINE LIFF infrastructure and extends the current client management system to support LINE profile data storage and connection tracking.

## Architecture

### System Components

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Admin Portal  │────────▶│   Backend API    │◀────────│  Client Portal  │
│   (Web/Preact)  │         │   (Hono/Bun)     │         │  (LIFF/Preact)  │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                     │                             │
                                     ▼                             ▼
                            ┌──────────────────┐         ┌─────────────────┐
                            │   PostgreSQL     │         │   LINE Platform │
                            │   (Drizzle ORM)  │         │   (LIFF API)    │
                            └──────────────────┘         └─────────────────┘
```

### Data Flow

#### Admin Flow: Generate Connect Code
```
Admin Portal → POST /api/clients/{id}/connect-code → Domain Layer → Repository Layer → Database
                                                                                          ↓
Admin Portal ← Response with connect code ←─────────────────────────────────────────────┘
```

#### Client Flow: Connect via Code
```
LIFF Page → Enter Code → POST /api/connect/verify
                              ↓
                         Validate Code (Repository)
                              ↓
                         Get LIFF Profile (Frontend)
                              ↓
                         POST /api/connect/complete
                              ↓
                         Update Client Record
                              ↓
                         GET /api/clients/{id}/loans
                              ↓
                         Display Loan Information
```

## Components and Interfaces

### 1. Database Schema Extensions

#### Connect Codes Table
```typescript
// api/src/core/database/schema/connect-codes.schema.ts
export const connectCodes = pgTable("connect_codes", {
  id: varchar("id", { length: 36 })
    .$defaultFn(() => uuidv7())
    .primaryKey(),
  code: varchar("code", { length: 8 }).unique().notNull(),
  client_id: varchar("client_id", { length: 36 })
    .references(() => clients.id)
    .notNull(),
  is_used: boolean("is_used").default(false).notNull(),
  expires_at: timestamp("expires_at").notNull(),
  used_at: timestamp("used_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Index for fast code lookup
CREATE INDEX idx_connect_codes_code ON connect_codes(code);
CREATE INDEX idx_connect_codes_client_id ON connect_codes(client_id);
```

#### Clients Table Extensions
```typescript
// Add to existing clients schema
export const clients = pgTable("clients", {
  // ... existing fields ...
  line_user_id: varchar("line_user_id", { length: 100 }).unique(),
  line_display_name: varchar("line_display_name", { length: 255 }),
  line_picture_url: varchar("line_picture_url", { length: 500 }),
  connected_at: timestamp("connected_at"),
  // ... existing timestamps ...
});

// Index for LINE user ID lookup
CREATE UNIQUE INDEX idx_clients_line_user_id ON clients(line_user_id) WHERE line_user_id IS NOT NULL;
```

#### Rate Limiting Table
```typescript
// api/src/core/database/schema/connect-rate-limit.schema.ts
export const connectRateLimit = pgTable("connect_rate_limit", {
  id: varchar("id", { length: 36 })
    .$defaultFn(() => uuidv7())
    .primaryKey(),
  client_id: varchar("client_id", { length: 36 })
    .references(() => clients.id)
    .notNull(),
  attempt_count: integer("attempt_count").default(0).notNull(),
  window_start: timestamp("window_start").defaultNow().notNull(),
  blocked_until: timestamp("blocked_until"),
});

// Index for rate limit checks
CREATE INDEX idx_connect_rate_limit_client_id ON connect_rate_limit(client_id);
```

### 2. Backend API Endpoints

#### Connect Code Management (Admin)
```typescript
// POST /api/clients/:clientId/connect-code
// Generate a new connect code for a client
interface GenerateConnectCodeRequest {
  clientId: string;
}

interface GenerateConnectCodeResponse {
  code: string;
  expiresAt: string; // ISO 8601 timestamp
  clientId: string;
}

// GET /api/clients/:clientId/connect-codes
// List all connect codes for a client (with status)
interface ConnectCodeListResponse {
  codes: Array<{
    code: string;
    isUsed: boolean;
    expiresAt: string;
    usedAt: string | null;
    createdAt: string;
  }>;
}

// DELETE /api/connect-codes/:code
// Invalidate/delete a connect code
interface DeleteConnectCodeResponse {
  success: boolean;
}
```

#### Client Connection (LIFF)
```typescript
// POST /api/connect/verify
// Verify connect code validity
interface VerifyConnectCodeRequest {
  code: string;
}

interface VerifyConnectCodeResponse {
  valid: boolean;
  clientId?: string;
  error?: string;
}

// POST /api/connect/complete
// Complete connection with LINE profile data
interface CompleteConnectionRequest {
  code: string;
  lineUserId: string;
  lineDisplayName: string;
  linePictureUrl?: string;
}

interface CompleteConnectionResponse {
  success: boolean;
  clientId: string;
  hasLoans: boolean;
}

// GET /api/connect/client/:lineUserId
// Get client info by LINE user ID (for returning users)
interface ClientByLineUserIdResponse {
  clientId: string;
  firstName: string;
  lastName: string;
  connectedAt: string;
}
```

#### Loan Information (LIFF)
```typescript
// GET /api/clients/:clientId/loans/summary
// Get loan summary for connected client
interface LoanSummaryResponse {
  loans: Array<{
    id: string;
    contractNumber: string;
    loanType: string;
    principalAmount: string;
    outstandingBalance: string;
    contractStatus: 'Active' | 'Closed' | 'Overdue';
    contractStartDate: string;
    contractEndDate: string;
    dueDay: number;
    overduedays: number;
  }>;
  totalLoans: number;
  totalOutstanding: string;
}
```

### 3. Domain Layer

#### Connect Code Domain
```typescript
// api/src/features/connect/connect.domain.ts
export class ConnectDomain {
  // Generate secure random code
  async generateConnectCode(clientId: string): Promise<ConnectCode>
  
  // Verify code validity (exists, not expired, not used)
  async verifyConnectCode(code: string): Promise<VerificationResult>
  
  // Complete connection with LINE profile
  async completeConnection(
    code: string, 
    lineProfile: LineProfile
  ): Promise<Client>
  
  // Check rate limiting
  async checkRateLimit(clientId: string): Promise<boolean>
  
  // Increment rate limit counter
  async incrementRateLimit(clientId: string): Promise<void>
  
  // Get client by LINE user ID
  async getClientByLineUserId(lineUserId: string): Promise<Client | null>
}
```

#### Clients Domain Extensions
```typescript
// api/src/features/clients/clients.domain.ts
export class ClientsDomain {
  // ... existing methods ...
  
  // Get connection status
  async getConnectionStatus(clientId: string): Promise<ConnectionStatus>
  
  // Get loans summary for client
  async getLoansSummary(clientId: string): Promise<LoanSummary>
}
```

### 4. Repository Layer

#### Connect Code Repository
```typescript
// api/src/features/connect/connect.repository.ts
export class ConnectRepository {
  // Create new connect code
  async create(data: ConnectCodeInsert): Promise<ConnectCode>
  
  // Find by code
  async findByCode(code: string): Promise<ConnectCode | null>
  
  // Find all codes for client
  async findByClientId(clientId: string): Promise<ConnectCode[]>
  
  // Mark code as used
  async markAsUsed(code: string): Promise<ConnectCode>
  
  // Delete/invalidate code
  async delete(code: string): Promise<void>
  
  // Clean up expired codes (cron job)
  async deleteExpired(): Promise<number>
}
```

#### Rate Limit Repository
```typescript
// api/src/features/connect/rate-limit.repository.ts
export class RateLimitRepository {
  // Get or create rate limit record
  async getOrCreate(clientId: string): Promise<RateLimit>
  
  // Increment attempt counter
  async incrementAttempts(clientId: string): Promise<RateLimit>
  
  // Reset rate limit window
  async reset(clientId: string): Promise<void>
  
  // Block client temporarily
  async blockClient(clientId: string, duration: number): Promise<void>
}
```

#### Clients Repository Extensions
```typescript
// api/src/features/clients/clients.repository.ts
export class ClientsRepository {
  // ... existing methods ...
  
  // Update LINE profile data
  async updateLineProfile(
    clientId: string, 
    lineProfile: LineProfileData
  ): Promise<Client>
  
  // Find by LINE user ID
  async findByLineUserId(lineUserId: string): Promise<Client | null>
  
  // Get clients with connection filter
  async findAllWithConnectionStatus(
    limit: number,
    offset: number,
    connected?: boolean
  ): Promise<Client[]>
}
```

### 5. Frontend Components

#### Admin Portal Components
```typescript
// web/src/components/ConnectCodeGenerator.tsx
// Button/modal to generate connect code for a client
interface ConnectCodeGeneratorProps {
  clientId: string;
  onCodeGenerated: (code: string) => void;
}

// web/src/components/ConnectCodeDisplay.tsx
// Display generated code with copy functionality and QR code
interface ConnectCodeDisplayProps {
  code: string;
  expiresAt: string;
}

// web/src/components/ConnectionStatusBadge.tsx
// Badge showing client connection status
interface ConnectionStatusBadgeProps {
  isConnected: boolean;
  connectedAt?: string;
  lineDisplayName?: string;
}
```

#### LIFF Portal Components
```typescript
// web/src/pages/LiffConnect.tsx
// Main connection page with code input
interface LiffConnectState {
  code: string;
  isVerifying: boolean;
  error: string | null;
  profile: LiffProfile | null;
}

// web/src/pages/LiffLoanSummary.tsx
// Display loan information after connection
interface LiffLoanSummaryProps {
  clientId: string;
}

// web/src/components/LoanCard.tsx
// Individual loan display card
interface LoanCardProps {
  loan: LoanSummary;
}
```

## Data Models

### Connect Code
```typescript
interface ConnectCode {
  id: string;
  code: string;
  clientId: string;
  isUsed: boolean;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}
```

### LINE Profile Data
```typescript
interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}
```

### Connection Status
```typescript
interface ConnectionStatus {
  isConnected: boolean;
  lineUserId: string | null;
  lineDisplayName: string | null;
  linePictureUrl: string | null;
  connectedAt: Date | null;
}
```

### Rate Limit
```typescript
interface RateLimit {
  id: string;
  clientId: string;
  attemptCount: number;
  windowStart: Date;
  blockedUntil: Date | null;
}
```

## Error Handling

### Error Types
```typescript
// api/src/features/connect/connect.errors.ts
export class ConnectCodeNotFoundError extends Error {
  constructor() {
    super('Connect code not found');
    this.name = 'ConnectCodeNotFoundError';
  }
}

export class ConnectCodeExpiredError extends Error {
  constructor() {
    super('Connect code has expired');
    this.name = 'ConnectCodeExpiredError';
  }
}

export class ConnectCodeAlreadyUsedError extends Error {
  constructor() {
    super('Connect code has already been used');
    this.name = 'ConnectCodeAlreadyUsedError';
  }
}

export class LineUserIdAlreadyConnectedError extends Error {
  constructor() {
    super('This LINE account is already connected to another client');
    this.name = 'LineUserIdAlreadyConnectedError';
  }
}

export class RateLimitExceededError extends Error {
  constructor(public retryAfter: number) {
    super('Too many connection attempts. Please try again later.');
    this.name = 'RateLimitExceededError';
  }
}
```

### Error Response Format
```typescript
interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    details?: any;
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}
```

## Security Considerations

### Connect Code Generation
- Use cryptographically secure random generation (`crypto.randomBytes`)
- 8-character alphanumeric codes (uppercase) = 36^8 = ~2.8 trillion combinations
- Format: `XXXX-XXXX` for readability (e.g., `AB12-CD34`)

### Rate Limiting
- Maximum 5 attempts per client within 15-minute window
- After 5 failed attempts, block for 15 minutes
- Track by client ID (not IP, since LIFF users may share IPs)
- Reset counter on successful connection

### Code Expiration
- Default expiration: 7 days from generation
- Configurable via environment variable: `CONNECT_CODE_EXPIRY_DAYS`
- Automatic cleanup of expired codes via scheduled job

### One-Time Use
- Codes are single-use only
- Mark as used immediately upon successful connection
- Prevent race conditions with database transaction

### LINE User ID Uniqueness
- Enforce unique constraint on `line_user_id` column
- Prevent one LINE account from connecting to multiple clients
- Return clear error message if LINE account already connected

## Testing Strategy

### Unit Tests
```typescript
// api/src/features/connect/__tests__/connect.domain.test.ts
describe('ConnectDomain', () => {
  describe('generateConnectCode', () => {
    it('should generate 8-character alphanumeric code');
    it('should set expiration to 7 days from now');
    it('should associate code with client ID');
  });
  
  describe('verifyConnectCode', () => {
    it('should return valid for unused, non-expired code');
    it('should return invalid for non-existent code');
    it('should return invalid for expired code');
    it('should return invalid for already used code');
  });
  
  describe('completeConnection', () => {
    it('should update client with LINE profile data');
    it('should mark code as used');
    it('should set connected_at timestamp');
    it('should throw error if LINE user ID already exists');
  });
  
  describe('checkRateLimit', () => {
    it('should allow connection within rate limit');
    it('should block after 5 attempts');
    it('should reset after 15 minutes');
  });
});
```

### Integration Tests
```typescript
// api/src/features/connect/__tests__/connect.integration.test.ts
describe('Connect API Integration', () => {
  describe('POST /api/clients/:id/connect-code', () => {
    it('should generate connect code for valid client');
    it('should return 404 for non-existent client');
    it('should require authentication');
  });
  
  describe('POST /api/connect/verify', () => {
    it('should verify valid connect code');
    it('should reject expired code');
    it('should reject used code');
  });
  
  describe('POST /api/connect/complete', () => {
    it('should complete connection with valid code and profile');
    it('should reject duplicate LINE user ID');
    it('should enforce rate limiting');
  });
});
```

### E2E Tests (Optional)
```typescript
// Test full flow from admin generating code to client connecting
describe('Client Connection E2E', () => {
  it('should complete full connection flow');
  it('should display loan information after connection');
  it('should handle expired code gracefully');
});
```

## Implementation Notes

### Code Generation Algorithm
```typescript
import crypto from 'crypto';

function generateConnectCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = crypto.randomBytes(8);
  
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  
  // Format as XXXX-XXXX
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}
```

### LIFF Profile Retrieval
```typescript
// In LIFF page (web/src/pages/LiffConnect.tsx)
import liff from '@line/liff';

async function getLiffProfile() {
  await liff.init({ liffId: import.meta.env.VITE_LIFF_ID });
  
  if (!liff.isLoggedIn()) {
    liff.login();
    return null;
  }
  
  const profile = await liff.getProfile();
  return {
    userId: profile.userId,
    displayName: profile.displayName,
    pictureUrl: profile.pictureUrl,
  };
}
```

### Database Migration Strategy
1. Create `connect_codes` table
2. Create `connect_rate_limit` table
3. Add LINE profile columns to `clients` table
4. Add indexes for performance
5. Run migration: `bun run db:migrate`

### Environment Variables
```bash
# .env
CONNECT_CODE_EXPIRY_DAYS=7
CONNECT_RATE_LIMIT_MAX_ATTEMPTS=5
CONNECT_RATE_LIMIT_WINDOW_MINUTES=15
CONNECT_RATE_LIMIT_BLOCK_MINUTES=15
```

## Future Enhancements

1. **QR Code Generation**: Generate QR codes for connect codes in admin portal
2. **SMS/Email Delivery**: Automatically send connect codes via SMS or email
3. **Multi-Factor Authentication**: Add additional verification step for sensitive operations
4. **Connection History**: Track connection attempts and history
5. **Reconnection Flow**: Allow clients to reconnect if they change LINE accounts
6. **Admin Notifications**: Notify admins when clients successfully connect
7. **Analytics Dashboard**: Track connection rates and success metrics
