//! A frontend for the serum dex to perform instantly settled token swaps.

use anchor_lang::prelude::*;
use anchor_spl::dex::{self, DEX_PROGRAM_ID, Market};
use anchor_spl::token::TokenAccount;
use anchor_spl::dex::serum_dex::instruction::SelfTradeBehavior;
use anchor_spl::dex::serum_dex::matching::{OrderType, Side};
use anchor_spl::dex::serum_dex::state::MarketState;

#[program]
pub mod swap {
    use super::*;

    /*
        // Creates an open orders account, required for using the orderbook.
        pub fn create_user_account(ctx: Context<CreateUserAccount>) -> Result<()> {
            // todo: create open orders account.
            Ok(())
        }
    */
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
    //    #[access_control(is_valid_swap(&ctx))]
    #[inline(never)]
    pub fn swap_base(ctx: Context<SwapBase>, amount: u64) -> Result<()> {
				// Parse bids of market_1. Get max amount sellable + price to sell.
				// Parse asks of market_2 Get max amount buyable + price to buy.
				// Execute sell.
				// Settle.
				// Excewute buy.
				// Settle.
				ctx.accounts.sell_order_cpi()?;
/*				self.sell_settle_cpi()?;
				self.buy_order_cpi()?;
				self.to_settle_cpi()?;*/

				emit!(DidSwap {
						amount_sold_given: amount,
						amount_sold: amount, // todo
						amount_purchased: amount, // todo
						mint_sold: ctx.accounts.from.coin_wallet.mint,
						mint_purchased: ctx.accounts.to.coin_wallet.mint,
				});

        Ok(())
    }

    /*
    // Swaps a
    pub fn swap_quote(ctx: Context<SwapQuote>) -> Result<()> {
        Ok(())
    }
     */
}

#[derive(Accounts)]
pub struct CreateUserAccount {}

#[derive(Accounts)]
pub struct SwapBase<'info> {
    from: MarketAccounts<'info>,
    to: MarketAccounts<'info>,
    #[account(mut)]
    pc_wallet: CpiAccount<'info, TokenAccount>,
    // Programs.
    #[account(executable)]
    dex_program: AccountInfo<'info>,
    #[account(executable)]
    token_program: AccountInfo<'info>,
    // Sysvars.
    rent: AccountInfo<'info>,

    // TODO: add optional referall account.
}

impl<'info> SwapBase<'info> {
		fn sell_order_cpi(&self) -> ProgramResult {
/*
				let orderbook = {
						let market = MarketState::load(&self.from.market, &*DEX_PROGRAM_ID)?;
						let bids = market.load_bids_mut(self.from.bids)?;
						let asks = market.load_asks_mut(self.from.asks)?;
						let order_book = OrderBookState {
								bids: bids.deref_mut(),
								asks: asks.deref_mut(),
								market_state: market.deref_mut(),
						};

				};
        let dex_accs = dex::NewOrderV3 {
            market: self.from.market.clone(),
            open_orders: self.from.open_orders.clone(),
            request_queue: self.from.request_queue.clone(),
            event_queue: self.from.event_queue.clone(),
            market_bids: self.from.bids.clone(),
            market_asks: self.from.asks.clone(),
            order_payer: self.from.order_payer.clone(),
            open_orders_authority: self.from.open_orders_authority.clone(),
            coin_vault: self.from.coin_vault.clone(),
            pc_vault: self.from.pc_vault.clone(),
            token_program: self.token_program.clone(),
            rent: self.rent.clone(),
        };
				let ctx = CpiContext::new(self.dex_program.clone(), dex_accs);
				dex::new_order_v3(
						ctx,
						Side::Ask,
						limit_price,
						max_coin_qty,
						max_pc_qty,
						SelfTradeBehavior::AbortTransaction,
						OrderType::ImmediateOrCancel,
						client_order_id,
						limit,
				)?;
*/
				Ok(())
		}


		fn from_order_cpi(&self) -> CpiContext<'_, '_, '_, 'info, anchor_spl::dex::NewOrderV3<'info>> {
        let dex_accs = dex::NewOrderV3 {
            market: self.from.market.clone(),
            open_orders: self.from.open_orders.clone(),
            request_queue: self.from.request_queue.clone(),
            event_queue: self.from.event_queue.clone(),
            market_bids: self.from.bids.clone(),
            market_asks: self.from.asks.clone(),
            order_payer: self.from.order_payer.clone(),
            open_orders_authority: self.from.open_orders_authority.clone(),
            coin_vault: self.from.coin_vault.clone(),
            pc_vault: self.from.pc_vault.clone(),
            token_program: self.token_program.clone(),
            rent: self.rent.clone(),
        };
				CpiContext::new(self.dex_program.clone(), dex_accs)
		}
}

/*
#[derive(Accounts)]
pub struct SwapQuote<'info> {
    market: Market<'info>,
}
*/

#[derive(Accounts)]
pub struct MarketAccounts<'info> {
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
    bids: AccountInfo<'info>,
    #[account(mut)]
    asks: AccountInfo<'info>,
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
    coin_wallet: CpiAccount<'info, TokenAccount>,
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

#[event]
pub struct DidSwap {
		// User given (max) amount to swap.
		pub amount_sold_given: u64,
		// Amount of the `from` token sold.
		pub amount_sold: u64,
		// Amount of the `to` token purchased.
		pub amount_purchased: u64,
		// Mint sold.
		pub mint_sold: Pubkey,
		// Mint purchased.
		pub mint_purchased: Pubkey,
}
