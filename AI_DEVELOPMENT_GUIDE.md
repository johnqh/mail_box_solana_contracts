# AI Development Guide for MailBox Solana Contracts

This guide provides comprehensive instructions for AI assistants working with the MailBox decentralized messaging system on Solana.

## 🎯 Quick Start for AI Assistants

### Essential Commands
```bash
# Always run after contract changes
anchor build          # Compiles Rust programs and generates TypeScript types
npm test              # Runs comprehensive test suites (22 utility tests + contract tests)
npm run build         # Builds TypeScript client library

# Development workflow
solana-test-validator  # Start local Solana validator
anchor deploy         # Deploy contracts locally
anchor clean          # Clean artifacts when needed
```

### Project Architecture Overview
```
mail_box_solana_contracts/
├── programs/                   # Rust smart contracts (Anchor framework)
│   ├── mail_service/          # Domain registration & delegation
│   │   └── src/lib.rs         # Core MailService program
│   ├── mailer/                # Messaging with revenue sharing  
│   │   └── src/lib.rs         # Core Mailer program
│   └── mail_box_factory/      # Deployment factory
│       └── src/lib.rs         # Factory for batch deployments
├── app/                       # TypeScript client library
│   ├── mail-service-client.ts # MailService wrapper with JSDoc
│   ├── mailer-client.ts       # Mailer wrapper with JSDoc
│   ├── types.ts               # Shared types and utilities
│   └── index.ts               # Exported public API
├── tests/                     # Comprehensive test suites
│   ├── mail-service.test.ts   # MailService contract tests
│   ├── mailer.test.ts         # Mailer contract tests
│   └── types-utils.test.ts    # Utility function tests
├── indexer/                   # Event indexing system
│   ├── types.ts               # Event type definitions
│   ├── database.ts            # Storage adapters
│   ├── listener.ts            # Real-time event listener
│   └── api.ts                 # REST & WebSocket APIs
└── target/                    # Auto-generated TypeScript types
```

## 🧠 AI-Specific Development Patterns

### 1. Contract Modification Workflow

**CRITICAL**: Always follow this sequence:
```bash
# 1. Modify Rust contract in programs/
# 2. Build to regenerate types
anchor build
# 3. Run tests to ensure no regressions  
anchor test
# 4. Update TypeScript client if needed
npm run build
```

**Why this matters**: Anchor generates TypeScript types from Rust programs. Skipping build after contract changes causes type mismatches and compilation errors.

### 2. Solana-Specific Concepts

**Program Derived Addresses (PDAs)**:
- All account addresses are deterministically derived
- Seeds: `[b"mailer"]`, `[b"mail_service"]`, `[b"claim", user.key()]`
- Use `findProgramAddressSync()` in TypeScript clients

**Account Management**:
- All accounts must be initialized before use
- Associated Token Accounts for USDC balances
- Rent exemption required for all accounts

**Cross-Program Invocations (CPIs)**:
- SPL Token program for USDC transfers
- System program for account creation
- Associated Token program for ATA creation

### 3. Fee Structure (USDC with 6 decimals)
```rust
// Mailer fees
const SEND_FEE: u64 = 100_000;         // 0.1 USDC
const RECIPIENT_SHARE: u64 = 90;       // 90%
const OWNER_SHARE: u64 = 10;           // 10%

// MailService fees  
const REGISTRATION_FEE: u64 = 100_000_000; // 100 USDC
const DELEGATION_FEE: u64 = 10_000_000;    // 10 USDC
```

## Smart Contract Architecture

### MailService Program (`programs/mail_service/src/lib.rs`)

**Purpose**: Domain registration and delegation management
**Program ID**: `8EKjCLZjz6LKRxZcQ6LwwF5V8P3TCEgM2CdQg4pZxXHE`

**Key Instructions**:
- `initialize(usdc_mint)` - Initialize the service with USDC mint
- `delegate_to(delegate)` - Set delegation, costs 10 USDC  
- `reject_delegation(delegating_address)` - Reject delegation made to you
- `register_domain(domain, is_extension)` - Register/extend domains (100 USDC)
- `set_registration_fee(amount)` / `set_delegation_fee(amount)` - Owner fee management

**Events**:
- `DelegationSet { delegator, delegate }` - Unified delegation event
- `DomainRegistered/Extended { domain, registrar, expiration }` - Domain lifecycle
- `RegistrationFeeUpdated/DelegationFeeUpdated { old_fee, new_fee }` - Fee changes

**Account Structure**:
```rust
#[account]
pub struct MailService {
    pub owner: Pubkey,
    pub usdc_mint: Pubkey,
    pub registration_fee: u64,
    pub delegation_fee: u64,
    pub bump: u8,
}

#[account] 
pub struct Delegation {
    pub delegator: Pubkey,
    pub delegate: Option<Pubkey>,
    pub bump: u8,
}
```

### Mailer Program (`programs/mailer/src/lib.rs`)

**Purpose**: Message sending with revenue sharing system  
**Program ID**: `9FLkBDGpZBcR8LMsQ7MwwV6X9P4TDFgN3DeRh5qYyHJF`

**Key Instructions**:
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
- All messages are sent to sender (msg.sender) - self-messaging system

**Account Structure**:
```rust
#[account]
pub struct Mailer {
    pub owner: Pubkey,
    pub usdc_mint: Pubkey, 
    pub send_fee: u64,
    pub owner_claimable: u64,
    pub bump: u8,
}

#[account]
pub struct RecipientClaim {
    pub recipient: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
    pub bump: u8,
}
```

### MailBoxFactory Program (`programs/mail_box_factory/src/lib.rs`)

**Purpose**: Factory for deploying and managing MailBox instances
**Program ID**: `7KxLzPMHGHLYqHYkX8YYtNjSGRD9mT4rE5hQ6pZvGbPz`

**Key Instructions**:
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

**Test Files**: `tests/*.test.ts`
**Framework**: Mocha + Chai with Anchor testing utilities
**Coverage**: Comprehensive tests for all program instructions

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

**Utility Tests** (`tests/types-utils.test.ts`):
- USDC formatting and parsing functions
- Network configuration validation
- Helper function correctness

### Test Patterns

**Account Setup Pattern**:
```typescript
// Create and fund USDC accounts for testing
const userUsdc = await createAssociatedTokenAccount(
    connection,
    payer,
    usdcMint,
    user.publicKey
);
await mintTo(connection, payer, usdcMint, userUsdc, mintAuthority, amount);
```

**Instruction Testing Pattern**:
```typescript
// Test successful instruction execution
const tx = await program.methods
    .instructionName(param1, param2)
    .accounts({...accounts})
    .signers([signer])
    .rpc();

// Verify state changes
const accountData = await program.account.accountType.fetch(accountAddress);
expect(accountData.field).to.equal(expectedValue);
```

**Event Verification Pattern**:
```typescript
// Parse and verify emitted events
const events = await program.addEventListener('EventName', (event, slot) => {
    expect(event.field).to.equal(expectedValue);
});
```

## TypeScript Client Library

### MailServiceClient (`app/mail-service-client.ts`)

**Purpose**: High-level wrapper for MailService program interactions

```typescript
export class MailServiceClient {
    private program: Program<MailService>;
    private provider: AnchorProvider;
    private servicePda: PublicKey;
    private usdcMint: PublicKey;

    // Core Methods
    async delegateTo(delegate?: PublicKey): Promise<string>
    async rejectDelegation(delegator: PublicKey): Promise<string>  
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
    private provider: AnchorProvider;
    private mailerPda: PublicKey;
    private usdcMint: PublicKey;

    // Message Sending
    async sendPriority(subject: string, body: string): Promise<string>
    async sendPriorityPrepared(mailId: string): Promise<string>
    async send(subject: string, body: string): Promise<string>
    async sendPrepared(mailId: string): Promise<string>
    
    // Claims Management
    async claimRecipientShare(): Promise<string>
    async claimOwnerShare(): Promise<string>
    async claimExpiredShares(recipient: PublicKey): Promise<string>
    
    // Query Methods
    async getClaimableInfo(recipient: PublicKey): Promise<ClaimableInfo>
    async getFees(): Promise<MailerFees>
}
```

## Event Indexing System

**Location**: `indexer/` directory
**Purpose**: Real-time event indexing with REST/WebSocket APIs

### Core Components

1. **Event Types** (`indexer/types.ts`): TypeScript interfaces for all 15 events
2. **Database Adapters** (`indexer/database.ts`): SQLite and memory storage
3. **Event Listener** (`indexer/listener.ts`): Real-time blockchain monitoring
4. **APIs** (`indexer/api.ts`): REST (port 3001) and WebSocket (port 8081) servers

### Supported Events (15 total)

**Mailer Events**:
- `MailSent`, `PreparedMailSent`, `SharesRecorded`
- `RecipientClaimed`, `OwnerClaimed`, `FeeUpdated`

**MailService Events**:  
- `DelegationSet`, `DomainRegistered`, `DomainExtended`
- `RegistrationFeeUpdated`, `DelegationFeeUpdated`

**Factory Events**:
- `DeploymentRegistered`, `AddressesPredicted`, `BatchInitialized`

### Usage Example

```typescript
import { MailBoxIndexer } from './indexer';

const config = {
    rpcEndpoint: 'https://api.devnet.solana.com',
    programs: { 
        mailer: 'ProgramId...', 
        mailService: 'ProgramId...',
        mailBoxFactory: 'ProgramId...'
    },
    database: { type: 'sqlite', url: './events.db' }
};

const indexer = new MailBoxIndexer(config);
await indexer.start(); // Starts real-time indexing
```

## Common Development Scenarios

### 1. Adding New Contract Instructions

```rust
// In programs/{program}/src/lib.rs
pub fn new_instruction(ctx: Context<NewInstruction>, param: Type) -> Result<()> {
    // Validate inputs
    require!(condition, ErrorCode::CustomError);
    
    // Update state
    let account = &mut ctx.accounts.account;
    account.field = param;
    
    // Emit event
    emit!(NewEvent { field: param });
    Ok(())
}

// Define account context
#[derive(Accounts)]
pub struct NewInstruction<'info> {
    #[account(mut)]
    pub account: Account<'info, AccountType>,
    pub signer: Signer<'info>,
}
```

### 2. Adding Client Methods

```typescript
// In app/{client}.ts
async newMethod(param: Type): Promise<string> {
    const accounts = {
        account: this.accountPda,
        signer: this.provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
    };

    return await (this.program.methods as any)
        .newInstruction(param)
        .accounts(accounts)
        .rpc();
}
```

### 3. Writing Tests

```typescript
// In tests/{program}.test.ts  
describe('New Instruction', () => {
    it('should execute successfully', async () => {
        const tx = await program.methods
            .newInstruction(param)
            .accounts({...accounts})
            .rpc();

        // Verify state change
        const account = await program.account.accountType.fetch(accountPda);
        expect(account.field).to.equal(param);
    });
    
    it('should handle error conditions', async () => {
        await expect(
            program.methods.newInstruction(invalidParam).accounts({...accounts}).rpc()
        ).to.be.rejectedWith('CustomError');
    });
});
```

## Security Best Practices

### Access Control
```rust
// Owner-only instructions
require!(ctx.accounts.signer.key() == account.owner, ErrorCode::OnlyOwner);

// Signer validation
require!(ctx.accounts.signer.is_signer, ErrorCode::MissingSignature);
```

### Account Validation
```rust
// PDA validation
let (expected_pda, bump) = Pubkey::find_program_address(
    &[b"seed", user.key().as_ref()], 
    ctx.program_id
);
require!(ctx.accounts.pda.key() == expected_pda, ErrorCode::InvalidPDA);
```

### Arithmetic Safety
```rust
// Use checked arithmetic
let result = amount.checked_add(fee).ok_or(ErrorCode::MathOverflow)?;

// Validate calculations
require!(total >= fee, ErrorCode::InsufficientFunds);
```

## Performance Optimization

### Efficient Account Access
- Use `zero_copy` for large accounts
- Minimize account fetches in hot paths  
- Batch related operations

### PDA Optimization
- Cache PDA calculations
- Use consistent seed patterns
- Minimize seed complexity

### Transaction Optimization  
- Combine related instructions
- Use compute unit optimization
- Consider transaction size limits

## Error Handling Patterns

### Custom Errors
```rust
#[error_code]
pub enum CustomError {
    #[msg("Insufficient funds for operation")]
    InsufficientFunds,
    #[msg("Invalid account provided")]
    InvalidAccount,
    #[msg("Operation not permitted")]
    Unauthorized,
}
```

### Client Error Handling
```typescript
try {
    await client.method();
} catch (error) {
    if (error.code === 6000) { // Anchor error codes start at 6000
        console.error('Custom error:', error.message);
    } else {
        console.error('Unexpected error:', error);
    }
}
```

## Development Environment Setup

### Required Tools
```bash
# Solana CLI (v1.18+)
curl --proto '=https' --tlsv1.2 -sSf https://release.solana.com/v1.18.0/install | sh

# Anchor CLI (v0.29+)
npm install -g @coral-xyz/anchor-cli

# Node.js dependencies
npm install
```

### Environment Variables
```bash
# Required for deployment and testing
export ANCHOR_WALLET=~/.config/solana/id.json
export SOLANA_RPC_URL=https://api.devnet.solana.com
```

### Local Development
```bash
# Terminal 1: Start validator
solana-test-validator

# Terminal 2: Deploy contracts
anchor deploy

# Terminal 3: Run tests  
anchor test --skip-local-validator
```

## Deployment Considerations

### Network Configuration
- **Devnet**: Testing and development
- **Mainnet**: Production deployments  
- **Localnet**: Local testing with test validator

### Program Upgrades
- Use upgrade authority for production
- Test upgrades thoroughly on devnet
- Consider state migration patterns

### Monitoring
- Set up RPC monitoring
- Monitor program logs
- Track account rent exemption

## AI-Specific Tips

### Code Generation Guidelines
1. Always use `(program.methods as any)` for method calls
2. Include proper account derivation logic
3. Handle both success and error cases
4. Follow existing naming conventions
5. Add comprehensive JSDoc comments

### Testing Patterns  
1. Fund all test accounts with USDC before operations
2. Test both positive and negative scenarios
3. Verify account state changes after instructions
4. Check event emissions where applicable
5. Test time-dependent functionality with clock manipulation

### Documentation Standards
1. Use JSDoc for all TypeScript methods
2. Include usage examples in complex functions
3. Document error conditions and their causes
4. Provide parameter descriptions and types
5. Reference related contract instructions

This guide should enable AI assistants to work effectively with the MailBox Solana contracts, understanding the architecture, patterns, and best practices specific to this implementation.