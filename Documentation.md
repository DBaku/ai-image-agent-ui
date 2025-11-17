Dokumentation: Der "Kostenlos-KI-Bild-Agent"
Wir haben eine voll funktionsfähige, "serverless" Full-Stack KI-Anwendung gebaut, die ohne Kreditkarte und ohne laufende Kosten betrieben werden kann.

1. Der "Stack" (Die Komponenten)
   Frontend (UI): index.html

Eine einzelne HTML-Datei, die das gesamte Nutzererlebnis (UI) enthält.

Styling: Tailwind CSS (eingebunden über styles/output.css).

Logik: Pures Javascript (im <script>-Tag), das User-Eingaben liest und API-Anfragen stellt.

Backend (API): /api/generate.js

Eine Vercel Serverless Function.

Zweck: Sie dient als sichere Brücke (Proxy) zwischen unserer öffentlichen Webseite und der privaten KI-API.

Sie liest die geheimen API-Keys (Environment Variables) und ruft die Cloudflare-KI auf.

KI-Dienst (Das Gehirn): Cloudflare Workers AI

Der eigentliche Dienst, der das Bild generiert (das stable-diffusion-xl-base-1.0-Modell).

Dieser Dienst wird nie direkt vom Browser aufgerufen.

Plattform (Das Fundament): Vercel

Hosting: Stellt unsere index.html und styles/output.css weltweit bereit.

Compute: Führt unsere Backend-Funktion /api/generate.js bei Bedarf aus.

Sicherheit: Verwaltet unsere geheimen API-Keys (CF_TOKEN etc.) sicher als "Environment Variables".

Build-Prozess: Liest die package.json und führt npm run build (den Tailwind-Befehl) automatisch aus.

2. 💡 Das Kernkonzept: Der "Secure Proxy"
   Das Wichtigste an unserer Architektur ist, wie wir die API-Keys schützen.

Der falsche (unsichere) Weg: Wäre, wenn unser Javascript in der index.html direkt die Cloudflare-API aufrufen würde. Browser -> Cloudflare AI API

Problem: Jeder Besucher könnte (mit F12) unseren CF_TOKEN sehen und stehlen.

Unser (sicherer) Weg:

Browser (index.html) ➡️ stellt eine POST-Anfrage an unsere eigene URL: /api/generate.

Vercel (api/generate.js) ➡️ empfängt die Anfrage. Es ist die einzige Komponente, die process.env.CF_TOKEN lesen darf.

Vercel (api/generate.js) ➡️ stellt eine neue, sichere Anfrage an die Cloudflare AI API.

Cloudflare AI ➡️ schickt das Bild (Blob) zurück an Vercel.

Vercel ➡️ leitet das Bild-Blob direkt an den Browser weiter.

Das Wichtigste: Der API-Key verlässt NIEMALS unseren Vercel-Server.
