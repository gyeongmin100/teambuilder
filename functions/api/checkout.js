const getBaseUrl = (env) => {
  const mode = String(env.POLAR_ENV || 'production').toLowerCase();
  return mode === 'sandbox' ? 'https://sandbox-api.polar.sh/v1' : 'https://api.polar.sh/v1';
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });

const normalizeCheckout = (data) => {
  if (!data || typeof data !== 'object') return null;
  if (data.id || data.status) return data;
  if (data.data && (data.data.id || data.data.status)) return data.data;
  return data;
};

const isPaidStatus = (status) => {
  const s = String(status || '').toLowerCase();
  return s === 'succeeded' || s === 'paid';
};

const getPolarToken = (env) => env.POLAR_ACCESS_TOKEN || env.POLAR_API_KEY;

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const token = getPolarToken(env);
    const productId = env.POLAR_PRODUCT_ID;
    if (!token || !productId) {
      return json({ error: 'Polar 설정이 없습니다. (POLAR_ACCESS_TOKEN/POLAR_PRODUCT_ID)' }, 500);
    }

    const body = await request.json();
    const origin = new URL(request.url).origin;
    const successUrl = `${origin}/?checkout_success=true&checkout_id={CHECKOUT_ID}`;

    const polarRes = await fetch(`${getBaseUrl(env)}/checkouts/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        products: [productId],
        success_url: successUrl,
        customer_email: body?.email || undefined,
        metadata: {
          source: 'teambuilder',
          ...(body?.metadata || {})
        }
      })
    });

    const data = await polarRes.json();
    if (!polarRes.ok) {
      return json({ error: data?.detail || data?.error || '결제 세션 생성 실패' }, 500);
    }

    const checkout = normalizeCheckout(data);
    if (!checkout?.url || !checkout?.id) {
      return json({ error: '결제 세션 응답이 올바르지 않습니다.' }, 500);
    }

    return json({ url: checkout.url, checkout_id: checkout.id, status: checkout.status || null });
  } catch (error) {
    return json({ error: error.message || '결제 세션 생성 중 오류' }, 500);
  }
}

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const token = getPolarToken(env);
    if (!token) return json({ error: 'POLAR_ACCESS_TOKEN이 없습니다.' }, 500);

    const checkoutId = new URL(request.url).searchParams.get('checkout_id');
    if (!checkoutId) return json({ error: 'checkout_id가 필요합니다.' }, 400);

    const polarRes = await fetch(`${getBaseUrl(env)}/checkouts/${encodeURIComponent(checkoutId)}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });

    const data = await polarRes.json();
    if (!polarRes.ok) {
      return json({ error: data?.detail || data?.error || '결제 상태 조회 실패' }, 500);
    }

    const checkout = normalizeCheckout(data);
    const status = checkout?.status || '';

    return json({
      checkout_id: checkoutId,
      status,
      paid: isPaidStatus(status),
      raw: checkout
    });
  } catch (error) {
    return json({ error: error.message || '결제 상태 조회 중 오류' }, 500);
  }
}
