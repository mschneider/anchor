const assert = require("assert");
const anchor = require("@project-serum/anchor");
const Token = require("@solana/spl-token").Token;
const TOKEN_PROGRAM_ID = require("@solana/spl-token").TOKEN_PROGRAM_ID;
const serum = require("@project-serum/serum");
const utils = require("./utils");
const serumCmn = require("@project-serum/common");
const PublicKey = anchor.web3.PublicKey;
const Market = serum.Market;
const BN = anchor.BN;
const Account = anchor.web3.Account;
const Transaction = anchor.web3.Transaction;
const SystemProgram = anchor.web3.SystemProgram;

describe("swap", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());

  const program = anchor.workspace.Swap;

  // The markets.
  let MARKET_A_USDC, MARKET_B_USDC;

  // Account placing orders on the orderbook.

  it("Sets up two markets with resting orders", async () => {
    // Setup mints with initial tokens owned by the provider.
    const decimals = 6;
    const [MINT_A, GOD_A] = await serumCmn.createMintAndVault(
      program.provider,
      new BN(1000000000000000),
      undefined,
      decimals
    );
    const [MINT_B, GOD_B] = await serumCmn.createMintAndVault(
      program.provider,
      new BN(1000000000000000),
      undefined,
      decimals
    );
    const [USDC, GOD_USDC] = await serumCmn.createMintAndVault(
      program.provider,
      new BN(1000000000000000),
      undefined,
      decimals
    );

    // Create a funded account to act as market maker.
    const amount = 100000 * 10 ** decimals;
    const marketMaker = await utils.fundAccount({
      provider: program.provider,
      mints: [
        { god: GOD_A, mint: MINT_A, amount, decimals },
        { god: GOD_B, mint: MINT_B, amount, decimals },
        { god: GOD_USDC, mint: USDC, amount, decimals },
      ],
    });

    // Setup A/USDC and B/USDC markets with resting orders.
    const asks = [
      [6.041, 7.8],
      [6.051, 72.3],
      [6.055, 5.4],
      [6.067, 15.7],
      [6.077, 390.0],
      [6.09, 24.0],
      [6.11, 36.3],
      [6.133, 300.0],
      [6.167, 687.8],
    ];
    const bids = [
      [6.004, 8.5],
      [5.995, 12.9],
      [5.987, 6.2],
      [5.978, 15.3],
      [5.965, 82.8],
      [5.961, 25.4],
    ];
    MARKET_A_USDC = await utils.setupMarket({
      baseMint: MINT_A,
      quoteMint: USDC,
      marketMaker: {
        account: marketMaker.account,
        baseToken: marketMaker.tokens[MINT_A.toString()],
        quoteToken: marketMaker.tokens[USDC.toString()],
      },
      bids,
      asks,
      provider: program.provider,
    });
    MARKET_B_USDC = await utils.setupMarket({
      baseMint: MINT_B,
      quoteMint: USDC,
      marketMaker: {
        account: marketMaker.account,
        baseToken: marketMaker.tokens[MINT_B.toString()],
        quoteToken: marketMaker.tokens[USDC.toString()],
      },
      bids,
      asks,
      provider: program.provider,
    });
    let myOrders = await MARKET_A_USDC.loadOrdersForOwner(
      program.provider.connection,
      marketMaker.account.publicKey
    );
			console.log("orders", myOrders);
    myOrders = await MARKET_B_USDC.loadOrdersForOwner(
      program.provider.connection,
      marketMaker.account.publicKey
    );
    console.log("orders", myOrders);
    // Complete.
  });


  it("Is initialized!", async () => {
    // Add your test here.
    /*
			const tx = await program.rpc.swapBase(new BN(10), {
					accounts: {
							from: {
									market: anchor.web3.SYSVAR_RENT_PUBKEY,
									openOrders: anchor.web3.SYSVAR_RENT_PUBKEY,
									openOrdersAuthority: program.provider.wallet.publicKey,
									requestQueue: anchor.web3.SYSVAR_RENT_PUBKEY,
									eventQueue: anchor.web3.SYSVAR_RENT_PUBKEY,
									bids: anchor.web3.SYSVAR_RENT_PUBKEY,
									asks: anchor.web3.SYSVAR_RENT_PUBKEY,
									orderPayer: anchor.web3.SYSVAR_RENT_PUBKEY,
									coinVault: anchor.web3.SYSVAR_RENT_PUBKEY,
									pcVault: anchor.web3.SYSVAR_RENT_PUBKEY,
									vaultSigner: anchor.web3.SYSVAR_RENT_PUBKEY,
									coinWallet: anchor.web3.SYSVAR_RENT_PUBKEY,
							},
							to: {
									market: anchor.web3.SYSVAR_RENT_PUBKEY,
									openOrders: anchor.web3.SYSVAR_RENT_PUBKEY,
									openOrdersAuthority: program.provider.wallet.publicKey,
									requestQueue: anchor.web3.SYSVAR_RENT_PUBKEY,
									eventQueue: anchor.web3.SYSVAR_RENT_PUBKEY,
									bids: anchor.web3.SYSVAR_RENT_PUBKEY,
									asks: anchor.web3.SYSVAR_RENT_PUBKEY,
									orderPayer: anchor.web3.SYSVAR_RENT_PUBKEY,
									coinVault: anchor.web3.SYSVAR_RENT_PUBKEY,
									pcVault: anchor.web3.SYSVAR_RENT_PUBKEY,
									vaultSigner: anchor.web3.SYSVAR_RENT_PUBKEY,
									coinWallet: anchor.web3.SYSVAR_RENT_PUBKEY,
							},
							pcWallet: anchor.web3.SYSVAR_RENT_PUBKEY,
							dexProgram: anchor.web3.SYSVAR_RENT_PUBKEY,
							tokenProgram: anchor.web3.SYSVAR_RENT_PUBKEY,
							rent: anchor.web3.SYSVAR_RENT_PUBKEY,
					}
			});
			console.log("Your transaction signature", tx);
			*/
  });
});
