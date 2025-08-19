# Railway Service Configuration Guide

## 🚨 CRITICAL FIX NEEDED: generous-wisdom Service Configuration

### Problem Summary
The `generous-wisdom` service is failing with "Admin static directory not found" because:
1. Railway service working directory is set to root "/" 
2. Install/Build/Start phases all execute in root, not admin/ directory
3. Build creates no admin/dist/ directory for start-admin.js to serve

### 🎯 REQUIRED ACTION: Set Working Directory

**URGENT: In Railway Console**
1. Navigate to Railway project: `yeslocker`
2. Select service: `generous-wisdom` 
3. Go to **Settings** tab
4. Find **Root Directory** or **Working Directory** setting
5. **Change from**: `/` (root)
6. **Change to**: `admin/`
7. **Save configuration**
8. **Redeploy service**

### Expected Result After Fix

With Root/Working Directory set to `admin/`:

```
Install Phase: npm ci (in admin/)
├── Reads admin/package.json
├── Installs all dependencies including devDependencies
└── Creates admin/node_modules/

Build Phase: NODE_ENV=production npm run build:h5 (in admin/)
├── Uses admin/package.json scripts
├── Accesses devDependencies (@dcloudio/vite-plugin-uni, vite, etc.)
└── Creates admin/dist/build/h5/ or admin/dist/h5/

Start Phase: npm start (in admin/)
├── Runs admin/package.json start script
├── Executes node start-admin.js from admin/
├── Finds admin/dist/ directory successfully
└── Serves admin panel on configured port
```

### Service Independence Achieved

After both fixes (nixpacks.toml + working directory):

**yeslocker-web** (Root: `/`)
- Install: `npm ci` in root → gets root dependencies
- Build: `npm run build:h5` in root → creates root/dist/
- Start: `npm start` in root → serves root/dist/

**generous-wisdom** (Root: `admin/`)  
- Install: `npm ci` in admin/ → gets admin dependencies
- Build: `npm run build:h5` in admin/ → creates admin/dist/
- Start: `npm start` in admin/ → serves admin/dist/

### Files Already Fixed
✅ `nixpacks.toml` - Removed `--omit=dev` to preserve build dependencies
✅ `admin/start-admin.js` - Has intelligent path detection for dist directory
✅ `admin/package.json` - Contains correct build script and dependencies

### Remaining Tasks
🔴 **CRITICAL**: Set generous-wisdom working directory to `admin/` in Railway console
🟡 **VERIFY**: Both services deploy and start successfully
🟡 **TEST**: User app and admin panel both accessible

---
**Generated**: $(date)
**Status**: Dependency fix committed, working directory fix pending Railway console access