/**
 * Keycloak Configuration for React
 */

import Keycloak from 'keycloak-js';

const keycloakConfig = {
  url: `http://${window.location.hostname}:8080`,
  realm: 'Jogja-SSO',
  clientId: 'pemda-dashboard'
};

const keycloak = new Keycloak(keycloakConfig);

export default keycloak;
