# AIvora gratis en Netlify (con Google Gemini)

Chatbot web de solo texto, público para cualquier persona, sin costo mientras uses
el plan gratuito de Netlify y el nivel gratuito de Gemini.

## Cosas que debes saber
- El nivel gratuito de Gemini tiene límite de mensajes por minuto y por día. Si mucha gente
  usa la página, algunos verán el aviso "Hay muchas personas usando AIvora ahora".
- En el nivel gratuito, Google puede usar lo que se escribe para mejorar sus productos.
  Avisa a tus visitantes que no escriban datos personales o privados.
- Las condiciones del nivel gratuito cambian. Revísalas en https://ai.google.dev/gemini-api/docs/pricing
- Si algún día quieres otro modelo, cambia la variable `GEMINI_MODEL` en Netlify.

## Paso 1: clave gratis de Gemini
1. Entra a https://aistudio.google.com e inicia sesión con tu cuenta de Google.
2. Pulsa "Get API key" y crea una clave. Cópiala.
   No actives facturación (billing): déjalo en el nivel gratuito.

## Paso 2: subir el proyecto a GitHub
1. Crea cuenta en https://github.com y un repositorio nuevo llamado `aivora`.
2. "Add file" > "Upload files". Arrastra `index.html`, `netlify.toml` y la carpeta `netlify`.
3. Pulsa "Commit changes".

## Paso 3: publicar en Netlify
1. Crea cuenta en https://app.netlify.com (gratis).
2. "Add new site" > "Import an existing project" > GitHub > elige `aivora`.
3. No cambies nada y pulsa "Deploy".
4. Site configuration > Environment variables > "Add a variable":
   - Clave: `GEMINI_API_KEY`
   - Valor: la clave del paso 1
5. Deploys > "Trigger deploy" > "Deploy site".
6. Abre el enlace `.netlify.app` y prueba el chat. Compártelo con quien quieras.

Para cambiar el nombre del enlace: Site configuration > "Change site name".

## Notas
- Las conversaciones se guardan en el navegador de cada visitante, y cada uno puede eliminarlas.
- Nunca pongas tu clave dentro de `index.html`.
