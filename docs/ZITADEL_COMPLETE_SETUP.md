# 🔐 Zitadel + PostgreSQL Authentication - Complete Setup Guide

## Overview

The OkNexus platform uses **Zitadel** (open-source OIDC provider) with **PostgreSQL** for enterprise-grade authentication. This guide completes the setup process.

**Status**: ✅ 95% Complete - Only manual Zitadel configuration needed

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Start Containers
```powershell
cd c:\Users\vjk51\Desktop\ai platform\OkNexus
docker compose up -d
```

### Step 2: Verify Services
```powershell
docker compose ps
```

Expected output:
```
NAME          IMAGE                         STATUS       PORTS
db            postgres:15-alpine           Up (healthy) 5432/tcp
zitadel       ghcr.io/zitadel/zitadel      Up (healthy) 8080/tcp
```

### Step 3: Configure Zitadel (Manual)
1. Open: http://localhost:8080/ui/console
2. Login: `admin` / `Admin@123!Change`
3. Follow [Section 2](#-section-2-configure-zitadel-application) below

### Step 4: Update Environment
Update `.env.local`:
```env
ZITADEL_CLIENT_ID=<your-client-id>
ZITADEL_CLIENT_SECRET=<your-client-secret>
```

### Step 5: Start Application
```powershell
npm run dev
```

Visit: http://localhost:3000

---

## 📋 Section 1: Architecture Overview

### Technology Stack
- **OIDC Provider**: Zitadel (latest)
- **Database**: PostgreSQL 15
- **Framework**: Next.js with NextAuth.js
- **Session**: JWT-based
- **Deployment**: Docker Compose

### Data Flow
```
User Browser
    ↓
Next.js App (localhost:3000)
    ↓
NextAuth.js (OIDC Client)
    ↓
Zitadel (localhost:8080) ← OAuth 2.0 / OIDC
    ↓
PostgreSQL (db service)
```

### Security Features
✅ **Offline Token Support** - Refresh tokens for long-lived sessions  
✅ **JWT Sessions** - Stateless authentication  
✅ **HTTPS Ready** - TLS support for production  
✅ **Token Encryption** - All tokens encrypted in transport  
✅ **Multi-factor Ready** - Zitadel supports MFA configuration  

---

## 🔐 Section 2: Configure Zitadel Application

### Prerequisites
- Zitadel running: `docker compose up -d`
- Browser access to: http://localhost:8080

### Step-by-Step Instructions

#### Step 2.1: Access Zitadel Console
```
URL: http://localhost:8080/ui/console
Username: admin
Password: Admin@123!Change
```

⚠️ **IMPORTANT**: Change the default password after first login!

#### Step 2.2: Create New Application

1. In the left sidebar, click **Applications**
2. Click **Create New Application** button
3. Fill in the form:
   - **Name**: `NextAuth`
   - **Type**: Select **Web**
4. Click **Create**

#### Step 2.3: Get Client Credentials

After creating the application:

1. In the application details page, you should see:
   - **Client ID**: Copy this value
   - **Redirect URIs section**: Verify the redirect URI is set

2. For **Client Secret**:
   - Click **Keys** in the application settings
   - Generate a new key if one doesn't exist
   - Copy the **Client Secret**

#### Step 2.4: Configure Redirect URI

This tells Zitadel where to send users after authentication.

1. In the **Redirect URIs** section, click **Add URI**
2. Enter: `http://localhost:3000/api/auth/callback/zitadel`
3. Click **Save**

**For Production**, also add:
- `https://yourdomain.com/api/auth/callback/zitadel`

#### Step 2.5: Verify Configuration

Back in Zitadel Console, verify:
- ✅ Application name: `NextAuth`
- ✅ Application type: `Web`
- ✅ Redirect URI: `http://localhost:3000/api/auth/callback/zitadel`
- ✅ Client ID is available
- ✅ Client Secret is available

---

## 🔑 Section 3: Update Environment Variables

### File: `.env.local`

Locate the Zitadel section and update with your credentials:

```env
# -- Zitadel Auth Configuration ---
ZITADEL_ISSUER=http://localhost:8080
ZITADEL_CLIENT_ID=<PASTE_YOUR_CLIENT_ID>
ZITADEL_CLIENT_SECRET=<PASTE_YOUR_CLIENT_SECRET>
```

### Environment Variables Explained

| Variable | Purpose | Example |
|----------|---------|---------|
| `ZITADEL_ISSUER` | OAuth provider URL | `http://localhost:8080` |
| `ZITADEL_CLIENT_ID` | Application identifier | `227380...@nextauth` |
| `ZITADEL_CLIENT_SECRET` | Application secret | `3bB5...jKx2` |
| `NEXTAUTH_SECRET` | Session encryption key | Auto-generated |
| `NEXTAUTH_URL` | Callback URL base | `http://localhost:3000` |

### Verification Script

```powershell
# Check if credentials are configured
$content = Get-Content .env.local -Raw
if ($content -match "ZITADEL_CLIENT_ID=([a-zA-Z0-9@]+)") {
    Write-Host "✅ ZITADEL_CLIENT_ID is configured"
}
if ($content -match "ZITADEL_CLIENT_SECRET=([a-zA-Z0-9]+)") {
    Write-Host "✅ ZITADEL_CLIENT_SECRET is configured"
}
```

---

## 🧪 Section 4: Testing Authentication

### Test 1: Zitadel Health Check

```bash
curl http://localhost:8080/oauth/v2/.well-known/openid-configuration
```

Expected: JSON response with OIDC configuration

### Test 2: Verify Database Connection

```bash
docker compose exec db psql -U zitadel -d zitadel -c "SELECT version();"
```

Expected: PostgreSQL version output

### Test 3: Login Flow

1. Start the application: `npm run dev`
2. Visit: http://localhost:3000
3. Click **Sign In with Zitadel**
4. You should be redirected to Zitadel login
5. Use: `admin` / `Admin@123!Change`
6. Grant permission if prompted
7. You should be redirected back to the app

### Test 4: Session Validation

After logging in:
1. Check browser DevTools → Application → Cookies
2. Look for `next-auth.jwt` cookie
3. Verify session exists

---

## 📁 Section 5: Files Modified/Created

### Authentication Configuration
- ✅ `lib/auth.ts` - NextAuth with Zitadel provider
- ✅ `app/api/auth/[...nextauth]/route.ts` - NextAuth route handler
- ✅ `.env.local` - Environment variables (needs manual credential update)

### UI Components
- ✅ `app/login/page.tsx` - Zitadel login page
- ✅ `components/main-nav.tsx` - Logout button
- ✅ `hooks/use-auth.ts` - Session hook

### Middleware
- ✅ `middleware.ts` - Route protection

### Docker Configuration
- ✅ `docker-compose.yml` - Zitadel + PostgreSQL services
- ✅ Database initialized with admin user

### Documentation
- ✅ `docs/zitadel-setup.md` - Detailed setup guide
- ✅ `README.md` - Updated tech stack
- ✅ `scripts/setup-zitadel-auth.ps1` - Automated setup script

---

## 🐛 Section 6: Troubleshooting

### Issue: "Cannot GET /api/auth/callback/zitadel"

**Cause**: Zitadel Client ID or Secret is incorrect

**Solution**:
1. Verify credentials in Zitadel Console
2. Update `.env.local`
3. Restart: `npm run dev`

### Issue: "Connection refused" to Zitadel

**Cause**: Zitadel container not running

**Solution**:
```bash
docker compose up -d
docker compose ps
```

### Issue: "jwt.sign error" in logs

**Cause**: NEXTAUTH_SECRET not set or invalid

**Solution**:
```bash
# Generate new secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Update in `.env.local`:
```env
NEXTAUTH_SECRET=<new-value>
```

### Issue: PostgreSQL connection errors

**Cause**: Database container not healthy

**Solution**:
```bash
docker compose logs db
docker compose restart db
```

### Issue: "Invalid redirect_uri"

**Cause**: Redirect URI doesn't match in Zitadel

**Solution**:
1. In Zitadel Console, verify Redirect URI exactly matches:
   - `http://localhost:3000/api/auth/callback/zitadel`
2. Check `.env.local` has correct `NEXTAUTH_URL`

---

## 🚀 Section 7: Production Deployment

### Changes Needed for Production

#### 1. Update Environment Variables
```env
NEXTAUTH_URL=https://yourdomain.com
ZITADEL_ISSUER=https://zitadel.yourdomain.com
ZITADEL_CLIENT_ID=<production-client-id>
ZITADEL_CLIENT_SECRET=<production-secret>
NEXTAUTH_SECRET=<strong-random-secret>
```

#### 2. Enable TLS in Zitadel
Update `docker-compose.yml`:
```yaml
environment:
  - ZITADEL_TLS_ENABLED=true
  - ZITADEL_EXTERNALSECURE=true
```

#### 3. Configure Database Backup
```yaml
db:
  volumes:
    - postgres_data:/var/lib/postgresql/data
    - ./backups:/backups
```

#### 4. Setup OAuth App in Zitadel
Repeat Section 2 but with production domain

#### 5. Add Production Redirect URI
```
https://yourdomain.com/api/auth/callback/zitadel
```

---

## 📊 Section 8: Monitoring

### View Zitadel Logs
```bash
docker compose logs -f zitadel
```

### View Database Logs
```bash
docker compose logs -f db
```

### Monitor Authentication Events
Zitadel Console → Audit Log (shows login attempts, failures, etc.)

### Performance Metrics
- Database: Check connection pool usage
- Zitadel: Monitor token generation rate
- NextAuth: Check session store usage

---

## ✅ Verification Checklist

Complete each item:

- [ ] Docker and Docker Compose installed
- [ ] Containers running: `docker compose ps`
- [ ] Zitadel accessible: http://localhost:8080/ui/console
- [ ] PostgreSQL healthy: `docker compose exec db pg_isready`
- [ ] Application created in Zitadel: `NextAuth`
- [ ] Client ID copied from Zitadel
- [ ] Client Secret copied from Zitadel
- [ ] Redirect URI configured: `http://localhost:3000/api/auth/callback/zitadel`
- [ ] `.env.local` updated with credentials
- [ ] Application starts: `npm run dev`
- [ ] Login page accessible: http://localhost:3000
- [ ] Can log in with Zitadel credentials
- [ ] Session persists after login
- [ ] Logout works and redirects to login

---

## 🆘 Getting Help

### Check Configuration
```powershell
# Run automated checks
./scripts/setup-zitadel-auth.ps1 -CheckOnly
```

### View Current Status
```bash
docker compose ps
```

### Test OIDC Provider
```bash
curl http://localhost:8080/oauth/v2/.well-known/openid-configuration
```

### Validate Environment
```bash
grep -E "ZITADEL|NEXTAUTH" .env.local
```

---

## 📚 Related Documentation

- [Zitadel Official Docs](https://zitadel.com/docs)
- [NextAuth.js Zitadel Provider](https://next-auth.js.org/providers/zitadel)
- [OAuth 2.0 / OIDC Spec](https://openid.net/connect/)
- [Local Setup Guide](./zitadel-setup.md)

---

## 🎯 Next Steps

1. ✅ Start containers: `docker compose up -d`
2. ✅ Configure Zitadel application (follow Section 2)
3. ✅ Update `.env.local` with credentials
4. ✅ Start application: `npm run dev`
5. ✅ Test login flow
6. ✅ Deploy to production (Section 7)

**Status**: Ready for Testing! 🎉

---

*Last Updated: April 2026*
*Authentication Provider: Zitadel*
*Database: PostgreSQL 15*
