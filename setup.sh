#!/bin/bash
# Omega AI Setup Script

echo "Setting up Omega AI v29.1.0..."

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create data directories
mkdir -p data/assistant
mkdir -p data/kb
mkdir -p .omega_sessions
mkdir -p logs

# Set permissions
chmod +x push_to_github.sh

# Initialize database
python -c "from db_engine import DBEngine; DBEngine().init_db()"

echo "Setup complete! Run 'python api_server.py' to start."
