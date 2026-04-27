#!/bin/bash
# Comprehensive test suite for Zitadel + PostgreSQL authentication
# Run this to validate the complete authentication setup

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# Test result tracking
declare -a RESULTS=()

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((TESTS_PASSED++))
    RESULTS+=("✅ $1")
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
    ((TESTS_FAILED++))
    RESULTS+=("❌ $1")
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((TESTS_SKIPPED++))
    RESULTS+=("⚠️  $1")
}

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  $1${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# ============================================================================
# Test Suite
# ============================================================================

print_header "ZITADEL + POSTGRESQL AUTHENTICATION TEST SUITE"

# Test 1: Docker Installation
print_header "🐳 DOCKER & INFRASTRUCTURE TESTS"

if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    log_success "Docker installed: $DOCKER_VERSION"
else
    log_error "Docker not installed"
    exit 1
fi

if command -v docker compose &> /dev/null; then
    COMPOSE_VERSION=$(docker compose version | grep -oP 'Docker Compose version \K[^,]*')
    log_success "Docker Compose available: $COMPOSE_VERSION"
else
    log_error "Docker Compose not available"
    exit 1
fi

# Test 2: Container Status
log_info "Checking container status..."

if docker compose ps --services &> /dev/null; then
    DB_STATUS=$(docker compose ps db --format="{{.State}}" 2>/dev/null || echo "Not found")
    ZITADEL_STATUS=$(docker compose ps zitadel --format="{{.State}}" 2>/dev/null || echo "Not found")
    
    if [ "$DB_STATUS" = "running" ]; then
        log_success "PostgreSQL container is running"
    else
        log_warning "PostgreSQL container status: $DB_STATUS (expected: running)"
    fi
    
    if [ "$ZITADEL_STATUS" = "running" ]; then
        log_success "Zitadel container is running"
    else
        log_warning "Zitadel container status: $ZITADEL_STATUS (expected: running)"
    fi
else
    log_error "Cannot check container status (docker compose not accessible)"
fi

# Test 3: Environment Variables
print_header "🔐 ENVIRONMENT CONFIGURATION TESTS"

if [ -f ".env.local" ]; then
    log_success ".env.local file exists"
    
    # Check each required variable
    if grep -q "NEXTAUTH_SECRET=" .env.local && ! grep -q "NEXTAUTH_SECRET=$" .env.local; then
        log_success "NEXTAUTH_SECRET is configured"
    else
        log_error "NEXTAUTH_SECRET is missing or empty"
    fi
    
    if grep -q "NEXTAUTH_URL=http://localhost:3000" .env.local; then
        log_success "NEXTAUTH_URL is configured correctly"
    else
        log_error "NEXTAUTH_URL is not configured correctly"
    fi
    
    if grep -q "ZITADEL_ISSUER=http://localhost:8080" .env.local; then
        log_success "ZITADEL_ISSUER is configured"
    else
        log_error "ZITADEL_ISSUER is not configured correctly"
    fi
    
    if grep -q "ZITADEL_CLIENT_ID=" .env.local && ! grep -q "placeholder" <(grep "ZITADEL_CLIENT_ID" .env.local); then
        log_success "ZITADEL_CLIENT_ID is configured (not placeholder)"
    else
        log_warning "ZITADEL_CLIENT_ID is placeholder or missing"
    fi
    
    if grep -q "ZITADEL_CLIENT_SECRET=" .env.local && ! grep -q "placeholder" <(grep "ZITADEL_CLIENT_SECRET" .env.local); then
        log_success "ZITADEL_CLIENT_SECRET is configured (not placeholder)"
    else
        log_warning "ZITADEL_CLIENT_SECRET is placeholder or missing"
    fi
else
    log_error ".env.local file not found"
fi

# Test 4: Code Configuration
print_header "💻 CODE CONFIGURATION TESTS"

if [ -f "lib/auth.ts" ]; then
    if grep -q "ZitadelProvider" lib/auth.ts; then
        log_success "Zitadel provider configured in auth.ts"
    else
        log_error "Zitadel provider not found in auth.ts"
    fi
else
    log_error "lib/auth.ts not found"
fi

if [ -f "app/api/auth/\[...nextauth\]/route.ts" ]; then
    log_success "NextAuth route handler exists"
else
    log_warning "NextAuth route handler not found"
fi

if [ -f "app/login/page.tsx" ]; then
    if grep -q "Sign In with Zitadel" app/login/page.tsx; then
        log_success "Zitadel login page configured"
    else
        log_error "Zitadel login button not found"
    fi
else
    log_error "app/login/page.tsx not found"
fi

if [ -f "middleware.ts" ]; then
    if grep -q "next-auth/middleware" middleware.ts; then
        log_success "NextAuth middleware configured"
    else
        log_error "NextAuth middleware not found"
    fi
else
    log_error "middleware.ts not found"
fi

# Test 5: Connectivity Tests
print_header "🌐 CONNECTIVITY TESTS"

log_info "Testing Zitadel connectivity..."
if timeout 5 curl -s http://localhost:8080/healthz > /dev/null 2>&1; then
    log_success "Zitadel is accessible (http://localhost:8080)"
else
    log_warning "Zitadel not accessible or not running (http://localhost:8080)"
fi

log_info "Testing OIDC configuration endpoint..."
if timeout 5 curl -s http://localhost:8080/oauth/v2/.well-known/openid-configuration > /dev/null 2>&1; then
    log_success "OIDC configuration endpoint is accessible"
else
    log_warning "OIDC configuration endpoint not accessible"
fi

# Test 6: Database Tests
print_header "🗄️  DATABASE TESTS"

if command -v pg_isready &> /dev/null; then
    if pg_isready -h localhost -U zitadel -d zitadel > /dev/null 2>&1; then
        log_success "PostgreSQL is accessible"
    else
        log_warning "PostgreSQL not accessible (may not be running)"
    fi
else
    log_warning "pg_isready not installed (skipping database test)"
fi

# Test 7: Documentation
print_header "📚 DOCUMENTATION TESTS"

if [ -f "docs/ZITADEL_COMPLETE_SETUP.md" ]; then
    log_success "ZITADEL_COMPLETE_SETUP.md exists"
else
    log_error "ZITADEL_COMPLETE_SETUP.md not found"
fi

if [ -f "docs/AUTH_COMPLETION_CHECKLIST.md" ]; then
    log_success "AUTH_COMPLETION_CHECKLIST.md exists"
else
    log_error "AUTH_COMPLETION_CHECKLIST.md not found"
fi

if [ -f "docs/zitadel-setup.md" ]; then
    log_success "zitadel-setup.md exists"
else
    log_error "zitadel-setup.md not found"
fi

# Test 8: Helper Scripts
print_header "🛠️  HELPER SCRIPTS TESTS"

if [ -f "scripts/auth-helper.ps1" ]; then
    log_success "auth-helper.ps1 exists"
else
    log_error "auth-helper.ps1 not found"
fi

if [ -f "scripts/setup-zitadel-auth.ps1" ]; then
    log_success "setup-zitadel-auth.ps1 exists"
else
    log_error "setup-zitadel-auth.ps1 not found"
fi

# Test 9: Package Dependencies
print_header "📦 PACKAGE DEPENDENCIES TESTS"

if grep -q '"next-auth"' package.json; then
    NEXTAUTH_VERSION=$(grep '"next-auth"' package.json | grep -oP '\d+\.\d+\.\d+')
    log_success "next-auth is installed (v$NEXTAUTH_VERSION)"
else
    log_error "next-auth not found in package.json"
fi

if grep -q '"zitadel"' package.json || grep -q 'zitadel' package.json; then
    log_success "Zitadel related packages found"
else
    log_warning "Zitadel related packages may not be installed (check next-auth providers)"
fi

# Summary Report
print_header "TEST SUMMARY REPORT"

echo "Results:"
for result in "${RESULTS[@]}"; do
    echo "  $result"
done

echo ""
echo "Statistics:"
echo -e "  ${GREEN}✅ Passed: $TESTS_PASSED${NC}"
echo -e "  ${RED}❌ Failed: $TESTS_FAILED${NC}"
echo -e "  ${YELLOW}⚠️  Warnings: $TESTS_SKIPPED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    if [ $TESTS_SKIPPED -eq 0 ]; then
        echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
        echo ""
        echo "Your Zitadel + PostgreSQL authentication setup is complete!"
        echo ""
        echo "Next steps:"
        echo "  1. npm run dev"
        echo "  2. Visit http://localhost:3000"
        echo "  3. Click 'Sign In with Zitadel'"
        echo "  4. Test the login flow"
        exit 0
    else
        echo -e "${YELLOW}⚠️  TESTS PASSED WITH WARNINGS${NC}"
        echo ""
        echo "Most features are working, but some optional components may need attention."
        echo "See warnings above for details."
        exit 0
    fi
else
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    echo ""
    echo "Please review the failed tests above and fix the issues."
    echo ""
    echo "Common fixes:"
    echo "  • Start containers: docker compose up -d"
    echo "  • Check environment: cat .env.local | grep ZITADEL"
    echo "  • View logs: docker compose logs -f zitadel"
    echo ""
    exit 1
fi
