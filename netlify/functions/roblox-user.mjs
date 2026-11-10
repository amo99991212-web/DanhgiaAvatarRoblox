export default async (req) => {
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*"
  };

  try {
    const username = new URL(req.url).searchParams.get("username")?.trim();

    if (!username) {
      return new Response(JSON.stringify({error:"Thiếu username."}), {status:400, headers});
    }

    const lookup = await fetch("https://users.roblox.com/v1/usernames/users", {
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({usernames:[username], excludeBannedUsers:true})
    });

    if (!lookup.ok) throw new Error("Roblox không phản hồi.");

    const payload = await lookup.json();
    const user = payload.data?.[0];

    if (!user) {
      return new Response(JSON.stringify({error:"Không tìm thấy username."}), {status:404, headers});
    }

    const thumb = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${user.id}&size=180x180&format=Png&isCircular=false`
    );

    const thumbData = thumb.ok ? await thumb.json() : {};

    return new Response(JSON.stringify({
      id:user.id,
      name:user.name,
      displayName:user.displayName,
      avatarUrl:thumbData.data?.[0]?.imageUrl || ""
    }), {status:200,headers});

  } catch (e) {
    return new Response(JSON.stringify({error:e.message || "Lỗi máy chủ."}), {status:502,headers});
  }
};
