// AIvora (versión gratuita): función de Netlify que llama a la API de Google Gemini.
// La clave vive en la variable de entorno GEMINI_API_KEY (nunca en la página).

const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const MAX_MESSAGES = 40;
const MAX_CHARS = 4000;

const SYSTEM =
  "Eres AIvora, un asistente de chat por texto para una página web. " +
  "Responde siempre solo con texto plano (sin imágenes, sin archivos, sin Markdown pesado, sin asteriscos). " +
  "Responde en el idioma del usuario, por defecto español. Sé claro, amable, cálido y conciso. " +
  "Recuerdas todo lo dicho antes en esta conversación y lo usas para responder. " +
  "Si no sabes algo, dilo con honestidad en lugar de inventar.";

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Método no permitido." });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return json(500, { error: "Falta configurar GEMINI_API_KEY en Netlify." });

  let messages;
  try {
    messages = JSON.parse(event.body || "{}").messages;
  } catch (e) {
    return json(400, { error: "Solicitud no válida." });
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
  if (!valid) return json(400, { error: "Mensajes no válidos." });

  try {
    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      encodeURIComponent(MODEL) +
      ":generateContent";
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        generationConfig: { maxOutputTokens: 800, temperature: 0.7 },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("Gemini API error", res.status, JSON.stringify(data));
      const msg =
        res.status === 429
          ? "Hay muchas personas usando AIvora ahora. Espera un momento e inténtalo otra vez."
          : "El servicio de respuestas no está disponible ahora.";
      // DIAGNÓSTICO: se devuelve el motivo real para verlo en pantalla. Bórralo cuando todo funcione.
      const detail = "Gemini " + res.status + ": " + String((data.error && data.error.message) || "").slice(0, 200);
      return json(res.status === 429 ? 429 : 502, { error: msg, detail });
    }
    const parts = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
    const text = parts.map((p) => p.text || "").join("").trim();
    if (!text) return json(502, { error: "No se obtuvo respuesta. Intenta de nuevo." });
    return json(200, { text });
  } catch (e) {
    console.error(e);
    return json(502, { error: "No se pudo contactar al servicio de respuestas." });
  }
};
