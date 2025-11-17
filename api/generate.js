export default async function handler(req, res) {
    // 1. Nur POST-Anfragen erlauben
    if (req.method !== "POST") {
        return res.status(405).send({ error: "Method Not Allowed" });
    }

    // 2. Daten aus der UI holen (z.B. den Text-Prompt)
    const { prompt, style } = req.body;
    if (!prompt || !style) {
        // 'engine' wurde entfernt
        return res.status(400).send({ error: "Missing prompt or style" });
    }

    // 3. Keys sicher aus den Vercel Environment Variables laden
    // Wir brauchen HF_TOKEN hier nicht mehr
    const CF_TOKEN = process.env.CF_TOKEN;
    const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;

    // Erstelle den fertigen Prompt
    const finalPrompt = `Create ${style} artwork of: ${prompt}`;

    try {
        // 4. ANFRAGE AN CLOUDFLARE AI
        const cfResponse = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/stabilityai/stable-diffusion-xl-base-1.0`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${CF_TOKEN}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    prompt: finalPrompt,
                }),
            }
        );

        // 5. Antwort-Logik (keine 'if/else'-Abfrage mehr)
        if (!cfResponse.ok) {
            const errorText = await cfResponse.text();
            throw new Error(`Cloudflare API error (${cfResponse.status}): ${errorText}`);
        }

        // Bild-Blob holen
        const imageBlob = await cfResponse.blob();
        const imageBuffer = Buffer.from(await imageBlob.arrayBuffer());

        // 6. Bild (Blob) direkt an das Frontend zurücksenden
        res.setHeader("Content-Type", imageBlob.type || "image/png");
        res.status(200).send(imageBuffer);
    } catch (error) {
        console.error("Handler error:", error);
        res.status(500).json({ error: "Failed to generate image", details: error.message });
    }
}
