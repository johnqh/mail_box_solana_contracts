# MailBox Solana - Release Notes

## Version 1.0.0 - Initial Release
*Released: January 1, 2024*

### 🎉 Features

**Core Messaging System**
- Two-tier messaging system with Priority and Standard tiers
- Priority messages: Full fee (0.1 USDC) with 90% revenue sharing
- Standard messages: Reduced fee (0.01 USDC) with no revenue sharing
- Support for both direct messages and prepared message IDs

**Revenue Sharing**
- 90% of priority message fees go to message senders
- 10% of all fees go to protocol owner
- 60-day claim period for recipient shares
- Automatic expiry handling - unclaimed shares revert to owner
- Gas-efficient claiming mechanism

**Domain Registration**
- Domain registration with 100 USDC fee
- 1-year registration terms
- Domain extension support
- Event-driven registration tracking

**Delegation System**
- Delegate message handling to other addresses
- 10 USDC delegation fee
- Delegation rejection capability
- Clear delegation without fees

**Cross-Network Deployment**
- Deterministic Program Derived Addresses (PDAs)
- Identical addresses across all Solana networks
- Factory program for deployment coordination
- Automated address prediction

**Developer Tools**
- Comprehensive TypeScript client libraries
- Multi-network deployment scripts
- Address prediction utilities
- Deployment verification tools

### 🏗️ Architecture

**Programs**
- `MailBoxFactory`: Deployment coordination and version management
- `Mailer`: Core messaging and revenue sharing functionality  
- `MailService`: Domain registration and delegation management

**Token Integration**
- Native USDC support on mainnet (`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`)
- Mock USDC creation for test networks
- 6-decimal precision matching USDC standard

**Network Support**
- Mainnet-Beta (production)
- Devnet (development)
- Testnet (staging)  
- Localnet (local development)

### 🔒 Security

- Reentrancy protection on all financial operations
- Owner-only access controls for administrative functions
- Fail-safe fee payment validation
- Atomic transaction processing
- No partial execution scenarios

### 📦 Technical Details

**Dependencies**
- Solana: >=1.16.0
- Anchor: >=0.30.1
- Node.js: >=16.0.0

**Program IDs**
- Factory: `FactoryABC123def456GHI789jkl012MNO345pqr678STU`
- Mailer: `9FLkBDGpZBcR8LMsQ7MwwV6X9P4TDFgN3DeRh5qYyHJF`
- MailService: `8EKjCLZjz6LKRxZcQ6LwwF5V8P3TCEgM2CdQg4pZxXHE`

**Consistent PDAs** (identical across all networks)
- Factory: `seeds: ["factory"]`
- Mailer: `seeds: ["mailer"]`
- MailService: `seeds: ["mail_service"]`

### 🚀 Deployment

**Available Networks**
```bash
# Single network deployment
npm run deploy:devnet-coordinated
npm run deploy:testnet  
npm run deploy:mainnet-coordinated

# Multi-network coordinated deployment
npm run deploy:coordinated

# Address prediction
npm run predict-addresses

# Deployment verification
npm run verify-deployments
```

### 📊 Comparison with EVM Version

| Feature | Solana | EVM |
|---------|--------|-----|
| **Deployment** | PDA-based deterministic | CREATE2 deterministic |
| **Transaction Cost** | ~0.000005 SOL | Variable gas costs |
| **Throughput** | 65,000 TPS | ~15 TPS (Ethereum) |
| **Finality** | ~400ms | ~12 seconds |
| **Network Support** | Solana networks | All EVM chains |
| **Token Standard** | SPL Token (USDC) | ERC-20 (USDC) |

### 🔧 Breaking Changes
None - initial release.

### 🐛 Known Issues
None at release.

### 📖 Documentation

- [Architecture Guide](./ARCHITECTURE.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Testing Guide](./TESTING.md)
- [API Documentation](./docs/api/)

### 🎯 Future Roadmap

**v1.1.0 - Enhanced Features**
- Multi-recipient messaging
- Message encryption support
- Advanced delegation controls
- Enhanced analytics

**v1.2.0 - Scaling Improvements**
- Batch message sending
- Compressed transaction support
- State compression for large datasets
- Advanced indexing

**v2.0.0 - Protocol Upgrades**
- Cross-chain messaging bridge
- NFT integration for domains
- Advanced revenue models
- Governance token integration

---

## Migration Guide

### From EVM to Solana

Key differences when migrating from EVM version:

**Address Format**
```typescript
// EVM (hex)
const address = "0x1234...abcd";

// Solana (base58)
const address = "1234...abcd"; // 32-44 characters
```

**Transaction Handling**
```typescript
// EVM
const tx = await contract.send();
await tx.wait();

// Solana
const signature = await program.rpc.send();
await connection.confirmTransaction(signature);
```

**Token Accounts**
```typescript
// EVM - tokens are contracts
const balance = await usdcContract.balanceOf(address);

// Solana - tokens are accounts
const tokenAccount = getAssociatedTokenAddressSync(mint, owner);
const balance = await connection.getTokenAccountBalance(tokenAccount);
```

### Development Setup

```bash
# Install Solana tools
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor
npm install -g @coral-xyz/anchor-cli

# Clone and setup project
git clone https://github.com/johnqh/mail_box_solana_contracts
cd mail_box_solana_contracts
npm install

# Build programs
anchor build

# Deploy locally
npm run deploy:local
```

---

## Support

- **Documentation:** [GitHub Repository](https://github.com/johnqh/mail_box_solana_contracts)
- **Issues:** [GitHub Issues](https://github.com/johnqh/mail_box_solana_contracts/issues)
- **Discord:** [MailBox Community](#)
- **Twitter:** [@MailBoxProtocol](#)

---

*This release marks the successful port of the MailBox protocol to Solana, maintaining full feature parity with the EVM version while leveraging Solana's performance and cost advantages.*