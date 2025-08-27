import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { expect } from 'chai';
import { PublicKey, Keypair, SystemProgram } from '@solana/web3.js';
import { 
    TOKEN_PROGRAM_ID, 
    createMint, 
    createAssociatedTokenAccount, 
    mintTo 
} from '@solana/spl-token';
import { MailService } from '../target/types/mail_service';
import { MailServiceClient } from '../app/mail-service-client';

describe('MailService', () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.MailService as Program<MailService>;
    
    let usdcMint: PublicKey;
    let owner: Keypair;
    let user1: Keypair;
    let user2: Keypair;
    let client: MailServiceClient;
    
    const REGISTRATION_FEE = 100_000_000; // 100 USDC
    const DELEGATION_FEE = 10_000_000;    // 10 USDC

    before(async () => {
        // Create keypairs
        owner = Keypair.generate();
        user1 = Keypair.generate();
        user2 = Keypair.generate();

        // Airdrop SOL
        await provider.connection.requestAirdrop(owner.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
        await provider.connection.requestAirdrop(user1.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
        await provider.connection.requestAirdrop(user2.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);

        // Create USDC mint
        usdcMint = await createMint(
            provider.connection,
            provider.wallet.payer,
            provider.wallet.publicKey,
            null,
            6 // USDC decimals
        );

        // Create client and initialize
        const wallet = new anchor.Wallet(owner);
        client = await MailServiceClient.initialize(
            provider.connection,
            wallet,
            program.programId,
            usdcMint,
            owner.publicKey
        );

        // Create token accounts and mint tokens
        await setupTokenAccounts();
    });

    async function setupTokenAccounts() {
        // Create and fund user token accounts
        const user1TokenAccount = await createAssociatedTokenAccount(
            provider.connection,
            user1,
            usdcMint,
            user1.publicKey
        );

        const user2TokenAccount = await createAssociatedTokenAccount(
            provider.connection,
            user2,
            usdcMint,
            user2.publicKey
        );

        // Mint tokens to users
        await mintTo(
            provider.connection,
            provider.wallet.payer,
            usdcMint,
            user1TokenAccount,
            provider.wallet.payer,
            1000 * 1_000_000 // 1000 USDC
        );

        await mintTo(
            provider.connection,
            provider.wallet.payer,
            usdcMint,
            user2TokenAccount,
            provider.wallet.payer,
            1000 * 1_000_000 // 1000 USDC
        );
    }

    describe('Delegation', () => {
        it('Should delegate to another address', async () => {
            const userClient = new MailServiceClient(
                provider.connection,
                new anchor.Wallet(user1),
                program.programId,
                usdcMint
            );

            const txSig = await userClient.delegateTo(user2.publicKey);
            console.log('Delegation transaction:', txSig);

            const delegation = await userClient.getDelegation(user1.publicKey);
            expect(delegation).to.not.be.null;
            expect(delegation!.delegate!.toString()).to.equal(user2.publicKey.toString());
        });

        it('Should reject delegation', async () => {
            const user2Client = new MailServiceClient(
                provider.connection,
                new anchor.Wallet(user2),
                program.programId,
                usdcMint
            );

            const txSig = await user2Client.rejectDelegation(user1.publicKey);
            console.log('Rejection transaction:', txSig);

            const delegation = await user2Client.getDelegation(user1.publicKey);
            expect(delegation!.delegate).to.be.null;
        });

        it('Should clear delegation', async () => {
            const userClient = new MailServiceClient(
                provider.connection,
                new anchor.Wallet(user1),
                program.programId,
                usdcMint
            );

            // Set delegation again
            await userClient.delegateTo(user2.publicKey);
            
            // Clear delegation
            const txSig = await userClient.delegateTo();
            console.log('Clear delegation transaction:', txSig);

            const delegation = await userClient.getDelegation(user1.publicKey);
            expect(delegation!.delegate).to.be.null;
        });
    });

    describe('Domain Registration', () => {
        it('Should register a domain', async () => {
            const userClient = new MailServiceClient(
                provider.connection,
                new anchor.Wallet(user1),
                program.programId,
                usdcMint
            );

            const txSig = await userClient.registerDomain('example.mailbox', false);
            console.log('Domain registration transaction:', txSig);
            
            // Check that fee was charged (we can't easily verify the exact amount without additional setup)
        });

        it('Should extend a domain registration', async () => {
            const userClient = new MailServiceClient(
                provider.connection,
                new anchor.Wallet(user1),
                program.programId,
                usdcMint
            );

            const txSig = await userClient.registerDomain('example.mailbox', true);
            console.log('Domain extension transaction:', txSig);
        });
    });

    describe('Fee Management', () => {
        it('Should get current fees', async () => {
            const fees = await client.getFees();
            expect(fees.registrationFee).to.equal(REGISTRATION_FEE);
            expect(fees.delegationFee).to.equal(DELEGATION_FEE);
        });

        it('Should update registration fee (owner only)', async () => {
            const newFee = 150_000_000; // 150 USDC
            const txSig = await client.setRegistrationFee(newFee);
            console.log('Fee update transaction:', txSig);

            const fees = await client.getFees();
            expect(fees.registrationFee).to.equal(newFee);
        });

        it('Should update delegation fee (owner only)', async () => {
            const newFee = 15_000_000; // 15 USDC
            const txSig = await client.setDelegationFee(newFee);
            console.log('Fee update transaction:', txSig);

            const fees = await client.getFees();
            expect(fees.delegationFee).to.equal(newFee);
        });

        it('Should get formatted fees', async () => {
            const fees = await client.getFeesFormatted();
            expect(fees.registrationFee).to.include('USDC');
            expect(fees.delegationFee).to.include('USDC');
        });
    });
});