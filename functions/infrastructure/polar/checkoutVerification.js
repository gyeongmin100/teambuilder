const getPolarBaseUrl = (env) => {
  const mode = String(env.POLAR_ENV || 'production').toLowerCase();
  return mode === 'sandbox' ? 'https://sandbox-api.polar.sh/v1' : 'https://api.polar.sh/v1';
};

const getPolarToken = (env) => env.POLAR_ACCESS_TOKEN || env.POLAR_API_KEY;

const isPaidStatus = (status) => {
  const normalized = String(status || '').toLowerCase();
  return normalized === 'succeeded' || normalized === 'paid';
};

const normalizeCheckout = (data) => {
  if (!data || typeof data !== 'object') return null;
  if (data.id || data.status) return data;
  if (data.data && (data.data.id || data.data.status)) return data.data;
  return data;
};

export const verifyPaidCheckout = async ({ checkoutId, env }) => {
  const token = getPolarToken(env);
  if (!token) throw new Error('POLAR_ACCESS_TOKEN이 없습니다.');
  if (!checkoutId) throw new Error('checkout_id가 필요합니다.');

  const response = await fetch(`${getPolarBaseUrl(env)}/checkouts/${encodeURIComponent(checkoutId)}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data?.detail || data?.error || '결제 상태 조회 실패');

  const checkout = normalizeCheckout(data);
  if (!isPaidStatus(checkout?.status)) throw new Error('결제가 완료되지 않았습니다.');
  return checkout;
};
