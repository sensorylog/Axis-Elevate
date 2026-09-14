let cachedToken = null;
let tokenExpiry = 0;

export async function getFatSecretToken() {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const res = await fetch('https://oauth.fatsecret.com/connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.FATSECRET_CLIENT_ID,
      client_secret: process.env.FATSECRET_CLIENT_SECRET,
      scope: 'basic'
    })
  });

  if (!res.ok) {
    throw new Error('FatSecret token error: ' + res.status);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000) - 60_000; // refresh a bit early
  return cachedToken;
}
