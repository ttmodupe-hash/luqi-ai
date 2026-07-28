# =============================================================================
# LUQI AI — Makefile
# =============================================================================

.PHONY: help install build dev prod test lint clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install all dependencies (Python + Node)
	pip install -r requirements.txt
	cd app && npm install

build: ## Build frontend for production
	cd app && npm run build
	mkdir -p static
	cp -r app/dist/* static/

dev: install build ## Run in development mode
	./deploy.sh dev

prod: install build ## Run in production mode
	./deploy.sh prod

docker: ## Build and run with Docker
	docker-compose up --build

test: ## Run Python syntax check on all modules
	@echo "Checking Python syntax..."
	@find backend omega_ai -name "*.py" -exec python -m py_compile {} \; && echo "✅ All Python files compile"

lint: ## Run ESLint on frontend
	cd app && npm run lint

clean: ## Clean build artifacts
	rm -rf app/dist static app/node_modules __pycache__
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true

status: ## Check system status
	@echo "=== LUQI AI Status ==="
	@echo "Version: $$(grep '__version__' backend/__init__.py 2>/dev/null | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' || echo 'unknown')"
	@echo "Python modules: $$(find backend omega_ai -name '*.py' | wc -l)"
	@echo "Frontend pages: $$(find app/src/pages -name '*.tsx' | wc -l)"
	@echo "API endpoints: $$(grep -h 'async def api_v25_' backend/v25_endpoints*.py | wc -l)"
	@echo ""
	@echo "✅ Run 'make dev' to start development server"
