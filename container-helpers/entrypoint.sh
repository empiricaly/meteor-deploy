#!/bin/bash
set -e
service docker start
export ENV_PATH=$PATH
su $ENTRY_USER -lp <<EOSU
set -e
export PATH=$ENV_PATH
. $NVM_DIR/nvm.sh
pulumi stack select -c dev
npx meteor-deploy stack configure default
$@ # Run given argument as a command
EOSU
