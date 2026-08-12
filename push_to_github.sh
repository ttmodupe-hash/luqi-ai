#!/bin/bash
# Push Omega AI to GitHub

echo "Pushing Omega AI to GitHub..."

cd /mnt/agents/output/omega_ai || exit 1

# Initialize git if not already
if [ ! -d .git ]; then
    git init
    git remote add origin https://github.com/ttmodupe-hash/luqi-ai.git
fi

# Add all files
git add .

# Commit
git commit -m "Update omega_ai/ — full v29.1.0 push"

# Push to main
git push origin main --force

echo "Push complete!"
