import { PublicKey } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

export interface TokenConfig {
    mint: string | null;
    decimals: number;
    symbol: string;
    name: string;
    createOnDeploy?: boolean;
    initialSupply?: number;
}

export interface NetworkConfig {
    name: string;
    cluster: string;
    rpcUrl: string;
    wsUrl: string;
    explorer: string | null;
    isMainnet: boolean;
    chainId: string;
    tokens: {
        usdc: TokenConfig;
    };
    deployment: {
        enabled: boolean;
        requiresConfirmation: boolean;
        gasMultiplier: number;
        priorityFee: number;
        autoFund?: boolean;
    };
    limits: {
        maxComputeUnits: number;
        maxTransactionSize: number;
        maxAccountDataSize: number;
    };
    faucet?: {
        enabled: boolean;
        solUrl: string;
        maxAirdrop: number;
    };
    validator?: {
        autoStart: boolean;
        reset: boolean;
        ledgerPath: string;
        accounts: Array<{
            address: string;
            program: string;
        }>;
    };
    monitoring: {
        healthCheck: boolean;
        alerting: boolean;
        metrics: boolean;
    };
}

export interface PDAConfig {
    seeds: string[];
    description: string;
}

export interface FeeConfig {
    amount: number;
    currency: string;
    description: string;
}

export interface ProgramConfig {
    name: string;
    programId: string;
    version: string;
    pdas: { [key: string]: PDAConfig };
    fees?: { [key: string]: FeeConfig };
    constants?: { [key: string]: any };
}

export interface DeployConfig {
    networks: { [key: string]: NetworkConfig };
    programs: { [key: string]: ProgramConfig };
    deployment: {
        strategy: string;
        coordination: string;
        verification: string;
        rollback: string;
    };
    security: {
        multiSignature: boolean;
        timelock: boolean;
        upgradeAuthority: string;
        freezeAuthority: string | null;
    };
}

class ConfigManager {
    private config: DeployConfig;
    private configPath: string;

    constructor() {
        this.configPath = path.join(__dirname, 'networks.json');
        this.loadConfig();
    }

    private loadConfig(): void {
        try {
            const configData = fs.readFileSync(this.configPath, 'utf8');
            this.config = JSON.parse(configData);
        } catch (error) {
            throw new Error(`Failed to load configuration: ${error}`);
        }
    }

    public getNetworkConfig(network: string): NetworkConfig {
        const networkConfig = this.config.networks[network];
        if (!networkConfig) {
            throw new Error(`Network configuration not found: ${network}`);
        }
        return networkConfig;
    }

    public getProgramConfig(program: string): ProgramConfig {
        const programConfig = this.config.programs[program];
        if (!programConfig) {
            throw new Error(`Program configuration not found: ${program}`);
        }
        return programConfig;
    }

    public getAllNetworks(): string[] {
        return Object.keys(this.config.networks);
    }

    public getEnabledNetworks(): string[] {
        return Object.keys(this.config.networks)
            .filter(network => this.config.networks[network].deployment.enabled);
    }

    public getTestNetworks(): string[] {
        return Object.keys(this.config.networks)
            .filter(network => !this.config.networks[network].isMainnet);
    }

    public getMainnetNetworks(): string[] {
        return Object.keys(this.config.networks)
            .filter(network => this.config.networks[network].isMainnet);
    }

    public getProgramPDA(program: string, pdaName: string, seedValues: { [key: string]: any } = {}): PublicKey {
        const programConfig = this.getProgramConfig(program);
        const pdaConfig = programConfig.pdas[pdaName];
        
        if (!pdaConfig) {
            throw new Error(`PDA configuration not found: ${program}.${pdaName}`);
        }

        const seeds: Buffer[] = [];
        
        for (const seedTemplate of pdaConfig.seeds) {
            if (seedTemplate.startsWith('u64:')) {
                // Handle u64 seeds
                const seedName = seedTemplate.replace('u64:', '');
                const value = seedValues[seedName];
                if (value === undefined) {
                    throw new Error(`Seed value not provided: ${seedName}`);
                }
                const buffer = Buffer.allocUnsafe(8);
                buffer.writeBigUInt64LE(BigInt(value), 0);
                seeds.push(buffer);
            } else if (seedTemplate.startsWith('pubkey:')) {
                // Handle pubkey seeds
                const seedName = seedTemplate.replace('pubkey:', '');
                const value = seedValues[seedName];
                if (!value) {
                    throw new Error(`Seed value not provided: ${seedName}`);
                }
                const pubkey = typeof value === 'string' ? new PublicKey(value) : value;
                seeds.push(pubkey.toBuffer());
            } else {
                // Handle string seeds
                seeds.push(Buffer.from(seedTemplate));
            }
        }

        const programId = new PublicKey(programConfig.programId);
        const [pda] = PublicKey.findProgramAddressSync(seeds, programId);
        return pda;
    }

    public getFeeAmount(program: string, feeName: string): number {
        const programConfig = this.getProgramConfig(program);
        if (!programConfig.fees || !programConfig.fees[feeName]) {
            throw new Error(`Fee configuration not found: ${program}.${feeName}`);
        }
        return programConfig.fees[feeName].amount;
    }

    public getConstant(program: string, constantName: string): any {
        const programConfig = this.getProgramConfig(program);
        if (!programConfig.constants || programConfig.constants[constantName] === undefined) {
            throw new Error(`Constant not found: ${program}.${constantName}`);
        }
        return programConfig.constants[constantName];
    }

    public validateNetwork(network: string): boolean {
        return this.config.networks.hasOwnProperty(network);
    }

    public validateProgram(program: string): boolean {
        return this.config.programs.hasOwnProperty(program);
    }

    public getDeploymentStrategy(): string {
        return this.config.deployment.strategy;
    }

    public requiresConfirmation(network: string): boolean {
        const networkConfig = this.getNetworkConfig(network);
        return networkConfig.deployment.requiresConfirmation;
    }

    public isMainnet(network: string): boolean {
        const networkConfig = this.getNetworkConfig(network);
        return networkConfig.isMainnet;
    }

    public getUSDCConfig(network: string): TokenConfig {
        const networkConfig = this.getNetworkConfig(network);
        return networkConfig.tokens.usdc;
    }

    public updateNetworkConfig(network: string, updates: Partial<NetworkConfig>): void {
        if (!this.config.networks[network]) {
            throw new Error(`Network not found: ${network}`);
        }
        
        this.config.networks[network] = {
            ...this.config.networks[network],
            ...updates
        };
        
        this.saveConfig();
    }

    public updateProgramConfig(program: string, updates: Partial<ProgramConfig>): void {
        if (!this.config.programs[program]) {
            throw new Error(`Program not found: ${program}`);
        }
        
        this.config.programs[program] = {
            ...this.config.programs[program],
            ...updates
        };
        
        this.saveConfig();
    }

    private saveConfig(): void {
        try {
            const configJson = JSON.stringify(this.config, null, 2);
            fs.writeFileSync(this.configPath, configJson, 'utf8');
        } catch (error) {
            throw new Error(`Failed to save configuration: ${error}`);
        }
    }

    public exportConfig(): DeployConfig {
        return JSON.parse(JSON.stringify(this.config));
    }
}

// Singleton instance
const configManager = new ConfigManager();
export default configManager;

// Convenience exports
export const getNetworkConfig = (network: string) => configManager.getNetworkConfig(network);
export const getProgramConfig = (program: string) => configManager.getProgramConfig(program);
export const getProgramPDA = (program: string, pdaName: string, seedValues?: { [key: string]: any }) => 
    configManager.getProgramPDA(program, pdaName, seedValues);
export const getFeeAmount = (program: string, feeName: string) => configManager.getFeeAmount(program, feeName);
export const getConstant = (program: string, constantName: string) => configManager.getConstant(program, constantName);

// Network utilities
export const getAllNetworks = () => configManager.getAllNetworks();
export const getEnabledNetworks = () => configManager.getEnabledNetworks();
export const getTestNetworks = () => configManager.getTestNetworks();
export const getMainnetNetworks = () => configManager.getMainnetNetworks();

// Validation utilities
export const validateNetwork = (network: string) => configManager.validateNetwork(network);
export const validateProgram = (program: string) => configManager.validateProgram(program);
export const requiresConfirmation = (network: string) => configManager.requiresConfirmation(network);
export const isMainnet = (network: string) => configManager.isMainnet(network);

// Token utilities  
export const getUSDCConfig = (network: string) => configManager.getUSDCConfig(network);

// Example usage:
/*
import configManager, { 
    getNetworkConfig, 
    getProgramPDA, 
    getFeeAmount 
} from './config/deploy-config';

// Get network configuration
const devnetConfig = getNetworkConfig('devnet');
console.log('Devnet RPC:', devnetConfig.rpcUrl);

// Get program PDA
const mailerPDA = getProgramPDA('mailer', 'mailer');
console.log('Mailer PDA:', mailerPDA.toString());

// Get recipient claim PDA
const recipientClaimPDA = getProgramPDA('mailer', 'recipient_claim', {
    recipient: new PublicKey('...')
});

// Get fee amounts
const sendFee = getFeeAmount('mailer', 'send_fee');
const regFee = getFeeAmount('mail_service', 'registration_fee');

// Get constants
const claimPeriod = getConstant('mailer', 'CLAIM_PERIOD');
const recipientShare = getConstant('mailer', 'RECIPIENT_SHARE');
*/