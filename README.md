# PEMDA DIY Dashboard - React + Node.js + Keycloak

## LINK DOKUMENTASI
https://docs.google.com/document/d/1TOWyc7GWLFrSWe_iZEVQYOG4u2PABEry/edit?usp=sharing&ouid=110544658660321133336&rtpof=true&sd=true

## 🚀 STARTER TEMPLATE - SETUP LENGKAP

**Tech Stack:**
- ✅ React 18 (Frontend)
- ✅ Node.js + Express (Backend)
- ✅ Keycloak Authentication
- ✅ JSON File Storage (No Database needed!)
- ✅ Mac Monterey 12.7.6 Compatible

---

## 📋 PREREQUISITES - INSTALL DULU

### **1. Install Homebrew**
```bash
# Check apakah sudah ada
brew --version

# Kalo belum, install:
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Setelah install, tambahkan ke PATH (ikuti instruksi di terminal)
```

### **2. Install Node.js & npm**
```bash
# Install Node.js (akan include npm)
brew install node

# Verify - harus keluar versi
node --version    # Expected: v18.x atau v20.x
npm --version     # Expected: v9.x atau v10.x
```

### **3. Install Git (kalo belum ada)**
```bash
brew install git
git --version
```

---

## 🛠 SETUP PROJECT

### **STEP 1: Extract & Navigate**
```bash
# Extract project
tar -xzf pemda-dashboard-react-starter.tar.gz
cd pemda-dashboard-react

# Check structure
ls -la
# Harus ada folder: frontend/ dan backend/
```

### **STEP 2: Setup Backend**
```bash
cd backend

# Install dependencies (5-10 menit)
npm install

# Copy environment file
cp .env.example .env

# Edit .env file
nano .env
# atau
code .env  # jika pake VSCode
```

**Edit `.env`** - Ganti values berikut:
```bash
KEYCLOAK_CLIENT_SECRET=YOUR_CLIENT_SECRET_FROM_KEYCLOAK
SESSION_SECRET=ganti-dengan-random-string-panjang
JWT_SECRET=ganti-dengan-random-string-panjang-lain
```

**Create data directories:**
```bash
mkdir -p data/users data/documents data/notes data/sessions data/logs
mkdir -p uploads
```

### **STEP 3: Setup Frontend**
```bash
# Kembali ke root
cd ..
cd frontend

# Install dependencies (10-15 menit)
npm install

# Create .env file
echo "REACT_APP_API_URL=http://localhost:5000" > .env
echo "REACT_APP_KEYCLOAK_URL=http://10.7.183.140:8080" >> .env
echo "REACT_APP_KEYCLOAK_REALM=Jogja-SSO" >> .env
echo "REACT_APP_KEYCLOAK_CLIENT_ID=pemda-dashboard" >> .env
```

---

## 🔑 KEYCLOAK CONFIGURATION

### **STEP 1: Login ke Keycloak Admin**
1. Buka browser: `http://10.7.183.140:8080/admin`
2. Login dengan admin credentials
3. Pilih Realm: **Jogja-SSO**

### **STEP 2: Create Client**
1. **Clients** → **Create Client**
2. **General Settings:**
   - Client ID: `pemda-dashboard`
   - Name: `PEMDA Dashboard React`
   - Description: `Dashboard custom dengan React`
   - **NEXT**

3. **Capability Config:**
   - Client authentication: **ON** ✅
   - Authorization: **OFF**
   - Authentication flow:
     - ✅ Standard flow
     - ✅ Direct access grants
   - **NEXT**

4. **Login Settings:**
   - Root URL: `http://localhost:3000`
   - Home URL: `http://localhost:3000`
   - Valid redirect URIs:
     ```
     http://localhost:3000/*
     http://localhost:3000/callback
     ```
   - Valid post logout redirect URIs:
     ```
     http://localhost:3000
     ```
   - Web origins:
     ```
     http://localhost:3000
     ```
   - **SAVE**

### **STEP 3: Get Client Secret**
1. Tab **Credentials**
2. Copy **Client Secret**
3. Paste ke `backend/.env`:
   ```bash
   KEYCLOAK_CLIENT_SECRET=<paste-disini>
   ```

### **STEP 4: Configure Roles (Optional)**
1. Tab **Roles**
2. Create role: `dashboard-user`
3. Assign role ke user di **Users** → pilih user → **Role Mappings**

---

## ▶️ RUNNING THE APP

### **Terminal 1 - Backend:**
```bash
cd backend
npm run dev

# Expected output:
# ╔════════════════════════════════════════╗
# ║   PEMDA DIY Dashboard - Backend API   ║
# ║   Server running on port 5000         ║
# ╚════════════════════════════════════════╝
```

### **Terminal 2 - Frontend:**
```bash
cd frontend
npm start

# Browser akan auto-open di http://localhost:3000
```

---

## 🧪 TESTING

1. **Buka browser:** `http://localhost:3000`
2. Klik **Login dengan Keycloak**
3. Redirect ke Keycloak login page
4. Login dengan username/password
5. Redirect kembali ke dashboard
6. ✅ **Dashboard tampil!**

---

## 📁 PROJECT STRUCTURE

```
pemda-dashboard-react/
├── backend/                    # Node.js API
│   ├── server.js              # Main server file
│   ├── package.json           # Dependencies
│   ├── .env                   # Environment variables
│   ├── config/
│   │   └── keycloak.js       # Keycloak config
│   ├── routes/
│   │   ├── auth.js           # Authentication routes
│   │   ├── users.js          # User management
│   │   ├── documents.js      # Document upload/download
│   │   ├── notes.js          # Notes CRUD
│   │   ├── sessions.js       # Session management
│   │   └── logs.js           # Login logs
│   ├── middleware/
│   │   └── auth.js           # Auth middleware
│   ├── data/                  # JSON file storage
│   │   ├── users/
│   │   ├── documents/
│   │   ├── notes/
│   │   ├── sessions/
│   │   └── logs/
│   └── uploads/               # Uploaded files
│
└── frontend/                   # React App
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── index.js           # Entry point
    │   ├── App.js             # Main app component
    │   ├── keycloak.js        # Keycloak instance
    │   ├── components/
    │   │   ├── Sidebar.jsx   # Sidebar navigation
    │   │   ├── Header.jsx    # Page header
    │   │   ├── Loading.jsx   # Loading spinner
    │   │   └── ...
    │   ├── pages/
    │   │   ├── Dashboard.jsx # Main dashboard
    │   │   ├── Profile.jsx   # User profile
    │   │   ├── Security.jsx  # Security settings
    │   │   ├── Documents.jsx # Document management
    │   │   ├── Notes.jsx     # Notes manager
    │   │   ├── Sessions.jsx  # Active sessions
    │   │   ├── Logs.jsx      # Login history
    │   │   └── Login.jsx     # Login page
    │   ├── services/
    │   │   └── api.js        # API calls
    │   └── styles/
    │       ├── index.css     # Global styles
    │       └── App.css       # Component styles
    └── package.json
```

---

## 🔧 TROUBLESHOOTING

### **Problem: `npm install` error**
```bash
# Clear cache
npm cache clean --force

# Delete node_modules & package-lock
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### **Problem: Port 3000 already in use**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or change port
PORT=3001 npm start
```

### **Problem: Keycloak CORS error**
1. Keycloak Admin → **Clients** → `pemda-dashboard`
2. **Settings** → Web origins: `http://localhost:3000`
3. **SAVE**

### **Problem: "Failed to fetch" API error**
```bash
# Check backend is running
curl http://localhost:5000/health

# Check .env frontend
cat frontend/.env
# REACT_APP_API_URL harus http://localhost:5000
```

---

## 📝 DEVELOPMENT WORKFLOW

### **1. Start Development Servers**
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm start
```

### **2. Edit Files**
- Frontend: Edit files di `frontend/src/`
- Backend: Edit files di `backend/`
- Auto-reload enabled!

### **3. Add New Features**
```bash
# Create new component
cd frontend/src/components
touch MyComponent.jsx

# Create new route
cd backend/routes
touch myroute.js
```

---

## 🚀 NEXT STEPS

### **1. Complete Missing Routes**
Edit these files in `backend/routes/`:
- ✅ `auth.js` - DONE
- ⚠️ `users.js` - TODO (template provided)
- ⚠️ `documents.js` - TODO (template provided)
- ⚠️ `notes.js` - TODO (template provided)
- ⚠️ `sessions.js` - TODO (template provided)
- ⚠️ `logs.js` - TODO (template provided)

### **2. Complete React Pages**
Edit these files in `frontend/src/pages/`:
- ✅ `Login.jsx` - DONE
- ✅ `Dashboard.jsx` - DONE (basic)
- ⚠️ `Profile.jsx` - TODO
- ⚠️ `Documents.jsx` - TODO
- ⚠️ `Notes.jsx` - TODO

### **3. Styling**
- Edit `frontend/src/styles/App.css`
- Add component-specific styles

### **4. Deploy**
```bash
# Build frontend
cd frontend
npm run build

# Build output di frontend/build/
# Deploy ke hosting atau integrate dengan backend
```

---

## 📚 USEFUL COMMANDS

```bash
# Backend
cd backend
npm run dev          # Development mode (auto-reload)
npm start            # Production mode

# Frontend
cd frontend
npm start            # Development mode
npm run build        # Production build
npm test             # Run tests

# Check logs
tail -f backend/logs/app.log  # Backend logs

# Database operations (JSON files)
cat backend/data/users/user_*.json
ls -la backend/data/documents/
```

---

## 🆘 HELP & SUPPORT

**Common Issues:**
1. ❌ Keycloak connection refused
   - Check Docker: `docker ps | grep keycloak`
   - Restart: `docker restart keycloak_arvin`

2. ❌ CORS errors
   - Check Keycloak client Web origins
   - Check backend CORS config in `server.js`

3. ❌ Token expired
   - Refresh page
   - Login again
   - Check token expiry settings in Keycloak

**Learning Resources:**
- React Docs: https://react.dev
- Node.js Docs: https://nodejs.org/docs
- Keycloak Docs: https://www.keycloak.org/docs
- Express Docs: https://expressjs.com

---

## ✅ CHECKLIST

Before running:
- [ ] Homebrew installed
- [ ] Node.js installed (v18+)
- [ ] npm installed (v9+)
- [ ] Backend `npm install` done
- [ ] Frontend `npm install` done
- [ ] Keycloak client created
- [ ] Client secret copied to `.env`
- [ ] Data directories created
- [ ] Both terminals ready

Ready to run:
- [ ] Terminal 1: `cd backend && npm run dev`
- [ ] Terminal 2: `cd frontend && npm start`
- [ ] Browser opens `http://localhost:3000`
- [ ] Login works
- [ ] Dashboard displays

---

**🎉 SELAMAT! Dashboard ready to develop!**
