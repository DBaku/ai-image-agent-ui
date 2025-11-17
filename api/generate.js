// Dateiname: /api/generate.js
// Dies ist deine sichere Server-Funktion.

export default async function handler(req, res) {
    // 1. Nur POST-Anfragen erlauben
    if (req.method !== "POST") {
        return res.status(405).send({ error: "Method Not Allowed" });
    }

    // 2. Daten aus der UI holen (z.B. den Text-Prompt)
    const { prompt, style } = req.body;
    if (!prompt) {
        return res.status(400).send({ error: "Missing prompt" });
    }

    // 3. Keys sicher aus den Vercel Environment Variables laden
    const HF_TOKEN = process.env.HF_TOKEN;
    const CF_TOKEN = process.env.CF_TOKEN;
    const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;

    // Erstelle den fertigen Prompt
    const finalPrompt = `Create ${style} artwork of: ${prompt}`;

    try {
        // 4. ANFRAGE AN CLOUDFLARE AI
        // Wir nutzen das Stable Diffusion Modell von Cloudflare
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

        // WICHTIG: Cloudflare sendet das Bild direkt als Binärdaten, nicht als JSON
        if (!cfResponse.ok) {
            throw new Error(`Cloudflare API error: ${cfResponse.statusText}`);
        }

        // Das Bild als Blob (Daten) holen
        const imageBlob = await cfResponse.blob();

        // 5. Bild an die UI zurücksenden
        // Wir setzen den Header, damit der Browser weiß, dass es ein Bild ist
        res.setHeader("Content-Type", imageBlob.type || "image/png");

        // Konvertiere Blob zu einem Buffer und sende es
        const imageBuffer = Buffer.from(await imageBlob.arrayBuffer());
        res.status(200).send(imageBuffer);

        /* // Alternative: Hugging Face (falls du lieber das nutzen willst)
    const hfResponse = await fetch(
      "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: finalPrompt }),
      }
    );
    const hfImageBlob = await hfResponse.blob();
    res.setHeader('Content-Type', hfImageBlob.type || 'image/jpeg');
    const hfImageBuffer = Buffer.from(await hfImageBlob.arrayBuffer());
    res.status(200).send(hfImageBuffer);
    */
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to generate image", details: error.message });
    }
}
