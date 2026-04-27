# 🚀 Zitadel + PostgreSQL Authentication - Quick Start Reference

## ⚡ 15-Minute Setup

### 1️⃣ Start Containers (2 min)
```powershell
cd "c:\Users\vjk51\Desktop\ai platform\OkNexus"
docker compose up -d
docker compose ps
```

### 2️⃣ Create Zitadel Application (8 min)
```
URL: http://localhost:8080/ui/console
Login: admin / Admin@123!Change

Steps:
1. Click "Applications"
2. Click "Create New Application"
3. Name: NextAuth
4. Type: Web
5. Click "Create"
```

### 3️⃣ Get Credentials (3 min)
```
In Zitadel Console:
1. Copy the "Client ID" value
2. Generate or copy "Client Secret" from Keys section
3. Add Redirect URI: http://localhost:3000/api/auth/callback/zitadel
4. Save
```

### 4️⃣ Update .env.local (1 min)
```env
ZITADEL_CLIENT_ID=YOUR_VALUE_HERE
ZITADEL_CLIENT_SECRET=YOUR_VALUE_HERE
```

### 5️⃣ Start Application (1 min)
```powershell
npm run dev
```

### 6️⃣ Test (Can log in? ✅)
```
1. Visit http://localhost:3000
2. Click "Sign In with Zitadel"
3. Use admin / Admin@123!Change
```

---

## 📋 Environment Variables Needed

| Variable | Value | Status |
|----------|-------|--------|
| `ZITADEL_ISSUER` | `http://localhost:8080` | ✅ Pre-configured |
| `ZITADEL_CLIENT_ID` | From Zitadel Console | ⚠️ Needs manual setup |
| `ZITADEL_CLIENT_SECRET` | From Zitadel Console | ⚠️ Needs manual setup |
| `NEXTAUTH_URL` | `http://localhost:3000` | ✅ Pre-configured |
| `NEXTAUTH_SECRET` | Auto-generated | ✅ Pre-configured |

---

## 🔗 Important URLs

| URL | Purpose |
|-----|---------|
| http://localhost:8080/ui/console | Zitadel Admin Console |
| http://localhost:8080/oauth/v2/.well-known/openid-configuration | OIDC Configuration |
| http://localhost:3000 | Application (after setup) |
| http://localhost:3000/api/auth/callback/zitadel | NextAuth Callback |
| http://localhost:3000/api/auth/config/status | Auth Config Status |

---

## 🛠️ Useful Commands

```powershell
# Check container status
docker compose ps

# View Zitadel logs
docker compose logs -f zitadel

# View database logs
docker compose logs -f db

# Restart containers
docker compose restart

# Stop containers
docker compose down

# Check auth configuration
.\scripts\auth-helper.ps1 status

# Validate setup
.\scripts\auth-helper.ps1 validate

# Open Zitadel console
.\scripts\auth-helper.ps1 console
```

---

## ✅ Quick Verification

```powershell
# Test 1: Zitadel Reachable?
curl http://localhost:8080/healthz

# Test 2: OIDC Configuration?
curl http://localhost:8080/oauth/v2/.well-known/openid-configuration

# Test 3: Credentials in env?
Select-String "ZITADEL_CLIENT_ID|ZITADEL_CLIENT_SECRET" .env.local

# Test 4: App starts?
npm run dev
```

---

## 🆘 Troubleshooting Quick Fixes

| Issue | Fix |
|-------|-----|
| Containers not running | `docker compose up -d` |
| Port 8080 in use | Kill the process or use different port |
| "Can't connect to Zitadel" | Wait 30 seconds, containers take time to start |
| "Invalid client_id" | Ensure CLIENT_ID in .env.local is not "placeholder" |
| "redirect_uri_mismatch" | Add `http://localhost:3000/api/auth/callback/zitadel` in Zitadel Console |
| "Session error" | Check NEXTAUTH_SECRET in .env.local is set |

---

## 📁 Key Files Created

```
/scripts
  ├── auth-helper.ps1              # Interactive auth helper
  ├── setup-zitadel-auth.ps1       # Automated setup
  └── test-auth-setup.sh           # Comprehensive tests

/docs
  ├── ZITADEL_COMPLETE_SETUP.md    # Full guide (80+ pages)
  ├── AUTH_COMPLETION_CHECKLIST.md # Step-by-step checklist
  ├── zitadel-setup.md             # Local setup guide
  └── QUICK_START.md               # This file

/app/api/auth
  └── config
      └── route.ts                 # Auth status endpoint

/lib
  └── auth.ts                      # NextAuth + Zitadel config
```

---

## 🔐 What's Protected

These routes require authentication:
- `/` (dashboard)
- `/dashboard/*`
- `/engagement/*`
- `/templates/*`
- `/settings/*`
- `/reports/*`
- `/analytics/*`
- `/clients/*`
- `/applications/*`
- `/engineers/*`
- `/artifacts/*`
- `/components/*`
- `/retests/*`
- `/seed/*`

---

## 🎯 Status Checks

### Container Status
```powershell
docker compose ps
# Should show: db (healthy), zitadel (healthy)
```

### Environment Status
```powershell
.\scripts\auth-helper.ps1 status
# Shows what's configured and what's missing
```

### Full Validation
```powershell
.\scripts\auth-helper.ps1 validate
# Comprehensive check of all components
```

### API Status
```
GET http://localhost:3000/api/auth/config/status
# Returns JSON with configuration status
```

---

## 📞 Getting Help

### View Setup Guide
```
Open: docs/ZITADEL_COMPLETE_SETUP.md
```

### Check Completion Checklist
```
Open: docs/AUTH_COMPLETION_CHECKLIST.md
```

### Run Tests
```bash
# If using WSL/Git Bash:
bash scripts/test-auth-setup.sh

# Or in PowerShell:
.\scripts\auth-helper.ps1 validate
```

### View Logs
```powershell
docker compose logs -f zitadel
docker compose logs -f db
npm run dev  # Shows application logs
```

---

## ⏱️ Time Estimates

| Task | Time |
|------|------|
| Start containers | 2 min |
| Create Zitadel app | 5 min |
| Get credentials | 2 min |
| Update .env.local | 1 min |
| Start app | 1 min |
| Test login flow | 3 min |
| **Total** | **14 min** ✅ |

---

## 🎉 Success Indicators

You'll know it's complete when:

✅ Containers running (`docker compose ps` shows healthy)  
✅ .env.local updated with Client ID and Secret  
✅ `npm run dev` starts without errors  
✅ Can visit http://localhost:3000  
✅ Can click "Sign In with Zitadel"  
✅ Redirected to Zitadel login  
✅ Can enter credentials  
✅ Redirected back to app  
✅ Dashboard loads  
✅ Session persists on refresh  
✅ Logout works and goes to login page  

---

## 🚀 Next Steps

1. **Complete the 15-minute setup above**
2. **Test all user flows** (login, logout, session)
3. **Review ZITADEL_COMPLETE_SETUP.md** for advanced topics
4. **Enable MFA** (optional, in Zitadel)
5. **Setup production** (when ready)

---

## 📌 Remember

- **Admin password**: `Admin@123!Change` (change this!)
- **Zitadel console**: http://localhost:8080/ui/console
- **Client ID/Secret**: Get these from Zitadel Console, not generated elsewhere
- **Redirect URI**: Must exactly match what's in Zitadel
- **Containers**: Need to be running for everything to work

---

## 💡 Pro Tips

- **Keep Zitadel logs open**: `docker compose logs -f zitadel` in second terminal
- **Use helper scripts**: They automate many checks
- **Test frequently**: Verify after each change
- **Check URLs carefully**: Typos in client ID are common issues
- **Wait for health**: Give containers 30 seconds to be healthy

---

**Status**: ✅ Ready to Complete  
**Last Updated**: April 2026  
**For**: OkNexus Platform Authentication

---

🎯 **You're ready! Start with Step 1 above.** 🚀
