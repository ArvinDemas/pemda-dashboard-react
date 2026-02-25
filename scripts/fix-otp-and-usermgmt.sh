#!/bin/bash
set -e

echo ""
echo "🔧  Fix OTP + User Management"
echo "=============================="

# ── Get Admin Token ──────────────────────────────────────────────────────────
ADMIN_TOKEN=$(curl -s --max-time 10 -X POST "http://localhost:8080/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin&grant_type=password&client_id=admin-cli" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
echo "✅ Got admin token"

# ══════════════════════════════════════════════════════════════════════════════
# PART 1: FIX OTP
# ══════════════════════════════════════════════════════════════════════════════

echo ""
echo "── Part 1: Fix OTP ──────────────────────────────────────"

# 1A: Disable CONFIGURE_TOTP as default required action
curl -s --max-time 10 -X PUT "http://localhost:8080/admin/realms/PemdaSSO/authentication/required-actions/CONFIGURE_TOTP" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"alias":"CONFIGURE_TOTP","name":"Configure OTP","providerId":"CONFIGURE_TOTP","enabled":true,"defaultAction":false,"priority":10}' > /dev/null
echo "✅ CONFIGURE_TOTP defaultAction → false"

# 1B: Check which browser flow is active
BROWSER_FLOW=$(curl -s --max-time 10 -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:8080/admin/realms/PemdaSSO" \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('browserFlow','browser'))")
echo "   Active browser flow: $BROWSER_FLOW"

# 1C: List executions and find OTP ones
echo ""
echo "   Browser flow executions:"
curl -s --max-time 10 -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:8080/admin/realms/PemdaSSO/authentication/flows/$BROWSER_FLOW/executions" \
  | python3 -c "
import sys,json
execs = json.load(sys.stdin)
for e in execs:
    name = e.get('displayName') or e.get('alias') or '?'
    req = e.get('requirement','?')
    eid = e.get('id','?')
    marker = ' ◀ OTP' if 'otp' in name.lower() or 'one time' in name.lower() else ''
    print(f'   {eid} | {name} | {req}{marker}')
"

# 1D: Change any OTP execution from REQUIRED to CONDITIONAL
echo ""
OTP_EXEC_IDS=$(curl -s --max-time 10 -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:8080/admin/realms/PemdaSSO/authentication/flows/$BROWSER_FLOW/executions" \
  | python3 -c "
import sys,json
execs = json.load(sys.stdin)
for e in execs:
    name = (e.get('displayName') or e.get('alias') or '').lower()
    if ('otp' in name or 'one time' in name) and e.get('requirement') == 'REQUIRED':
        print(e['id'])
")

if [ -n "$OTP_EXEC_IDS" ]; then
  while IFS= read -r OTP_ID; do
    [ -z "$OTP_ID" ] && continue
    curl -s --max-time 10 -X PUT "http://localhost:8080/admin/realms/PemdaSSO/authentication/flows/$BROWSER_FLOW/executions" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"id\": \"$OTP_ID\", \"requirement\": \"CONDITIONAL\"}" > /dev/null
    echo "✅ OTP execution $OTP_ID → CONDITIONAL"
  done <<< "$OTP_EXEC_IDS"
else
  echo "ℹ️  No OTP executions with REQUIRED found (may already be CONDITIONAL)"
fi

# 1E: Clear all user OTP credentials and required actions
echo ""
echo "   Clearing user OTP credentials..."
curl -s --max-time 10 -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:8080/admin/realms/PemdaSSO/users?max=100" \
  | python3 -c "import sys,json; [print(u['id'], u.get('username','?')) for u in json.load(sys.stdin)]" \
  | while IFS=' ' read -r USER_ID USERNAME; do
      [ -z "$USER_ID" ] && continue

      # Clear required actions
      curl -s --max-time 10 -X PUT "http://localhost:8080/admin/realms/PemdaSSO/users/$USER_ID" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"requiredActions":[]}' > /dev/null

      # Delete OTP credentials
      curl -s --max-time 10 -H "Authorization: Bearer $ADMIN_TOKEN" \
        "http://localhost:8080/admin/realms/PemdaSSO/users/$USER_ID/credentials" \
        | python3 -c "
import sys,json
for c in json.load(sys.stdin):
    if c.get('type') == 'otp': print(c['id'])
" | while IFS= read -r CRED_ID; do
          [ -z "$CRED_ID" ] && continue
          curl -s --max-time 10 -X DELETE \
            "http://localhost:8080/admin/realms/PemdaSSO/users/$USER_ID/credentials/$CRED_ID" \
            -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null
          echo "   ✅ Removed OTP cred for $USERNAME"
        done
    done

# 1F: Clear all sessions
curl -s --max-time 10 -X POST "http://localhost:8080/admin/realms/PemdaSSO/logout-all" \
  -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null
echo "✅ All sessions cleared"

# ══════════════════════════════════════════════════════════════════════════════
# PART 2: FIX USER MANAGEMENT (public → confidential client)
# ══════════════════════════════════════════════════════════════════════════════

echo ""
echo "── Part 2: Fix User Management ──────────────────────────"

CLIENT_UUID=$(curl -s --max-time 10 -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:8080/admin/realms/PemdaSSO/clients?clientId=pemda-dashboard" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")

echo "   Client UUID: $CLIENT_UUID"

# 2A: Show current state
echo ""
curl -s --max-time 10 -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:8080/admin/realms/PemdaSSO/clients/$CLIENT_UUID" \
  | python3 -c "
import sys,json
c = json.load(sys.stdin)
print('   publicClient:', c.get('publicClient'))
print('   serviceAccountsEnabled:', c.get('serviceAccountsEnabled'))
print('   directAccessGrantsEnabled:', c.get('directAccessGrantsEnabled'))
"

# 2B: Convert to confidential + enable service accounts
curl -s --max-time 10 -X PUT "http://localhost:8080/admin/realms/PemdaSSO/clients/$CLIENT_UUID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"publicClient":false,"serviceAccountsEnabled":true,"directAccessGrantsEnabled":true}' > /dev/null
echo "✅ Client → confidential + service accounts enabled"

# 2C: Get the new client secret
SECRET=$(curl -s --max-time 10 -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:8080/admin/realms/PemdaSSO/clients/$CLIENT_UUID/client-secret" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['value'])")
echo "   New client secret: $SECRET"

# 2D: Update backend/.env
BACKEND_ENV="/Users/mrnugroho/Downloads/pemda-dashboard-react/backend/.env"
sed -i '' "s|KEYCLOAK_CLIENT_SECRET=.*|KEYCLOAK_CLIENT_SECRET=$SECRET|g" "$BACKEND_ENV"
sed -i '' "s|KEYCLOAK_ADMIN_SECRET=.*|KEYCLOAK_ADMIN_SECRET=$SECRET|g" "$BACKEND_ENV"
echo "✅ backend/.env updated with new secret"

# 2E: Assign view-users, manage-users, query-users roles
SA_USER=$(curl -s --max-time 10 -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:8080/admin/realms/PemdaSSO/clients/$CLIENT_UUID/service-account-user" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "   Service account user: $SA_USER"

RM_CLIENT=$(curl -s --max-time 10 -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:8080/admin/realms/PemdaSSO/clients?clientId=realm-management" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")

ROLES=$(curl -s --max-time 10 -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:8080/admin/realms/PemdaSSO/users/$SA_USER/role-mappings/clients/$RM_CLIENT/available" \
  | python3 -c "
import sys,json
roles = json.load(sys.stdin)
needed = [r for r in roles if r['name'] in ('view-users','manage-users','query-users')]
print(json.dumps(needed))
")

if [ "$ROLES" != "[]" ] && [ -n "$ROLES" ]; then
  curl -s --max-time 10 -X POST \
    "http://localhost:8080/admin/realms/PemdaSSO/users/$SA_USER/role-mappings/clients/$RM_CLIENT" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$ROLES" > /dev/null
  echo "✅ view-users / manage-users / query-users roles assigned"
else
  echo "ℹ️  Roles already assigned"
fi

# 2F: Test service account login
echo ""
echo "   Testing service account login..."
TEST_RESULT=$(curl -s --max-time 10 -X POST "http://localhost:8080/realms/PemdaSSO/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=pemda-dashboard&client_secret=$SECRET" \
  | python3 -c "
import sys,json
d = json.load(sys.stdin)
if 'access_token' in d:
    print('OK')
else:
    print('FAIL: ' + d.get('error_description', str(d)))
")

if [ "$TEST_RESULT" = "OK" ]; then
  echo "✅ Service account login works!"
else
  echo "❌ Service account login failed: $TEST_RESULT"
fi

# ══════════════════════════════════════════════════════════════════════════════
# DONE
# ══════════════════════════════════════════════════════════════════════════════
echo ""
echo "=============================="
echo "  ✅  All fixes applied!"
echo "=============================="
echo ""
echo "  Next steps:"
echo "  1. Restart backend: lsof -ti:5000 | xargs kill -9; cd backend && npm start"
echo "  2. Open app in incognito window"
echo "  3. Login — OTP should NOT be asked"
echo "  4. Go to User Management — users should load"
echo ""
