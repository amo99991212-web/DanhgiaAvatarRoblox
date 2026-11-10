export default async (request) => {
  const headers = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
  if (request.method !== "POST") return new Response(JSON.stringify({error:"Chỉ hỗ trợ POST."}), {status:405,headers});
  try {
    const { username: raw } = await request.json();
    const username = String(raw || "").trim().replace(/^@/, "");
    if (!/^[A-Za-z0-9_]{3,20}$/.test(username))
      return new Response(JSON.stringify({error:"Username phải dài 3–20 ký tự, chỉ gồm chữ, số hoặc dấu gạch dưới."}),{status:400,headers});
    const lookup = await fetch("https://users.roblox.com/v1/usernames/users", {
      method:"POST", headers:{"content-type":"application/json"},
      body:JSON.stringify({usernames:[username],excludeBannedUsers:true})
    });
    if (!lookup.ok) return new Response(JSON.stringify({error:`Roblox API trả về lỗi (${lookup.status}). Thử lại sau nhé.`}),{status:502,headers});
    const result = await lookup.json(); const user = result?.data?.[0];
    if (!user) return new Response(JSON.stringify({error:"Không tìm thấy username này. Kiểm tra lại chính tả nhé."}),{status:404,headers});
    const url = new URL("https://thumbnails.roblox.com/v1/users/avatar");
    url.search = new URLSearchParams({userIds:String(user.id),size:"420x420",format:"Png",isCircular:"false"}).toString();
    const thumb = await fetch(url);
    if (!thumb.ok) return new Response(JSON.stringify({error:`Tài khoản có tồn tại nhưng Roblox chưa trả ảnh (${thumb.status}).`}),{status:502,headers});
    const thumbData = await thumb.json(); const avatarUrl = thumbData?.data?.[0]?.imageUrl;
    if (!avatarUrl) return new Response(JSON.stringify({error:"Roblox chưa trả về ảnh avatar."}),{status:502,headers});
    return new Response(JSON.stringify({user:{id:user.id,name:user.name,displayName:user.displayName||user.name},avatarUrl}),{status:200,headers});
  } catch {
    return new Response(JSON.stringify({error:"Lỗi máy chủ khi tìm avatar. Hãy thử lại."}),{status:500,headers});
  }
};
