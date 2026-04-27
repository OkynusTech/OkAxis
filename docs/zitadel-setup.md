# Zitadel Local Setup Guide

This guide walks you through setting up **Zitadel** locally using Docker Compose for a fully local authentication system integrated with OkNexus.

---

## 📋 Prerequisites

- **Docker** installed and running
- **Docker Compose** (usually included with Docker Desktop)
- **Next.js development server** stopped (if running)

---

## 🚀 Quick Start

### Step 1: Start Zitadel with Docker Compose

From the project root directory:

```bash
docker-compose up -d
```

This will:
- ✅ Start PostgreSQL database
- ✅ Start Zitadel instance
- ✅ Initialize the database with default admin user

### Step 2: Verify Zitadel is Running

Check that both services are healthy:

```bash
docker-compose ps
```

Expected output:
```
NAME          STATUS
postgres      Up (healthy)
zitadel       Up (healthy)
```

Or visit the health endpoint:
```bash
curl http://localhost:8080/oauth/v2/.well-known/openid-configuration
```

---

## 🔐 Access Zitadel Console

1. Open your browser: **http://localhost:8080/ui/console**
2. Default credentials:
   - **Username**: `admin`
   - **Password**: `Admin@123!Change`

3. **⚠️ IMPORTANT**: Change the default password immediately after first login

---

## 🎯 Create NextAuth Application in Zitadel

This is the critical manual step for integrating with OkNexus.

### Step 1: Create an Organization (if needed)

1. In Zitadel Console, navigate to **Organizations**
2. You should see the default organization: **OkNexus**
3. Click on it to proceed

### Step 2: Create an Application

1. In the organization, go to **Applications** (left sidebar)
2. Click **Create New Application**
3. Fill in the details:
   - **Name**: `NextAuth`
   - **Type**: Select **Web**
4. Click **Create**

### Step 3: Configure OAuth Settings

1. After creation, click on the **NextAuth** application
2. Go to **URLs** tab
3. Set the following **Redirect URIs**:
   ```
   http://localhost:3000/api/auth/callback/zitadel
   ```

### Step 4: Get Client Credentials

1. Still in the application details, go to **Client Secrets** tab
2. You'll see:
   - **Client ID** (the application ID)
   - Click **Generate** to create a new **Client Secret**
3. Copy both values

### Step 5: Update Environment Variables

In your `.env.local` file, replace the placeholders:

```env
# Replace these with values from Zitadel
ZITADEL_ISSUER=http://localhost:8080
ZITADEL_CLIENT_ID=<your-client-id>
ZITADEL_CLIENT_SECRET=<your-client-secret>
```

Example (do not use these values - get your own from Zitadel):
```env
ZITADEL_ISSUER=http://localhost:8080
ZITADEL_CLIENT_ID=288493629275119617@nextauth
ZITADEL_CLIENT_SECRET=AbCdEfGhIjKlMnOpQrStUvWxYz0123456789...
```

---

## ▶️ Start OkNexus with Zitadel

Once Zitadel is running and configured:

```bash
# In the project root
npm run dev
```

---

## ✅ Test the Authentication Flow

1. **Open the app**: http://localhost:3000
2. **Click "Sign In with Zitadel"**
3. **You'll be redirected** to Zitadel login
4. **Enter credentials**:
   - Username: An admin user created in Zitadel
   - Password: That user's password
5. **Accept consent** (if prompted)
6. **You'll be redirected** back to OkNexus dashboard
7. ✅ **Success!** You're now authenticated

---

## 🚪 Test Sign Out

1. Click your **profile avatar** (top right)
2. Click **Log out**
3. You should be redirected to `/login`
4. ✅ Success!

---

## 📊 Zitadel Management Tasks

### Add Additional Users

1. In Zitadel Console, go to **Users** → **People**
2. Click **Create New User**
3. Fill in user details
4. Set password
5. Confirm creation

### Create Multiple Organizations (Multi-tenant)

1. Go to **Organizations**
2. Click **Create New Organization**
3. Set up separate apps for each organization
4. Users will be scoped to their organization

### View Audit Logs

1. Go to **Audit Log** (left sidebar)
2. See all authentication events, user creations, sign-ins, etc.

---

## 🐳 Docker Management

### Stop Zitadel and Database

```bash
docker-compose down
```

### View Logs

```bash
# All services
docker-compose logs -f

# Just Zitadel
docker-compose logs -f zitadel

# Just PostgreSQL
docker-compose logs -f db
```

### Reset Everything (Clean Slate)

```bash
# Stop all services
docker-compose down

# Remove volumes (DELETES ALL DATA)
docker-compose down -v

# Start fresh
docker-compose up -d
```

---

## 🔍 Troubleshooting

### "Connection refused" when accessing localhost:8080

**Problem**: Zitadel service didn't start properly

**Solution**:
```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs zitadel

# Restart
docker-compose restart zitadel
```

### "Invalid client" error during login

**Problem**: Client ID or Client Secret is incorrect

**Solution**:
1. Go back to Zitadel Console
2. Verify the Client ID and Secret values
3. Update `.env.local` with the correct values
4. Restart Next.js dev server

### "Redirect URI mismatch" error

**Problem**: The OAuth redirect URL doesn't match

**Solution**:
1. In Zitadel Console, go to your **NextAuth** application
2. Check the **Redirect URIs** configured
3. Ensure it's exactly: `http://localhost:3000/api/auth/callback/zitadel`
4. Restart Next.js dev server

### PostgreSQL won't start (port 5432 in use)

**Problem**: Another PostgreSQL is running on port 5432

**Solution**:
```bash
# Option 1: Stop other PostgreSQL instances
sudo systemctl stop postgresql

# Option 2: Use a different port in docker-compose.yml
# Change "5432:5432" to "5433:5432"
```

### "Database initialization failed" for Zitadel

**Problem**: PostgreSQL didn't fully start before Zitadel tried to connect

**Solution**:
```bash
# Restart services
docker-compose restart

# Or full reset
docker-compose down -v
docker-compose up -d
```

---

## 🔗 Integration Points

### In your code:

1. **Authentication**: Uses NextAuth.js with Zitadel provider
2. **Session**: JWT tokens stored in NextAuth session
3. **Protected Routes**: Middleware checks authentication status
4. **User Info**: Available via `useSession()` hook or `getSession()` server-side

### Example: Getting User Info

```typescript
// Client Component
import { useSession } from 'next-auth/react';

export function UserProfile() {
  const { data: session } = useSession();
  
  return (
    <div>
      <p>Name: {session?.user?.name}</p>
      <p>Email: {session?.user?.email}</p>
    </div>
  );
}
```

### Example: Server-Side Session

```typescript
// Server Component or API Route
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  return Response.json({ user: session.user });
}
```

---

## 📚 Additional Resources

- **Zitadel Docs**: https://zitadel.com/docs
- **NextAuth.js Docs**: https://next-auth.js.org
- **Docker Compose Docs**: https://docs.docker.com/compose/

---

## ✨ What's Next?

Once local Zitadel is working:

1. ✅ Create users for your team
2. ✅ Test authentication flows
3. ✅ Configure Supabase for application data (already connected)
4. ✅ Deploy to production (Zitadel Cloud or self-hosted)

---

**Questions?** Refer to the official documentation or create an issue in the repository.
