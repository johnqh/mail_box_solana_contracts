# MailBox Solana Contracts - Decentralized Messaging System

A comprehensive Solana-based decentralized email/messaging system with USDC fee integration, domain registration, and revenue sharing capabilities.

## 🏗️ Project Overview

**MailBox Solana Contracts** enables decentralized messaging with built-in economic incentives through a two-tier fee system and revenue sharing mechanism, implemented using Solana's Anchor framework.

### Core Features

- **Domain Registration**: Register and manage email domains with USDC fees
- **Delegation System**: Delegate email handling with rejection capability  
- **Two-Tier Messaging**: Priority (revenue share) vs Standard (fee-only) tiers
- **Revenue Sharing**: 90% back to senders, 10% to platform
- **Time-based Claims**: 60-day claim period for revenue shares

## 📦 NPM Package Installation

```bash
# Install the TypeScript client library
npm install mail_box_solana_contracts

# Or with yarn
yarn add mail_box_solana_contracts
```

### Quick Start

```typescript
import { MailServiceClient, MailerClient } from 'mail_box_solana_contracts';
import { Connection, PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';

// Connect to Solana
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const wallet = new anchor.Wallet(keypair);

// USDC mint addresses
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'); // mainnet
// const USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'); // devnet

// Initialize clients
const mailService = new MailServiceClient(
    connection,
    wallet,
    MAIL_SERVICE_PROGRAM_ID,
    USDC_MINT
);

const mailer = new MailerClient(
    connection,
    wallet,
    MAILER_PROGRAM_ID,
    USDC_MINT
);

// Send a priority message with revenue sharing
await mailer.sendPriority("Hello Solana!", "This is a decentralized message");

// Register a domain
await mailService.registerDomain("example.mailbox", false);

// Claim revenue share
await mailer.claimRecipientShare();
```

### TypeScript Support

Full TypeScript support with auto-generated Anchor types:

```typescript
import type { 
  MailService, 
  Mailer 
} from 'mail_box_solana_contracts/target/types';

// Fully typed program interactions
const tx = await mailerClient.sendPriority(subject, body);
```

## 📁 Project Structure

```
mail_box_solana_contracts/
├── programs/               # Anchor programs (Rust)
│   ├── mail_service/      # Domain registration & delegation
│   └── mailer/            # Messaging with revenue sharing
├── app/                   # TypeScript client library
│   ├── mail-service-client.ts
│   ├── mailer-client.ts
│   └── types.ts
├── tests/                 # Test suites
├── migrations/            # Deployment scripts
├── target/                # Compiled programs and IDLs
├── Anchor.toml            # Anchor configuration
└── package.json           # NPM configuration
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- Rust 1.70+
- Solana CLI
- Anchor CLI

### Installation

```bash
# Clone and install dependencies
npm install

# Build Anchor programs
anchor build

# Run tests
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

## 📋 Solana Programs

### MailService Program

**Purpose**: Domain registration and delegation management

**Key Instructions**:
- `delegate_to(delegate)` - Delegate email handling (10 USDC fee)
- `reject_delegation(delegator)` - Reject unwanted delegations
- `register_domain(domain, is_extension)` - Register domains (100 USDC fee)
- `set_registration_fee(amount)` - Owner fee management
- `withdraw_fees(amount)` - Owner fee withdrawal

**Fees**:
- Domain Registration: 100 USDC
- Delegation: 10 USDC

### Mailer Program

**Purpose**: Message sending with revenue sharing

**Message Types**:
- **Priority Messages**: Full fee (0.1 USDC) + 90% revenue share
  - `send_priority(subject, body)`
  - `send_priority_prepared(mail_id)`
- **Standard Messages**: 10% fee only (0.01 USDC)
  - `send(subject, body)`
  - `send_prepared(mail_id)`

**Revenue Model**:
- Senders pay fees to send messages to themselves
- Priority senders get 90% back as claimable revenue
- 60-day claim period for revenue shares
- Expired shares go to program owner

## 🧪 Testing

Comprehensive test coverage with Anchor testing framework:

```bash
# Run all tests
anchor test

# Run specific test files
anchor test -- --grep "MailService"
```

### Test Categories
- MailService tests - Delegation, domain registration, fees
- Mailer tests - Messaging, revenue sharing, claims

## 🔧 Development Commands

```bash
# Essential commands
anchor build          # Build programs and generate IDLs/types
anchor test           # Run tests
npm run build         # Build TypeScript client

# Development
solana-test-validator  # Start local validator
anchor deploy          # Deploy to current cluster
anchor clean          # Clean build artifacts
```

## 📊 Architecture

### Revenue Sharing Flow
1. **Priority Message**: User pays 0.1 USDC
2. **Revenue Split**: 90% claimable by sender, 10% to owner
3. **Claim Period**: 60 days to claim revenue share
4. **Expiration**: Unclaimed shares go to program owner

### Delegation System
1. **Delegate**: Pay 10 USDC to delegate email handling
2. **Reject**: Delegates can reject unwanted delegations
3. **Clear**: Set delegate to null to clear delegation

## 🛠️ TypeScript Integration

Full TypeScript support with Anchor-generated types:

```typescript
import { MailServiceClient, MailerClient } from './app';

// Type-safe program interactions
const mailService = new MailServiceClient(connection, wallet, programId, usdcMint);
await mailService.delegateTo(delegateAddress);

const mailer = new MailerClient(connection, wallet, programId, usdcMint);
await mailer.sendPriority("Subject", "Body");
```

## 🌐 Network Deployment

### Supported Networks

- **Mainnet**: Program deployed with real USDC
- **Devnet**: Testing with devnet USDC
- **Localnet**: Local development with mock tokens

### USDC Integration

- **Mainnet**: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- **Devnet**: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`

### Deployment Process

1. **Build Programs**: `anchor build`
2. **Deploy**: `anchor deploy --provider.cluster <network>`
3. **Initialize**: Run initialization scripts
4. **Verify**: Test basic functionality

## 🔐 Security Features

- **Program Derived Addresses (PDAs)** for deterministic account generation
- **Cross-Program Invocation (CPI)** for secure token transfers
- **Time-based expiration** for revenue claims
- **Access control** with owner-only functions
- **Comprehensive error handling** with custom errors

## 📖 Documentation

### Key Differences from EVM Version

1. **Account Model**: Solana's account model vs Ethereum's state-based model
2. **Program Derived Addresses**: Deterministic addresses without private keys
3. **Token Program Integration**: SPL Token integration vs ERC20
4. **Cross-Program Invocations**: Secure inter-program calls
5. **Anchor Framework**: Type-safe Solana development

### Migration from EVM

The Solana implementation maintains functional equivalence with the EVM version while leveraging Solana-specific optimizations:

- Same fee structure and revenue sharing model
- Equivalent domain registration and delegation features
- Compatible TypeScript client interface
- Similar testing patterns and deployment workflows

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Add comprehensive tests for new functionality
4. Ensure all tests pass: `anchor test`
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details.

---

**Built with**: Anchor, Solana, Rust, TypeScript, SPL Token

## 🆚 EVM vs Solana Comparison

| Feature | EVM Implementation | Solana Implementation |
|---------|-------------------|---------------------|
| **Language** | Solidity | Rust (Anchor) |
| **Tokens** | ERC20 (USDC) | SPL Token (USDC) |
| **Accounts** | Smart contracts | Program Derived Addresses |
| **Gas Model** | Gas fees (ETH) | Transaction fees (SOL) |
| **Concurrency** | Sequential | Parallel processing |
| **Finality** | ~15 seconds | ~400ms |

The Solana implementation offers:
- **Lower fees**: Significantly cheaper transactions
- **Higher throughput**: Thousands of TPS vs dozens
- **Faster finality**: Sub-second confirmation
- **Native token integration**: First-class SPL token support