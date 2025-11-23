# Requirements Document

## Introduction

This document specifies the requirements for a Client Connection System that enables secure onboarding of clients through unique connect codes. The system allows administrators to generate connect codes that clients use to link their LINE accounts with the loan management system, enabling personalized communication and access to loan information.

## Glossary

- **Admin Portal**: The web-based administrative interface used by system administrators to manage clients and generate connect codes
- **Client Portal**: The LINE LIFF (LINE Front-end Framework) application used by clients to connect their LINE accounts
- **Connect Code**: A unique, time-limited alphanumeric string used to authenticate and link a client's LINE account to their client record
- **LINE User ID**: A unique identifier provided by LINE platform for each user, used for push messaging
- **LIFF API**: LINE Front-end Framework API that provides access to LINE user profile data
- **LMS**: Loan Management System - the overall application managing clients and loan contracts

## Requirements

### Requirement 1

**User Story:** As an admin, I want to generate unique connect codes for clients, so that clients can securely link their LINE accounts to the system

#### Acceptance Criteria

1. WHEN an admin creates a new client record, THE Admin Portal SHALL provide an option to generate a connect code
2. WHEN an admin requests connect code generation, THE LMS SHALL create a unique alphanumeric code between 6 and 8 characters in length
3. WHEN a connect code is generated, THE LMS SHALL store the code with an expiration timestamp of 7 days from creation time
4. WHEN a connect code is generated, THE LMS SHALL associate the code with the specific client record via client identifier
5. WHEN a connect code is successfully generated, THE Admin Portal SHALL display the code to the admin for sharing with the client

### Requirement 2

**User Story:** As an admin, I want connect codes to be secure and time-limited, so that unauthorized users cannot access client accounts

#### Acceptance Criteria

1. THE LMS SHALL generate connect codes using cryptographically secure random string generation
2. WHEN a connect code reaches its expiration timestamp, THE LMS SHALL reject any connection attempts using that code
3. WHEN a connect code is successfully used for connection, THE LMS SHALL mark the code as used and reject subsequent connection attempts with the same code
4. THE LMS SHALL enforce a maximum of 5 connection attempts per client within a 15-minute window to prevent brute-force attacks
5. WHEN rate limiting is triggered, THE LMS SHALL return an error message indicating too many attempts and require a waiting period

### Requirement 3

**User Story:** As a client, I want to enter a connect code in the LINE LIFF page, so that I can link my LINE account to my client record

#### Acceptance Criteria

1. WHEN a client opens the Client Portal, THE LIFF Application SHALL display a connect code input form
2. WHEN a client submits a connect code, THE LMS SHALL validate that the code exists in the database
3. IF the connect code does not exist, THEN THE LMS SHALL return an error message stating "Invalid connect code"
4. IF the connect code is expired, THEN THE LMS SHALL return an error message stating "Connect code has expired"
5. IF the connect code has already been used, THEN THE LMS SHALL return an error message stating "Connect code has already been used"

### Requirement 4

**User Story:** As a client, I want my LINE profile information automatically saved when I connect, so that the system can communicate with me via LINE

#### Acceptance Criteria

1. WHEN a client successfully validates a connect code, THE LIFF Application SHALL retrieve the client's LINE User ID from the LIFF API
2. WHEN LINE profile data is retrieved, THE LMS SHALL save the LINE User ID to the client record
3. WHEN LINE profile data is retrieved, THE LMS SHALL save the display name to the client record
4. WHEN LINE profile data is retrieved, THE LMS SHALL save the profile picture URL to the client record if available
5. WHEN all profile data is saved, THE LMS SHALL record the connection timestamp in the client record

### Requirement 5

**User Story:** As a client, I want to see my loan information after connecting, so that I can view my loan status and details

#### Acceptance Criteria

1. WHEN a client completes the connection process, THE Client Portal SHALL query for loan contracts associated with the client identifier
2. IF the client has one or more active loan contracts, THEN THE Client Portal SHALL display a summary of loan information including principal amount, status, and due dates
3. IF the client has no loan contracts, THEN THE Client Portal SHALL display a message stating "No active loans found"
4. WHEN displaying loan information, THE Client Portal SHALL show loan status values including Active, Closed, and Overdue
5. WHEN displaying multiple loans, THE Client Portal SHALL sort loans by creation date with newest loans first

### Requirement 6

**User Story:** As an admin, I want to view the connection status of clients, so that I can verify which clients have successfully linked their LINE accounts

#### Acceptance Criteria

1. WHEN viewing a client record, THE Admin Portal SHALL display whether the client has connected their LINE account
2. IF a client has connected, THEN THE Admin Portal SHALL display the connection timestamp and LINE display name
3. IF a client has not connected, THEN THE Admin Portal SHALL display the status as "Not Connected"
4. WHEN viewing client list, THE Admin Portal SHALL provide a filter option to show only connected or not connected clients
5. THE Admin Portal SHALL display the connect code status including whether it is unused, used, or expired

### Requirement 7

**User Story:** As a system, I want to store LINE User IDs securely, so that future push messaging functionality can be implemented

#### Acceptance Criteria

1. THE LMS SHALL store LINE User ID as a unique indexed field in the client database table
2. THE LMS SHALL prevent duplicate LINE User IDs from being associated with multiple client records
3. IF a LINE User ID is already associated with another client, THEN THE LMS SHALL return an error message stating "This LINE account is already connected to another client"
4. THE LMS SHALL validate that LINE User ID is not null or empty before saving to the database
5. THE LMS SHALL maintain referential integrity between client records and their associated LINE profile data
