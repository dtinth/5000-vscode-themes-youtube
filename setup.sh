#!/bin/bash -e
pnpm install
pnpm playwright install chromium --with-deps
mkdir -p ~/.config/fontconfig
if [ ! -f ~/.config/fontconfig/fonts.conf ]; then
  cp fonts.conf ~/.config/fontconfig
fi
