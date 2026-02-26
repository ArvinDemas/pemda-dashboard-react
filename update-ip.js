const os = require('os');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m', bright: '\x1b[1m',
  green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m'
};

function getLocalIP() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    if (/loopback|docker|vmware|vbox|wsl|utun|awdl|llw|anpi|bridge|gif|stf/i.test(name)) continue;
    for (const a of ifaces[name]) {
      if (a.family === 'IPv4' && a.internal === false) {
        if (a.address.startsWith('192.168.') || a.address.startsWith('10.') || a.address.startsWith('172.')) {
          return a.address;
        }
      }
    }
  }
  return null;
}

function updateEnvFile(filePath, oldIp, newIp) {
  if (!fs.existsSync(filePath)) return false;
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes(oldIp)) return false;
  const updated = content.split(oldIp).join(newIp);
  fs.writeFileSync(filePath, updated);
  console.log('✅ Updated: ' + filePath);
  return true;
}

function getCurrentIP() {
  const envPath = path.join(__dirname, 'backend', '.env');
  if (!fs.existsSync(envPath)) return null;
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/FRONTEND_URL=http:\/\/([^:]+):/);
  if (match && match[1] !== 'localhost') return match[1];
  return null;
}

console.log('\n╔════════════════════════════════════════╗');
console.log('║   IP Address Update Utility           ║');
console.log('╚════════════════════════════════════════╝\n');

const newIp = getLocalIP();
if (!newIp) { console.log('❌ Could not detect IP'); process.exit(1); }

console.log('🔍 Detecting LAN IP address...');
console.log('✅ Found IP: ' + newIp);

const oldIp = getCurrentIP();
if (!oldIp || oldIp === newIp) {
  console.log('ℹ️  IP unchanged: ' + newIp);
} else {
  console.log('📋 Current IP in config: ' + oldIp);
  console.log('🔄 Updating from ' + oldIp + ' to ' + newIp + '\n');
  console.log('📝 Updating configuration files...\n');
  updateEnvFile(path.join(__dirname, 'backend', '.env'), oldIp, newIp);
  updateEnvFile(path.join(__dirname, 'frontend', '.env'), oldIp, newIp);
}

console.log('\n' + colors.bright + colors.green + '╔════════════════════════════════════════════════════════════╗' + colors.reset);
console.log(colors.bright + colors.green + '║                    ✅ IP UPDATED!                         ║' + colors.reset);
console.log(colors.bright + colors.green + '╠════════════════════════════════════════════════════════════╣' + colors.reset);
console.log(colors.bright + colors.green + '║  New IP: ' + newIp + ' '.repeat(51 - newIp.length) + '║' + colors.reset);
console.log(colors.bright + colors.green + '╚════════════════════════════════════════════════════════════╝' + colors.reset + '\n');
console.log('📱 Access from mobile:\n   http://' + newIp + ':3000\n');
