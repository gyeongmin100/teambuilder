export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { participants, config } = body;

    if (!env.POLAR_ACCESS_TOKEN || !env.POLAR_PRODUCT_ID) {
      return new Response(JSON.stringify({ error: "Polar configuration missing" }), { status: 500 });
    }

    // 1. Polar Checkout Session 생성
    const response = await fetch("https://api.polar.sh/v1/checkouts/custom/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.POLAR_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        product_id: env.POLAR_PRODUCT_ID,
        success_url: `${new URL(request.url).origin}/?success=true&checkout_id={CHECKOUT_ID}`,
        confirmation_url: `${new URL(request.url).origin}/?success=true&checkout_id={CHECKOUT_ID}`,
        customer_email: body.email || undefined,
        metadata: {
          // 결제 후 복구를 위해 필요한 데이터 저장 (또는 DB 사용)
          // 여기서는 간단하게 participants를 저장할 수 없으므로(크기 제한), 
          // 실제 서비스에서는 Supabase 등에 임시 저장하고 ID만 넘기는 것이 좋음.
        }
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Failed to create checkout");

    return new Response(JSON.stringify({ url: data.url }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
