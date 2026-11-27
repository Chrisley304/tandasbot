#!/bin/bash

cd ~/Documents/tandasbot/
git fetch origin main
if [ "$(git rev-parse HEAD)" != "$(git rev-parse @{u})" ]; then
    git pull origin main
    pnpm install
    pnpm build
    pm2 restart tandasbot
    echo "Tandasbot updated and restarted."
else
    echo "No new changes."
fi
