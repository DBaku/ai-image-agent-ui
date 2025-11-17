// Dateiname: /api/generate.js
// 2. KORREKTURVERSUCH für Hugging Face (Fix für 404-Fehler)

export default async function handler(req, res) {
    // 1. Guards und Daten holen
    if (req.method !== "POST") {
        return res.status(405).send({ error: "Method Not Allowed" });
    }
    const { prompt, style, engine = "cf" } = req.body;
    if (!prompt || !style) {
        return res.status(400).send({ error: "Missing prompt or style" });
    }

    // 2. Keys sicher laden
    const { CF_TOKEN, CF_ACCOUNT_ID, HF_TOKEN } = process.env;

    const finalPrompt = `Create ${style} artwork of: ${prompt}`;
    let apiResponse;
    let contentType = "image/png";

    try {
        // 3. ENTSCHEIDUNG: Welche Engine wird genutzt?
        if (engine === "hf") {
            // --- KORRIGIERTE LOGIK FÜR HUGGING FACE (v2) ---
            if (!HF_TOKEN) throw new Error("Missing HF_TOKEN");

            // Die 404-Fehlermeldung legt nahe, dass die URL unvollständig war.
            // Wir hängen jetzt die Modell-ID an die Router-URL an.
            const MODEL_ID = "stabilityai/stable-diffusion-xl-base-1.0";
            const ROUTER_URL = `https://router.huggingface.co/hf-inference/${MODEL_ID}`; // NEUE URL

            apiResponse = await fetch(ROUTER_URL, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${HF_TOKEN}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    // "model" ist jetzt Teil der URL, also nicht mehr im Body nötig
                    inputs: finalPrompt,
                }),
            });
            contentType = apiResponse.headers.get("Content-Type") || "image/jpeg";
        } else {
            // --- LOGIK FÜR CLOUDFLARE (Standard) ---
            if (!CF_TOKEN || !CF_ACCOUNT_ID) throw new Error("Missing CF_TOKEN or CF_ACCOUNT_ID");

            apiResponse = await fetch(
                `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/stabilityai/stable-diffusion-xl-base-1.0`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${CF_TOKEN}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ prompt: finalPrompt }),
                }
            );
            contentType = apiResponse.headers.get("Content-Type") || "image/png";
        }

        // 4. Gemeinsame Antwort-Logik (für BEIDE)
        if (!apiResponse.ok) {
            const errorText = await apiResponse.text(); // Hol dir den genauen Fehlertext
            throw new Error(`API error (${apiResponse.status}): ${errorText}`);
        }

        // Bild-Blob holen
        const imageBlob = await apiResponse.blob();
        const imageBuffer = Buffer.from(await imageBlob.arrayBuffer());

        // 5. Bild (Blob) direkt an das Frontend zurücksenden
        res.setHeader("Content-Type", contentType);
        res.status(200).send(imageBuffer);
    } catch (error) {
        console.error("Handler error:", error);
        // Sende den Fehler als JSON zurück, damit das Frontend ihn anzeigen kann
        res.status(500).json({ error: "Failed to generate image", details: error.message });
    }
}
