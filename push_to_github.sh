#!/bin/bash
# Push LUQI AI / Omega AI to GitHub

echo "Syncing repository to GitHub..."

TARGET_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$TARGET_DIR" || exit 1

# Initialize git if not already
if [ ! -d .git ]; then
    git init
    git branch -m main
    git remote add origin https://github.com/ttmodupe-hash/luqi-ai.git
fi

# Set git identity if not set
if [ -z "$(git config user.name)" ]; then
    git config user.name "ttmodupe-hash"
    git config user.email "TTmodupe@gmail.com"
fi

# Add all tracked changes and new files
git add -A

# Commit
git commit -m "Fix: Add cryptography dependency, repair CI workflow paths, and sync 48-page command palette" || echo "Nothing new to commit."

echo "Local git tree is clean and synchronized."
