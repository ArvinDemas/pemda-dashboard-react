/**
 * Keycloak Configuration
 */

const Keycloak = require('keycloak-connect');

const keycloakConfig = {
    realm: process.env.KEYCLOAK_REALM,
    'auth-server-url': process.env.KEYCLOAK_URL,
    'ssl-required': 'external',
    resource: process.env.KEYCLOAK_CLIENT_ID,
    credentials: {
        secret: process.env.KEYCLOAK_CLIENT_SECRET
    },
    'confidential-port': 0,
    'bearer-only': true
};

let keycloak;

const initKeycloak = (memoryStore) => {
    if (keycloak) {
        console.warn('Keycloak already initialized');
        return keycloak;
    }

    keycloak = new Keycloak({ store: memoryStore }, keycloakConfig);
    
    console.log('✅ Keycloak initialized successfully');
    return keycloak;
};

const getKeycloak = () => {
    if (!keycloak) {
        throw new Error('Keycloak has not been initialized. Please call initKeycloak first.');
    }
    return keycloak;
};

module.exports = {
    initKeycloak,
    getKeycloak,
    keycloakConfig
};
