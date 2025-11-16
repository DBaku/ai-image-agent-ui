// worker.js
addEventListener("fetch", (event) => {
    event.respondWith(handle(event.request));
});

async function handle(req) {
    try {
        if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
        const body = await req.json();
        const input = (body.input || "").slice(0, 300);
        const styles =
            body.styles && body.styles.length
                ? body.styles.slice(0, 20)
                : [
                      "Anime / Manga",
                      "Hyperrealistic / Photoreal",
                      "Cyberpunk / Neon",
                      "Vintage Film / 35mm",
                      "Surreal / Dreamcore",
                  ];
        // build prompts
        const prompts = styles.map((s) => ({
            style: s,
            prompt: `Create a ${s} artwork of: ${input}. Focus on high detail, strong composition, style-specific attributes.`,
        }));

        // For each prompt call Hugging Face inference
        const hfKey = GLOBAL_HF_KEY(); // set via secret
        const imgurId = GLOBAL_IMGUR_CLIENT_ID(); // set via secret

        const images = [];
        for (const p of prompts) {
            // call HF inference for an image model (replace model name if needed)
            const hfRes = await fetch(
                "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${hfKey}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ inputs: p.prompt, options: { wait_for_model: true } }),
                }
            );

            if (!hfRes.ok) {
                const txt = await hfRes.text();
                return new Response(JSON.stringify({ error: "HF error: " + txt }), {
                    status: 500,
                    headers: { "Content-Type": "application/json" },
                });
            }

            // HF returns image bytes (arraybuffer), or sometimes json with base64
            const arrayBuffer = await hfRes.arrayBuffer();
            const base64 = arrayBufferToBase64(arrayBuffer);

            // upload to Imgur (anonymous upload with client-id)
            const imgurRes = await fetch("https://api.imgur.com/3/image", {
                method: "POST",
                headers: {
                    Authorization: `Client-ID ${imgurId}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ image: base64, type: "base64" }),
            });

            const imgurJson = await imgurRes.json();
            if (!imgurJson || !imgurJson.success) {
                return new Response(
                    JSON.stringify({ error: "Imgur upload failed", detail: imgurJson }),
                    { status: 500, headers: { "Content-Type": "application/json" } }
                );
            }

            images.push({ style: p.style, url: imgurJson.data.link, prompt: p.prompt });
        }

        return new Response(JSON.stringify({ images }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}

// util
function arrayBufferToBase64(buffer) {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
}
