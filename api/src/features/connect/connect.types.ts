export interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}

export interface VerificationResult {
  valid: boolean;
  clientId?: string;
  error?: string;
}

export interface ConnectCode {
  id: string;
  code: string;
  clientId: string;
  isUsed: boolean;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}
