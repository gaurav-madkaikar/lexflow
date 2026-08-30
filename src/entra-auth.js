import { createHash, randomBytes } from 'node:crypto';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { consumeAuthTransaction, createAuthTransaction, hashClaim, resolvePrincipal } from './tenants.js';

const SCOPES = ['openid', 'profile', 'email'];
const AUTH_TTL_MS = 10 * 60 * 1000;

function authError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.expose = true;
  return error;
}

function base64url(bytes) {
  return Buffer.from(bytes).toString('base64url');
}

function verifier() {
  return base64url(randomBytes(32));
}

function challenge(value) {
  return createHash('sha256').update(value).digest('base64url');
}

function safeRedirect(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
  return value;
}

export function createEntraAuth({ db, config, clock = () => new Date(), msalFactory = options => new ConfidentialClientApplication(options) }) {
  const settings = config ?? {};
  const authority = settings.authority || 'https://login.microsoftonline.com/organizations';
  const redirectUri = settings.redirectUri;
  const clientId = settings.clientId;
  const clientSecret = settings.clientSecret;
  const configured = Boolean(clientId && clientSecret && redirectUri);

  function client() {
    if (!configured) throw authError(503, 'ENTRA_NOT_CONFIGURED', 'Microsoft sign-in is not configured on this server.');
    return msalFactory({
      auth: { clientId, clientSecret, authority },
      system: { loggerOptions: { loggerCallback() {}, piiLoggingEnabled: false } },
    });
  }

  async function authorizationUrl({ redirectPath = '/' } = {}) {
    const state = base64url(randomBytes(32));
    const nonce = base64url(randomBytes(32));
    const codeVerifier = verifier();
    const expiresAt = new Date(clock().getTime() + AUTH_TTL_MS).toISOString();
    createAuthTransaction({ db, state, nonce, codeVerifier, redirectPath: safeRedirect(redirectPath), expiresAt });
    try {
      return await client().getAuthCodeUrl({
        scopes: SCOPES,
        redirectUri,
        responseMode: 'query',
        state,
        nonce,
        codeChallenge: challenge(codeVerifier),
        codeChallengeMethod: 'S256',
      });
    } catch (cause) {
      db.prepare('DELETE FROM auth_transactions WHERE state_digest = ?').run(hashClaim(state));
      throw authError(502, 'ENTRA_AUTHORIZATION_FAILED', 'Microsoft sign-in could not be started.');
    }
  }

  async function callback({ code, state, error: providerError } = {}) {
    if (typeof state !== 'string' || !state) {
      throw authError(400, 'ENTRA_AUTHORIZATION_FAILED', 'Microsoft sign-in was cancelled or failed.');
    }
    const transaction = consumeAuthTransaction({ db, state, now: clock() });
    if (providerError || typeof code !== 'string' || !code) {
      throw authError(400, 'ENTRA_AUTHORIZATION_FAILED', 'Microsoft sign-in was cancelled or failed.');
    }
    let result;
    try {
      result = await client().acquireTokenByCode({
        code,
        state,
        scopes: SCOPES,
        redirectUri,
        codeVerifier: transaction.code_verifier,
        nonce: transaction.nonce,
      });
    } catch {
      throw authError(401, 'ENTRA_AUTHENTICATION_FAILED', 'Microsoft sign-in could not be verified.');
    }
    const claims = result?.idTokenClaims;
    if (!claims || claims.nonce !== undefined && claims.nonce !== transaction.nonce) {
      // MSAL validates the signed ID token and nonce. The explicit check remains
      // defensive for test adapters and malformed authentication results.
      throw authError(401, 'ENTRA_AUTHENTICATION_FAILED', 'Microsoft sign-in could not be verified.');
    }
    const access = resolvePrincipal({ db, claims, now: clock() });
    return { ...access, redirectPath: safeRedirect(transaction.redirect_path) };
  }

  return { configured, authorizationUrl, callback, authority };
}

export { SCOPES };
