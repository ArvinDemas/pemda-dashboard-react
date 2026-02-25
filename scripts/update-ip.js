#!/usr/bin/env node
/**
 * IP Address Update Utility
 * Automatically updates LAN IP addresses in frontend and backend .env files
 * Run this script every morning before starting servers: npm run set-ip
 */

const os = require('os');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    red: '\x1b[31m'
};

/**
 * Get current LAN IPv4 address
 */
function getLanIpAddress() {
    const interfaces = os.networkInterfaces();

    // Priority order: en0 (macOS), Wi-Fi, Ethernet, other
    const priorityOrder = ['en0', 'Wi-Fi', 'Ethernet', 'eth0', 'wlan0'];

    // Try priority interfaces first
    for (const interfaceName of priorityOrder) {
        const addresses = interfaces[interfaceName];
        if (addresses) {
            const ipv4 = addresses.find(addr =>
                addr.family === 'IPv4' &&
                !addr.internal &&
                addr.address.startsWith('10.') || addr.address.startsWith('192.168.')
            );
            if (ipv4) {
                return ipv4.address;
            }
        }
    }

    // Fallback: search all interfaces
    for (const interfaceName in interfaces) {
        const addresses = interfaces[interfaceName];
        const ipv4 = addresses.find(addr =>
            addr.family === 'IPv4' &&
            !addr.internal &&
            (addr.address.startsWith('10.') || addr.address.startsWith('192.168.') || addr.address.startsWith('172.'))
        );
        if (ipv4) {
            return ipv4.address;
        }
    }

    throw new Error('Could not find LAN IPv4 address');
}

/**
 * Extract current IP from .env file
 */
function extractCurrentIp(envContent) {
    // Look for IP in KEYCLOAK_URL, FRONTEND_URL, or REACT_APP_API_URL
    const ipRegex = /(?:http:\/\/)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?::|\/)/.exec(envContent);
    return ipRegex ? ipRegex[1] : null;
}

/**
 * Update IP addresses in .env file
 */
function updateEnvFile(filePath, oldIp, newIp) {
    if (!fs.existsSync(filePath)) {
        console.log(`${colors.yellow}⚠️  File not found: ${filePath}${colors.reset}`);
        return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Replace IP in all URLs
    const ipPattern = new RegExp(oldIp.replace(/\./g, '\\.'), 'g');
    content = content.replace(ipPattern, newIp);

    // Only write if content changed
    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`${colors.green}✅ Updated: ${filePath}${colors.reset}`);
        return true;
    } else {
        console.log(`${colors.blue}ℹ️  No changes needed: ${filePath}${colors.reset}`);
        return false;
    }
}

/**
 * Main execution
 */
function main() {
    console.log(`\n${colors.bright}${colors.blue}╔════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}║   IP Address Update Utility           ║${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}╚════════════════════════════════════════╝${colors.reset}\n`);

    try {
        // Step 1: Detect current LAN IP
        console.log('🔍 Detecting LAN IP address...');
        const newIp = getLanIpAddress();
        console.log(`${colors.green}✅ Found IP: ${newIp}${colors.reset}\n`);

        // Step 2: Read backend .env to get old IP
        const backendEnvPath = path.join(__dirname, 'backend', '.env');
        let oldIp = null;

        if (fs.existsSync(backendEnvPath)) {
            const backendContent = fs.readFileSync(backendEnvPath, 'utf8');
            oldIp = extractCurrentIp(backendContent);
        }

        if (!oldIp) {
            console.log(`${colors.yellow}⚠️  Could not detect old IP. Using new IP for all files.${colors.reset}\n`);
            oldIp = '10.7.183.46'; // Default fallback
        } else {
            console.log(`📋 Current IP in config: ${oldIp}`);

            if (oldIp === newIp) {
                console.log(`${colors.green}\n✨ IP address is already up to date! No changes needed.${colors.reset}\n`);
                return;
            }

            console.log(`🔄 Updating from ${colors.yellow}${oldIp}${colors.reset} to ${colors.green}${newIp}${colors.reset}\n`);
        }

        // Step 3: Update backend/.env
        console.log('📝 Updating configuration files...\n');
        const backendUpdated = updateEnvFile(backendEnvPath, oldIp, newIp);

        // Step 4: Update frontend/.env (if exists)
        const frontendEnvPath = path.join(__dirname, 'frontend', '.env');
        const frontendUpdated = updateEnvFile(frontendEnvPath, oldIp, newIp);

        // Step 5: Success message
        if (backendUpdated || frontendUpdated) {
            console.log(`\n${colors.bright}${colors.green}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
            console.log(`${colors.bright}${colors.green}║                    ✅ IP UPDATED!                         ║${colors.reset}`);
            console.log(`${colors.bright}${colors.green}╠════════════════════════════════════════════════════════════╣${colors.reset}`);
            console.log(`${colors.bright}${colors.green}║  New IP: ${newIp}${' '.repeat(41 - newIp.length)}║${colors.reset}`);
            console.log(`${colors.bright}${colors.green}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

            console.log(`${colors.yellow}⚠️  IMPORTANT: Update Keycloak Configuration${colors.reset}\n`);
            console.log(`   1. Open Keycloak Admin Console:`);
            console.log(`      ${colors.blue}http://${newIp}:8080/admin${colors.reset}\n`);
            console.log(`   2. Navigate to: PemdaSSO realm → Clients → pemda-dashboard\n`);
            console.log(`   3. Update the following fields:\n`);
            console.log(`      ${colors.bright}Root URL:${colors.reset}`);
            console.log(`      http://${newIp}:3000\n`);
            console.log(`      ${colors.bright}Valid Redirect URIs:${colors.reset}`);
            console.log(`      http://${newIp}:3000/*\n`);
            console.log(`      ${colors.bright}Valid Post Logout Redirect URIs:${colors.reset}`);
            console.log(`      http://${newIp}:3000/*\n`);
            console.log(`      ${colors.bright}Web Origins:${colors.reset}`);
            console.log(`      http://${newIp}:3000\n`);
            console.log(`   4. Click ${colors.green}"Save"${colors.reset}\n`);

            console.log(`${colors.blue}📱 Access from mobile:${colors.reset}`);
            console.log(`   http://${newIp}:3000\n`);
        }

    } catch (error) {
        console.error(`\n${colors.red}❌ Error: ${error.message}${colors.reset}\n`);
        process.exit(1);
    }
}

// Run the script
main();
