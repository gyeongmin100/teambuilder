export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { participants, config } = body; 
    // participants: [{ name: "Alice", intro: "...", email: "..." }, ...]
    // config: { teamSize: 4, goal: "role_balance" | "diversity" | "similarity" }

    if (!env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "API Key missing" }), { status: 500 });
    }

    // 1. GPT를 이용한 텍스트 정규화 및 스키마 추출
    const normalizedParticipants = await Promise.all(participants.map(async (p) => {
      const prompt = `당신은 팀 빌딩 전문가입니다. 다음은 팀 빌딩을 위한 설문 응답입니다:
이름: ${p.name}
자기소개 및 협업 스타일: ${p.intro}

이 내용을 바탕으로 다음 JSON 스키마에 맞춰 데이터를 추출해 주세요. 한국어로 작성하세요.
{
  "role": "선호 역할 (리더, 분석, 실행, 발표 중 가장 적합한 것 1개)",
  "style": "협업 스타일 요약 (30자 이내)",
  "strength": "핵심 강점 요약 (30자 이내)",
  "traits": ["성향 키워드 2-3개"]
}
JSON 형식으로만 답변하세요.`;

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are a team building expert who extracts structured data from text." },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" }
        })
      });

      const data = await res.json();
      const extracted = JSON.parse(data.choices[0].message.content);
      return { ...p, ...extracted };
    }));

    // 2. 팀 배정 알고리즘 (Deterministic)
    // 단순 구현: 역할별로 정렬 후 순차 배정하여 균형 맞춤
    const teamSize = config.teamSize || 4;
    const sorted = [...normalizedParticipants].sort((a, b) => {
      // 리더 우선 배치 등을 위해 역할별 가중치 부여 가능
      const roleWeight = { "리더": 10, "발표": 5, "분석": 3, "실행": 1 };
      return (roleWeight[b.role] || 0) - (roleWeight[a.role] || 0);
    });

    const numTeams = Math.ceil(sorted.length / teamSize);
    const teams = Array.from({ length: numTeams }, (_, i) => ({
      id: i + 1,
      members: [],
      analysis: ""
    }));

    // 지그재그 방식으로 배정하여 역할이 골고루 섞이게 함
    sorted.forEach((p, index) => {
      const teamIndex = index % numTeams;
      teams[teamIndex].members.push(p);
    });

    // 3. 팀별 분석 요약 (선택 사항 - 다시 GPT 호출 가능하지만 일단 생략)
    teams.forEach(team => {
      const roles = team.members.map(m => m.role);
      team.analysis = `${team.members.length}명으로 구성됨. 주요 역할: ${[...new Set(roles)].join(", ")}`;
    });

    return new Response(JSON.stringify({ teams }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
