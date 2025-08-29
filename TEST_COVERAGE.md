# Smart Contract Unit Test Coverage

## Overview

All smart contracts (except factory as requested) have comprehensive unit tests that cover core functionality, edge cases, and error conditions.

## Mail Service Contract Tests (`tests/mail-service.test.ts`)

**Test Categories: 4**
**Total Test Cases: 8**

### 1. Initialization Tests
- ✅ Should initialize the service correctly
  - Verifies proper initialization with USDC mint
  - Checks delegation fee setup (10 USDC)

### 2. Delegation Tests  
- ✅ Should allow delegation to another address
  - Tests delegation creation with fee payment
  - Verifies USDC transfer for delegation fee
- ✅ Should clear delegation when setting to null
  - Tests delegation removal functionality
- ✅ Should allow delegate to reject delegation
  - Tests rejection mechanism by delegate

### 3. Fee Management Tests
- ✅ Should allow owner to update delegation fee
  - Tests owner-only fee modification
- ✅ Should allow owner to withdraw fees
  - Tests fee collection by owner

### 4. Validation Tests
- ✅ Should fail delegation rejection by non-delegate
  - Tests security: only delegate can reject
- ✅ Should fail fee operations by non-owner  
  - Tests security: only owner can modify fees

**Key Features Tested:**
- USDC mint integration and token transfers
- PDA (Program Derived Address) creation and validation
- Access control (owner vs delegate vs user permissions)
- Fee calculation and collection
- State management and persistence
- Error handling for invalid operations

## Mailer Contract Tests (`tests/mailer.test.ts`)

**Test Categories: 8**
**Total Test Cases: 19**

### 1. Initialization Tests
- ✅ Should initialize mailer program
  - Verifies initialization with USDC mint
  - Checks send fee setup (0.1 USDC)

### 2. Priority Mail Sending Tests
- ✅ Should send priority mail with full fee and revenue sharing
  - Tests full fee payment (0.1 USDC)
  - Verifies 90% recipient share, 10% owner share
  - Checks claim creation for revenue sharing
- ✅ Should send priority prepared mail
  - Tests pre-prepared message sending

### 3. Regular Mail Sending Tests
- ✅ Should send regular mail with reduced fee
  - Tests reduced fee (10% of full fee = 0.01 USDC)
  - Verifies no revenue sharing for regular mail
- ✅ Should send prepared regular mail
  - Tests prepared message with reduced fee

### 4. Claims Management Tests
- ✅ Should allow recipient to claim their share
  - Tests revenue share claiming mechanism
  - Verifies USDC transfer to recipient
- ✅ Should allow owner to claim their share
  - Tests owner fee collection
- ✅ Should fail to claim with no claimable amount
  - Tests error handling for empty claims

### 5. Fee Management Tests
- ✅ Should get current send fee
  - Tests fee getter functionality
- ✅ Should update send fee (owner only)
  - Tests owner-only fee modification
- ✅ Should fail to set fee as non-owner
  - Tests access control for fee updates
- ✅ Should get formatted fees
  - Tests fee formatting utilities

### 6. Expired Claims Tests
- ✅ Should simulate claim expiration (testing helper)
  - Tests claim expiration logic (60-day limit)
- ✅ Should allow owner to claim expired shares
  - Tests recovery of expired recipient shares

### 7. Fee Calculation Helper Tests
- ✅ Should calculate priority mail fees correctly
  - Tests revenue sharing calculations (90%/10% split)
- ✅ Should calculate regular mail fees correctly
  - Tests reduced fee calculations

### 8. Integration Tests
- ✅ Should handle complete mail workflow
  - End-to-end test of mail sending and claiming
- ✅ Should verify program address derivation
  - Tests PDA generation consistency
- ✅ Should verify USDC mint and program ID getters
  - Tests configuration getters

**Key Features Tested:**
- Revenue sharing system (90% recipient, 10% owner)
- Time-based claim expiration (60 days)
- Fee calculation for priority vs regular mail
- USDC token transfers and balance tracking
- PDA derivation for claims and program state
- Access control (owner vs user permissions)
- Message preparation and sending workflows
- State persistence across transactions
- Integration with SPL Token program
- Error handling and edge cases

## Test Infrastructure

**Dependencies:**
- Anchor framework testing utilities
- Chai assertion library
- SPL Token program integration
- Solana web3.js for blockchain interaction

**Setup:**
- Automated USDC mint creation
- Keypair generation for test accounts
- Token account creation and funding
- Client library integration testing

**Execution:**
```bash
npm run test:contracts        # Run with existing validator
npm run test:contracts:local  # Run with local validator
```

## Test Quality

**Coverage Areas:**
- ✅ Happy path functionality
- ✅ Error conditions and edge cases  
- ✅ Access control and security
- ✅ State management
- ✅ Token transfers and fee handling
- ✅ Time-based functionality
- ✅ Integration between contracts and clients
- ✅ Program initialization and configuration

**Test Characteristics:**
- Comprehensive setup with real blockchain interactions
- Proper assertion testing with expected values
- Error case validation with specific error checking
- Integration testing with client libraries
- State verification after operations
- Fee and balance calculations verification

Both mail_service and mailer contracts have production-ready test suites that thoroughly validate all core functionality, security requirements, and edge cases.