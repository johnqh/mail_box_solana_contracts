import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import { 
    Connection, 
    PublicKey, 
    SystemProgram, 
    Transaction,
    TransactionInstruction
} from '@solana/web3.js';
import { 
    TOKEN_PROGRAM_ID, 
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getAssociatedTokenAddressSync
} from '@solana/spl-token';
import { MailService } from '../target/types/mail_service';
import { DelegationInfo, MailServiceFees, formatUSDC } from './types';

export class MailServiceClient {
    private program: Program<MailService>;
    private provider: AnchorProvider;
    private mailServicePda: PublicKey;
    private usdcMint: PublicKey;

    constructor(
        connection: Connection,
        wallet: anchor.Wallet,
        programId: PublicKey,
        usdcMint: PublicKey
    ) {
        this.provider = new AnchorProvider(connection, wallet, {});
        this.program = new Program(
            require('../target/idl/mail_service.json') as any,
            this.provider
        ) as Program<MailService>;
        this.usdcMint = usdcMint;
        
        // Derive PDA
        const [mailServicePda] = PublicKey.findProgramAddressSync(
            [Buffer.from('mail_service')],
            this.program.programId
        );
        this.mailServicePda = mailServicePda;
    }

    static async initialize(
        connection: Connection,
        wallet: anchor.Wallet,
        programId: PublicKey,
        usdcMint: PublicKey,
        owner?: PublicKey
    ): Promise<MailServiceClient> {
        const client = new MailServiceClient(connection, wallet, programId, usdcMint);
        await client.initializeProgram(owner || wallet.publicKey);
        return client;
    }

    private async initializeProgram(owner: PublicKey): Promise<void> {
        await ((this.program.methods as any) as any)
            .initialize(this.usdcMint)
            .accounts({
                mailService: this.mailServicePda,
                owner: owner,
                systemProgram: SystemProgram.programId,
            })
            .rpc();
    }

    async delegateTo(delegate?: PublicKey): Promise<string> {
        const delegator = this.provider.wallet.publicKey;
        const [delegationPda] = PublicKey.findProgramAddressSync(
            [Buffer.from('delegation'), delegator.toBuffer()],
            this.program.programId
        );

        const delegatorUsdcAccount = getAssociatedTokenAddressSync(
            this.usdcMint,
            delegator
        );

        const serviceUsdcAccount = getAssociatedTokenAddressSync(
            this.usdcMint,
            this.mailServicePda,
            true
        );

        return await ((this.program.methods as any) as any)
            .delegateTo(delegate || null)
            .accounts({
                delegation: delegationPda,
                mailService: this.mailServicePda,
                delegator: delegator,
                delegatorUsdcAccount,
                serviceUsdcAccount,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .rpc();
    }

    async rejectDelegation(delegatorAddress: PublicKey): Promise<string> {
        const [delegationPda] = PublicKey.findProgramAddressSync(
            [Buffer.from('delegation'), delegatorAddress.toBuffer()],
            this.program.programId
        );

        return await (this.program.methods as any)
            .rejectDelegation()
            .accounts({
                delegation: delegationPda,
                delegator: delegatorAddress,
                rejector: this.provider.wallet.publicKey,
            })
            .rpc();
    }

    async registerDomain(domain: string, isExtension: boolean = false): Promise<string> {
        const registrant = this.provider.wallet.publicKey;
        const registrantUsdcAccount = getAssociatedTokenAddressSync(
            this.usdcMint,
            registrant
        );

        const serviceUsdcAccount = getAssociatedTokenAddressSync(
            this.usdcMint,
            this.mailServicePda,
            true
        );

        return await (this.program.methods as any)
            .registerDomain(domain, isExtension)
            .accounts({
                mailService: this.mailServicePda,
                registrant: registrant,
                registrantUsdcAccount,
                serviceUsdcAccount,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .rpc();
    }

    async setRegistrationFee(newFee: number): Promise<string> {
        return await (this.program.methods as any)
            .setRegistrationFee(new BN(newFee))
            .accounts({
                mailService: this.mailServicePda,
                owner: this.provider.wallet.publicKey,
            })
            .rpc();
    }

    async setDelegationFee(newFee: number): Promise<string> {
        return await (this.program.methods as any)
            .setDelegationFee(new BN(newFee))
            .accounts({
                mailService: this.mailServicePda,
                owner: this.provider.wallet.publicKey,
            })
            .rpc();
    }

    async withdrawFees(amount: number): Promise<string> {
        const owner = this.provider.wallet.publicKey;
        const serviceUsdcAccount = getAssociatedTokenAddressSync(
            this.usdcMint,
            this.mailServicePda,
            true
        );
        const ownerUsdcAccount = getAssociatedTokenAddressSync(
            this.usdcMint,
            owner
        );

        return await (this.program.methods as any)
            .withdrawFees(new BN(amount))
            .accounts({
                mailService: this.mailServicePda,
                owner: owner,
                serviceUsdcAccount,
                ownerUsdcAccount,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .rpc();
    }

    async getDelegation(delegator: PublicKey): Promise<DelegationInfo | null> {
        try {
            const [delegationPda] = PublicKey.findProgramAddressSync(
                [Buffer.from('delegation'), delegator.toBuffer()],
                this.program.programId
            );

            const account = await (this.program.account as any).delegation.fetch(delegationPda);
            return {
                delegator: account.delegator,
                delegate: account.delegate,
            };
        } catch {
            return null;
        }
    }

    async getFees(): Promise<MailServiceFees> {
        const account = await (this.program.account as any).mailServiceState.fetch(this.mailServicePda);
        return {
            registrationFee: account.registrationFee.toNumber(),
            delegationFee: account.delegationFee.toNumber(),
        };
    }

    async getFeesFormatted(): Promise<{ registrationFee: string; delegationFee: string }> {
        const fees = await this.getFees();
        return {
            registrationFee: formatUSDC(fees.registrationFee) + ' USDC',
            delegationFee: formatUSDC(fees.delegationFee) + ' USDC',
        };
    }

    getServiceAddress(): PublicKey {
        return this.mailServicePda;
    }

    getUsdcMint(): PublicKey {
        return this.usdcMint;
    }

    getProgramId(): PublicKey {
        return this.program.programId;
    }
}