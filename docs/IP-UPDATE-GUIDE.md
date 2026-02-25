# IP Update Utility - Quick Guide

## 📱 Mobile Access Setup

Since your DHCP assigns a new IP daily, use this utility to automatically update all configuration files.

## 🚀 Usage

### Every Morning Before Starting Servers:

```bash
npm run set-ip
```

That's it! The script will:
1. ✅ Detect your current LAN IP address
2. ✅ Update `backend/.env` with the new IP
3. ✅ Update `frontend/.env` with the new IP (if exists)
4. ✅ Show you exactly what to update in Keycloak Admin Console

## 📋 What Gets Updated

The script automatically updates these variables:
- `KEYCLOAK_URL`
- `FRONTEND_URL`
- `REACT_APP_API_URL`

## ⚠️ Manual Step Required

After running the script, you MUST update Keycloak:

1. Open Keycloak Admin Console: `http://10.7.183.46:8080/admin`
2. Go to: **Jogja-SSO realm** → **Clients** → **pemda-dashboard**
3. Update these fields with your new IP:
   - **Root URL**: `http://[NEW_IP]:3000`
   - **Valid Redirect URIs**: `http://[NEW_IP]:3000/*`
   - **Valid Post Logout Redirect URIs**: `http://[NEW_IP]:3000/*`
   - **Web Origins**: `http://[NEW_IP]:3000`
4. Click **Save**

## 📱 Access from Mobile

Once updated:
```
http://[YOUR_NEW_IP]:3000
```

## 🔧 Technical Details

The script:
- Uses Node.js `os` module to detect network interfaces
- Prioritizes: `en0` (macOS) > `Wi-Fi` > `Ethernet`
- Looks for IPs starting with `10.`, `192.168.`, or `172.`
- Uses regex to find and replace IPs in .env files
- Colorized console output for easy reading

## 💡 Tips

- Run `npm run set-ip` every morning before starting work
- Keep the Keycloak admin console bookmarked for quick updates
- The script is safe to run multiple times - it checks if IP already matches

## 🛠️ Troubleshooting

**Script can't find IP:**
- Make sure you're connected to WiFi/Ethernet
- Check that your network adapter is named `en0`, `Wi-Fi`, or `Ethernet`

**Changes not taking effect:**
- Restart both backend and frontend servers after updating IP
- Clear browser cache if you see old redirect errors
- Double-check Keycloak settings were saved

## 📂 File Locations

- Script: `update-ip.js`
- Backend config: `backend/.env`
- Frontend config: `frontend/.env` (create if needed)

---

**Made with ❤️ for PEMDA DIY Dashboard**
