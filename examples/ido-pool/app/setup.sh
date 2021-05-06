#!/bin/bash

export MINT_USDC=`spl-token create-token --decimals 6 | head -n 1 | cut -d' ' -f3`
export ACC_USDC=`spl-token create-account $MINT_USDC | head -n 1 | cut -d' ' -f3`
spl-token mint $MINT_USDC 1000 $ACC_USDC

export MINT_MELON=`spl-token create-token --decimals 6 | head -n 1 | cut -d' ' -f3`
export ACC_MELON=`spl-token create-account $MINT_MELON | head -n 1 | cut -d' ' -f3`
spl-token mint $MINT_MELON 1000 $ACC_MELON

echo "MINT_USDC: $MINT_USDC"
echo "ACC_USDC: $ACC_USDC"
echo "MINT_MELON: $MINT_MELON"
echo "ACC_MELON: $ACC_MELON"

node app/index.js init $MINT_USDC $MINT_MELON $ACC_MELON 1000

