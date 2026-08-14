#!/bin/bash

cd ~/Documents/chrisbot-whatsapp/
git fetch origin main
if [ "$(git rev-parse HEAD)" != "$(git rev-parse @{u})" ]; then
    git pull origin main
    npm install
    npm run build
    pm2 restart chrisbot
    echo "Bot updated and restarted."
else
    echo "No new changes."
fi
