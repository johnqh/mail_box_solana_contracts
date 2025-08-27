# MailBox Solana - Deployment Guide

## Quick Start

### Prerequisites
- Node.js 16+ and npm
- Solana CLI tools
- Anchor framework
- A funded Solana wallet

### 1-Minute Deploy
```bash
# Clone and setup
git clone https://github.com/johnqh/mail_box_solana_contracts
cd mail_box_solana_contracts
npm install

# Build programs
anchor build

# Deploy to devnet
npm run deploy:devnet-coordinated

# Verify deployment
npm run verify-deployments
```

## Deployment Options

### Single Network Deployment

Deploy to a specific network:
```bash
# Local validator (testing)
npm run deploy:local

# Devnet (development)
npm run deploy:devnet-coordinated

# Testnet (staging)
npm run deploy:testnet

# Mainnet (production)
npm run deploy:mainnet-coordinated
```

### Multi-Network Coordinated Deployment

Deploy to multiple test networks simultaneously:
```bash
# Deploy to all test networks (localnet, devnet, testnet)
npm run deploy:coordinated
```

This ensures identical addresses across all networks.

## Network Configuration

### Supported Networks

| Network | RPC URL | USDC Token | Purpose |
|---------|---------|------------|---------|
| **Mainnet-Beta** | `https://api.mainnet-beta.solana.com` | Real USDC | Production |
| **Devnet** | `https://api.devnet.solana.com` | Mock USDC | Development |
| **Testnet** | `https://api.testnet.solana.com` | Mock USDC | Staging |
| **Localnet** | `http://127.0.0.1:8899` | Mock USDC | Local Testing |

### USDC Configuration
- **Mainnet:** Uses real USDC (`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`)
- **Test Networks:** Automatically creates mock USDC with 6 decimals
- **Local:** Creates mock USDC and funds deployer with 1M tokens

## Wallet Setup

### Option 1: Default Solana Wallet
```bash
# Generate new wallet (if needed)
solana-keygen new --outfile ~/.config/solana/id.json

# Set as default
solana config set --keypair ~/.config/solana/id.json
```

### Option 2: Custom Wallet
```bash
# Set custom wallet path
export ANCHOR_WALLET=/path/to/your/wallet.json
```

### Funding Your Wallet

**Devnet:**
```bash
solana airdrop 2 --url devnet
```

**Testnet:**
```bash
solana airdrop 2 --url testnet
```

**Mainnet:**
Fund your wallet with SOL from an exchange.

## Deployment Process

### Step 1: Build Programs
```bash
# Clean previous builds
npm run clean

# Build all programs
anchor build
```

This generates:
- Program binaries in `target/deploy/`
- IDL files in `target/idl/`
- TypeScript types in `target/types/`

### Step 2: Predict Addresses
```bash
npm run predict-addresses
```

Generates consistent addresses that will be identical across all networks.

### Step 3: Deploy
Choose your deployment strategy:

**Single Network:**
```bash
npm run deploy:devnet-coordinated
```

**Multi-Network:**
```bash
npm run deploy:coordinated
```

**Custom Network:**
```bash
ts-node scripts/deploy.ts <network-name>
```

### Step 4: Verify Deployment
```bash
npm run verify-deployments
```

Checks all networks and confirms:
- Programs are deployed
- Programs are initialized
- Addresses are consistent
- Fees are set correctly

## Deployment Architecture

### Program Deployment Order
1. **MailBox Factory** - Coordinates other deployments
2. **USDC Token** - Creates mock USDC on test networks
3. **Mailer** - Messaging system
4. **Mail Service** - Domain registration system

### Address Generation
All addresses use deterministic Program Derived Addresses (PDAs):

```rust
// These seeds ensure consistent addresses
Factory:     ["factory"]
Mailer:      ["mailer"]
MailService: ["mail_service"]
```

## Configuration Management

### Environment Variables
```bash
# Wallet location (optional)
export ANCHOR_WALLET=/path/to/wallet.json

# Owner address (optional, defaults to deployer)
export OWNER_ADDRESS=<owner_pubkey>

# Custom USDC address (optional, for test networks)
export USDC_ADDRESS=<usdc_mint_pubkey>
```

### Network-Specific Settings

**Localnet:**
- Starts local validator automatically
- Creates mock USDC
- Fast deployment for testing

**Devnet/Testnet:**
- Uses public RPC endpoints
- Creates mock USDC
- Suitable for staging

**Mainnet:**
- Uses real USDC token
- Production deployment
- Requires careful validation

## Advanced Deployment

### Custom Factory Deployment
```typescript
// Example: Custom factory initialization
const factory = await deployFactory(provider, "v1.1.0");
await registerDeployment(factory, "Mailer", mailerProgramId, "devnet");
```

### Batch Operations
```typescript
// Coordinate multiple program initialization
await batchInitializePrograms(
    provider,
    "MailBox",
    "v1.0.0",
    usdcMint
);
```

### Cross-Network Verification
```typescript
// Verify consistent addresses across networks
const addresses = await predictAddresses(
    "MailBox",
    "v1.0.0",
    mailerProgramId,
    mailServiceProgramId,
    factoryProgramId
);
```

## Deployment Files

### Generated Files
- `deployments/<network>.json` - Single network deployment info
- `deployments/coordinated-deployment.json` - Multi-network summary
- `predictions/address-predictions-v1.0.0.json` - Predicted addresses
- `verification/verification-YYYY-MM-DD.json` - Verification results

### Example Deployment Info
```json
{
  "network": "devnet",
  "chainId": "Solana Devnet",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "deployer": "...",
  "owner": "...",
  "programs": {
    "factory": "...",
    "usdcMint": "...",
    "mailer": "...",
    "mailService": "..."
  },
  "fees": {
    "sendFee": "0.1 USDC",
    "registrationFee": "100.0 USDC",
    "delegationFee": "10.0 USDC"
  },
  "transactions": {
    "factory": "...",
    "mailer": "...",
    "mailService": "..."
  }
}
```

## Troubleshooting

### Common Issues

**"Insufficient SOL balance"**
```bash
# Check balance
solana balance --url <network>

# Request airdrop (testnets only)
solana airdrop 2 --url <network>
```

**"Account already exists"**
- Programs are already deployed
- Use verification script to check status
- Consider using existing deployment

**"Network connection failed"**
- Check internet connection
- Verify RPC endpoint
- Try different RPC if needed

**"IDL files not found"**
```bash
# Rebuild programs
anchor build
```

### Debugging Deployment
```bash
# Verbose logging
DEBUG=* npm run deploy:devnet-coordinated

# Check program logs
solana logs --url <network>

# Manual address verification
solana account <program_address> --url <network>
```

### Recovery Procedures

**Failed Deployment:**
1. Check logs for specific error
2. Verify wallet has sufficient SOL
3. Retry deployment (idempotent)
4. Use verification script to check status

**Inconsistent Addresses:**
1. Run address prediction script
2. Compare with actual deployments
3. Redeploy if necessary (addresses should be deterministic)

## Production Deployment Checklist

### Pre-Deployment
- [ ] Code review completed
- [ ] Tests passing on all test networks
- [ ] Address predictions generated
- [ ] Wallet funded with sufficient SOL
- [ ] Owner address configured correctly

### Deployment
- [ ] Deploy to devnet first
- [ ] Verify devnet deployment
- [ ] Deploy to testnet
- [ ] Verify testnet deployment
- [ ] Run full integration tests
- [ ] Deploy to mainnet
- [ ] Verify mainnet deployment

### Post-Deployment
- [ ] Verify all programs initialized correctly
- [ ] Check fee configurations
- [ ] Test basic functionality
- [ ] Monitor for any issues
- [ ] Update documentation with addresses
- [ ] Notify integration partners

## Integration

### Using Deployed Programs
```typescript
import { MailerClient, MailServiceClient } from 'mail_box_solana_contracts';

// Load from deployment file
const deployment = require('./deployments/devnet.json');

// Initialize clients
const mailer = new MailerClient(
    connection,
    wallet,
    new PublicKey(deployment.programs.mailer),
    new PublicKey(deployment.programs.usdcMint)
);
```

### Address Reference
After deployment, use the generated addresses in your applications:
```typescript
// Addresses are consistent across networks
const ADDRESSES = {
    MAILER: "...",        // From predictions or deployment
    MAIL_SERVICE: "...",  // Same address on all networks
    FACTORY: "..."        // Deterministic PDA
};
```

## Maintenance

### Version Updates
1. Update version in deployment scripts
2. Generate new address predictions
3. Deploy new version
4. Update client integrations
5. Deprecate old versions (if needed)

### Fee Updates
```bash
# Update fees post-deployment (owner only)
ts-node scripts/update-fees.ts <network> --send-fee 200000 --reg-fee 50000000
```

### Monitoring
- Monitor program accounts for changes
- Track fee collection and claims
- Watch for unusual transaction patterns
- Set up alerts for program upgrades