
export default async (req) => {
  const headers = {
    "content-type": "application/json; charset=utf-8"
  };

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({error:"Chỉ hỗ trợ POST."}),
      {status:405,headers}
    );
  }

  const key = Netlify.env.get("OPENAI_API_KEY");

  if (!key) {
    return new Response(
      JSON.stringify({
        error:"Chưa cấu hình AI trên Netlify. Tính năng chấm ảnh chưa bật."
      }),
      {status:503,headers}
    );
  }

  try {
    const {image} = await req.json();

    if (typeof image !== "string" || !image.startsWith("data:image/")) {
      return new Response(
        JSON.stringify({error:"Ảnh không hợp lệ."}),
        {status:400,headers}
      );
    }

    const prompt = `Đánh giá avatar Roblox trong ảnh bằng tiếng Việt.
Trả về CHỈ JSON hợp lệ theo mẫu:
{
 "score": 85,
 "rank": "PEAKK!",
 "summary": "Nhận xét tổng quan",
 "pros": ["Ưu điểm 1"],
 "cons": ["Khuyết điểm 1"],
 "tips": ["Gợi ý cải thiện 1"]
}
Điểm từ 0 đến 100.
0-20 BASIC, 21-40 RARE, 41-60 EPIC,
61-80 MYTHICAL, 81-100 PEAKK!.
Đánh giá phối màu, phong cách và phụ kiện nhìn thấy.`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method:"POST",
      headers:{
        "authorization":`Bearer ${key}`,
        "content-type":"application/json"
      },
      body:JSON.stringify({
        model:"gpt-4.1-mini",
        input:[{
          role:"user",
          content:[
            {type:"input_text",text:prompt},
            {type:"input_image",image_url:image}
          ]
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "AI gặp lỗi.");
    }

    const output = data.output
      ?.flatMap(x=>x.content || [])
      .find(x=>x.type==="output_text")?.text;

    if (!output) throw new Error("AI không trả kết quả.");

    const result = JSON.parse(
      output.replace(/^```json\s*|\s*```$/g,"").trim()
    );

    result.score = Math.max(0,Math.min(100,Number(result.score)||0));

    return new Response(JSON.stringify(result), {
      status:200,
      headers
    });

  } catch (e) {
    return new Response(
      JSON.stringify({error:e.message || "Không thể phân tích ảnh."}),
      {status:500,headers}
    );
  }
};
