# Dependency Management Guide

This document outlines the dependency management strategy for the MailBox Solana Contracts project, including version constraints, security considerations, and Dependabot configuration.

## Version Constraints Strategy

### Solana Ecosystem Dependencies

The project uses specific version constraints due to Solana/Anchor compatibility requirements:

- **Solana CLI**: v1.18.0 (stable release)
- **Anchor**: v0.29.0 (compatible with Solana v1.18.0)
- **Rust**: 1.79.0 (Solana CLI compatibility)

**Key Dependencies**:
```json
{
  "@coral-xyz/anchor": "^0.30.1",    // Kept at 0.30.1 for stability
  "@coral-xyz/borsh": "^0.30.1",     // Matches Anchor version
  "@solana/spl-token": "^0.4.13",    // Latest stable SPL token
  "@solana/web3.js": "^1.95.0"       // Solana web3 client
}
```

### Test Framework Dependencies

Test frameworks are pinned to avoid breaking changes:

```json
{
  "chai": "^4.3.0",         // Avoid v5+ breaking changes
  "mocha": "^10.0.0",       // Avoid v11+ breaking changes  
  "ts-mocha": "^10.0.0"     // Matches mocha version
}
```

## Security Considerations

### bigint-buffer Vulnerability

The project includes overrides to handle a known vulnerability in the bigint-buffer package:

```json
{
  "overrides": {
    "bigint-buffer": "1.1.5"
  },
  "resolutions": {
    "bigint-buffer": "1.1.5"
  }
}
```

**Details**:
- **Vulnerability**: Buffer Overflow via toBigIntLE() Function
- **Severity**: High (but not critical)
- **Source**: Transitive dependency through @solana/spl-token
- **Mitigation**: Version pinning to last known working version
- **Status**: Monitoring for upstream fixes

## Dependabot Configuration

The project uses a custom Dependabot configuration (`.github/dependabot.yml`) with the following strategy:

### Update Grouping

- **solana-ecosystem**: All Solana-related packages grouped together
- **test-frameworks**: Test-related packages grouped together  
- **dev-dependencies**: General development dependencies

### Version Update Controls

**Ignored Updates** (manual management required):
- `@coral-xyz/anchor` - major/minor updates ignored
- `@coral-xyz/borsh` - major/minor updates ignored
- `@solana/*` - major updates ignored
- `chai` - major updates ignored (breaking changes)
- `mocha` - major updates ignored (breaking changes)

**Allowed Updates**:
- Security patches (always allowed)
- Patch-level updates for all packages
- Minor updates for most packages (except those listed above)

### Update Schedule

- **Frequency**: Weekly
- **Limit**: Maximum 10 open PRs
- **Commit Prefixes**: `deps:` for production, `deps-dev:` for development

## Manual Update Process

For packages that Dependabot ignores, follow this process:

### 1. Anchor Updates

```bash
# Check current versions
npm outdated @coral-xyz/anchor @coral-xyz/borsh

# Test compatibility
anchor --version
solana --version

# Update if compatible with current Solana version
npm update @coral-xyz/anchor@latest
```

### 2. Solana Updates

```bash
# Check SPL token compatibility
npm outdated @solana/spl-token @solana/web3.js

# Test with current setup
npm install @solana/spl-token@latest
npm run build
npm run test
```

### 3. Test Framework Updates

```bash
# Check for breaking changes in release notes
npm outdated chai mocha ts-mocha

# Update carefully with testing
npm install chai@latest
npm run test
```

## Troubleshooting

### Common Issues

#### 1. Dependabot Failures

**Symptoms**:
- "Dependabot encountered an error performing the update"
- Container exit code 1

**Causes**:
- Version conflicts between Solana packages
- Breaking changes in major version updates
- Resolution conflicts with bigint-buffer

**Solutions**:
1. Check Dependabot logs for specific error
2. Verify version constraints in dependabot.yml
3. Update package.json overrides if needed
4. Test proposed changes locally first

#### 2. Build Failures After Updates

**Symptoms**:
- TypeScript compilation errors
- Anchor build failures
- Test failures

**Solutions**:
1. Revert to working versions: `git checkout package.json package-lock.json`
2. Clean install: `rm -rf node_modules && npm install`
3. Check for breaking changes in updated packages
4. Update code to match new API changes

#### 3. Security Vulnerabilities

**Symptoms**:
- npm audit shows high/critical vulnerabilities
- Dependabot security PRs

**Solutions**:
1. Check if vulnerability affects runtime (vs dev-only)
2. Look for patches in newer versions
3. Consider temporary overrides for transitive dependencies
4. Monitor upstream packages for fixes

## Version History

### Current Stable Versions (as of latest)

- Node.js: 18.18.0 (LTS)
- Solana CLI: 1.18.0
- Anchor: 0.29.0
- TypeScript: 5.4.x
- Rust: 1.79.0

### Update Log

- **2024-08-29**: Added bigint-buffer override for security
- **2024-08-29**: Configured Dependabot with version constraints
- **2024-08-29**: Pinned Anchor to 0.29.0 for Solana compatibility

## References

- [Anchor Documentation](https://www.anchor-lang.com/)
- [Solana Documentation](https://docs.solana.com/)
- [Dependabot Configuration](https://docs.github.com/en/code-security/dependabot)
- [npm Security Best Practices](https://docs.npmjs.com/security)