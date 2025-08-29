#!/bin/bash

# Solana Development Environment Setup Script
# This script sets up the complete local development environment for Solana

set -e  # Exit on any error

echo "🚀 Setting up Solana Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Step 1: Check and setup Rust
echo "📦 Step 1: Setting up Rust toolchain..."

if ! command -v rustc &> /dev/null; then
    echo "Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
fi

# Set Rust 1.79.0 as default for Solana compatibility
if ! rustup toolchain list | grep -q "1.79.0"; then
    echo "Installing Rust 1.79.0..."
    rustup install 1.79.0
fi

rustup default 1.79.0
print_status "Rust 1.79.0 set as default"

# Step 2: Install Solana CLI
echo "🔗 Step 2: Installing Solana CLI..."

if ! command -v solana &> /dev/null; then
    echo "Downloading Solana CLI..."
    SOLANA_VERSION="1.18.0"
    ARCH="aarch64-apple-darwin"
    DOWNLOAD_URL="https://github.com/solana-labs/solana/releases/download/v${SOLANA_VERSION}/solana-release-${ARCH}.tar.bz2"
    
    mkdir -p "$HOME/.local/share/solana"
    curl -L "$DOWNLOAD_URL" -o /tmp/solana.tar.bz2
    cd "$HOME/.local/share/solana"
    tar -xjf /tmp/solana.tar.bz2
    mv solana-release install
fi

# Add Solana to PATH
export PATH="$HOME/.local/share/solana/install/bin:$PATH"
print_status "Solana CLI v$(solana --version | cut -d' ' -f2) installed"

# Step 3: Install Anchor CLI
echo "⚓ Step 3: Installing Anchor CLI..."

source $HOME/.cargo/env

if ! command -v avm &> /dev/null; then
    echo "Installing avm (Anchor Version Manager)..."
    rustup default stable  # Temporarily use stable for avm installation
    cargo install --git https://github.com/coral-xyz/anchor avm --force
    rustup default 1.79.0  # Switch back to 1.79.0
fi

# Install Anchor 0.29.0 (compatible with Solana v1.18.0)
if ! avm list | grep -q "0.29.0"; then
    echo "Installing Anchor 0.29.0..."
    # Remove existing anchor binary to avoid conflicts
    if [ -f "$HOME/.cargo/bin/anchor" ]; then
        rm "$HOME/.cargo/bin/anchor"
    fi
    avm install 0.29.0
fi

avm use 0.29.0
print_status "Anchor CLI v$(anchor --version | cut -d' ' -f2) installed"

# Step 4: Configure Solana
echo "⚙️  Step 4: Configuring Solana..."

# Set to localhost for local development
solana config set --url localhost

# Create keypair if it doesn't exist
if [ ! -f "$HOME/.config/solana/id.json" ]; then
    echo "Creating Solana keypair..."
    solana-keygen new --no-passphrase --outfile ~/.config/solana/id.json
fi

print_status "Solana configured for local development"

# Step 5: Setup project dependencies
echo "📁 Step 5: Setting up project dependencies..."

# Install Node.js dependencies
if [ -f "package.json" ]; then
    echo "Installing Node.js dependencies..."
    npm install
    print_status "Node.js dependencies installed"
fi

# Update Rust dependencies
echo "Updating Rust dependencies..."
rm -f Cargo.lock
cargo update
print_status "Rust dependencies updated"

# Step 6: Create environment script
echo "📝 Step 6: Creating environment script..."

cat > ~/.solana-env << 'EOF'
# Solana Development Environment
# Source this file to set up your environment: source ~/.solana-env

# Rust environment
source $HOME/.cargo/env
export RUST_LOG=error

# Solana paths
export PATH="$HOME/.local/share/solana/install/bin:$PATH"

# Solana config
export SOLANA_CLI_CONFIG="$HOME/.config/solana/cli/config.yml"
export ANCHOR_WALLET="$HOME/.config/solana/id.json"

# Development aliases
alias soldev="solana config set --url localhost"
alias soldevnet="solana config set --url devnet"
alias solmainnet="solana config set --url mainnet-beta"
alias start-validator="solana-test-validator --reset --quiet &"
alias stop-validator="pkill solana-test-validator"
alias anchor-build="anchor build"
alias anchor-test="anchor test --skip-local-validator"

echo "🚀 Solana development environment loaded!"
echo "   Solana: $(solana --version | cut -d' ' -f2)"
echo "   Anchor: $(anchor --version | cut -d' ' -f2)"
echo "   Rust:   $(rustc --version | cut -d' ' -f2)"
echo ""
echo "💡 Quick commands:"
echo "   start-validator  - Start local test validator"
echo "   stop-validator   - Stop local test validator"  
echo "   anchor-build     - Build Solana programs"
echo "   anchor-test      - Run tests"
EOF

print_status "Environment script created at ~/.solana-env"

# Step 7: Final verification
echo "🔍 Step 7: Verifying installation..."

source ~/.solana-env

echo "Versions:"
echo "  Rust:   $(rustc --version)"
echo "  Solana: $(solana --version)"
echo "  Anchor: $(anchor --version)"

print_status "Development environment setup complete!"

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "To activate the environment in future sessions:"
echo "  source ~/.solana-env"
echo ""
echo "To start developing:"
echo "  1. source ~/.solana-env"
echo "  2. start-validator"  
echo "  3. anchor build"
echo "  4. anchor test"
echo ""
print_warning "Note: Due to Rust version compatibility between Solana CLI (1.72.0) and"
print_warning "Solana program crates (1.75.0+), some builds may require manual intervention."
print_warning "The CI/CD pipeline handles this automatically."