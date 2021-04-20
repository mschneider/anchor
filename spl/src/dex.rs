use anchor_lang::solana_program::account_info::AccountInfo;
use anchor_lang::solana_program::entrypoint::ProgramResult;
use anchor_lang::solana_program::instruction::AccountMeta;
use anchor_lang::{Accounts, ToAccountInfos, AccountsExit, ToAccountMetas, CpiContext};
use solana_program::pubkey::Pubkey;
use std::num::NonZeroU64;
use serum_dex::state::MarketState;
use anchor_lang::solana_program::program_error::ProgramError;
use std::cell::RefMut;
use serum_dex::instruction::SelfTradeBehavior;
use serum_dex::matching::{OrderType, Side};

pub use serum_dex;

lazy_static::lazy_static! {
    pub static ref DEX_PROGRAM_ID: Pubkey = "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin".parse().unwrap();
}

pub fn new_order_v3<'info>(
    ctx: CpiContext<'_, '_, '_, 'info, NewOrderV3<'info>>,
    side: Side,
    limit_price: NonZeroU64,
    max_coin_qty: NonZeroU64,
    max_native_pc_qty_including_fees: NonZeroU64,
    self_trade_behavior: SelfTradeBehavior,
    order_type: OrderType,
    client_order_id: u64,
    limit: u16,
) -> ProgramResult {
    let ix = serum_dex::instruction::new_order(
        ctx.accounts.market.key,
        ctx.accounts.open_orders.key,
        ctx.accounts.request_queue.key,
        ctx.accounts.event_queue.key,
        ctx.accounts.market_bids.key,
        ctx.accounts.market_asks.key,
        ctx.accounts.order_payer.key,
        ctx.accounts.open_orders_authority.key,
        ctx.accounts.coin_vault.key,
        ctx.accounts.pc_vault.key,
        ctx.accounts.token_program.key,
        ctx.accounts.rent.key,
        None, // TODO: referral,
        &DEX_PROGRAM_ID,
        side,
        limit_price,
        max_coin_qty,
        order_type,
        client_order_id,
        self_trade_behavior,
        limit,
        max_native_pc_qty_including_fees,
    )?;
    solana_program::program::invoke_signed(
        &ix,
        &ToAccountInfos::to_account_infos(&ctx),
        ctx.signer_seeds,
    )?;
    Ok(())
}

pub fn settle_funds<'info>(
    ctx: CpiContext<'_, '_, '_, 'info, SettleFunds<'info>>,
) -> ProgramResult {
    let ix = serum_dex::instruction::settle_funds(
        &DEX_PROGRAM_ID,
        ctx.accounts.market.key,
        ctx.accounts.token_program.key,
        ctx.accounts.open_orders.key,
        ctx.accounts.open_orders_authority.key,
        ctx.accounts.coin_vault.key,
        ctx.accounts.coin_wallet.key,
        ctx.accounts.pc_vault.key,
        ctx.accounts.pc_wallet.key,
        None, // TODO: referral,
        ctx.accounts.vault_signer.key,
    )?;
    solana_program::program::invoke_signed(
        &ix,
        &ToAccountInfos::to_account_infos(&ctx),
        ctx.signer_seeds,
    )?;
    Ok(())
}

#[derive(Accounts)]
pub struct NewOrderV3<'info> {
    pub market: AccountInfo<'info>,
    pub open_orders: AccountInfo<'info>,
    pub request_queue: AccountInfo<'info>,
    pub event_queue: AccountInfo<'info>,
    pub market_bids: AccountInfo<'info>,
    pub market_asks: AccountInfo<'info>,
    pub order_payer: AccountInfo<'info>,
    pub open_orders_authority: AccountInfo<'info>,
    // Also known as the "base" currency. For a given A/B market,
    // this is the vault for the A mint.
    pub coin_vault: AccountInfo<'info>,
    // Also known as the "quote" currency. For a given A/B market,
    // this is the vault for the B mint.
    pub pc_vault: AccountInfo<'info>,
    pub token_program: AccountInfo<'info>,
    pub rent: AccountInfo<'info>,
    // TODO: add optional referall account.
}

#[derive(Accounts)]
pub struct SettleFunds<'info> {
    pub market: AccountInfo<'info>,
    pub open_orders: AccountInfo<'info>,
    pub open_orders_authority: AccountInfo<'info>,
    pub coin_vault: AccountInfo<'info>,
    pub pc_vault: AccountInfo<'info>,
    pub coin_wallet: AccountInfo<'info>,
    pub pc_wallet: AccountInfo<'info>,
    pub vault_signer: AccountInfo<'info>,
    pub token_program: AccountInfo<'info>,
}

pub struct Market<'info> {
		acc_info: AccountInfo<'info>,
}

impl<'info> Market<'info> {
		fn new(acc_info: AccountInfo<'info>) -> Market<'info> {
				Self {
						acc_info
				}
		}

		pub fn load_mut(&self) -> Result<RefMut<MarketState>, ProgramError> {
				MarketState::load(&self.acc_info, &DEX_PROGRAM_ID)
						.map_err(Into::into)
		}
}

impl<'info> anchor_lang::Accounts<'info> for Market<'info> {
    #[inline(never)]
    fn try_accounts(
        _program_id: &Pubkey,
        accounts: &mut &[AccountInfo<'info>],
    ) -> Result<Self, ProgramError> {
        if accounts.is_empty() {
            return Err(ProgramError::NotEnoughAccountKeys);
        }
        let account = &accounts[0];
        *accounts = &accounts[1..];
        let l = Market::new(account.clone());
        if l.acc_info.owner != &*DEX_PROGRAM_ID {
            return Err(ProgramError::Custom(1)); // todo: proper error
        }
        Ok(l)
    }
}

impl<'info> ToAccountMetas for Market<'info> {
    #[inline(never)]
    fn to_account_metas(&self, is_signer: Option<bool>) -> Vec<AccountMeta> {
        let is_signer = is_signer.unwrap_or(self.acc_info.is_signer);
        let meta = match self.acc_info.is_writable {
            false => AccountMeta::new_readonly(*self.acc_info.key, is_signer),
            true => AccountMeta::new(*self.acc_info.key, is_signer),
        };
        vec![meta]
    }
}

impl<'info> ToAccountInfos<'info> for Market<'info> {
    #[inline(never)]
    fn to_account_infos(&self) -> Vec<AccountInfo<'info>> {
        vec![self.acc_info.clone()]
    }
}

impl<'info> AccountsExit<'info> for Market<'info> {
    #[inline(never)]
    fn exit(&self, _program_id: &Pubkey) -> ProgramResult {
        // no-op
        Ok(())
    }
}
