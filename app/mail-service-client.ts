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

/**
 * @class MailServiceClient
 * @description High-level TypeScript client for the MailService program on Solana
 * @notice Provides easy-to-use methods for domain registration and delegation management
 * 
 * ## Key Features:
 * - **Domain Registration**: Register domains for 100 USDC with 1-year expiration
 * - **Domain Extension**: Extend existing domain registrations for another year
 * - **Delegation Management**: Delegate mail handling to other addresses for 10 USDC
 * - **Delegation Rejection**: Allow delegates to reject unwanted delegations
 * - **Fee Management**: Owner can update registration and delegation fees
 * 
 * ## Usage Examples:
 * ```typescript
 * // Connect to existing deployed program
 * const connection = new Connection('https://api.devnet.solana.com');
 * const wallet = new Wallet(keypair);
 * const client = new MailServiceClient(connection, wallet, programId, usdcMint);
 * 
 * // Register a domain
 * await client.registerDomain('mydomain.sol', false);
 * 
 * // Set up delegation
 * await client.delegateTo(delegatePublicKey);
 * 
 * // Check delegation status
 * const delegate = await client.getDelegation(wallet.publicKey);
 * ```
 * 
 * @author MailBox Team
 * @version 1.0.0
 */
export class MailServiceClient {
    private program: Program<MailService>;
    private provider: AnchorProvider;
    private mailServicePda: PublicKey;
    private usdcMint: PublicKey;

    /**
     * @description Creates a new MailServiceClient instance for interacting with a deployed MailService program
     * @param connection Solana RPC connection for blockchain interactions
     * @param wallet Anchor wallet containing keypair for signing transactions
     * @param programId Public key of the deployed MailService program
     * @param usdcMint Public key of the USDC token mint (6 decimal places)
     * @example
     * ```typescript
     * const connection = new Connection('https://api.devnet.solana.com');
     * const wallet = new Wallet(Keypair.generate());
     * const programId = new PublicKey('8EKjCLZjz6LKRxZcQ6LwwF5V8P3TCEgM2CdQg4pZxXHE');
     * const usdcMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
     * const client = new MailServiceClient(connection, wallet, programId, usdcMint);
     * ```
     */
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

    /**
     * @description Deploy and initialize a new MailService program, returning a client instance
     * @param connection Solana RPC connection for blockchain interactions
     * @param wallet Anchor wallet with authority to initialize the program
     * @param programId Public key of the deployed MailService program
     * @param usdcMint Public key of the USDC token mint
     * @param owner Optional owner address (defaults to wallet.publicKey)
     * @returns Promise resolving to a configured MailServiceClient instance
     * @throws {Error} If initialization fails or accounts cannot be created
     * @example
     * ```typescript
     * const client = await MailServiceClient.initialize(
     *     connection,
     *     wallet,
     *     programId,
     *     usdcMint,
     *     ownerPublicKey
     * );
     * console.log('MailService initialized at:', client.getServiceAddress());
     * ```
     */
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

    /**
     * @description Delegate mail handling to another address or clear existing delegation
     * @notice Costs 10 USDC to set delegation, free to clear (pass undefined)
     * @param delegate Target delegate address, or undefined to clear delegation
     * @returns Promise resolving to transaction signature
     * @throws {Error} If insufficient USDC balance (when setting) or transaction fails
     * @example
     * ```typescript
     * // Set delegation to another address (costs 10 USDC)
     * const tx1 = await client.delegateTo(delegatePublicKey);
     * console.log('Delegation set:', tx1);
     * 
     * // Clear delegation (free)
     * const tx2 = await client.delegateTo();
     * console.log('Delegation cleared:', tx2);
     * ```
     */
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

    /**
     * @description Reject a delegation made to you by another address
     * @notice Only the current delegate can reject a delegation made to them
     * @param delegatorAddress Address of the user who delegated to you
     * @returns Promise resolving to transaction signature
     * @throws {Error} If no delegation exists or you're not the current delegate
     * @example
     * ```typescript
     * // If someone delegated to you and you want to reject it
     * const tx = await client.rejectDelegation(delegatorPublicKey);
     * console.log('Delegation rejected:', tx);
     * 
     * // The delegation will be cleared and the delegator will need to set a new one
     * ```
     */
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

    /**
     * @description Register a new domain or extend an existing domain registration
     * @notice Costs 100 USDC for both new registration and extension (1 year each)
     * @param domain The domain name to register (e.g., 'mydomain')
     * @param isExtension true if extending existing registration, false for new registration
     * @returns Promise resolving to transaction signature
     * @throws {Error} If domain is empty, insufficient USDC balance, or transaction fails
     * @example
     * ```typescript
     * // Register a new domain (costs 100 USDC)
     * const tx1 = await client.registerDomain('mydomain.sol', false);
     * console.log('Domain registered:', tx1);
     * 
     * // Extend existing domain (costs 100 USDC, adds 1 year)
     * const tx2 = await client.registerDomain('mydomain.sol', true);
     * console.log('Domain extended:', tx2);
     * ```
     */
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

    /**
     * @description Update the domain registration fee (owner only)
     * @notice Only the program owner can call this function
     * @param newFee New registration fee in USDC (with 6 decimals)
     * @returns Promise resolving to transaction signature
     * @throws {Error} If caller is not owner or transaction fails
     * @example
     * ```typescript
     * // Set registration fee to 150 USDC (150,000,000 with 6 decimals)
     * const tx = await client.setRegistrationFee(150000000);
     * console.log('Registration fee updated:', tx);
     * ```
     */
    async setRegistrationFee(newFee: number): Promise<string> {
        return await (this.program.methods as any)
            .setRegistrationFee(new BN(newFee))
            .accounts({
                mailService: this.mailServicePda,
                owner: this.provider.wallet.publicKey,
            })
            .rpc();
    }

    /**
     * @description Update the delegation fee (owner only)
     * @notice Only the program owner can call this function
     * @param newFee New delegation fee in USDC (with 6 decimals)
     * @returns Promise resolving to transaction signature
     * @throws {Error} If caller is not owner or transaction fails
     * @example
     * ```typescript
     * // Set delegation fee to 15 USDC (15,000,000 with 6 decimals)
     * const tx = await client.setDelegationFee(15000000);
     * console.log('Delegation fee updated:', tx);
     * ```
     */
    async setDelegationFee(newFee: number): Promise<string> {
        return await (this.program.methods as any)
            .setDelegationFee(new BN(newFee))
            .accounts({
                mailService: this.mailServicePda,
                owner: this.provider.wallet.publicKey,
            })
            .rpc();
    }

    /**
     * @description Withdraw accumulated fees from the program (owner only)
     * @notice Only the program owner can call this function
     * @param amount Amount of USDC to withdraw (with 6 decimals)
     * @returns Promise resolving to transaction signature
     * @throws {Error} If caller is not owner, insufficient balance, or transaction fails
     * @example
     * ```typescript
     * // Withdraw 50 USDC from accumulated fees
     * const tx = await client.withdrawFees(50000000);
     * console.log('Fees withdrawn:', tx);
     * ```
     */
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

    /**
     * @description Get the current delegation information for a given address
     * @param delegator Address to check delegation for
     * @returns Promise resolving to DelegationInfo or null if no delegation exists
     * @example
     * ```typescript
     * const delegation = await client.getDelegation(userAddress);
     * if (delegation && delegation.delegate) {
     *     console.log(`${delegation.delegator} has delegated to:`, delegation.delegate.toString());
     * } else {
     *     console.log('No delegation set');
     * }
     * ```
     */
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

    /**
     * @description Get current registration and delegation fees
     * @returns Promise resolving to fee amounts in USDC (with 6 decimals)
     * @example
     * ```typescript
     * const fees = await client.getFees();
     * console.log(`Registration: ${formatUSDC(fees.registrationFee)} USDC`);
     * console.log(`Delegation: ${formatUSDC(fees.delegationFee)} USDC`);
     * ```
     */
    async getFees(): Promise<MailServiceFees> {
        const account = await (this.program.account as any).mailServiceState.fetch(this.mailServicePda);
        return {
            registrationFee: account.registrationFee.toNumber(),
            delegationFee: account.delegationFee.toNumber(),
        };
    }

    /**
     * @description Get current fees formatted as human-readable strings
     * @returns Promise resolving to formatted fee strings
     * @example
     * ```typescript
     * const formatted = await client.getFeesFormatted();
     * console.log(`Domain registration: ${formatted.registrationFee}`);
     * console.log(`Delegation setup: ${formatted.delegationFee}`);
     * ```
     */
    async getFeesFormatted(): Promise<{ registrationFee: string; delegationFee: string }> {
        const fees = await this.getFees();
        return {
            registrationFee: formatUSDC(fees.registrationFee) + ' USDC',
            delegationFee: formatUSDC(fees.delegationFee) + ' USDC',
        };
    }

    /**
     * @description Get the Program Derived Address (PDA) of the MailService account
     * @returns The deterministically derived address of the MailService program account
     * @example
     * ```typescript
     * const serviceAddress = client.getServiceAddress();
     * console.log('MailService PDA:', serviceAddress.toString());
     * 
     * // This address stores the program state and USDC balance
     * const usdcAccount = getAssociatedTokenAddressSync(usdcMint, serviceAddress, true);
     * ```
     */
    getServiceAddress(): PublicKey {
        return this.mailServicePda;
    }

    /**
     * @description Get the USDC token mint address used by this client
     * @returns The USDC mint public key
     * @example
     * ```typescript
     * const usdcMint = client.getUsdcMint();
     * console.log('USDC Mint:', usdcMint.toString());
     * ```
     */
    getUsdcMint(): PublicKey {
        return this.usdcMint;
    }

    /**
     * @description Get the MailService program ID
     * @returns The MailService program's public key
     * @example
     * ```typescript
     * const programId = client.getProgramId();
     * console.log('MailService Program ID:', programId.toString());
     * ```
     */
    getProgramId(): PublicKey {
        return this.program.programId;
    }
}