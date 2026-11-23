// AIvora (versiÃ³n gratuita): funciÃ³n de Netlify que llama a la API de Google Gemini.
// Si un modelo estÃ¡ saturado (error 503) o no existe, prueba automÃ¡ticamente el siguiente.
// La clave vive en la variable GEMINI_API_KEY (nunca en la pÃ¡gina).

const PRIMARY = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const FALLBACKS = ["gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"];
const MODELS = [PRIMARY].concat(FALLBACKS.filter((m) => m !== PRIMARY));
const RETRY_STATUS = new Set([404, 429, 500, 502, 503, 504]); // se prueba otro modelo
const MAX_MESSAGES = 40;
const MAX_CHARS = 4000;

const SYSTEM =
  "Eres AIvora, un asistente de chat por texto para una pÃ¡gina web. " +
  "Responde siempre solo con texto plano (sin imÃ¡genes, sin archivos, sin Markdown pesado, sin asteriscos). " +
  "Responde en el idioma del usuario, por defecto espaÃ±ol. SÃ© claro, amable, cÃ¡lido y conciso. " +
  "Recuerdas todo lo dicho antes en esta conversaciÃ³n y lo usas para responder. " +
  "Si no sabes algo, dilo con honestidad en lugar de inventar.";

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(body),
});

async function callGemini(model, key, payload) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 7000);
  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent",
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      }
    );
    const data = await res.json().catch(() => ({}));
    return { res, data };
  } finally {
    clearTimeout(timer);
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "MÃ©todo no permitido." });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return json(500, { error: "Falta configurar GEMINI_API_KEY en Netlify." });

  let messages;
  try {
    messages = JSON.parse(event.body || "{}").messages;
  } catch (e) {
    return json(400, { error: "Solicitud no vÃ¡lida." });
  }

  const valid =
    Array.isArray(messages) &&
    messages.length > 0 &&
    messages.length <= MAX_MESSAGES &&
    messages[0].role === "user" &&
    messages[messages.length - 1].role === "user" &&
    messages.every(
      (m, i) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.length > 0 &&
        m.content.length <= MAX_CHARS &&
        (i === 0 || m.role !== messages[i - 1].role)
    );
  if (!valid) return json(400, { error: "Mensajes no vÃ¡lidos." });

  const payload = {
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    generationConfig: { maxOutputTokens: 800, temperature: 0.7 },
  };

  let lastStatus = 0;
  for (const model of MODELS) {
    try {
      const { res, data } = await callGemini(model, key, payload);
      if (res.ok) {
        const parts = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
        const text = parts.map((p) => p.text || "").join("").trim();
        if (text) return json(200, { text });
        lastStatus = 502;
        continue; // respuesta vacÃ­a: prueba el siguiente modelo
      }
      lastStatus = res.status;
      console.error("Gemini error", model, res.status, JSON.stringify(data));
      if (!RETRY_STATUS.has(res.status)) {
        // Clave invÃ¡lida u otra falla que otro modelo no arregla.
        return json(502, { error: "El servicio de respuestas rechazÃ³ la solicitud.", detail: "Gemini " + res.status });
      }
    } catch (e) {
      lastStatus = 504;
      console.error("Gemini fetch failed", model, String(e));
    }
  }

  return json(lastStatus === 429 ? 429 : 503, {
    error: "AIvora tiene mucha demanda en este momento. Espera un momento e intÃ©ntalo otra vez.",
    detail: "Gemini " + lastStatus,
  });
};
