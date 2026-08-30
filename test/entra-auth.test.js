import assert from 'node:assert/strict';
import test from 'node:test';

import { createDatabase } from '../src/db.js';
import { createEntraAuth } from '../src/entra-auth.js';
import { createOrganization } from '../src/tenants.js';

const tenantId = '11111111-1111-4111-8111-111111111111';
const objectId = '22222222-2222-4222-8222-222222222222';

test('Entra auth uses state, nonce, PKCE and consumes callback transactions once', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  createOrganization({
    db,
    input: {
      name: 'Acme Corporation',
      domain: 'acme.test',
      entraTenantId: tenantId,
      initialAdminEmail: 'admin@acme.test',
      initialAdminObjectId: objectId,
    },
  });

  let authRequest;
  const entra = createEntraAuth({
    db,
    config: { clientId: 'client', clientSecret: 'secret', redirectUri: 'https://lexflow.test/api/auth/outlook/callback' },
    msalFactory: () => ({
      async getAuthCodeUrl(request) {
        authRequest = request;
        return `https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize?state=${request.state}`;
      },
      async acquireTokenByCode(request) {
        assert.equal(request.state, authRequest.state);
        assert.equal(request.codeVerifier, db.prepare('SELECT code_verifier FROM auth_transactions').get()?.code_verifier ?? request.codeVerifier);
        return {
          idTokenClaims: {
            tid: tenantId,
            oid: objectId,
            email: 'admin@acme.test',
            name: 'Acme Admin',
            nonce: authRequest.nonce,
          },
        };
      },
    }),
  });

  const url = await entra.authorizationUrl({ redirectPath: '/settings' });
  const state = new URL(url).searchParams.get('state');
  assert.equal(authRequest.codeChallengeMethod, 'S256');
  assert.ok(authRequest.codeChallenge);
  const result = await entra.callback({ code: 'authorization-code', state });
  assert.equal(result.role, 'org_admin');
  assert.equal(result.redirectPath, '/settings');
  await assert.rejects(() => entra.callback({ code: 'authorization-code', state }), error => error.code === 'INVALID_AUTH_STATE');
});
