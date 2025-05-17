.PHONY: help install start stop build test lint clean deploy

# Default target
.DEFAULT_GOAL := help

# Colors for output
CYAN := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
RESET := \033[0m

help: ## Show this help message
	@echo '$(CYAN)Usage:$(RESET)'
	@echo '  make <target>'
	@echo ''
	@echo '$(CYAN)Targets:$(RESET)'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(RESET) %s\n", $$1, $$2}'

install: ## Install all dependencies
	@echo "$(CYAN)Installing dependencies...$(RESET)"
	npm install
	@echo "$(CYAN)Bootstrapping Lerna...$(RESET)"
	npx lerna bootstrap
	@echo "$(GREEN)Installation complete!$(RESET)"

start: ## Start all services in development mode
	@echo "$(CYAN)Starting all services...$(RESET)"
	npm run dev

start-frontend: ## Start frontend only
	@echo "$(CYAN)Starting frontend...$(RESET)"
	npm run dev:frontend

start-backend: ## Start backend only
	@echo "$(CYAN)Starting backend...$(RESET)"
	npm run dev:backend

start-game-server: ## Start game server only
	@echo "$(CYAN)Starting game server...$(RESET)"
	npm run dev:game-server

start-contracts: ## Start smart contracts development
	@echo "$(CYAN)Starting smart contracts...$(RESET)"
	npm run dev:contracts

build: ## Build all services for production
	@echo "$(CYAN)Building for production...$(RESET)"
	npm run build
	@echo "$(GREEN)Build complete!$(RESET)"

test: ## Run all tests
	@echo "$(CYAN)Running tests...$(RESET)"
	npm run test
	@echo "$(GREEN)Tests complete!$(RESET)"

test-unit: ## Run unit tests only
	@echo "$(CYAN)Running unit tests...$(RESET)"
	npm run test:unit

test-integration: ## Run integration tests only
	@echo "$(CYAN)Running integration tests...$(RESET)"
	npm run test:integration

test-e2e: ## Run end-to-end tests
	@echo "$(CYAN)Running E2E tests...$(RESET)"
	npm run test:e2e

lint: ## Run linting on all projects
	@echo "$(CYAN)Running linting...$(RESET)"
	npm run lint

lint-fix: ## Fix linting issues automatically
	@echo "$(CYAN)Fixing linting issues...$(RESET)"
	npm run lint:fix

format: ## Format code with Prettier
	@echo "$(CYAN)Formatting code...$(RESET)"
	npm run format

clean: ## Clean all build directories and dependencies
	@echo "$(CYAN)Cleaning...$(RESET)"
	rm -rf */node_modules
	rm -rf */dist
	rm -rf */build
	rm -rf */coverage
	rm -rf */.next
	npx lerna clean --yes
	@echo "$(GREEN)Clean complete!$(RESET)"

docker-up: ## Start all services with Docker
	@echo "$(CYAN)Starting Docker containers...$(RESET)"
	docker-compose up -d
	@echo "$(GREEN)Docker containers started!$(RESET)"

docker-down: ## Stop all Docker containers
	@echo "$(CYAN)Stopping Docker containers...$(RESET)"
	docker-compose down
	@echo "$(GREEN)Docker containers stopped!$(RESET)"

docker-build: ## Build Docker images
	@echo "$(CYAN)Building Docker images...$(RESET)"
	docker-compose build
	@echo "$(GREEN)Docker images built!$(RESET)"

docker-logs: ## Show Docker logs
	docker-compose logs -f

deploy-dev: ## Deploy to development environment
	@echo "$(CYAN)Deploying to development...$(RESET)"
	./scripts/deploy.sh development
	@echo "$(GREEN)Deployment to development complete!$(RESET)"

deploy-staging: ## Deploy to staging environment
	@echo "$(CYAN)Deploying to staging...$(RESET)"
	./scripts/deploy.sh staging
	@echo "$(GREEN)Deployment to staging complete!$(RESET)"

deploy-prod: ## Deploy to production environment
	@echo "$(CYAN)Deploying to production...$(RESET)"
	./scripts/deploy.sh production
	@echo "$(GREEN)Deployment to production complete!$(RESET)"

contracts-deploy: ## Deploy smart contracts
	@echo "$(CYAN)Deploying smart contracts...$(RESET)"
	cd smart-contracts && npm run deploy:testnet
	@echo "$(GREEN)Smart contracts deployed!$(RESET)"

contracts-verify: ## Verify smart contracts
	@echo "$(CYAN)Verifying smart contracts...$(RESET)"
	cd smart-contracts && npm run verify
	@echo "$(GREEN)Smart contracts verified!$(RESET)"

season-init: ## Initialize new season
	@echo "$(CYAN)Initializing new season...$(RESET)"
	./scripts/season-init.sh
	@echo "$(GREEN)Season initialized!$(RESET)"

security-scan: ## Run security scan
	@echo "$(CYAN)Running security scan...$(RESET)"
	./scripts/security-scan.sh
	@echo "$(GREEN)Security scan complete!$(RESET)"

performance-test: ## Run performance tests
	@echo "$(CYAN)Running performance tests...$(RESET)"
	./scripts/performance-test.sh
	@echo "$(GREEN)Performance tests complete!$(RESET)"

backup: ## Create system backup
	@echo "$(CYAN)Creating backup...$(RESET)"
	./scripts/backup.sh
	@echo "$(GREEN)Backup complete!$(RESET)"

restore: ## Restore from backup
	@echo "$(CYAN)Restoring from backup...$(RESET)"
	./scripts/restore.sh
	@echo "$(GREEN)Restore complete!$(RESET)"

logs: ## Show system logs
	@echo "$(CYAN)Showing logs...$(RESET)"
	docker-compose logs -f

monitor: ## Start monitoring dashboard
	@echo "$(CYAN)Starting monitoring dashboard...$(RESET)"
	open http://localhost:3001

docs: ## Generate documentation
	@echo "$(CYAN)Generating documentation...$(RESET)"
	npm run docs:generate
	@echo "$(GREEN)Documentation generated!$(RESET)"

dev-setup: ## Complete development environment setup
	@echo "$(CYAN)Setting up development environment...$(RESET)"
	make install
	cp .env.example .env
	make docker-up
	make contracts-deploy
	@echo "$(GREEN)Development environment setup complete!$(RESET)"

check: ## Run all checks (lint, test, build)
	@echo "$(CYAN)Running all checks...$(RESET)"
	make lint
	make test
	make build
	@echo "$(GREEN)All checks passed!$(RESET)"
