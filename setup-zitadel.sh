#!/bin/bash
# Quick Setup Script for Zitadel Local Authentication
# Run this after implementation to start the system

set -e

echo "🚀 OkNexus - Zitadel Local Setup"
echo "================================"
echo ""

# Step 1: Start Docker Compose
echo "📦 Step 1: Starting Docker containers..."
docker-compose up -d
echo "✅ Docker containers started"
echo ""

# Step 2: Wait for services to be healthy
echo "⏳ Step 2: Waiting for services to be healthy..."
echo "   - Checking Zitadel health..."

max_attempts=30
attempt=1
while [ $attempt -le $max_attempts ]; do
    if curl -s -f http://localhost:8080/oauth/v2/.well-known/openid-configuration > /dev/null 2>&1; then
        echo "✅ Zitadel is ready"
        break
    fi
    echo "   Waiting... (attempt $attempt/$max_attempts)"
    sleep 2
    attempt=$((attempt + 1))
done

if [ $attempt -gt $max_attempts ]; then
    echo "❌ Zitadel failed to start. Check docker-compose logs:"
    echo "   docker-compose logs zitadel"
    exit 1
fi
echo ""

# Step 3: Instructions
echo "🎯 Manual Steps Required:"
echo "========================"
echo ""
echo "1. Open Zitadel Console:"
echo "   👉 http://localhost:8080/ui/console"
echo ""
echo "2. Login with default credentials:"
echo "   Username: admin"
echo "   Password: Admin@123!Change"
echo ""
echo "3. Create a New Application:"
echo "   - Go to Applications → Create New Application"
echo "   - Name: NextAuth"
echo "   - Type: Web"
echo "   - Redirect URI: http://localhost:3000/api/auth/callback/zitadel"
echo ""
echo "4. Get Client Credentials:"
echo "   - Copy the Client ID"
echo "   - Generate and copy the Client Secret"
echo ""
echo "5. Update .env.local with:"
echo "   ZITADEL_CLIENT_ID=<your-client-id>"
echo "   ZITADEL_CLIENT_SECRET=<your-client-secret>"
echo ""
echo "6. Start Next.js:"
echo "   👉 npm run dev"
echo ""
echo "7. Test Login:"
echo "   👉 http://localhost:3000"
echo "   Click 'Sign In with Zitadel'"
echo ""
echo "✨ All set! Follow the manual steps above."
echo ""
echo "📚 For detailed help, see: docs/zitadel-setup.md"
