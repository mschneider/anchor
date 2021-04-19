const anchor = require('@project-serum/anchor');

describe('swap', () => {

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());

  it('Is initialized!', async () => {
    // Add your test here.
    const program = anchor.workspace.Swap;
    const tx = await program.rpc.createUserAccount();
    console.log("Your transaction signature", tx);
  });
});
