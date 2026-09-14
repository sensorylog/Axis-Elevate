import { getFatSecretToken } from './_fatsecret.mjs';

export async function handler(event) {
  const { httpMethod, path, queryStringParameters = {}, body = '{}' } = event;

  try {
    const token = await getFatSecretToken();
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // /api/food?mode=search&query=chicken
    // /api/food?mode=detail&food_id=1234
    // /api/food?mode=barcode&barcode=5901234123457
    const mode = queryStringParameters.mode;

    if (mode === 'search') {
      const query = queryStringParameters.query;
      if (!query) {
        return { statusCode: 400, body: JSON.stringify({ error: 'query required' }) };
      }

      const url = new URL('https://platform.fatsecret.com/rest/food.search/v3.1');
      url.searchParams.set('search_expression', query);
      url.searchParams.set('limit', '10');
      url.searchParams.set('format', 'json');

      const res = await fetch(url.toString(), { headers });
      const data = await res.json();
      return { statusCode: 200, body: JSON.stringify(data) };
    }

    if (mode === 'detail') {
      const foodId = queryStringParameters.food_id;
      if (!foodId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'food_id required' }) };
      }

      const url = new URL('https://platform.fatsecret.com/rest/food/v4');
      url.searchParams.set('food_id', foodId);
      url.searchParams.set('format', 'json');

      const res = await fetch(url.toString(), { headers });
      const data = await res.json();
      return { statusCode: 200, body: JSON.stringify(data) };
    }

    if (mode === 'barcode') {
      const barcode = queryStringParameters.barcode;
      if (!barcode) {
        return { statusCode: 400, body: JSON.stringify({ error: 'barcode required' }) };
      }

      const url = new URL('https://platform.fatsecret.com/rest/barcode/v2');
      url.searchParams.set('barcode', barcode);
      url.searchParams.set('format', 'json');

      const res = await fetch(url.toString(), { headers });
      const data = await res.json();
      return { statusCode: 200, body: JSON.stringify(data) };
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'invalid mode' }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
