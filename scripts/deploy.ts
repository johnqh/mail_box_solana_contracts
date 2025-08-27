import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { 
    Connection, 
    PublicKey, 
    Keypair,
    SystemProgram,
    LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { 
    TOKEN_PROGRAM_ID, 
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createMint,
    getOrCreateAssociatedTokenAccount,
    mintTo
} from '@solana/spl-token';
import fs from 'fs';
import path from 'path';

// Network configurations
const NETWORK_CONFIGS = {
    'mainnet-beta': {
        name: 'Solana Mainnet',
        url: 'https://api.mainnet-beta.solana.com',
        usdcMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // Real USDC
    },
    'devnet': {
        name: 'Solana Devnet',
        url: 'https://api.devnet.solana.com',
        usdcMint: null, // Will create mock USDC
    },
    'testnet': {
        name: 'Solana Testnet',
        url: 'https://api.testnet.solana.com',
        usdcMint: null, // Will create mock USDC
    },
    'localnet': {
        name: 'Local Solana',
        url: 'http://127.0.0.1:8899',
        usdcMint: null, // Will create mock USDC
    }
};

interface DeploymentConfig {
    projectName: string;
    version: string;
    network: string;
}

interface DeploymentResult {
    network: string;
    chainId: string;
    timestamp: string;
    deployer: string;
    owner: string;
    programs: {
        factory: string;
        usdcMint: string;
        mailer: string;
        mailService: string;
    };
    fees: {
        sendFee: string;
        registrationFee: string;
        delegationFee: string;
    };
    transactions: {
        factory?: string;
        mailer?: string;
        mailService?: string;
        usdcMint?: string;
    };
}

const DEPLOYMENT_CONFIG: DeploymentConfig = {
    projectName: "MailBox",
    version: "v1.0.0",
    network: process.argv[2] || 'localnet'
};

async function createMockUSDC(
    connection: Connection,
    payer: Keypair
): Promise<PublicKey> {
    console.log("📋 Creating Mock USDC for testing...");
    
    // Create a new mint for USDC with 6 decimals
    const mint = await createMint(
        connection,
        payer,
        payer.publicKey,
        payer.publicKey,
        6 // USDC has 6 decimals
    );
    
    console.log("✅ Mock USDC created:", mint.toString());
    
    // Create associated token account for deployer and mint some tokens
    const deployerAta = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        mint,
        payer.publicKey
    );
    
    // Mint 1 million USDC to deployer for testing
    await mintTo(
        connection,
        payer,
        mint,
        deployerAta.address,
        payer.publicKey,
        1_000_000_000_000 // 1M USDC (6 decimals)
    );
    
    console.log("✅ Minted 1,000,000 Mock USDC to deployer");
    
    return mint;
}

async function deployFactory(
    provider: AnchorProvider,
    version: string
): Promise<{ address: PublicKey; tx: string }> {
    console.log("🏭 Deploying MailBox Factory...");
    
    const factoryIdl = JSON.parse(
        fs.readFileSync(
            path.join(__dirname, '../target/idl/mail_box_factory.json'),
            'utf8'
        )
    );
    
    const factoryProgramId = new PublicKey(factoryIdl.metadata.address);
    const factoryProgram = new Program(factoryIdl, factoryProgramId, provider);
    
    const [factoryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('factory')],
        factoryProgram.programId
    );
    
    const tx = await factoryProgram.methods
        .initialize(version)
        .accounts({
            factory: factoryPda,
            owner: provider.wallet.publicKey,
            systemProgram: SystemProgram.programId,
        })
        .rpc();
    
    console.log("✅ Factory deployed to:", factoryPda.toString());
    console.log("   Transaction:", tx);
    
    return { address: factoryPda, tx };
}

async function deployMailer(
    provider: AnchorProvider,
    usdcMint: PublicKey
): Promise<{ address: PublicKey; tx: string; fees: any }> {
    console.log("📧 Deploying Mailer...");
    
    const mailerIdl = JSON.parse(
        fs.readFileSync(
            path.join(__dirname, '../target/idl/mailer.json'),
            'utf8'
        )
    );
    
    const mailerProgramId = new PublicKey(mailerIdl.metadata.address);
    const mailerProgram = new Program(mailerIdl, mailerProgramId, provider);
    
    const [mailerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('mailer')],
        mailerProgram.programId
    );
    
    const tx = await mailerProgram.methods
        .initialize(usdcMint)
        .accounts({
            mailer: mailerPda,
            owner: provider.wallet.publicKey,
            systemProgram: SystemProgram.programId,
        })
        .rpc();
    
    // Fetch fees for documentation
    const mailerAccount = await mailerProgram.account.mailerState.fetch(mailerPda);
    const fees = {
        sendFee: (mailerAccount.sendFee.toNumber() / 1_000_000).toString() + " USDC"
    };
    
    console.log("✅ Mailer deployed to:", mailerPda.toString());
    console.log("   Send fee:", fees.sendFee);
    console.log("   Transaction:", tx);
    
    return { address: mailerPda, tx, fees };
}

async function deployMailService(
    provider: AnchorProvider,
    usdcMint: PublicKey
): Promise<{ address: PublicKey; tx: string; fees: any }> {
    console.log("📬 Deploying MailService...");
    
    const mailServiceIdl = JSON.parse(
        fs.readFileSync(
            path.join(__dirname, '../target/idl/mail_service.json'),
            'utf8'
        )
    );
    
    const mailServiceProgramId = new PublicKey(mailServiceIdl.metadata.address);
    const mailServiceProgram = new Program(mailServiceIdl, mailServiceProgramId, provider);
    
    const [mailServicePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('mail_service')],
        mailServiceProgram.programId
    );
    
    const tx = await mailServiceProgram.methods
        .initialize(usdcMint)
        .accounts({
            mailService: mailServicePda,
            owner: provider.wallet.publicKey,
            systemProgram: SystemProgram.programId,
        })
        .rpc();
    
    // Fetch fees for documentation
    const serviceAccount = await mailServiceProgram.account.mailServiceState.fetch(mailServicePda);
    const fees = {
        registrationFee: (serviceAccount.registrationFee.toNumber() / 1_000_000).toString() + " USDC",
        delegationFee: (serviceAccount.delegationFee.toNumber() / 1_000_000).toString() + " USDC"
    };
    
    console.log("✅ MailService deployed to:", mailServicePda.toString());
    console.log("   Registration fee:", fees.registrationFee);
    console.log("   Delegation fee:", fees.delegationFee);
    console.log("   Transaction:", tx);
    
    return { address: mailServicePda, tx, fees };
}

async function main() {
    const networkConfig = NETWORK_CONFIGS[DEPLOYMENT_CONFIG.network as keyof typeof NETWORK_CONFIGS];
    
    if (!networkConfig) {
        console.error(`❌ Unknown network: ${DEPLOYMENT_CONFIG.network}`);
        console.error("Supported networks:", Object.keys(NETWORK_CONFIGS).join(', '));
        process.exit(1);
    }

    console.log("=".repeat(60));
    console.log("SOLANA MULTI-NETWORK DEPLOYMENT SCRIPT");
    console.log("=".repeat(60));
    console.log("Network:", DEPLOYMENT_CONFIG.network);
    console.log("Network Name:", networkConfig.name);
    console.log("RPC URL:", networkConfig.url);
    console.log("Project:", DEPLOYMENT_CONFIG.projectName);
    console.log("Version:", DEPLOYMENT_CONFIG.version);
    
    // Initialize connection and wallet
    const connection = new Connection(networkConfig.url, 'confirmed');
    const keypairPath = process.env.ANCHOR_WALLET || 
                       path.join(require('os').homedir(), '.config/solana/id.json');
    
    if (!fs.existsSync(keypairPath)) {
        console.error("❌ Wallet not found at:", keypairPath);
        console.error("Set ANCHOR_WALLET environment variable or create a wallet at the default location");
        process.exit(1);
    }
    
    const keypair = Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(fs.readFileSync(keypairPath, 'utf8')))
    );
    
    const wallet = new anchor.Wallet(keypair);
    const provider = new AnchorProvider(connection, wallet, {});
    
    console.log("Deploying with account:", wallet.publicKey.toString());
    
    const balance = await connection.getBalance(wallet.publicKey);
    console.log("Account balance:", (balance / LAMPORTS_PER_SOL).toFixed(4), "SOL");
    
    if (balance < 0.1 * LAMPORTS_PER_SOL) {
        console.error("❌ Insufficient SOL balance! Please fund the account with at least 0.1 SOL.");
        process.exit(1);
    }

    try {
        // Determine USDC mint
        let usdcMint: PublicKey;
        let usdcTx: string | undefined;
        
        if (networkConfig.usdcMint) {
            usdcMint = new PublicKey(networkConfig.usdcMint);
            console.log("Using existing USDC mint:", usdcMint.toString());
        } else {
            const result = await createMockUSDC(connection, keypair);
            usdcMint = result;
            console.log("✅ Created Mock USDC for testing");
        }
        
        console.log("-".repeat(60));

        // Deploy Factory
        const factory = await deployFactory(provider, DEPLOYMENT_CONFIG.version);
        
        console.log("-".repeat(60));

        // Deploy Mailer
        const mailer = await deployMailer(provider, usdcMint);
        
        console.log("-".repeat(60));

        // Deploy MailService
        const mailService = await deployMailService(provider, usdcMint);

        console.log("=".repeat(60));
        console.log("🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!");
        console.log("=".repeat(60));
        console.log("Network:", DEPLOYMENT_CONFIG.network);
        console.log("Network Name:", networkConfig.name);
        console.log("Factory:", factory.address.toString());
        console.log("USDC Mint:", usdcMint.toString());
        console.log("Mailer:", mailer.address.toString());
        console.log("MailService:", mailService.address.toString());
        console.log("=".repeat(60));

        // Save deployment info
        const deploymentInfo: DeploymentResult = {
            network: DEPLOYMENT_CONFIG.network,
            chainId: networkConfig.name,
            timestamp: new Date().toISOString(),
            deployer: wallet.publicKey.toString(),
            owner: wallet.publicKey.toString(),
            programs: {
                factory: factory.address.toString(),
                usdcMint: usdcMint.toString(),
                mailer: mailer.address.toString(),
                mailService: mailService.address.toString(),
            },
            fees: {
                sendFee: mailer.fees.sendFee,
                registrationFee: mailService.fees.registrationFee,
                delegationFee: mailService.fees.delegationFee,
            },
            transactions: {
                factory: factory.tx,
                mailer: mailer.tx,
                mailService: mailService.tx,
                ...(usdcTx && { usdcMint: usdcTx })
            }
        };

        // Ensure deployments directory exists
        const deploymentsDir = path.join(__dirname, '../deployments');
        if (!fs.existsSync(deploymentsDir)) {
            fs.mkdirSync(deploymentsDir, { recursive: true });
        }
        
        // Write deployment info to file
        const deploymentFile = path.join(deploymentsDir, `${DEPLOYMENT_CONFIG.network}.json`);
        fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
        console.log("📄 Deployment info saved to:", deploymentFile);

    } catch (error) {
        console.error("❌ Deployment failed:");
        console.error(error);
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch((error) => {
        console.error("❌ Script execution failed:");
        console.error(error);
        process.exitCode = 1;
    });
}