//! A frontend for the serum dex to perform instantly settled token swaps.

use anchor_lang::prelude::*;
use anchor_spl::dex;

#[program]
pub mod swap {
    use super::*;

    // Creates an open orders account, required for using the orderbook.
    pub fn create_user_account(ctx: Context<CreateUserAccount>) -> Result<()> {
        // todo: create open orders account.
        Ok(())
    }

    // Swaps two base currencies ocross two different markets. That is,
    // suppose there are two markets, A/USD(x) and B/USD(x). Then swaps token
    // A for token B via
    //
    // * IOC (immediate or cancel) sell order on A/USD(x) market.
    // * Settle open orders to get USDT.
    // * IOC buy order on B/USD(x) market to convert to token B.
    // * Settle open orders to get token B.
    //
    // Before using this method, a user must first create open orders accounts
    // on both markets being used.
    #[access_control(is_valid_swap(&ctx))]
    pub fn swap_base(ctx: Context<SwapBase>) -> Result<()> {
        // dex::new_order_v3(ctx: CpiContext<'_, '_, '_, 'info, NewOrderV3<'info>>, side: Side, limit_price: NonZeroU64, max_coin_qty: NonZeroU64, max_native_pc_qty_including_fees: NonZeroU64, self_trade_behavior: SelfTradeBehavior, order_type: OrderType, client_order_id: u64, limit: u16, )
        Ok(())
    }

    // Swaps a
    pub fn swap_quote(ctx: Context<SwapQuote>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateUserAccount {}

#[derive(Accounts)]
pub struct SwapBase<'info> {
    from: Market<'info>,
    to: Market<'info>,
}

#[derive(Accounts)]
pub struct SwapQuote<'info> {
    market: Market<'info>,
}

#[derive(Accounts)]
pub struct Market<'info> {
    #[account(mut)]
    market: AccountInfo<'info>,
    #[account(mut)]
    open_orders: AccountInfo<'info>,
    #[account(signer)]
    open_orders_authority: AccountInfo<'info>,
    #[account(mut)]
    request_queue: AccountInfo<'info>,
    #[account(mut)]
    event_queue: AccountInfo<'info>,
    #[account(mut)]
    market_bids: AccountInfo<'info>,
    #[account(mut)]
    market_asks: AccountInfo<'info>,
    #[account(mut)]
    order_payer: AccountInfo<'info>,
    // Also known as the "base" currency. For a given A/B market,
    // this is the vault for the A mint.
    #[account(mut)]
    coin_vault: AccountInfo<'info>,
    // Also known as the "quote" currency. For a given A/B market,
    // this is the vault for the B mint.
    #[account(mut)]
    pc_vault: AccountInfo<'info>,
    vault_signer: AccountInfo<'info>,
    // User wallets.
    #[account(mut)]
    coin_wallet: AccountInfo<'info>,
    #[account(mut)]
    pc_wallet: AccountInfo<'info>,
    // Programs.
    #[account(executable)]
    dex_program: AccountInfo<'info>,
    #[account(executable)]
    token_program: AccountInfo<'info>,
    // Sysvars.
    rent: AccountInfo<'info>,
    // TODO: add optional referall account.
}

impl<'a, 'b, 'c, 'info> From<Market<'info>>
    for CpiContext<'a, 'b, 'c, 'info, anchor_spl::dex::NewOrderV3<'info>>
{
    fn from(
        accs: Market<'info>,
    ) -> CpiContext<'a, 'b, 'c, 'info, anchor_spl::dex::NewOrderV3<'info>> {
        let dex_accs = dex::NewOrderV3 {
            market: accs.market,
            open_orders: accs.open_orders,
            request_queue: accs.request_queue,
            event_queue: accs.event_queue,
            market_bids: accs.market_bids,
            market_asks: accs.market_asks,
            order_payer: accs.order_payer,
            open_orders_authority: accs.open_orders_authority,
            coin_vault: accs.coin_vault,
            pc_vault: accs.pc_vault,
            token_program: accs.token_program,
            rent: accs.rent,
        };
        CpiContext::new(accs.dex_program.clone(), dex_accs)
    }
}

impl<'a, 'b, 'c, 'info> From<Market<'info>>
    for CpiContext<'a, 'b, 'c, 'info, anchor_spl::dex::SettleFunds<'info>>
{
    fn from(
        accs: Market<'info>,
    ) -> CpiContext<'a, 'b, 'c, 'info, anchor_spl::dex::SettleFunds<'info>> {
        let dex_accs = dex::SettleFunds {
            market: accs.market,
            open_orders: accs.open_orders,
            open_orders_authority: accs.open_orders_authority,
            coin_vault: accs.coin_vault,
            pc_vault: accs.pc_vault,
            coin_wallet: accs.coin_wallet,
            pc_wallet: accs.pc_wallet,
            vault_signer: accs.vault_signer,
            token_program: accs.token_program,
        };
        CpiContext::new(accs.dex_program.clone(), dex_accs)
    }
}

// Validates that the markets provided to the swap function are valid.
fn is_valid_swap(ctx: &Context<SwapBase>) -> Result<()> {
    // todo
    Ok(())
}

#[error]
pub enum ErrorCode {
    Unknown,
}
