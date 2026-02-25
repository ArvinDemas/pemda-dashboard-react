require('dotenv').config();

console.log('--- Backend Environment Check ---');
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('KEYCLOAK_URL:', process.env.KEYCLOAK_URL);
console.log('PORT:', process.env.PORT);

if (process.env.FRONTEND_URL && process.env.FRONTEND_URL.includes('10.7.183.73')) {
    console.log('✅ FRONTEND_URL is correctly set to IP.');
} else {
    console.error('❌ FRONTEND_URL is NOT set to the expected IP (10.7.183.73).');
}

if (process.env.KEYCLOAK_URL && process.env.KEYCLOAK_URL.includes('10.7.183.73')) {
    console.log('✅ KEYCLOAK_URL is correctly set to IP.');
} else {
    console.error('❌ KEYCLOAK_URL is NOT set to the expected IP (10.7.183.73).');
}
