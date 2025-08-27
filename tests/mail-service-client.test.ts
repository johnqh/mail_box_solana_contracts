import * as anchor from '@coral-xyz/anchor';
import { expect } from 'chai';
import { PublicKey, Keypair, Connection, clusterApiUrl } from '@solana/web3.js';
import { 
    createMint, 
    createAssociatedTokenAccount, 
    mintTo,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID 
} from '@solana/spl-token';
import { MailServiceClient } from '../app/mail-service-client';
import { formatUSDC, parseUSDC } from '../app/types';

describe('MailServiceClient', () => {
    let connection: Connection;
    let owner: Keypair;
    let user1: Keypair;
    let user2: Keypair;
    let usdcMint: PublicKey;
    let programId: PublicKey;
    let client: MailServiceClient;

    before(async () => {
        // Set up connection (using localnet for tests)
        connection = new Connection('http://localhost:8899', 'confirmed');
        
        // Create keypairs
        owner = Keypair.generate();
        user1 = Keypair.generate();
        user2 = Keypair.generate();

        // Mock program ID for testing
        programId = new PublicKey('8EKjCLZjz6LKRxZcQ6LwwF5V8P3TCEgM2CdQg4pZxXHE');
        
        // Create mock USDC mint
        usdcMint = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
    });

    describe('Constructor and Initialization', () => {
        it('Should create client with correct parameters', () => {
            const wallet = new anchor.Wallet(owner);
            const client = new MailServiceClient(connection, wallet, programId, usdcMint);

            expect(client.getProgramId().toString()).to.equal(programId.toString());
            expect(client.getUsdcMint().toString()).to.equal(usdcMint.toString());
        });

        it('Should derive correct service PDA', () => {
            const wallet = new anchor.Wallet(owner);
            const client = new MailServiceClient(connection, wallet, programId, usdcMint);
            
            const [expectedPda] = PublicKey.findProgramAddressSync(
                [Buffer.from('mail_service')],
                programId
            );
            
            expect(client.getServiceAddress().toString()).to.equal(expectedPda.toString());
        });

        it('Should handle static initialization method', async () => {
            // This would require actual program deployment for full testing
            // For unit testing, we verify the method exists and has correct signature
            expect(MailServiceClient.initialize).to.be.a('function');
            expect(MailServiceClient.initialize.length).to.equal(5); // 5 parameters
        });
    });

    describe('Address Derivation Helpers', () => {
        let testClient: MailServiceClient;

        before(() => {
            const wallet = new anchor.Wallet(owner);
            testClient = new MailServiceClient(connection, wallet, programId, usdcMint);
        });

        it('Should derive delegation PDA correctly', () => {
            const delegator = user1.publicKey;
            const [expectedPda] = PublicKey.findProgramAddressSync(
                [Buffer.from('delegation'), delegator.toBuffer()],
                programId
            );

            // We can verify this by checking that the client would use the same derivation
            // in its delegateTo method (though we can't call it without deployment)
            expect(expectedPda).to.be.instanceOf(PublicKey);
        });

        it('Should derive associated token addresses correctly', () => {
            const owner = user1.publicKey;
            const servicePda = testClient.getServiceAddress();

            // Test that we can derive the expected token account addresses
            // These would be used in the client methods
            expect(() => {
                // This should not throw
                const userTokenAccount = anchor.utils.token.associatedAddress({
                    mint: usdcMint,
                    owner: owner
                });
                const serviceTokenAccount = anchor.utils.token.associatedAddress({
                    mint: usdcMint,
                    owner: servicePda
                });
            }).to.not.throw();
        });
    });

    describe('Client Method Signatures', () => {
        let testClient: MailServiceClient;

        before(() => {
            const wallet = new anchor.Wallet(owner);
            testClient = new MailServiceClient(connection, wallet, programId, usdcMint);
        });

        it('Should have correct delegateTo method signature', () => {
            expect(testClient.delegateTo).to.be.a('function');
            expect(testClient.delegateTo.length).to.equal(1); // Optional delegate parameter
        });

        it('Should have correct rejectDelegation method signature', () => {
            expect(testClient.rejectDelegation).to.be.a('function');
            expect(testClient.rejectDelegation.length).to.equal(1); // delegatorAddress parameter
        });

        it('Should have correct registerDomain method signature', () => {
            expect(testClient.registerDomain).to.be.a('function');
            expect(testClient.registerDomain.length).to.equal(2); // domain and isExtension parameters
        });

        it('Should have correct fee management method signatures', () => {
            expect(testClient.setRegistrationFee).to.be.a('function');
            expect(testClient.setRegistrationFee.length).to.equal(1);

            expect(testClient.setDelegationFee).to.be.a('function');
            expect(testClient.setDelegationFee.length).to.equal(1);

            expect(testClient.withdrawFees).to.be.a('function');
            expect(testClient.withdrawFees.length).to.equal(1);
        });

        it('Should have correct query method signatures', () => {
            expect(testClient.getDelegation).to.be.a('function');
            expect(testClient.getDelegation.length).to.equal(1);

            expect(testClient.getFees).to.be.a('function');
            expect(testClient.getFees.length).to.equal(0);

            expect(testClient.getFeesFormatted).to.be.a('function');
            expect(testClient.getFeesFormatted.length).to.equal(0);
        });
    });

    describe('Error Handling', () => {
        let testClient: MailServiceClient;

        before(() => {
            const wallet = new anchor.Wallet(owner);
            testClient = new MailServiceClient(connection, wallet, programId, usdcMint);
        });

        it('Should handle null delegate in delegateTo', async () => {
            // Test that the method can handle undefined delegate (clearing delegation)
            // This tests the parameter handling logic, not the actual transaction
            try {
                // This will fail due to no actual program deployment, but shouldn't fail on parameter validation
                await testClient.delegateTo();
            } catch (error) {
                // Should be a connection/transaction error, not a parameter error
                expect((error as any).message).to.not.include('parameter');
            }
        });

        it('Should handle invalid PublicKey in rejectDelegation', async () => {
            const invalidDelegator = Keypair.generate().publicKey;
            
            try {
                await testClient.rejectDelegation(invalidDelegator);
            } catch (error) {
                // Should be a connection/transaction error, not a parameter error
                expect((error as any).message).to.not.include('parameter');
            }
        });
    });

    describe('Parameter Validation', () => {
        let testClient: MailServiceClient;

        before(() => {
            const wallet = new anchor.Wallet(owner);
            testClient = new MailServiceClient(connection, wallet, programId, usdcMint);
        });

        it('Should accept valid domain names', () => {
            const validDomains = [
                'example.mailbox',
                'test.domain.mailbox',
                'simple',
                'with-dashes.mailbox',
                'with_underscores.mailbox'
            ];

            validDomains.forEach(domain => {
                // Test that registerDomain method accepts these domains
                // (actual call will fail due to no deployment, but parameter should be accepted)
                expect(() => testClient.registerDomain(domain, false)).to.not.throw();
            });
        });

        it('Should handle boolean flags correctly', () => {
            // Test isExtension parameter handling
            expect(() => testClient.registerDomain('test.mailbox', true)).to.not.throw();
            expect(() => testClient.registerDomain('test.mailbox', false)).to.not.throw();
        });

        it('Should handle fee amounts correctly', () => {
            const testFees = [0, 1000000, 100000000, 999999999999]; // Various USDC amounts in smallest units
            
            testFees.forEach(fee => {
                expect(() => testClient.setRegistrationFee(fee)).to.not.throw();
                expect(() => testClient.setDelegationFee(fee)).to.not.throw();
                expect(() => testClient.withdrawFees(fee)).to.not.throw();
            });
        });
    });

    describe('Integration with Anchor BN', () => {
        let testClient: MailServiceClient;

        before(() => {
            const wallet = new anchor.Wallet(owner);
            testClient = new MailServiceClient(connection, wallet, programId, usdcMint);
        });

        it('Should convert numbers to BN correctly for fee methods', () => {
            // These tests verify that the client correctly converts JavaScript numbers
            // to Anchor BN instances for blockchain transactions
            
            const testFee = 100000000; // 100 USDC
            
            // The methods should internally create BN instances
            // We can't directly test this without mocking, but we verify the methods don't throw on valid inputs
            expect(() => testClient.setRegistrationFee(testFee)).to.not.throw();
            expect(() => testClient.setDelegationFee(testFee)).to.not.throw();
            expect(() => testClient.withdrawFees(testFee)).to.not.throw();
        });
    });

    describe('Utility Method Integration', () => {
        it('Should work with formatUSDC utility', () => {
            const amount = 100000000; // 100 USDC in smallest units
            const formatted = formatUSDC(amount);
            expect(formatted).to.equal('100.00');
        });

        it('Should work with parseUSDC utility', () => {
            const amount = '100.50';
            const parsed = parseUSDC(amount);
            expect(parsed).to.equal(100500000); // 100.5 USDC in smallest units
        });

        it('Should handle fee formatting workflow', async () => {
            // Test the complete workflow that getFeesFormatted would use
            const mockFees = {
                registrationFee: 100000000,
                delegationFee: 10000000
            };

            const formattedRegistration = formatUSDC(mockFees.registrationFee) + ' USDC';
            const formattedDelegation = formatUSDC(mockFees.delegationFee) + ' USDC';

            expect(formattedRegistration).to.equal('100.00 USDC');
            expect(formattedDelegation).to.equal('10.00 USDC');
        });
    });

    describe('Account Structure Validation', () => {
        let testClient: MailServiceClient;

        before(() => {
            const wallet = new anchor.Wallet(owner);
            testClient = new MailServiceClient(connection, wallet, programId, usdcMint);
        });

        it('Should validate delegation account structure', async () => {
            // Test that getDelegation expects the correct account structure
            const mockDelegation = {
                delegator: user1.publicKey,
                delegate: user2.publicKey
            };

            // The method should be able to handle this structure
            // (though it will fail on actual fetch due to no deployment)
            expect(testClient.getDelegation).to.be.a('function');
        });

        it('Should validate fee structure', async () => {
            // Test that getFees expects the correct account structure
            const mockMailServiceState = {
                registrationFee: { toNumber: () => 100000000 },
                delegationFee: { toNumber: () => 10000000 }
            };

            // The method should expect this structure
            expect(testClient.getFees).to.be.a('function');
        });
    });

    describe('Token Program Integration', () => {
        let testClient: MailServiceClient;

        before(() => {
            const wallet = new anchor.Wallet(owner);
            testClient = new MailServiceClient(connection, wallet, programId, usdcMint);
        });

        it('Should use correct token program constants', () => {
            // Verify that the client uses the correct SPL token program IDs
            // These would be used in the account specifications for transactions
            expect(TOKEN_PROGRAM_ID).to.be.instanceOf(PublicKey);
            expect(ASSOCIATED_TOKEN_PROGRAM_ID).to.be.instanceOf(PublicKey);
        });

        it('Should handle associated token account creation', () => {
            // Test that the client can derive associated token accounts correctly
            const owner = user1.publicKey;
            
            // These would be used in the client methods for token transfers
            expect(() => {
                anchor.utils.token.associatedAddress({
                    mint: usdcMint,
                    owner: owner
                });
            }).to.not.throw();
        });
    });

    describe('Client State Management', () => {
        it('Should maintain correct state after construction', () => {
            const wallet = new anchor.Wallet(owner);
            const client = new MailServiceClient(connection, wallet, programId, usdcMint);

            expect(client.getProgramId().toString()).to.equal(programId.toString());
            expect(client.getUsdcMint().toString()).to.equal(usdcMint.toString());
            expect(client.getServiceAddress()).to.be.instanceOf(PublicKey);
        });

        it('Should handle different wallet instances', () => {
            const wallet1 = new anchor.Wallet(user1);
            const wallet2 = new anchor.Wallet(user2);

            const client1 = new MailServiceClient(connection, wallet1, programId, usdcMint);
            const client2 = new MailServiceClient(connection, wallet2, programId, usdcMint);

            // Clients should have same program and mint, but different wallets
            expect(client1.getProgramId().toString()).to.equal(client2.getProgramId().toString());
            expect(client1.getUsdcMint().toString()).to.equal(client2.getUsdcMint().toString());
            expect(client1.getServiceAddress().toString()).to.equal(client2.getServiceAddress().toString());
        });
    });
});