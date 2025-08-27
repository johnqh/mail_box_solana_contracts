// Global type declarations for test environment
declare global {
  namespace Mocha {
    interface Context {
      timeout(ms: number): this;
      slow(ms: number): this;
      retries(count: number): this;
      skip(): this;
    }
  }
}

// Augment Anchor types for testing
declare module '@coral-xyz/anchor' {
  interface Wallet {
    payer?: Keypair;
    publicKey: PublicKey;
    signTransaction(tx: Transaction): Promise<Transaction>;
    signAllTransactions(txs: Transaction[]): Promise<Transaction[]>;
  }

  interface Program<T = any> {
    methods: Record<string, (...args: any[]) => any>;
    account: Record<string, { fetch: (address: PublicKey) => Promise<any> }>;
  }
}

// Type assertions for test mocks
declare module '*/target/idl/*.json' {
  const idl: any;
  export default idl;
}

declare module '*/target/types/*' {
  export const program: any;
}

export {};