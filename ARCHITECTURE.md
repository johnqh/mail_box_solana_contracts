# MailBox Solana - Architecture Documentation

## Overview

MailBox Solana is a decentralized messaging system built on the Solana blockchain, featuring USDC-based fees and revenue sharing mechanisms. This document outlines the system architecture, program interactions, and deployment strategies.

## System Architecture

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   MailBox Factory   │    │      Mailer         │    │   Mail Service      │
│                     │    │                     │    │                     │
│ ┌─────────────────┐ │    │ ┌─────────────────┐ │    │ ┌─────────────────┐ │
│ │ Factory State   │ │    │ │ Mailer State    │ │    │ │ Service State   │ │
│ │ - Owner         │ │    │ │ - Owner         │ │    │ │ - Owner         │ │
│ │ - Version       │ │    │ │ - USDC Mint     │ │    │ │ - USDC Mint     │ │
│ │ - Deploy Count  │ │    │ │ - Send Fee      │ │    │ │ - Reg Fee       │ │
│ └─────────────────┘ │    │ │ - Owner Claim   │ │    │ │ - Del Fee       │ │
│                     │    │ └─────────────────┘ │    │ └─────────────────┘ │
│ ┌─────────────────┐ │    │                     │    │                     │
│ │ Deployment Info │ │    │ ┌─────────────────┐ │    │ ┌─────────────────┐ │
│ │ - Type          │ │    │ │ Recipient Claims│ │    │ │ Delegations     │ │
│ │ - Program ID    │ │    │ │ - Amount        │ │    │ │ - Delegator     │ │
│ │ - Network       │ │    │ │ - Timestamp     │ │    │ │ - Delegate      │ │
│ │ - Deployer      │ │    │ │ - Expiry        │ │    │ └─────────────────┘ │
│ └─────────────────┘ │    │ └─────────────────┘ │    │                     │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

## Core Programs

### 1. MailBox Factory (`mail_box_factory`)

**Purpose:** Coordinate deployments and manage versioning across networks.

**Key Features:**
- Track deployments across networks
- Predict consistent addresses
- Version management
- Batch initialization coordination

**Program ID:** `FactoryABC123def456GHI789jkl012MNO345pqr678STU`

**Main PDA:**
- **Factory State:** `seeds: ["factory"]`

### 2. Mailer (`mailer`)

**Purpose:** Handle messaging with two-tier fee system and revenue sharing.

**Key Features:**
- Priority messaging (full fee + 90% revenue share)
- Standard messaging (10% fee only)
- Revenue sharing with 60-day claim period
- Owner fee collection

**Program ID:** `9FLkBDGpZBcR8LMsQ7MwwV6X9P4TDFgN3DeRh5qYyHJF`

**Main PDAs:**
- **Mailer State:** `seeds: ["mailer"]`
- **Recipient Claims:** `seeds: ["claim", recipient_pubkey]`

### 3. Mail Service (`mail_service`)

**Purpose:** Domain registration and delegation management.

**Key Features:**
- Domain registration with 1-year terms
- Delegation system with rejection capability
- Fee management (registration & delegation)
- Owner fee withdrawal

**Program ID:** `8EKjCLZjz6LKRxZcQ6LwwF5V8P3TCEgM2CdQg4pZxXHE`

**Main PDAs:**
- **Service State:** `seeds: ["mail_service"]`
- **Delegations:** `seeds: ["delegation", delegator_pubkey]`

## Token Economics

### USDC Integration
- **Mainnet:** Uses real USDC (`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`)
- **Testnets:** Creates mock USDC for testing
- **Decimals:** 6 (standard USDC)

### Fee Structure

| Service | Fee | Revenue Share |
|---------|-----|---------------|
| Priority Message | 0.1 USDC | 90% to sender, 10% to owner |
| Standard Message | 0.01 USDC | 100% to owner |
| Domain Registration | 100 USDC | 100% to owner |
| Delegation | 10 USDC | 100% to owner |

### Revenue Sharing Details

**Priority Messages:**
- Sender pays full fee (0.1 USDC)
- 90% goes to sender's claimable balance
- 10% goes to owner's claimable balance
- Claim period: 60 days
- Expired claims revert to owner

## Cross-Network Consistency

### Deterministic Addressing
All programs use Program Derived Addresses (PDAs) with static seeds:

```rust
// Consistent across all networks
Factory PDA:     seeds = ["factory"]
Mailer PDA:      seeds = ["mailer"]  
MailService PDA: seeds = ["mail_service"]
```

### Address Prediction
Before deployment, addresses can be predicted using:
```bash
npm run predict-addresses
```

This generates identical addresses for all Solana networks due to deterministic PDA generation.

## Deployment Architecture

### Multi-Network Support
- **Mainnet-Beta:** Production deployment
- **Devnet:** Development and testing
- **Testnet:** Additional testing environment
- **Localnet:** Local development

### Deployment Scripts

1. **Single Network:** `npm run deploy:devnet`
2. **Coordinated Multi-Network:** `npm run deploy:coordinated`
3. **Address Prediction:** `npm run predict-addresses`
4. **Verification:** `npm run verify-deployments`

### Factory-Coordinated Deployment
```typescript
// Deployment flow
1. Predict addresses for all programs
2. Deploy Factory program
3. Register each program deployment
4. Batch initialize programs
5. Verify cross-network consistency
```

## Security Architecture

### Access Control
- **Owner-only functions:** Fee updates, fund withdrawal, expired claim collection
- **Public functions:** Messaging, domain registration, delegation
- **Reentrancy protection:** All financial operations are protected

### Fee Security
- **Prepaid model:** All fees collected upfront
- **Fail-safe design:** Operations fail if payment insufficient
- **No partial executions:** Atomic operations only

### Data Validation
- **Domain validation:** Non-empty domain names required
- **Delegation validation:** Proper ownership checks
- **Timestamp validation:** Claim expiry enforcement

## Integration Architecture

### TypeScript Clients
- **MailerClient:** Full mailer functionality
- **MailServiceClient:** Domain and delegation management
- **Factory utilities:** Deployment coordination

### Event System
All programs emit structured events for:
- Message sending
- Domain registration
- Delegation changes
- Fee updates
- Claims processing

## Monitoring & Analytics

### On-Chain Events
- `MailSent` / `PreparedMailSent`
- `DomainRegistered` / `DomainExtended`
- `DelegationSet`
- `SharesRecorded`
- `RecipientClaimed` / `OwnerClaimed`

### Off-Chain Indexing
Events can be indexed for:
- Message analytics
- Revenue tracking
- Domain usage statistics
- Delegation patterns

## Upgrade Strategy

### Version Management
- Factory tracks deployment versions
- Consistent versioning across networks
- Migration planning for future upgrades

### Backward Compatibility
- Event structure versioning
- Client library compatibility
- Data migration strategies

## Performance Considerations

### Transaction Costs
- Typical Solana transaction fees: ~0.000005 SOL
- USDC transfer costs: Minimal
- PDA rent exemption: Handled automatically

### Scalability
- Solana TPS: Up to 65,000 transactions/second
- Parallel processing: Programs can run concurrently
- State management: Efficient PDA usage

## Development Workflow

### Setup
```bash
# Install dependencies
npm install

# Build programs
anchor build

# Run tests
npm test

# Deploy locally
npm run deploy:local
```

### Testing Strategy
- Unit tests for each program
- Integration tests for cross-program interactions
- End-to-end testing with real USDC flows

### CI/CD Integration
- Automated testing on PR
- Deployment verification
- Cross-network consistency checks

## Comparison with EVM Version

| Feature | Solana | EVM |
|---------|--------|-----|
| **Deployment** | PDA-based deterministic | CREATE2 deterministic |
| **Gas Costs** | ~0.000005 SOL | Variable (ETH gas) |
| **Throughput** | 65,000 TPS | ~15 TPS (Ethereum) |
| **Finality** | ~400ms | ~12 seconds |
| **Network Support** | Solana networks | All EVM chains |
| **Token Standard** | SPL Token | ERC-20 |

Both versions maintain feature parity while leveraging their respective blockchain advantages.