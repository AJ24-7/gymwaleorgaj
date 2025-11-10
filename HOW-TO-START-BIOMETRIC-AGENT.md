# 🚀 How to Start the Biometric Agent

## Quick Start Guide for Gym Admins

### ⚡ Quick Method (Recommended)

1. Open **File Explorer**
2. Navigate to: `C:\Users\Aayus\Downloads\gymwebsite\Fit-verseofficial\biometric-agent`
3. Double-click on **`quick-start.bat`**
4. A command window will open showing the agent status
5. Keep this window open while using the system

---

## 📋 Step-by-Step Instructions

### Step 1: Open Command Prompt

- Press `Win + R` on your keyboard
- Type `cmd` and press Enter

### Step 2: Navigate to Project Folder

Copy and paste this command:
```cmd
cd C:\Users\Aayus\Downloads\gymwebsite\Fit-verseofficial\biometric-agent
```

### Step 3: Start the Agent

**Option A: Quick Start (Easiest)**
```cmd
quick-start.bat
```

**Option B: Manual Start**
```cmd
node enhanced-agent.js
```

### Step 4: Verify Agent is Running

You should see output similar to:
```
🚀 Biometric Agent v2.0
✅ Server running on http://localhost:5001
🔍 Scanning for devices...
🖐️ Found fingerprint device: Mantra MFS100
📷 Found camera device: HD Webcam
```

✅ **Agent is now running!** Keep the command window open.

---

## 🔌 Hardware Setup

### Before Starting the Agent:

1. **Connect Fingerprint Scanner**
   - Plug USB fingerprint scanner into computer
   - Wait for Windows to recognize device
   - Install drivers if prompted

2. **Connect Camera (Optional)**
   - Connect USB webcam OR use built-in laptop camera
   - Ensure camera is not being used by other applications

### Supported Devices:

#### Fingerprint Scanners (India)
- ✅ Mantra MFS100 / MFS110
- ✅ Bio-Max FPR1300
- ✅ Startek FM220U
- ✅ Evolute EFM01
- ✅ Precision PB510
- ✅ SecuGen Hamster Pro

#### Fingerprint Scanners (International)
- ✅ DigitalPersona U.are.U
- ✅ Futronic FS88/FS90
- ✅ ZKTeco SLK20R
- ✅ Suprema BioMini Plus

#### Cameras
- ✅ Any USB webcam (720p or higher)
- ✅ Built-in laptop camera
- ✅ HD cameras (1080p recommended)

---

## ✅ Checking Agent Status

### Method 1: Browser Check
Open your web browser and visit:
```
http://localhost:5001/health
```

You should see:
```json
{
  "status": "healthy",
  "uptime": 12345,
  "devices": {
    "fingerprint": 1,
    "camera": 1,
    "total": 2
  }
}
```

### Method 2: In Gym Admin Dashboard
- Go to **Attendance** tab
- Look for status notification in top-right corner:
  - 🟢 **"Agent Online"** = Working correctly
  - 🔴 **"Agent Offline"** = Need to start agent

---

## 🚨 Troubleshooting

### Problem: "Port 5001 already in use"

**Solution:**
```cmd
# Find process using port 5001
netstat -ano | findstr :5001

# Kill the process (replace PID with actual number)
taskkill /PID [PID_NUMBER] /F

# Restart agent
quick-start.bat
```

### Problem: "Node.js not found"

**Solution:**
1. Download Node.js from https://nodejs.org
2. Install Node.js (LTS version recommended)
3. Restart command prompt
4. Try starting agent again

### Problem: "No devices detected"

**Solutions:**
1. Check if device is properly connected via USB
2. Open **Device Manager** (Win + X → Device Manager)
3. Look for fingerprint/biometric devices
4. If device shows yellow triangle, update drivers
5. Try different USB port
6. Restart the biometric agent

### Problem: Agent crashes or stops

**Solutions:**
1. Check `biometric-agent/agent.log` for errors
2. Ensure devices are not being used by other software
3. Restart the agent
4. Check if USB device is still connected

### Problem: "Module not found" error

**Solution:**
```cmd
cd C:\Users\Aayus\Downloads\gymwebsite\Fit-verseofficial\biometric-agent
npm install
node enhanced-agent.js
```

---

## 💡 Best Practices

### For Daily Use:

1. **Start agent before gym opens**
   - Run `quick-start.bat` when you start your computer
   - Keep command window minimized (don't close it)

2. **Check status regularly**
   - Green notification = Everything working
   - Red notification = Need to restart agent

3. **Keep devices connected**
   - Don't unplug USB devices while agent is running
   - If unplugged, restart agent to detect again

### For Production Use:

**Install as Windows Service** (runs automatically on startup):

```cmd
cd biometric-agent
npm install
node service-manager.js install
node service-manager.js start
```

To stop service:
```cmd
node service-manager.js stop
```

To uninstall service:
```cmd
node service-manager.js uninstall
```

---

## 📱 Quick Reference Card

### Starting Agent:
```cmd
cd C:\Users\Aayus\Downloads\gymwebsite\Fit-verseofficial\biometric-agent
quick-start.bat
```

### Checking Status:
```
Browser: http://localhost:5001/health
Dashboard: Look for notification in top-right
```

### Stopping Agent:
```
Press Ctrl + C in command window
```

### Restarting Agent:
```
1. Press Ctrl + C to stop
2. Run quick-start.bat again
```

---

## 🎯 Common Commands

| Task | Command |
|------|---------|
| Start agent | `quick-start.bat` |
| Stop agent | `Ctrl + C` |
| Check port usage | `netstat -ano \| findstr :5001` |
| Kill process | `taskkill /PID [PID] /F` |
| Install packages | `npm install` |
| View logs | Open `agent.log` file |
| Manual start | `node enhanced-agent.js` |

---

## 📞 Need Help?

### Check These First:
1. Agent log file: `biometric-agent/agent.log`
2. Browser console: Press F12, check Console tab
3. Device Manager: Win + X → Device Manager

### Common Error Messages:

| Error | Meaning | Solution |
|-------|---------|----------|
| "Cannot find module" | Missing dependencies | Run `npm install` |
| "Port already in use" | Port 5001 occupied | Kill existing process |
| "ENOENT" | File not found | Check if in correct directory |
| "Device not found" | Hardware issue | Check USB connection |

---

## ✅ Checklist Before Starting

- [ ] USB fingerprint scanner connected
- [ ] Camera connected (if using face recognition)
- [ ] Drivers installed for all devices
- [ ] Node.js installed on computer
- [ ] No other software using the devices
- [ ] Port 5001 not in use
- [ ] In correct directory (`biometric-agent` folder)

---

## 🎓 Training Video (Recommended)

**For New Admins:**
1. Watch device connection demonstration
2. Practice starting/stopping agent
3. Test with sample fingerprint enrollment
4. Verify attendance marking works

**Duration:** 10 minutes
**Location:** Contact IT administrator

---

## 📄 Related Documents

- **Full Guide:** `BIOMETRIC-INTEGRATION-GUIDE.md`
- **Error Fixes:** `BIOMETRIC-ERROR-FIXES.md`
- **Architecture:** `BIOMETRIC-ARCHITECTURE.md`
- **Production Report:** `BIOMETRIC-PRODUCTION-READY-REPORT.md`

---

## 🔒 Security Notes

1. **Don't close agent while gym is open**
   - Biometric features won't work
   - Members can't use fingerprint attendance

2. **Keep agent updated**
   - Check for updates monthly
   - Follow update instructions from IT team

3. **Monitor device connections**
   - Ensure devices are secure
   - Don't allow unauthorized access to devices

4. **Log files contain sensitive info**
   - Don't share agent.log publicly
   - Protect biometric templates

---

**Last Updated:** November 5, 2025  
**Version:** 1.0  
**For:** Gym Administrators

**Quick Support:** Check status notification in top-right corner of Attendance tab!
