# MailBox Solana - Testing Guide

## Testing Overview

MailBox Solana uses a comprehensive testing strategy covering unit tests, integration tests, and end-to-end testing across multiple networks.

## Quick Start

```bash
# Install dependencies
npm install

# Build programs
anchor build

# Run all tests
npm test

# Run tests with local validator
npm run test:local
```

## Test Structure

```
tests/
├── mail-service.test.ts    # Domain registration & delegation tests
├── mailer.test.ts          # Messaging & revenue sharing tests
├── factory.test.ts         # Deployment coordination tests
├── integration/
│   ├── cross-program.test.ts    # Multi-program interactions
│   ├── revenue-sharing.test.ts  # Complete revenue flow tests
│   └── deployment.test.ts       # Deployment coordination tests
└── utils/
    ├── setup.ts            # Test environment setup
    └── helpers.ts          # Common test utilities
```

## Testing Frameworks

- **Anchor Testing Framework:** Solana program testing
- **Mocha:** Test runner
- **Chai:** Assertions
- **TypeScript:** Type safety in tests

## Unit Tests

### Mailer Tests

Test messaging functionality and revenue sharing:

```typescript
describe("Mailer", () => {
    it("should send priority message with revenue sharing", async () => {
        // Setup
        const subject = "Test Subject";
        const body = "Test Body";
        
        // Execute
        const tx = await mailerClient.sendPriority(subject, body);
        
        // Verify
        expect(tx).to.exist;
        // Check recipient claim balance increased
        // Check owner claim balance increased
        // Verify fee split (90/10)
    });
    
    it("should handle claim expiry correctly", async () => {
        // Test 60-day claim period
        // Verify expired claims revert to owner
    });
});
```

### Mail Service Tests

Test domain registration and delegation:

```typescript
describe("MailService", () => {
    it("should register domain with fee payment", async () => {
        const domain = "test.mailbox";
        const tx = await mailServiceClient.registerDomain(domain);
        
        expect(tx).to.exist;
        // Verify domain registered event
        // Check fee deducted
    });
    
    it("should handle delegation correctly", async () => {
        const delegate = Keypair.generate().publicKey;
        const tx = await mailServiceClient.delegateTo(delegate);
        
        // Verify delegation set
        // Check fee charged
    });
});
```

### Factory Tests

Test deployment coordination:

```typescript
describe("Factory", () => {
    it("should predict consistent addresses", async () => {
        const addresses = await factoryClient.predictAddresses(
            "MailBox", 
            "v1.0.0"
        );
        
        // Verify addresses are deterministic
        // Check cross-network consistency
    });
});
```

## Integration Tests

### Cross-Program Interactions

Test interactions between programs:

```typescript
describe("Cross-Program Integration", () => {
    it("should coordinate mailer and mail service", async () => {
        // Register domain
        await mailServiceClient.registerDomain("user.mailbox");
        
        // Set up delegation
        await mailServiceClient.delegateTo(delegateKeypair.publicKey);
        
        // Send message with delegation
        await mailerClient.sendPriority("Hello", "World");
        
        // Verify delegation works
        // Check revenue sharing with delegated recipient
    });
});
```

### Revenue Sharing End-to-End

Complete revenue flow testing:

```typescript
describe("Revenue Sharing E2E", () => {
    let sender: Keypair;
    let recipient: PublicKey;
    
    beforeEach(async () => {
        // Setup wallets with USDC
        sender = await setupWalletWithUSDC(1000);
        recipient = sender.publicKey; // Self-messaging
    });
    
    it("should complete full revenue sharing cycle", async () => {
        // 1. Send priority message
        const initialBalance = await getUSDCBalance(sender.publicKey);
        await mailerClient.sendPriority("Test", "Message");
        
        // 2. Verify fee deducted
        const postSendBalance = await getUSDCBalance(sender.publicKey);
        expect(initialBalance - postSendBalance).to.equal(100000); // 0.1 USDC
        
        // 3. Check claimable amounts
        const claimable = await mailerClient.getRecipientClaimable(recipient);
        expect(claimable.amount).to.equal(90000); // 90% of 0.1 USDC
        
        // 4. Claim revenue share
        await mailerClient.claimRecipientShare();
        
        // 5. Verify balance increased
        const finalBalance = await getUSDCBalance(sender.publicKey);
        expect(finalBalance - postSendBalance).to.equal(90000);
    });
    
    it("should handle claim expiry", async () => {
        // Send message
        await mailerClient.sendPriority("Test", "Message");
        
        // Fast-forward time 61 days (beyond claim period)
        await fastForwardTime(61 * 24 * 60 * 60);
        
        // Attempt to claim (should fail)
        try {
            await mailerClient.claimRecipientShare();
            expect.fail("Should have failed due to expiry");
        } catch (error) {
            expect(error.message).to.include("claim period expired");
        }
        
        // Owner should be able to claim expired shares
        await mailerClient.claimExpiredShares(recipient);
    });
});
```

## Network Testing

### Local Validator Testing

Test against local validator for fast iteration:

```bash
# Start local validator with test setup
solana-test-validator \
    --bpf-program EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v usdc_mock.so \
    --reset

# Run tests
npm run test:local
```

### Multi-Network Testing

Test deployment consistency across networks:

```typescript
describe("Multi-Network Deployment", () => {
    const networks = ['localnet', 'devnet'];
    
    networks.forEach(network => {
        it(`should deploy consistently to ${network}`, async () => {
            const deployment = await deployToNetwork(network);
            
            // Verify addresses match predictions
            expect(deployment.mailer).to.equal(predictedAddresses.mailer);
            expect(deployment.mailService).to.equal(predictedAddresses.mailService);
            
            // Verify program functionality
            await testBasicFunctionality(network, deployment);
        });
    });
});
```

## Performance Tests

### Gas/Compute Cost Testing

```typescript
describe("Performance", () => {
    it("should use reasonable compute units", async () => {
        const tx = await mailerClient.sendPriority("Test", "Message");
        const computeUnits = await getComputeUnitsUsed(tx);
        
        // Verify compute usage is reasonable
        expect(computeUnits).to.be.lessThan(100000);
    });
    
    it("should handle batch operations efficiently", async () => {
        const messages = Array.from({length: 10}, (_, i) => ({
            subject: `Test ${i}`,
            body: `Message ${i}`
        }));
        
        const startTime = Date.now();
        
        // Send messages in parallel
        await Promise.all(
            messages.map(msg => 
                mailerClient.sendPriority(msg.subject, msg.body)
            )
        );
        
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        
        // Should complete within reasonable time
        expect(totalTime).to.be.lessThan(5000); // 5 seconds
    });
});
```

## Security Tests

### Access Control Testing

```typescript
describe("Security", () => {
    it("should prevent unauthorized fee updates", async () => {
        const unauthorizedWallet = Keypair.generate();
        const unauthorizedClient = new MailerClient(
            connection,
            new anchor.Wallet(unauthorizedWallet),
            mailerProgramId,
            usdcMint
        );
        
        try {
            await unauthorizedClient.setFee(200000);
            expect.fail("Should have failed with unauthorized access");
        } catch (error) {
            expect(error.message).to.include("OnlyOwner");
        }
    });
    
    it("should prevent double spending", async () => {
        // Fund wallet with exact amount for one message
        await fundWalletWithUSDC(testWallet, 100000); // 0.1 USDC
        
        // First message should succeed
        await mailerClient.sendPriority("First", "Message");
        
        // Second message should fail due to insufficient funds
        try {
            await mailerClient.sendPriority("Second", "Message");
            expect.fail("Should have failed with insufficient funds");
        } catch (error) {
            expect(error).to.exist;
        }
    });
});
```

### Reentrancy Testing

```typescript
describe("Reentrancy Protection", () => {
    it("should prevent reentrancy in claim functions", async () => {
        // Setup scenario where reentrancy could occur
        // Attempt to call claim function recursively
        // Verify it's prevented by the guard
    });
});
```

## Test Utilities

### Setup Helpers

```typescript
// Test environment setup
export async function setupTestEnvironment() {
    const connection = new Connection("http://localhost:8899", "confirmed");
    const wallet = await createFundedWallet(connection);
    const usdcMint = await createMockUSDC(connection, wallet);
    
    return { connection, wallet, usdcMint };
}

// Create wallet with SOL and USDC
export async function createFundedWallet(
    connection: Connection,
    solAmount: number = 10,
    usdcAmount: number = 1000
) {
    const wallet = Keypair.generate();
    
    // Airdrop SOL
    await connection.requestAirdrop(wallet.publicKey, solAmount * LAMPORTS_PER_SOL);
    
    // Create and fund USDC account
    const usdcAccount = await createAssociatedTokenAccount(
        connection,
        wallet,
        usdcMint,
        wallet.publicKey
    );
    
    await mintTo(
        connection,
        wallet,
        usdcMint,
        usdcAccount,
        mintAuthority,
        usdcAmount * 1_000_000 // 6 decimals
    );
    
    return wallet;
}
```

### Assertion Helpers

```typescript
// Custom assertions for USDC amounts
export function expectUSDCAmount(actual: number, expected: number, tolerance: number = 0) {
    const diff = Math.abs(actual - expected);
    expect(diff).to.be.at.most(tolerance, 
        `Expected ${expected/1_000_000} USDC, got ${actual/1_000_000} USDC`
    );
}

// Event assertion helpers
export async function expectEventEmitted(tx: string, eventName: string, eventData?: any) {
    const events = await getTransactionEvents(tx);
    const targetEvent = events.find(e => e.name === eventName);
    
    expect(targetEvent).to.exist;
    
    if (eventData) {
        expect(targetEvent.data).to.deep.include(eventData);
    }
}
```

## Continuous Integration

### GitHub Actions Setup

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '16'
    
    - name: Setup Solana
      run: |
        sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
        echo "$HOME/.local/share/solana/install/active_release/bin" >> $GITHUB_PATH
    
    - name: Setup Anchor
      run: |
        npm install -g @coral-xyz/anchor-cli
    
    - name: Install dependencies
      run: npm install
    
    - name: Build programs
      run: anchor build
    
    - name: Run tests
      run: npm test
    
    - name: Test deployment scripts
      run: |
        npm run predict-addresses
        npm run deploy:local
        npm run verify-deployments
```

### Test Coverage

```bash
# Generate coverage report
npx nyc npm test

# View coverage
npx nyc report --reporter=html
open coverage/index.html
```

## Manual Testing

### Interactive Testing Script

```typescript
// scripts/manual-test.ts
async function manualTest() {
    console.log("🧪 Starting Manual Test Suite");
    
    // 1. Setup
    const { connection, wallet, usdcMint } = await setupTestEnvironment();
    
    // 2. Deploy programs
    console.log("Deploying programs...");
    const deployment = await deployPrograms(connection, wallet, usdcMint);
    
    // 3. Test messaging
    console.log("Testing messaging...");
    await testMessaging(deployment);
    
    // 4. Test domain registration
    console.log("Testing domain registration...");
    await testDomainRegistration(deployment);
    
    // 5. Test revenue sharing
    console.log("Testing revenue sharing...");
    await testRevenueSharing(deployment);
    
    console.log("✅ Manual tests completed successfully");
}

// Run manual tests
manualTest().catch(console.error);
```

## Debugging Tests

### Common Issues

**"Account not found"**
- Ensure programs are built and deployed
- Check account addresses are correct
- Verify test setup created required accounts

**"Insufficient funds"**
- Check wallet funding in test setup
- Verify USDC mint and token accounts
- Ensure adequate SOL for transaction fees

**"Transaction failed"**
- Check program logs: `solana logs`
- Verify instruction parameters
- Check account permissions

### Debug Utilities

```typescript
// Debug helpers
export async function debugTransaction(signature: string) {
    const tx = await connection.getTransaction(signature);
    console.log("Transaction:", JSON.stringify(tx, null, 2));
}

export async function debugAccount(address: PublicKey) {
    const account = await connection.getAccountInfo(address);
    console.log("Account Info:", {
        address: address.toString(),
        lamports: account?.lamports,
        dataLength: account?.data.length,
        owner: account?.owner.toString()
    });
}
```

## Test Data Management

### Mock Data Generators

```typescript
// Generate test domains
export function generateTestDomain(): string {
    return `test-${Math.random().toString(36).substr(2, 9)}.mailbox`;
}

// Generate test messages
export function generateTestMessage(): { subject: string, body: string } {
    return {
        subject: `Test Subject ${Date.now()}`,
        body: `Test message body generated at ${new Date().toISOString()}`
    };
}
```

### Test Cleanup

```typescript
afterEach(async () => {
    // Clean up test accounts
    await cleanupTestAccounts();
    
    // Reset state
    await resetProgramState();
});
```

## Performance Benchmarks

Target performance metrics:

| Operation | Max Compute Units | Max Time | Max Cost |
|-----------|-------------------|----------|----------|
| Send Message | 50,000 | 1s | 0.000005 SOL |
| Register Domain | 30,000 | 1s | 0.000005 SOL |
| Claim Revenue | 25,000 | 1s | 0.000005 SOL |
| Set Delegation | 20,000 | 1s | 0.000005 SOL |

Run benchmarks:
```bash
npm run benchmark
```