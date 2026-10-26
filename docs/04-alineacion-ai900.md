# 04 · Alineación de InnovVentas con el curso AI-900

Curso: **AI-900T00 — Microsoft Azure AI Fundamentals** (Conceptos Básicos de IA en
Microsoft Azure), material técnico de apoyo **PIAD-627 (senati)**. Este documento
mapea las tareas del material con lo que el proyecto realmente usa, como guía de
sustentación.

## Mapa TAREA PIAD-627 ↔ Implementación

El material del curso se organiza en 4 tareas:

| TAREA del material | Servicios enseñados | ¿Se usa en InnovVentas? | Dónde |
|---|---|---|---|
| **T 01** · Modelos predictivos sin código (Azure ML) + Introducción a la IA + IA responsable | Azure ML (AutoML, diseñador), principios de IA responsable | **Conceptual**: principios de IA responsable aplicados al chat. Azure ML AutoML/diseñador **no aplica** al alcance (no entrenamos modelos tabulares.SQL/Edge) | Chat: handoff a humano rate limit, validez server-side de stock/precios |
| **T 02** · Explora Computer Vision | Visión de Azure AI, Custom Vision, Image Analysis 4.0, OCR | **No aplica** al alcance del MVP (toco el catálogo en la BD). Se menciona en README que las fotos de producto requieren assets con licencia | — |
| **T 03** · Explora el procesamiento del lenguaje natural | Text Analytics, análisis de sentimientos, Language Understanding (LUIS) | **Parcial**: el concepto de extraer intención del texto está implementado — no con LUIS (servicio en retiro, como QnA Maker) sino con el sucesor vivo moderno: **CQA en Language Studio** | `askCqa()` en la Edge Function |
| **T 04** · Explora la IA conversacional | **QnA Maker**, CLU, Bot Service, ciclo de vida del proyecto | **Sí — tarea central aplicada al 100%**: el proyecto InnovaBot es *exactamente* la KB de pares pregunta-respuesta del material, construida con Herramienta Language Studio (el sucesor actual de QnA Maker) | InnovaBot + deployment `production` |

**Nota de sustentación clave**: el material enseña QnA Maker y LUIS (servicios
retirados *deprecated*); InnovVentas implementa el mismo ciclo de vida y la misma
estructura de base de conocimiento (para pregunta-respuesta, variaciones, confianza)
usando su reemplazo oficial actual: **Azure AI Language — Custom Question Answering**.
El flujo del material (crear KB → importar → entrenar/publicar → preguntar por REST
al endpoint) es idéntico al ejecutado en Language Studio con InnovaBot.

## Mapa módulo AI-900 (referencial) ↔ Implementación

| Módulo AI-900 | Servicio enseñado | ¿Se usa en InnovVentas? | Dónde |
|---|---|---|---|
| Principios de IA responsable | Transversal (equidad, privacidad, seguridad, transparencia) | **Sí** | Chat: nunca pide datos de tarjeta, rate limit, handoff a humano, se declara que es demo; el backend valida todo lo crítico (stock/precios) |
| Visión de computadora (Computer Vision, Custom Vision, Face, OCR) | Azure AI Vision | **No aplica** al alcance del MVP | — |
| Procesamiento de lenguaje natural | **Azure AI Language — Custom Question Answering** | **Sí (núcleo del chatbot)** | `supabase/functions/chat/index.ts` → `askCqa()` contra el recurso `botinnoventas` (proyecto **InnovaBot**, deployment `production`), entrenado con `docs/azure-cqa-innovventas-kb.tsv` desde Language Studio |
| Minería de conocimiento (AI Search / Knowledge Mining) | Azure AI Search | **Patrón equivalente, no el servicio**: el catálogo vivo se consulta contra PostgreSQL (Supabase) con índices, no contra AI Search | Vista `published_products` + consultas REST del frontend y del Edge |
| IA generativa (Azure OpenAI, patrones "sobre tus propios datos") | Azure AI Studio / OpenAI | **No directamente**; replicamos el patrón *KB estática + datos propios en vivo* con reglas determinísticas sobre la BD (recomendaciones por specs), que es más auditable y sin costo de tokens | `buildRecommendation()` detecta intención, consulta `published_products` y responde con precios/stock reales |

## Arquitectura del asistente (híbrida)

```
Usuario → Widget React (/chat)
   │  POST { message, sessionId }
   ▼
Edge Function `chat`  (la key de Azure vive aquí como secret; nunca en el navegador)
   ├─ Intención de recomendación/comparación → consulta `published_products`
   │   → respuesta con S/, stock y specs en vivo  [mode=recommendation]
   └─ Resto de preguntas → Azure CQA (InnovaBot)
       → respuesta de la KB entrenada      [mode=azure]
       └─ confianza < 0.35 o sin KB        → fallback honesto / handoff [mode=fallback]
```

## Puntos para la sustentación (demo)

1. **Flujo del curso aplicado literal**: Language Studio → Custom question answering →
   crear proyecto → importar TSV → Guardar → Deploy → probar en el panel Test.
   El mismo endpoint ayuda con el que consulta la función.
2. **Buenas prácticas de seguridad del AI-900**: la llave de Azure se guarda como
   secret de la Edge Function (`supabase secrets set`), no se compila al frontend;
   la interacción con el recurso es llamada server-side.
3. **IA responsable en acción**: el bot declara qué es (demo), se limita la tasa de
   mensajes por minuto, no procesa pagos ni recibe datos sensibles, y deriva a un
   humano cuando la respuesta tiene baja confianza o el usuario lo pide.
4. **Limitación de la IA estática resuelta con datos**: las políticas cambian poco
   (vivo en la KB), pero el catálogo cambia siempre (vivo en la BD) — por eso el
   precio/stock de una recomendación no lo responde la KB sino la consulta directa.
