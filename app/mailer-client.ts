import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import { 
    Connection, 
    PublicKey, 
    SystemProgram
} from '@solana/web3.js';
import { 
    TOKEN_PROGRAM_ID, 
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getAssociatedTokenAddressSync
} from '@solana/spl-token';
import { Mailer } from '../target/types/mailer';
import { ClaimableInfo, MailerFees, formatUSDC, CLAIM_PERIOD_DAYS } from './types';

export class MailerClient {
    private program: Program<Mailer>;
    private provider: AnchorProvider;
    private mailerPda: PublicKey;
    private usdcMint: PublicKey;

    constructor(
        connection: Connection,
        wallet: anchor.Wallet,
        programId: PublicKey,
        usdcMint: PublicKey
    ) {
        this.provider = new AnchorProvider(connection, wallet, {});
        this.program = new Program(
            require('../target/idl/mailer.json') as any,
            this.provider
        ) as Program<Mailer>;
        this.usdcMint = usdcMint;
        
        // Derive PDA
        const [mailerPda] = PublicKey.findProgramAddressSync(
            [Buffer.from('mailer')],
            this.program.programId
        );
        this.mailerPda = mailerPda;
    }

    static async initialize(
        connection: Connection,
        wallet: anchor.Wallet,
        programId: PublicKey,
        usdcMint: PublicKey,
        owner?: PublicKey
    ): Promise<MailerClient> {
        const client = new MailerClient(connection, wallet, programId, usdcMint);
        await client.initializeProgram(owner || wallet.publicKey);
        return client;
    }

    private async initializeProgram(owner: PublicKey): Promise<void> {
        await (this.program.methods as any)
            .initialize(this.usdcMint)
            .accounts({
                mailer: this.mailerPda,
                owner: owner,
                systemProgram: SystemProgram.programId,
            })
            .rpc();
    }

    async sendPriority(subject: string, body: string): Promise<string> {
        const sender = this.provider.wallet.publicKey;
        const [recipientClaimPda] = PublicKey.findProgramAddressSync(
            [Buffer.from('claim'), sender.toBuffer()],
            this.program.programId
        );

        const senderUsdcAccount = getAssociatedTokenAddressSync(
            this.usdcMint,
            sender
        );

        const mailerUsdcAccount = getAssociatedTokenAddressSync(
            this.usdcMint,
            this.mailerPda,
            true
        );

        return await (this.program.methods as any)
            .sendPriority(subject, body)
            .accounts({
                recipientClaim: recipientClaimPda,
                mailer: this.mailerPda,
                sender: sender,
                senderUsdcAccount,
                mailerUsdcAccount,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .rpc();
    }

    async sendPriorityPrepared(mailId: string): Promise<string> {
        const sender = this.provider.wallet.publicKey;
        const [recipientClaimPda] = PublicKey.findProgramAddressSync(
            [Buffer.from('claim'), sender.toBuffer()],
            this.program.programId
        );

        const senderUsdcAccount = getAssociatedTokenAddressSync(
            this.usdcMint,
            sender
        );

        const mailerUsdcAccount = getAssociatedTokenAddressSync(
            this.usdcMint,
            this.mailerPda,
            true
        );

        return await (this.program.methods as any)
            .sendPriorityPrepared(mailId)
            .accounts({
                recipientClaim: recipientClaimPda,
                mailer: this.mailerPda,
                sender: sender,
                senderUsdcAccount,
                mailerUsdcAccount,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .rpc();
    }

    async send(subject: string, body: string): Promise<string> {
        const sender = this.provider.wallet.publicKey;
        const [recipientClaimPda] = PublicKey.findProgramAddressSync(
            [Buffer.from('claim'), sender.toBuffer()],
            this.program.programId
        );

        const senderUsdcAccount = getAssociatedTokenAddressSync(
            this.usdcMint,
            sender
        );

        const mailerUsdcAccount = getAssociatedTokenAddressSync(
            this.usdcMint,
            this.mailerPda,
            true
        );

        return await (this.program.methods as any)
            .send(subject, body)
            .accounts({
                recipientClaim: recipientClaimPda,
                mailer: this.mailerPda,
                sender: sender,
                senderUsdcAccount,
                mailerUsdcAccount,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .rpc();
    }

    async sendPrepared(mailId: string): Promise<string> {
        const sender = this.provider.wallet.publicKey;
        const [recipientClaimPda] = PublicKey.findProgramAddressSync(
            [Buffer.from('claim'), sender.toBuffer()],
            this.program.programId
        );

        const senderUsdcAccount = getAssociatedTokenAddressSync(
            this.usdcMint,
            sender
        );

        const mailerUsdcAccount = getAssociatedTokenAddressSync(
            this.usdcMint,
            this.mailerPda,
            true
        );

        return await (this.program.methods as any)
            .sendPrepared(mailId)
            .accounts({
                recipientClaim: recipientClaimPda,
                mailer: this.mailerPda,
                sender: sender,
                senderUsdcAccount,
                mailerUsdcAccount,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .rpc();
    }

    async claimRecipientShare(): Promise<string> {
        const recipient = this.provider.wallet.publicKey;
        const [recipientClaimPda] = PublicKey.findProgramAddressSync(
            [Buffer.from('claim'), recipient.toBuffer()],
            this.program.programId
        );

        const recipientUsdcAccount = getAssociatedTokenAddressSync(
            this.usdcMint,
            recipient
        );

        const mailerUsdcAccount = getAssociatedTokenAddressSync(
            this.usdcMint,
            this.mailerPda,
            true
        );

        return await (this.program.methods as any)
            .claimRecipientShare()
            .accounts({
                recipientClaim: recipientClaimPda,
                mailer: this.mailerPda,
                recipient: recipient,
                recipientUsdcAccount,
                mailerUsdcAccount,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .rpc();
    }

    async claimOwnerShare(): Promise<string> {
        const owner = this.provider.wallet.publicKey;
        const ownerUsdcAccount = getAssociatedTokenAddressSync(
            this.usdcMint,
            owner
        );

        const mailerUsdcAccount = getAssociatedTokenAddressSync(
            this.usdcMint,
            this.mailerPda,
            true
        );

        return await (this.program.methods as any)
            .claimOwnerShare()
            .accounts({
                mailer: this.mailerPda,
                owner: owner,
                ownerUsdcAccount,
                mailerUsdcAccount,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .rpc();
    }

    async claimExpiredShares(recipient: PublicKey): Promise<string> {
        const [recipientClaimPda] = PublicKey.findProgramAddressSync(
            [Buffer.from('claim'), recipient.toBuffer()],
            this.program.programId
        );

        return await (this.program.methods as any)
            .claimExpiredShares()
            .accounts({
                recipientClaim: recipientClaimPda,
                mailer: this.mailerPda,
                owner: this.provider.wallet.publicKey,
            })
            .rpc();
    }

    async setFee(newFee: number): Promise<string> {
        return await (this.program.methods as any)
            .setFee(new BN(newFee))
            .accounts({
                mailer: this.mailerPda,
                owner: this.provider.wallet.publicKey,
            })
            .rpc();
    }

    async getRecipientClaimable(recipient: PublicKey): Promise<ClaimableInfo | null> {
        try {
            const [recipientClaimPda] = PublicKey.findProgramAddressSync(
                [Buffer.from('claim'), recipient.toBuffer()],
                this.program.programId
            );

            const account = await (this.program.account as any).recipientClaim.fetch(recipientClaimPda);
            const amount = account.amount.toNumber();
            const timestamp = account.timestamp.toNumber();
            const claimPeriodSeconds = CLAIM_PERIOD_DAYS * 24 * 60 * 60;
            const expiresAt = timestamp + claimPeriodSeconds;
            const currentTime = Math.floor(Date.now() / 1000);
            
            return {
                amount,
                expiresAt,
                isExpired: amount > 0 && currentTime > expiresAt,
            };
        } catch {
            return null;
        }
    }

    async getOwnerClaimable(): Promise<number> {
        const account = await (this.program.account as any).mailerState.fetch(this.mailerPda);
        return account.ownerClaimable.toNumber();
    }

    async getFees(): Promise<MailerFees> {
        const account = await (this.program.account as any).mailerState.fetch(this.mailerPda);
        return {
            sendFee: account.sendFee.toNumber(),
        };
    }

    async getFeesFormatted(): Promise<{ sendFee: string }> {
        const fees = await this.getFees();
        return {
            sendFee: formatUSDC(fees.sendFee) + ' USDC',
        };
    }

    getMailerAddress(): PublicKey {
        return this.mailerPda;
    }

    getUsdcMint(): PublicKey {
        return this.usdcMint;
    }

    getProgramId(): PublicKey {
        return this.program.programId;
    }

    // Helper method to calculate fee splits
    calculateFees(sendFee: number, isPriority: boolean): { recipientAmount: number; ownerAmount: number } {
        if (isPriority) {
            const ownerAmount = Math.floor((sendFee * 10) / 100);
            const recipientAmount = sendFee - ownerAmount;
            return { recipientAmount, ownerAmount };
        } else {
            const ownerAmount = Math.floor((sendFee * 10) / 100);
            return { recipientAmount: 0, ownerAmount };
        }
    }
}