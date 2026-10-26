# 02 · Azure Custom Question Answering (chatbot serve-side)

El asistente de InnovVentas responde preguntas de la tienda con **Azure Custom
Question Answering (CQA)** — parte de Language Service — invocada **exclusivamente
desde la Edge Function `chat`**. El navegador nunca ve la llave de Azure.

## 1. Crear el recurso

1. Portal Azure → **Create a resource → Language Service**.
2. Selecciona *Custom question answering (CQA)*; incluye el recurso **Azure Cognitive
   Search** (plan básico o superior; obligatorio para CQA).
3. Región recomendada: cercana (p. ej. `eastus2` para-latam). Pricing S0 para pruebas.

## 2. Crear la base de conocimiento

1. En el recurso de Language → **Custom question answering → Create project**
   (ej. `innovventas-faq`).
2. Idioma: español (Latin America / `es`). Pregunta base: “Bienvenida a InnovVentas”.
3. Carga la KB de ejemplo (v3, modelos reales con precios de referencia en S/):
   - `docs/azure-cqa-innovventas-kb.json` — si el portal acepta **Import as JSON**
     (o si usas la API/SDK de importación).
   - `docs/azure-cqa-innovventas-kb.tsv` — formato **Question → Answer** (una fila
     por variante de pregunta, UTF-8 con BOM) para el *Import from file* del
     portal, que solo acepta `txt/tsv/doc/docx/xlsx`.
   - El nombre del proyecto: `innovventas-faq`. Cubre catálogo (HP/ASUS/Acer/LG/
     Logitech/etc.), envíos en soles (S/ 15, gratis desde S/ 1,500), cambios,
     garantías, seguimiento INV-AAAAMM-######, pagos demo y recomendaciones por
     perfil (estudio / gaming / arquitectura).
   - **Importante**: tras importar hay que **Guardar → Deploy** (el deploy entrena
     y publica; no hay paso de entrenamiento separado en CQA). Si editas la KB sin
     volver a publicar, el endpoint sigue sirviendo el modelo anterior.
4. Flujo ya ejecutado en este proyecto (Language Studio):
   - Proyecto CQA: **InnovaBot** (recurso Language `botinnoventas.cognitiveservices.azure.com`)
     · deployment **production** · idioma es.
   - KB cargada con 47 pares (195 variantes) desde `docs/azure-cqa-innovventas-kb.tsv`.
   - Secrets configurados con `supabase secrets set` (ver sección 3) — verificado
     end-to-end: preguntas de política responden con `mode=azure` (conf ≥ 0.9),
     recomendaciones de catálogo siguen respondiendo con `mode=recommendation`
     (datos vivos de `published_products`, sin pasar por Azure).
   > Las recomendaciones dinámicas (precios/stock en vivo) las calcula la Edge
   > Function `chat` consultando `published_products`; la KB cubre lo estático.
4. Dale “Guardar → Entrenar → Publicar”.

> Añade en producción sin inventar URLs. Las respuestas no enlazan rutas que no
> existen; puedes enriquecer con “fuente: <texto>” o enlaces a secciones reales.

## 3. Variables de la Edge Function

En el proyecto de **Supabase** (no en el navegador):

```bash
supabase secrets set AZURE_CQA_ENDPOINT="https://<lenguaje-recurso>.cognitiveservices.azure.com" \
  AZURE_CQA_KEY="<Primary/Secondary Key>" \
  AZURE_CQA_PROJECT="<nombre proyecto CQA>" \
  AZURE_CQA_DEPLOYMENT="<deployment name>"
```

- `AZURE_CQA_ENDPOINT` — el host **del recurso de Language** (o CQA-direct host
  `https://<resource>.azurewebsites.net` según tu creado).
- `AZURE_CQA_KEY` — en **Language → Custom question answering → Get deployment
  details** tambiénse verifica tu clave.
- `AZURE_CQA_PROJECT` / `AZURE_CQA_DEPLOYMENT` — como los muestre “Deployment details”.

Env test desde la máquina:

```bash
curl -X POST "$AZURE_CQA_ENDPOINT/language/:query-knowledgebases?api-version=2021-10-01" \
  -H "Ocp-Apim-Subscription-Key: $AZURE_CQA_KEY" \
  -H "Content-Type: application/json" \
  -d '{"top":1,"question":"¿Cuánto cuesta el envío?"}'
```

## 4. Comportamiento del frontend

- El widget de chat envía `{ message, sessionId }` a la Edge Function `chat`.
- La Edge Function:
  - identifica/guarda conversación en `chat_conversations`/`chat_messages`
    (los invitados usan `sessionId` anónimo, nadie ve historial ajeno),
  - aplica **rate limit** (8 mensajes/60 s por sesión → error
    `TOO_MANY_MESSAGES` amigable),
  - consulta Azure CQA con el texto del usuario,
  - `confident` si ≥ 0.35; si Azure falla/devuelve baja confianza y sin领导小组
    exacta → resortes a textos de demo confiables (`DEMO_FALLBACK`,
    `LOW_CONFIDENCE_FALLBACK`).
- El widget muestra “alta/media/baja confianza” con `confidentConfidenceLabel`.
- Si hay **problems de disponibilidad**: mensaje sugerencia “contacta vía formulario”
  con enlace real `/contacto`.

## 5. Preguntas de ejemplo (español)

- ¿Qué laptops tienes disponibles?
- ¿Cuánto tarda el envío? ¿Es gratis?
- ¿Cómo rastreo mi pedido INV-202601-0012?
- ¿Qué cubre la garantía?
- ¿Puedo pagar con transferencia o contra entrega?

## Solución de problemas

| Síntoma | Causa probable |
|---|---|
| Chat siempre “fallback” | Secretos mal escritos, projects no publicada, o región del Language vs Search distintas |
| `401` en Edge logs | `AZURE_CQA_KEY` incorrecta/regenerada |
| Respuestas fuera de tema | La KB no “entrenada/publicada”; añade variaciones de preguntas |
| Respuestas muy lentas | Plan de Search sub-usado: verifica throughput deltier de Cognitive Search |
