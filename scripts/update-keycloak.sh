#!/bin/bash
cd /Users/mrnugroho/Downloads/pemda-dashboard-react

NEW_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
echo "🌐 IP: $NEW_IP"

TOKEN=$(curl -s -X POST "http://localhost:8080/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin&grant_type=password&client_id=admin-cli" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

CLIENT_UUID=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/admin/realms/PemdaSSO/clients?clientId=pemda-dashboard" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")

curl -s -X PUT "http://localhost:8080/admin/realms/PemdaSSO/clients/$CLIENT_UUID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"rootUrl\":\"http://$NEW_IP:3000\",\"redirectUris\":[\"http://$NEW_IP:3000\",\"http://$NEW_IP:3000/*\",\"http://localhost:3000/*\"],\"webOrigins\":[\"http://$NEW_IP:3000\",\"http://localhost:3000\"],\"adminUrl\":\"http://$NEW_IP:3000\"}" \
  && echo "✅ Client updated"

curl -s -X PUT "http://localhost:8080/admin/realms/PemdaSSO" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"attributes\":{\"frontendUrl\":\"http://$NEW_IP:8080\"}}" \
  && echo "✅ Realm updated"

sed -i '' "s|KC_HOSTNAME:.*|KC_HOSTNAME: $NEW_IP|g" docker-compose.yml
docker compose restart keycloak
echo "✅ Done — buka http://$NEW_IP:3000"
