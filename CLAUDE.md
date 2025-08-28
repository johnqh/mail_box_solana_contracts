# CLAUDE.md - AI Assistant Guide

This file provides comprehensive guidance for AI assistants working with this decentralized mail service project on Solana.

## 🚀 Project Overview

**MailBox Solana Contracts** is an Anchor-based decentralized email/messaging system with USDC fee integration, delegation features, revenue sharing, and comprehensive AI-friendly documentation.

### Core Programs

1. **MailService** (`programs/mail_service/`) - Domain registration and delegation management
2. **Mailer** (`programs/mailer/`) - Message sending with revenue sharing  
3. **MailBoxFactory** (`programs/mail_box_factory/`) - Factory for batch deployments

### 📁 Enhanced Project Structure

```
mail_box_solana_contracts/
├── programs/                   # Anchor smart contracts (Rust)
│   ├── mail_service/          # Domain registration & delegation
│   ├── mailer/                # Messaging with revenue sharing
│   └── mail_box_factory/      # Deployment factory
├── app/                       # TypeScript client library (fully documented)
│   ├── mail-service-client.ts # MailService wrapper with JSDoc
│   ├── mailer-client.ts       # Mailer wrapper with JSDoc  
│   ├── types.ts               # Shared types and utilities
│   └── index.ts               # Exported public API
├── tests/                     # Comprehensive test suites
│   ├── mail-service.test.ts   # MailService contract tests
│   ├── mailer.test.ts         # Mailer contract tests
│   └── types-utils.test.ts    # Utility function tests (22 tests)
├── indexer/                   # Event indexing system
│   ├── types.ts               # Event type definitions (15 events)
│   ├── database.ts            # SQLite & memory adapters
│   ├── listener.ts            # Real-time event listener
│   ├── api.ts                 # REST & WebSocket APIs
│   └── README.md              # Indexer documentation
├── examples/                  # Complete usage examples
│   ├── indexer-usage.ts       # Indexer setup example
│   └── query-events.ts        # Event querying examples
├── target/                    # Auto-generated TypeScript types
├── AI_DEVELOPMENT_GUIDE.md    # Comprehensive AI assistant guide
├── CLAUDE.md                  # This file - AI assistant documentation
└── README.md                  # Main project documentation (AI-optimized)
```

## 🛠️ Common Development Commands

```bash
# Essential Commands (run these frequently)
anchor build      # Compile contracts + generate TypeScript types
anchor test       # Run all tests (comprehensive coverage)
npm run build     # Build TypeScript files

# Deployment Commands  
anchor deploy               # Deploy to configured cluster
solana-test-validator      # Start local Solana validator

# Development Commands
anchor clean       # Clean compiled artifacts
npm install        # Install dependencies
npm test          # Run utility tests (22 tests)

# Testing Commands
anchor test --skip-local-validator  # Run tests with existing validator
npx ts-node examples/indexer-usage.ts  # Run indexer example
```

## Program Architecture

### MailService Program (`programs/mail_service/src/lib.rs`)

**Purpose**: Domain registration and delegation management
**Program ID**: `8EKjCLZjz6LKRxZcQ6LwwF5V8P3TCEgM2CdQg4pZxXHE`

**Core Instructions**:
- `initialize(usdc_mint)` - Initialize service with USDC mint
- `delegate_to(delegate)` - Set delegation, costs 10 USDC
- `reject_delegation(delegating_address)` - Reject delegation made to you
- `register_domain(domain, is_extension)` - Register/extend domains (100 USDC)
- `set_registration_fee(amount)` / `set_delegation_fee(amount)` - Owner fee management

**Events**:
- `DelegationSet { delegator, delegate }` - Unified delegation event
- `DomainRegistered/Extended/Released { domain, registrar, expiration }` - Domain lifecycle
- `RegistrationFeeUpdated/DelegationFeeUpdated { old_fee, new_fee }` - Fee changes

**Account Structure**:
```rust
#[account]
pub struct MailService {
    pub owner: Pubkey,              // Program owner
    pub usdc_mint: Pubkey,          // USDC token mint
    pub registration_fee: u64,      // Domain registration fee (100 USDC)
    pub delegation_fee: u64,        // Delegation fee (10 USDC)  
    pub bump: u8,                   // PDA bump seed
}

#[account]
pub struct Delegation {
    pub delegator: Pubkey,          // Address that created delegation
    pub delegate: Option<Pubkey>,   // Delegate address (None = cleared)
    pub bump: u8,                   // PDA bump seed
}
```

### Mailer Program (`programs/mailer/src/lib.rs`)

**Purpose**: Message sending with revenue sharing system
**Program ID**: `9FLkBDGpZBcR8LMsQ7MwwV6X9P4TDFgN3DeRh5qYyHJF`

**Core Instructions**:
- `send_priority(subject, body)` - Full fee (0.1 USDC), 90% revenue share
- `send_priority_prepared(mail_id)` - Full fee, pre-prepared message
- `send(subject, body)` - 10% fee only (0.01 USDC)
- `send_prepared(mail_id)` - 10% fee, pre-prepared message
- `claim_recipient_share()` - Claim your 90% share within 60 days
- `claim_owner_share()` - Owner claims accumulated fees
- `claim_expired_shares(recipient)` - Owner reclaims expired shares

**Revenue Model**:
- **Priority functions**: Sender pays full fee, gets 90% back as claimable
- **Standard functions**: Sender pays 10% fee only  
- All messages are sent to sender (self-messaging system)

**Account Structure**:
```rust
#[account]
pub struct Mailer {
    pub owner: Pubkey,              // Program owner
    pub usdc_mint: Pubkey,          // USDC token mint
    pub send_fee: u64,              // Base sending fee (0.1 USDC)
    pub owner_claimable: u64,       // Accumulated owner fees
    pub bump: u8,                   // PDA bump seed
}

#[account]
pub struct RecipientClaim {
    pub recipient: Pubkey,          // Claimant address
    pub amount: u64,                // Claimable USDC amount
    pub timestamp: i64,             // Claim creation timestamp
    pub bump: u8,                   // PDA bump seed
}
```

### MailBoxFactory Program (`programs/mail_box_factory/src/lib.rs`)

**Purpose**: Factory for deploying and managing MailBox instances
**Program ID**: `7KxLzPMHGHLYqHYkX8YYtNjSGRD9mT4rE5hQ6pZvGbPz`

**Core Instructions**:
- `initialize_factory(usdc_mint)` - Initialize factory
- `predict_addresses(project_name, version)` - Predict deployment addresses
- `initialize_batch(project_name, version)` - Initialize batch deployment
- `register_deployment(deployment_type, program_id, network)` - Register completed deployment

**Features**:
- Deterministic address prediction for deployments
- Batch initialization for coordinated deployments
- Deployment registry with metadata
- Version management for different releases

## Testing Architecture

**Test Files**: `tests/*.test.ts` + `tests/types-utils.test.ts`
**Framework**: Mocha + Chai with Anchor testing utilities
**Total Coverage**: Contract tests + 22 utility tests

### Test Categories

**MailService Tests** (`tests/mail-service.test.ts`):
- Program initialization and configuration
- Delegation lifecycle (creation, rejection, fee payment)  
- Domain registration with fee validation
- Owner permissions and fee management
- Error conditions and edge cases

**Mailer Tests** (`tests/mailer.test.ts`):
- Message sending (all 4 variants with fee validation)
- Revenue sharing calculations and claims
- Time-based claim expiration logic
- Owner operations and fee management
- Error handling and security checks

**Utility Tests** (`tests/types-utils.test.ts`) - 22 passing tests:
- USDC formatting and parsing functions
- Network configuration validation
- Helper function correctness
- Type validation and edge cases

### Key Test Patterns

**Account Setup**:
```typescript
// Create and fund USDC accounts for testing
const userUsdc = await createAssociatedTokenAccount(
    connection, payer, usdcMint, user.publicKey
);
await mintTo(connection, payer, usdcMint, userUsdc, mintAuthority, amount);
```

**Instruction Testing**:
```typescript
// Test successful instruction with state verification
const tx = await program.methods
    .instructionName(param1, param2)
    .accounts({...requiredAccounts})
    .signers([signer])
    .rpc();

const accountData = await program.account.accountType.fetch(accountPda);
expect(accountData.field).to.equal(expectedValue);
```

**Error Testing**:
```typescript
// Test error conditions with custom errors
await expect(
    program.methods.invalidCall().accounts({...accounts}).rpc()
).to.be.rejectedWith('CustomErrorMessage');
```

## TypeScript Client Architecture

### MailServiceClient (`app/mail-service-client.ts`)

**Purpose**: High-level wrapper for MailService program interactions

```typescript
export class MailServiceClient {
    private program: Program<MailService>;
    private servicePda: PublicKey;
    
    // Delegation Management
    async delegateTo(delegate?: PublicKey): Promise<string>
    async rejectDelegation(delegator: PublicKey): Promise<string>
    
    // Domain Registration  
    async registerDomain(domain: string, isExtension: boolean): Promise<string>
    
    // Fee Management (Owner Only)
    async setRegistrationFee(feeAmount: number): Promise<string>
    async setDelegationFee(feeAmount: number): Promise<string>
    
    // Query Methods
    async getDelegation(delegator: PublicKey): Promise<PublicKey | null>
    async getFees(): Promise<{ registration: number; delegation: number }>
}
```

### MailerClient (`app/mailer-client.ts`)

**Purpose**: High-level wrapper for Mailer program interactions

```typescript
export class MailerClient {
    private program: Program<Mailer>;
    private mailerPda: PublicKey;
    
    // Message Sending (4 variants)
    async sendPriority(subject: string, body: string): Promise<string>
    async sendPriorityPrepared(mailId: string): Promise<string>  
    async send(subject: string, body: string): Promise<string>
    async sendPrepared(mailId: string): Promise<string>
    
    // Claims Management
    async claimRecipientShare(): Promise<string>
    async claimOwnerShare(): Promise<string>
    async claimExpiredShares(recipient: PublicKey): Promise<string>
    
    // Query Methods with detailed return types
    async getClaimableInfo(recipient: PublicKey): Promise<ClaimableInfo>
    async getFees(): Promise<MailerFees>
}
```

## Event Indexing System

**Location**: `indexer/` directory
**Purpose**: Comprehensive real-time event indexing with APIs

### Architecture Overview

1. **Event Types** (`indexer/types.ts`): Complete TypeScript interfaces for all 15 events
2. **Database Layer** (`indexer/database.ts`): SQLite and memory storage adapters  
3. **Event Listener** (`indexer/listener.ts`): Real-time blockchain monitoring with backfill
4. **API Layer** (`indexer/api.ts`): REST (port 3001) and WebSocket (port 8081) servers
5. **Main Indexer** (`indexer/index.ts`): Orchestrator class with simple API

### Supported Events (15 total)

**Mailer Events (6)**:
- `MailSent` - Regular mail sent
- `PreparedMailSent` - Pre-prepared mail sent
- `SharesRecorded` - Revenue shares recorded  
- `RecipientClaimed` - Recipient claimed funds
- `OwnerClaimed` - Owner claimed funds
- `FeeUpdated` - Sending fee updated

**MailService Events (5)**:
- `DelegationSet` - Delegation created/cleared/rejected
- `DomainRegistered` - New domain registered
- `DomainExtended` - Domain registration extended
- `RegistrationFeeUpdated` - Domain fee updated
- `DelegationFeeUpdated` - Delegation fee updated

**Factory Events (4)**:
- `DeploymentRegistered` - New deployment registered
- `AddressesPredicted` - Addresses predicted for deployment
- `BatchInitialized` - Batch deployment started
- `[Additional factory events]`

### Usage Examples

**Start Indexer**:
```typescript
import { MailBoxIndexer } from './indexer';

const indexer = new MailBoxIndexer({
    rpcEndpoint: 'https://api.devnet.solana.com',
    programs: {
        mailer: 'ProgramId...',
        mailService: 'ProgramId...',
        mailBoxFactory: 'ProgramId...'
    },
    database: { type: 'sqlite', url: './events.db' }
});

await indexer.start(); // Real-time indexing
await indexer.backfill(100000); // Historical events
```

**Query Events**:
```bash
# REST API examples
curl "http://localhost:3001/events?eventNames=MailSent&limit=10"
curl "http://localhost:3001/events/address/UserPublicKey"
curl "http://localhost:3001/stats"
```

**WebSocket Subscription**:
```typescript
const ws = new WebSocket('ws://localhost:8081');
ws.send(JSON.stringify({
    type: 'subscribe',
    filter: { eventNames: ['MailSent', 'DomainRegistered'] }
}));
```

## Development Workflow & Best Practices

### Making Contract Changes

1. **Modify Rust Contract** → `anchor build` → `anchor test`
2. **Always run build after contract changes** - regenerates TypeScript types
3. **Run full test suite** - ensures no regressions
4. **Update client library** if new instructions added
5. **Check for breaking changes** in generated types

### Common Development Patterns

**PDA Derivation**:
```typescript
// Consistent PDA derivation patterns
const [servicePda] = PublicKey.findProgramAddressSync(
    [Buffer.from('mail_service')],
    program.programId
);

const [delegationPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('delegation'), delegator.toBuffer()],
    program.programId
);
```

**USDC Operations**:
```typescript
// Standard USDC account setup
const userUsdcAccount = getAssociatedTokenAddressSync(
    usdcMint,
    user.publicKey
);

const serviceUsdcAccount = getAssociatedTokenAddressSync(
    usdcMint,
    servicePda,
    true // allowOwnerOffCurve for PDA
);
```

**Error Handling**:
```typescript
// Handle Anchor program errors
try {
    await client.method();
} catch (error) {
    if (error.code >= 6000) { // Custom program errors
        console.error('Program error:', error.message);
    } else {
        console.error('RPC/Network error:', error);
    }
}
```

### Important Notes for AI Assistants

**Solana-Specific Considerations**:
- All accounts must be initialized before use
- PDAs are deterministically derived from seeds
- Associated Token Accounts required for USDC balances
- Cross-program invocations (CPIs) for token transfers
- Rent exemption required for all accounts

**Security Best Practices**:
- All functions use proper signer validation
- USDC transfers must succeed for operations to proceed
- Revenue shares have time-based expiration (60 days)
- Owner functions protected by ownership checks
- PDA validation ensures account authenticity

**Common Pitfalls**:
- Don't forget to create/initialize accounts before use
- Remember to use `(program.methods as any)` for method calls due to Anchor typing
- USDC amounts are in 6-decimal format (1 USDC = 1_000_000)
- All messages are sent to sender (self-messaging system)
- PDAs need `allowOwnerOffCurve: true` for associated token accounts

### File Structure Notes

**Generated Files (Don't Edit)**:
- `target/` - Auto-generated TypeScript types from Anchor
- `target/idl/` - Interface Definition Language files

**Source Files (Edit These)**:
- `programs/` - Rust smart contract source code
- `app/` - TypeScript client library source
- `tests/` - Comprehensive test suites

## Network Configuration & Deployment

**Cluster Configuration**: Defined in `Anchor.toml`
- **Localnet**: `http://127.0.0.1:8899` for local development
- **Devnet**: `https://api.devnet.solana.com` for testing
- **Mainnet**: `https://api.mainnet-beta.solana.com` for production

**Required Environment Variables**:
```bash
export ANCHOR_WALLET=~/.config/solana/id.json
export SOLANA_RPC_URL=https://api.devnet.solana.com
```

## 📚 AI-Friendly Documentation Structure

### Comprehensive Documentation Files:

1. **AI_DEVELOPMENT_GUIDE.md** - Complete AI assistant guide with:
   - Solana-specific development patterns and workflows
   - Program architecture deep-dive  
   - Testing strategies and patterns
   - Code style guidelines and security practices
   - Performance optimization techniques
   - Common development scenarios with code examples

2. **indexer/README.md** - Event indexing documentation with:
   - Setup and configuration guide
   - All 15 supported events with examples
   - REST API reference with curl examples
   - WebSocket protocol documentation  
   - Database schema and query patterns
   - Performance considerations and monitoring

3. **README.md** - Main project documentation with:
   - Quick start guide for developers
   - Architecture overview with diagrams
   - Development commands and workflows
   - TypeScript integration examples
   - Deployment instructions

4. **Contract Documentation** - All programs have extensive inline documentation:
   - Rust doc comments for all functions and structs
   - Parameter descriptions and usage examples
   - Error condition explanations
   - Event emission documentation

5. **Client Library Documentation** - TypeScript clients with full JSDoc:
   - Class-level documentation with usage examples
   - Method-level documentation with parameters and return types
   - Error handling patterns
   - Example code snippets for all operations

### Key AI Integration Points:

**Smart Contract Comments**: Every instruction, account, and error is documented with Rust doc comments
**TypeScript Client**: Full JSDoc with usage examples and parameter descriptions  
**Test Patterns**: Comprehensive test suites demonstrating all functionality
**Example Code**: Working examples with expected output and error handling
**Development Guides**: Step-by-step workflows for common AI development tasks

## 🤖 Enhanced AI Assistant Instructions

### Critical Development Workflow:
1. **Always run `anchor build` after contract changes** - Regenerates TypeScript types
2. **Run `anchor test` to verify changes don't break existing functionality**
3. **Follow existing test patterns** documented in AI_DEVELOPMENT_GUIDE.md
4. **Use proper PDA derivation** - consistent seed patterns across codebase
5. **Handle both positive and negative test cases** - Error conditions are critical
6. **Verify event emissions match expected parameters** - Events drive indexer and UI
7. **Consider fee calculations and revenue sharing implications** - Core business logic
8. **Test time-dependent functionality** - Claims have 60-day expiration

### AI-Specific Guidance:

**Code Generation Patterns**:
- Reference existing client methods as templates for new functionality
- Use established PDA derivation patterns consistently
- Follow the established error handling patterns with try/catch
- Maintain consistency with existing naming conventions
- Always use `(program.methods as any)` for method calls

**Testing Patterns**:
- Create and fund USDC accounts before testing
- Initialize all required accounts (PDAs, ATAs) before operations
- Test both success and failure scenarios comprehensively
- Verify account state changes after instructions
- Use time manipulation for claim expiration testing

**Documentation Standards**:
- Add Rust doc comments to all new program instructions
- Include JSDoc comments for all TypeScript methods
- Provide usage examples in complex functions
- Document error conditions and their causes
- Reference related program instructions and accounts

**Security Considerations**:
- Always validate PDAs against expected derivation
- Use proper signer validation in all instructions
- Validate all external inputs and account relationships
- Test authorization and access control thoroughly  
- Consider arithmetic overflow protection

### Quick Reference Files for AI:
- `AI_DEVELOPMENT_GUIDE.md` - Comprehensive development patterns
- `indexer/README.md` - Event indexing system documentation
- `app/types.ts` - Shared types and utility functions
- `tests/` directory - Comprehensive test patterns and examples
- `programs/` directory - Smart contract source with extensive comments

### Project Philosophy:
This project emphasizes **security, comprehensive testing, AI-friendly documentation, and clear separation of concerns** between domain management, messaging functionality, and deployment coordination. All code should be self-documenting with extensive examples and clear usage patterns.

### Common AI Development Scenarios:
1. **Adding new program instructions** - Follow existing patterns in programs/
2. **Extending client library** - Use existing client methods as templates
3. **Writing tests** - Reference existing comprehensive test suites  
4. **Understanding program flow** - Start with client library and trace to programs
5. **Debugging issues** - Check AI_DEVELOPMENT_GUIDE.md for common solutions
6. **Event indexing** - Use indexer/ system for real-time blockchain monitoring

### Program ID Reference:
- **MailService**: `8EKjCLZjz6LKRxZcQ6LwwF5V8P3TCEgM2CdQg4pZxXHE`
- **Mailer**: `9FLkBDGpZBcR8LMsQ7MwwV6X9P4TDFgN3DeRh5qYyHJF`  
- **MailBoxFactory**: `7KxLzPMHGHLYqHYkX8YYtNjSGRD9mT4rE5hQ6pZvGbPz`

All programs are deployed and tested on Solana devnet with comprehensive test coverage and production-ready error handling.