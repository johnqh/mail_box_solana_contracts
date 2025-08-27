use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("9FLkBDGpZBcR8LMsQ7MwwV6X9P4TDFgN3DeRh5qYyHJF");

const SEND_FEE: u64 = 100_000;         // 0.1 USDC (6 decimals)
const CLAIM_PERIOD: i64 = 60 * 24 * 60 * 60; // 60 days in seconds
const RECIPIENT_SHARE: u64 = 90;       // 90%
const OWNER_SHARE: u64 = 10;           // 10%

#[program]
pub mod mailer {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, usdc_mint: Pubkey) -> Result<()> {
        let mailer = &mut ctx.accounts.mailer;
        mailer.owner = ctx.accounts.owner.key();
        mailer.usdc_mint = usdc_mint;
        mailer.send_fee = SEND_FEE;
        mailer.owner_claimable = 0;
        mailer.bump = ctx.bumps.mailer;
        Ok(())
    }

    pub fn send_priority(
        ctx: Context<SendMessage>,
        subject: String,
        body: String,
    ) -> Result<()> {
        let sender = ctx.accounts.sender.key();
        
        // Transfer full send fee from sender to mailer contract
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.sender_usdc_account.to_account_info(),
                to: ctx.accounts.mailer_usdc_account.to_account_info(),
                authority: ctx.accounts.sender.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, ctx.accounts.mailer.send_fee)?;

        // Record shares for revenue sharing
        record_shares(
            &mut ctx.accounts.recipient_claim,
            &mut ctx.accounts.mailer,
            sender,
            ctx.accounts.mailer.send_fee,
        )?;

        emit!(MailSent {
            from: sender,
            to: sender, // Messages are sent to self
            subject,
            body,
        });

        Ok(())
    }

    pub fn send_priority_prepared(
        ctx: Context<SendMessage>,
        mail_id: String,
    ) -> Result<()> {
        let sender = ctx.accounts.sender.key();
        
        // Transfer full send fee from sender to mailer contract
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.sender_usdc_account.to_account_info(),
                to: ctx.accounts.mailer_usdc_account.to_account_info(),
                authority: ctx.accounts.sender.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, ctx.accounts.mailer.send_fee)?;

        // Record shares for revenue sharing
        record_shares(
            &mut ctx.accounts.recipient_claim,
            &mut ctx.accounts.mailer,
            sender,
            ctx.accounts.mailer.send_fee,
        )?;

        emit!(PreparedMailSent {
            from: sender,
            to: sender, // Messages are sent to self
            mail_id,
        });

        Ok(())
    }

    pub fn send(
        ctx: Context<SendMessage>,
        subject: String,
        body: String,
    ) -> Result<()> {
        let sender = ctx.accounts.sender.key();
        let owner_fee = (ctx.accounts.mailer.send_fee * OWNER_SHARE) / 100;
        
        // Transfer only owner fee (10%) from sender to mailer contract
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.sender_usdc_account.to_account_info(),
                to: ctx.accounts.mailer_usdc_account.to_account_info(),
                authority: ctx.accounts.sender.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, owner_fee)?;

        // Only add to owner claimable, no revenue sharing
        ctx.accounts.mailer.owner_claimable += owner_fee;

        emit!(MailSent {
            from: sender,
            to: sender, // Messages are sent to self
            subject,
            body,
        });

        Ok(())
    }

    pub fn send_prepared(
        ctx: Context<SendMessage>,
        mail_id: String,
    ) -> Result<()> {
        let sender = ctx.accounts.sender.key();
        let owner_fee = (ctx.accounts.mailer.send_fee * OWNER_SHARE) / 100;
        
        // Transfer only owner fee (10%) from sender to mailer contract
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.sender_usdc_account.to_account_info(),
                to: ctx.accounts.mailer_usdc_account.to_account_info(),
                authority: ctx.accounts.sender.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, owner_fee)?;

        // Only add to owner claimable, no revenue sharing
        ctx.accounts.mailer.owner_claimable += owner_fee;

        emit!(PreparedMailSent {
            from: sender,
            to: sender, // Messages are sent to self
            mail_id,
        });

        Ok(())
    }

    pub fn claim_recipient_share(ctx: Context<ClaimRecipientShare>) -> Result<()> {
        let claim = &mut ctx.accounts.recipient_claim;
        let recipient = ctx.accounts.recipient.key();
        
        require!(claim.amount > 0, MailerError::NoClaimableAmount);
        
        // Check if claim period has expired
        let current_time = Clock::get()?.unix_timestamp;
        require!(
            current_time <= claim.timestamp + CLAIM_PERIOD,
            MailerError::ClaimPeriodExpired
        );

        let amount = claim.amount;
        claim.amount = 0;
        claim.timestamp = 0;

        // Transfer USDC from mailer to recipient
        let seeds = &[b"mailer", &[ctx.accounts.mailer.bump]];
        let signer_seeds = &[&seeds[..]];
        
        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.mailer_usdc_account.to_account_info(),
                to: ctx.accounts.recipient_usdc_account.to_account_info(),
                authority: ctx.accounts.mailer.to_account_info(),
            },
            signer_seeds,
        );
        token::transfer(transfer_ctx, amount)?;

        emit!(RecipientClaimed {
            recipient,
            amount,
        });

        Ok(())
    }

    pub fn claim_owner_share(ctx: Context<ClaimOwnerShare>) -> Result<()> {
        let mailer = &mut ctx.accounts.mailer;
        
        require!(mailer.owner_claimable > 0, MailerError::NoClaimableAmount);

        let amount = mailer.owner_claimable;
        mailer.owner_claimable = 0;

        // Transfer USDC from mailer to owner
        let seeds = &[b"mailer", &[mailer.bump]];
        let signer_seeds = &[&seeds[..]];
        
        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.mailer_usdc_account.to_account_info(),
                to: ctx.accounts.owner_usdc_account.to_account_info(),
                authority: ctx.accounts.mailer.to_account_info(),
            },
            signer_seeds,
        );
        token::transfer(transfer_ctx, amount)?;

        emit!(OwnerClaimed { amount });

        Ok(())
    }

    pub fn claim_expired_shares(ctx: Context<ClaimExpiredShares>) -> Result<()> {
        let claim = &mut ctx.accounts.recipient_claim;
        let recipient_key = ctx.accounts.recipient_claim.recipient;
        
        require!(claim.amount > 0, MailerError::NoClaimableAmount);
        
        // Check if claim period has expired
        let current_time = Clock::get()?.unix_timestamp;
        require!(
            current_time > claim.timestamp + CLAIM_PERIOD,
            MailerError::ClaimPeriodNotExpired
        );

        let amount = claim.amount;
        claim.amount = 0;
        claim.timestamp = 0;

        // Add expired amount to owner claimable
        ctx.accounts.mailer.owner_claimable += amount;

        emit!(ExpiredSharesClaimed {
            recipient: recipient_key,
            amount,
        });

        Ok(())
    }

    pub fn set_fee(ctx: Context<SetFee>, new_fee: u64) -> Result<()> {
        let mailer = &mut ctx.accounts.mailer;
        let old_fee = mailer.send_fee;
        mailer.send_fee = new_fee;

        emit!(FeeUpdated { old_fee, new_fee });

        Ok(())
    }
}

fn record_shares(
    claim: &mut Account<RecipientClaim>,
    mailer: &mut Account<MailerState>,
    recipient: Pubkey,
    total_amount: u64,
) -> Result<()> {
    // Calculate owner amount first for precision
    let owner_amount = (total_amount * OWNER_SHARE) / 100;
    let recipient_amount = total_amount - owner_amount;

    // Update recipient's claimable amount and set timestamp only if not already set
    claim.recipient = recipient;
    claim.amount += recipient_amount;
    if claim.timestamp == 0 {
        claim.timestamp = Clock::get()?.unix_timestamp;
    }

    // Update owner's claimable amount
    mailer.owner_claimable += owner_amount;

    emit!(SharesRecorded {
        recipient,
        recipient_amount,
        owner_amount,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + MailerState::INIT_SPACE,
        seeds = [b"mailer"],
        bump
    )]
    pub mailer: Account<'info, MailerState>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SendMessage<'info> {
    #[account(
        init_if_needed,
        payer = sender,
        space = 8 + RecipientClaim::INIT_SPACE,
        seeds = [b"claim", sender.key().as_ref()],
        bump
    )]
    pub recipient_claim: Account<'info, RecipientClaim>,
    
    #[account(seeds = [b"mailer"], bump = mailer.bump)]
    pub mailer: Account<'info, MailerState>,
    
    #[account(mut)]
    pub sender: Signer<'info>,
    
    #[account(
        mut,
        associated_token::mint = mailer.usdc_mint,
        associated_token::authority = sender
    )]
    pub sender_usdc_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = mailer.usdc_mint,
        associated_token::authority = mailer
    )]
    pub mailer_usdc_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimRecipientShare<'info> {
    #[account(
        mut,
        seeds = [b"claim", recipient.key().as_ref()],
        bump,
        has_one = recipient @ MailerError::InvalidRecipient
    )]
    pub recipient_claim: Account<'info, RecipientClaim>,
    
    #[account(seeds = [b"mailer"], bump = mailer.bump)]
    pub mailer: Account<'info, MailerState>,
    
    pub recipient: Signer<'info>,
    
    #[account(
        mut,
        associated_token::mint = mailer.usdc_mint,
        associated_token::authority = recipient
    )]
    pub recipient_usdc_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = mailer.usdc_mint,
        associated_token::authority = mailer
    )]
    pub mailer_usdc_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimOwnerShare<'info> {
    #[account(
        mut,
        seeds = [b"mailer"],
        bump = mailer.bump,
        has_one = owner @ MailerError::OnlyOwner
    )]
    pub mailer: Account<'info, MailerState>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
    
    #[account(
        mut,
        associated_token::mint = mailer.usdc_mint,
        associated_token::authority = owner
    )]
    pub owner_usdc_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = mailer.usdc_mint,
        associated_token::authority = mailer
    )]
    pub mailer_usdc_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimExpiredShares<'info> {
    #[account(
        mut,
        seeds = [b"claim", recipient_claim.recipient.as_ref()],
        bump
    )]
    pub recipient_claim: Account<'info, RecipientClaim>,
    
    #[account(
        mut,
        seeds = [b"mailer"],
        bump = mailer.bump,
        has_one = owner @ MailerError::OnlyOwner
    )]
    pub mailer: Account<'info, MailerState>,
    
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct SetFee<'info> {
    #[account(
        mut,
        seeds = [b"mailer"],
        bump = mailer.bump,
        has_one = owner @ MailerError::OnlyOwner
    )]
    pub mailer: Account<'info, MailerState>,
    
    pub owner: Signer<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct MailerState {
    pub owner: Pubkey,
    pub usdc_mint: Pubkey,
    pub send_fee: u64,
    pub owner_claimable: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct RecipientClaim {
    pub recipient: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
    pub bump: u8,
}

#[event]
pub struct MailSent {
    pub from: Pubkey,
    pub to: Pubkey,
    pub subject: String,
    pub body: String,
}

#[event]
pub struct PreparedMailSent {
    pub from: Pubkey,
    pub to: Pubkey,
    pub mail_id: String,
}

#[event]
pub struct FeeUpdated {
    pub old_fee: u64,
    pub new_fee: u64,
}

#[event]
pub struct SharesRecorded {
    pub recipient: Pubkey,
    pub recipient_amount: u64,
    pub owner_amount: u64,
}

#[event]
pub struct RecipientClaimed {
    pub recipient: Pubkey,
    pub amount: u64,
}

#[event]
pub struct OwnerClaimed {
    pub amount: u64,
}

#[event]
pub struct ExpiredSharesClaimed {
    pub recipient: Pubkey,
    pub amount: u64,
}

#[error_code]
pub enum MailerError {
    #[msg("Only the owner can perform this action")]
    OnlyOwner,
    #[msg("No claimable amount available")]
    NoClaimableAmount,
    #[msg("Claim period has expired")]
    ClaimPeriodExpired,
    #[msg("Claim period has not expired yet")]
    ClaimPeriodNotExpired,
    #[msg("Invalid recipient")]
    InvalidRecipient,
}