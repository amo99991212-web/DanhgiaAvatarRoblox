export default async (request) => {
  const headers = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
  if (request.method !== "POST") return new Response(JSON.stringify({error:"Chỉ hỗ trợ POST."}),{status:405,headers});
  const apiKey = Netlify.env.get("OPENAI_API_KEY");
  if (!apiKey) return new Response(JSON.stringify({error:"Website chưa được cấu hình AI. Chủ website cần thêm OPENAI_API_KEY trong Netlify → Site configuration → Environment variables."}),{status:503,headers});
  try {
    const { image } = await request.json();
    if (typeof image !== "string" || image.length > 5_500_000)
      return new Response(JSON.stringify({error:"Ảnh không hợp lệ hoặc quá lớn. Hãy chọn ảnh nhỏ hơn."}),{status:400,headers});
    const match = image.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!match) return new Response(JSON.stringify({error:"Ảnh phải là JPG, PNG hoặc WEBP."}),{status:400,headers});
    const prompt = `Bạn là giám khảo thẩm mỹ avatar Roblox. Hãy đánh giá công bằng, vui vẻ nhưng trung thực, chỉ dựa trên những gì nhìn thấy trong ảnh. Đây là đánh giá phong cách, không đánh giá ngoại hình hay giá trị con người.
Chấm 5 tiêu chí:
- beauty: Độ đẹp tổng thể, 0-25
- color: Phối màu, 0-20
- originality: Độ độc đáo, 0-20
- accessories: Phụ kiện và cách phối phụ kiện, 0-20
- harmony: Độ hài hòa outfit, 0-15
Tổng điểm là tổng 5 mục (0-100). Không tự cộng điểm cho món đồ vì đoán là UGC; ảnh không xác minh được món đồ có phải UGC hay không. Nêu rõ nếu ảnh không đủ góc nhìn/độ rõ để đánh giá. strengths và weaknesses là mảng 2-4 ý cụ thể bằng tiếng Việt. summary là 1-3 câu. improvement_tips là 1-2 câu gợi ý chỉnh outfit. Tránh chê bai người chơi; chỉ góp ý outfit.
Chỉ trả về JSON hợp lệ theo cấu trúc:
{"scores":{"beauty":0,"color":0,"originality":0,"accessories":0,"harmony":0},"total_score":0,"strengths":["..."],"weaknesses":["..."],"summary":"...","improvement_tips":"..."}`;
    const apiResponse = await fetch("https://api.openai.com/v1/responses", {
      method:"POST",
      headers:{"Authorization":`Bearer ${apiKey}`,"Content-Type":"application/json"},
      body:JSON.stringify({
        model:"gpt-4.1-mini",
        input:[{role:"user",content:[
          {type:"input_text",text:prompt},
          {type:"input_image",image_url:image,detail:"high"}
        ]}],
        max_output_tokens:700
      })
    });
    const apiData = await apiResponse.json();
    if (!apiResponse.ok) {
      const message = apiData?.error?.message || `AI API lỗi (${apiResponse.status}).`;
      return new Response(JSON.stringify({error:message}),{status:502,headers});
    }
    const textOutput = apiData.output?.flatMap(item => item.content || [])
      .filter(item => item.type === "output_text")
      .map(item => item.text).join("\n") || "";
    const jsonText = textOutput.replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"").trim();
    const parsed = JSON.parse(jsonText);
    const limits = {beauty:25,color:20,originality:20,accessories:20,harmony:15};
    const scores = {};
    for (const [key,max] of Object.entries(limits)) {
      const value = Number(parsed.scores?.[key]);
      scores[key] = Number.isFinite(value) ? Math.max(0,Math.min(max,Math.round(value))) : 0;
    }
    const total_score = Object.values(scores).reduce((a,b)=>a+b,0);
    const cleanList = value => Array.isArray(value) ? value.slice(0,4).map(x=>String(x).slice(0,240)) : [];
    return new Response(JSON.stringify({
      scores,total_score,
      strengths:cleanList(parsed.strengths),
      weaknesses:cleanList(parsed.weaknesses),
      summary:String(parsed.summary||"").slice(0,700),
      improvement_tips:String(parsed.improvement_tips||"").slice(0,500)
    }),{status:200,headers});
  } catch (error) {
    return new Response(JSON.stringify({error:"Không phân tích được ảnh. Kiểm tra API key, giới hạn sử dụng hoặc thử lại."}),{status:500,headers});
  }
};
