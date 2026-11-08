#!/bin/bash
# Wipes the OffGrid database and publishes the latest backend.
cd "$(dirname "$0")/backend/spacetime" || exit 1
export PATH="$HOME/.local/bin:$HOME/.spacetime/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
spacetime publish warroom --server local --delete-data=always --yes=all
echo
echo "Done. Now restart Vite (Ctrl+C, npm run dev) and reload localhost:5173/admin."
read -n 1 -s -r -p "Press any key to close"
