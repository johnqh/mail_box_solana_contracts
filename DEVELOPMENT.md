# Local Development Environment Setup

This document provides instructions for setting up a complete local development environment for the MailBox Solana Contracts project.

## Quick Setup (Recommended)

Run the automated setup script:

```bash
./setup-dev.sh
```

This will install and configure everything you need for local development.

## Manual Setup

If you prefer to set up manually or need to troubleshoot:

### 1. Install Rust (1.79.0)

```bash
# Install rustup if not already installed
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source $HOME/.cargo/env

# Install and set Rust 1.79.0 (Solana compatibility)
rustup install 1.79.0
rustup default 1.79.0
```

### 2. Install Solana CLI (v1.18.0)

```bash
# Download and install
SOLANA_VERSION="1.18.0"
ARCH="aarch64-apple-darwin"  # or "x86_64-unknown-linux-gnu" for Linux
DOWNLOAD_URL="https://github.com/solana-labs/solana/releases/download/v${SOLANA_VERSION}/solana-release-${ARCH}.tar.bz2"

mkdir -p "$HOME/.local/share/solana"
curl -L "$DOWNLOAD_URL" -o /tmp/solana.tar.bz2
cd "$HOME/.local/share/solana"
tar -xjf /tmp/solana.tar.bz2
mv solana-release install

# Add to PATH
export PATH="$HOME/.local/share/solana/install/bin:$PATH"
```

### 3. Install Anchor CLI (v0.29.0)

```bash
# Install avm (Anchor Version Manager)
rustup default stable  # Temporarily for avm installation
cargo install --git https://github.com/coral-xyz/anchor avm --force
rustup default 1.79.0  # Switch back

# Install Anchor 0.29.0
avm install 0.29.0
avm use 0.29.0
```

### 4. Configure Solana

```bash
# Set to localhost for development
solana config set --url localhost

# Create keypair
solana-keygen new --no-passphrase --outfile ~/.config/solana/id.json
```

### 5. Install Project Dependencies

```bash
# Node.js dependencies
npm install

# Update Rust dependencies
rm -f Cargo.lock
cargo update
```

## Environment Activation

After setup, activate the development environment:

```bash
source ~/.solana-env
```

This loads all necessary paths and provides helpful aliases:

- `start-validator` - Start local test validator
- `stop-validator` - Stop local test validator
- `anchor-build` - Build Solana programs
- `anchor-test` - Run tests
- `soldev` - Switch to localhost
- `soldevnet` - Switch to devnet
- `solmainnet` - Switch to mainnet

## Development Workflow

### 1. Start Local Validator

```bash
source ~/.solana-env
start-validator
```

The validator runs in the background. You can check if it's running:

```bash
solana cluster-version
```

### 2. Build Programs

```bash
anchor-build
```

### 3. Run Tests

```bash
anchor-test
```

### 4. Deploy to Local Validator

```bash
anchor deploy
```

## Troubleshooting

### Common Issues

#### 1. Rust Version Conflicts

**Problem**: "rustc 1.72.0 is not supported" or similar version errors.

**Solution**: 
```bash
rustup default 1.79.0
source ~/.solana-env
```

#### 2. Anchor Version Mismatch

**Problem**: "anchor-lang version and CLI version don't match"

**Solution**:
```bash
avm use 0.29.0
```

#### 3. Build Failures

**Problem**: Build fails with dependency conflicts.

**Solution**:
```bash
rm -f Cargo.lock
cargo update
anchor-build
```

#### 4. Test Validator Won't Start

**Problem**: `start-validator` fails or times out.

**Solution**:
```bash
stop-validator  # Kill any existing validators
start-validator # Start fresh
```

### Version Compatibility

This project is configured for:

- **Rust**: 1.79.0 (Solana CLI compatibility)  
- **Solana CLI**: 1.18.0 (stable release)
- **Anchor**: 0.29.0 (compatible with Solana 1.18.0)

### Environment Variables

The setup script creates these environment variables:

```bash
RUST_LOG=error                                    # Reduce Rust log noise
SOLANA_CLI_CONFIG="$HOME/.config/solana/cli/config.yml"  # Solana config
ANCHOR_WALLET="$HOME/.config/solana/id.json"     # Default wallet
```

### File Locations

- Solana CLI: `~/.local/share/solana/install/bin/`
- Solana Config: `~/.config/solana/cli/config.yml`
- Keypair: `~/.config/solana/id.json`
- Environment: `~/.solana-env`

## Next Steps

After setup:

1. **Start Development**: `source ~/.solana-env && start-validator`
2. **Build Programs**: `anchor-build`
3. **Run Tests**: `anchor-test`
4. **Deploy**: `anchor deploy`

For more information, see the main [README.md](./README.md).