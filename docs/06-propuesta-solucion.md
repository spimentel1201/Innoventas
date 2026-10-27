# Propuesta de Solución — Caso Práctico PIAD-627 (AI-900)

> InnovVentas · Asistente conversacional **InnovaBot** sobre tienda E‑commerce
> Redacción lista para el informe. Basada en la implementación real del proyecto.

---

## 1. Necesidades del cliente y problemas identificados en el flujo de E‑commerce

**Cliente:** InnovVentas, tienda de tecnología (Perú) con catálogo de equipos reales —laptops, monitores, periféricos, audio, impresoras y almacenamiento— que opera en modo demostración con moneda soles (S/), envíos a todo el país y políticas de pago, garantía y devolución propias.

**Problemas identificados en el flujo de E‑commerce:**

1. **Fricción en la descubrimiento de producto.** El comprador debe recorrer catálogo y filtros para llegar al equipo adecuado; no sabe traducir su necesidad ("estudio", "gaming", "editar video") a especificaciones (RAM, GPU, pantalla).
2. **Consultas repetitivas de políticas.** Dudas sobre envíos (S/ 15, gratis desde S/ 1,500), métodos de pago (Yape, Plin, contra entrega), garantía (12 y 6 meses), devoluciones (5 días naturales) y estados del pedido saturan al equipo humano.
3. **Desinformación de precios y stock.** Los precios y la disponibilidad cambian; el comprador necesita respuestas con el **dato vigente**, no un texto estático.
4. **Atención humana costosa y lenta.** El equipo dedica tiempo a responder lo mismo todo el día; los clientes esperan fuera de horario sin respuesta.
5. **Falta de guía en la compra.** El comprador abandona ante dudas de compatibilidad ("¿mi laptop conecta a un monitor?") y elección de accesorios.

**Solución propuesta:** un chatbot híbrido que (a) responde políticas desde una **base de conocimiento** mantenida por el equipo, y (b) genera **recomendaciones de producto con datos en vivo** del catálogo, con escalamiento a persona cuando hace falta.

---

## 2. Diseño del Chatbot

### 2.1 Esquema de interacciones

| Rol | Quién | Acciones |
|---|---|---|
| **Usuario (invitado o registrado)** | Comprador del sitio | Escribe en el widget de chat; los registrados conservan historial y ven sus pedidos |
| **InnovaBot** | Bot (automático) | Responde desde KB (Azure CQA) o desde el catálogo vivo (recomendaciones); sugiere handoff |
| **Equipo humano** | Atención al cliente | Recibe eventos `handoff_requested` y los casos del formulario de Contacto |

**Esquema técnico de interacción:**

```
Navegador (React) ──POST /functions/v1/chat {message, sessionId}──▶
  Edge Function "chat" (Supabase)
      ├──▶ Azure AI Language · Custom Question Answering  (políticas)
      └──▶ PostgreSQL (vista published_products)           (precios/stock en vivo)
  ◀── JSON {message, mode: azure | recommendation | fallback, confidence, intent}
```

- El usuario puede interactuar como **invitado** (con `sessionId` en el navegador) o **autenticado** (JWT de Supabase Auth).
- La clave de Azure **nunca** llega al navegador: vive en los secretos de la Edge Function (principio de defensa en profundidad).

### 2.2 Flujo de conversación

Ver diagrama completo en `docs/diagrama-flujo-chat.md` (Mermaid) y `docs/diagrama-flujo-chat.html` (visual). Resumen:

1. El mensaje entra a la Edge Function → validación de esquema (Zod, 1–600 caracteres) y **rate limit** de 8 mensajes/min por conversación.
2. Se persiste la conversación y el mensaje (`chat_conversations`, `chat_messages`) con eventos de auditoría (`chat_events`).
3. **Detección de intención de recomendación** por palabras clave (gaming, arquitectura, Photoshop, estudiar, comparaciones tipo "¿por qué una y no otra?").
   - Si hay intención → se consulta el catálogo **en vivo** y se arma la recomendación (laptop más barata para estudio; mejor GPU dedicada para gaming; GPU+RAM para arquitectura; más RAM para edición), con **precio en S/ y unidades disponibles del momento** → `mode = recommendation`.
4. Si no hay intención de recomendación → consulta a **Azure CQA** (proyecto InnovaBot, despliegue production, top 3 respuestas ordenadas por `confidenceScore`).
   - Confianza ≥ **0.35** → responde la KB → `mode = azure`.
   - Confianza < 0.35 o Azure no disponible → respuesta honesta de escalamiento → `mode = fallback` y evento `fallback` auditable.
5. La respuesta se guarda, se devuelve al navegador y se renderiza con formato (negrita y saltos de línea).
6. El usuario puede pedir **handoff humano** (`handoff_requested`); la conversación pasa a estado `handoff`.

### 2.3 Preguntas frecuentes que aborda (KB)

Base de conocimiento de **49 pares / 211 variaciones de pregunta** en español, agrupadas por tema:

| Tema | Ejemplos de pregunta cubierta |
|---|---|
| Saludo y bienvenida | «Hola», «Buenas tardes», «¿Quién eres?», «¿Qué puedes hacer?» |
| Catálogo y oferta | «¿Qué venden?», «¿Qué ofertas hay?», «¿Cuáles son los más vendidos?» |
| Compra y carrito | «¿Cómo compro?», «¿Puedo modificar el carrito?», «¿Qué métodos de pago aceptan? ¿Yape o Plin?» |
| Precios e impuestos | «¿Los precios incluyen IGV?», «¿El precio mostrado es el final?» |
| Envíos y seguimiento | «¿Cuánto cuesta el envío?», «¿Envían a provincias?», «¿Cómo rastreo mi pedido?» |
| Garantía y devoluciones | «¿Qué cubre la garantía?», «¿En cuántos días puedo devolver?», «Llegó dañado» |
| Recomendaciones y comparación | «¿Laptop para estudiar/gaming/AutoCAD?», «¿Cuánta RAM necesito?», «¿SSD o HDD?», «¿Qué monitor me recomiendan?» |
| Límites del bot | «¿Puedo comprar por el chat?», «¿Confirma stock?», «No entendí» |
| Escalamiento | «Quiero hablar con una persona», «¿Cómo cancelo un pedido?» |

Cada par tiene hasta 10 preguntas alternas (promedio ~4), lo que permite al modelo comprender **distintas formas de preguntar lo mismo** sin entrenar expresiones una por una.

---

## 3. Plataformas y frameworks — justificación de la elección

| Componente | Tecnología | Justificación |
|---|---|---|
| **NLU / Chatbot** | Azure AI Language — *Custom Question Answering* | Servicio de IA administrado (tema del curso AI‑900): entiende preguntas en lenguaje natural con semántica y confianza medible; el equipo de negocio mantiene la KB en Language Studio **sin programar**; el despliegue (production) se versiona y publica con Guardar → Deploy, y el umbral de confianza permite detectar cuándo no sabe. |
| **Motor de recomendación** | Supabase Postgres + Edge Function (TypeScript) | La recomendación no puede ser texto estático: requiere **precio y stock del momento**. La lógica corre en servidor junto a la base de datos, con ranking por especificaciones (RAM, modelo de GPU) y sin exponer credenciales al navegador. |
| **Backend / datos** | Supabase (PostgreSQL, Auth, Storage, Edge Functions, RLS) | Backend‑as‑a‑Service: autenticación, base de datos con vistas públicas (`published_products`), auditoría (`chat_messages`, `chat_events`) y funciones serverless con escalado automático, todo en un solo servicio y con políticas de seguridad por fila (RLS). |
| **Frontend** | React 18 + TypeScript + Vite + Tailwind CSS | Stack moderno y tipado: arranque instantáneo (Vite), componentes reutilizables para el widget de chat y UI consistente con utilidades (Tailwind). TypeScript reduce errores en tiempo de compilación. |
| **Seguridad** | Secretos de Edge Function + validación (Zod) + rate limit + RLS | La clave de Azure solo vive en el servidor; el usuario solo puede leer **su** conversación (403 si intenta leer otra); límite de 8 msg/min y validación de esquema contra abuso — alineado con los principios de responsible AI (seguridad, privacidad, confiabilidad). |
| **Monitoreo** | `chat_events` + métricas de confianza | Eventos de `message_sent`, `recommendation`, `fallback` y `handoff_requested` permiten medir aciertos, detectar huecos de la KB y **mejorar el modelo** continuamente (ciclo de vida del bot del curso). |

**Relación con los objetivos de AI‑900 (PIAD‑627):** uso de servicios de IA administrados de Azure (Language), claves y endpoint de Cognitive Services, proyectos y despliegues de Custom Question Answering, medición de confianza y umbrales, y ciclo de mejora del modelo con datos reales de conversación.

---

## 4. Plan de Implementación — pasos para integrar el chatbot al sitio web

| # | Paso | Detalle | Evidencia en el proyecto |
|---|---|---|---|
| 1 | **Preparar la base de conocimiento** | Redactar pares de pregunta/respuesta en lenguaje del comprador (49 pares / 211 variantes) con preguntas alternas por par; archivo maestro JSON → TSV para importar | `docs/azure-cqa-innovventas-kb.json` / `.tsv` / `.xlsx` |
| 2 | **Crear el recurso de Azure** | Recurso de tipo *Language* en Azure; proyecto *Custom Question Answering* (InnovaBot, español); importar el TSV; **Guardar → Deploy** al despliegue `production` | `docs/02-azure-cqa-setup.md` |
| 3 | **Exponer catálogo y seguridad en BD** | Vista `published_products` (nombre, marca, precio, oferta, stock, specs, categoría) con RLS; tablas `chat_conversations`, `chat_messages`, `chat_events` | migraciones en `supabase/migrations` |
| 4 | **Desarrollar la Edge Function `chat`** | Endpoint único que: valida esquema, aplica rate limit, persiste conversación, decide entre recomendación en vivo y Azure CQA (umbral 0.35), guarda la respuesta con su `mode` y devuelve JSON | `supabase/functions/chat/index.ts` |
| 5 | **Configurar secretos y desplegar la función** | `AZURE_CQA_ENDPOINT/KEY/PROJECT/DEPLOYMENT` como secretos de Supabase (nunca en el frontend); despliegue con Supabase CLI | `supabase secrets set …` |
| 6 | **Integrar el widget en el sitio web** | Componente React de chat flotante en el layout: autenticación opcional, `sessionId` persistente, envío/recepción de mensajes, render de Markdown, botón de handoff y carga del historial | `src/features/chat/` + layout |
| 7 | **Pruebas end‑to‑end** | Casos de éxito por modo (azure, recommendation, fallback), handoff, rate limit, seguridad (403) y render móvil/escritorio | `docs/03-tests.md` |
| 8 | **Publicar y monitorear** | Deploy del sitio (Vite build) y de la función; revisar eventos `fallback`/`handoff` para **agregar preguntas alternas** al TSV y redesplegar la KB — ciclo de mejora continua | `docs/04-deploy.md` |

**Resultado:** el comprador conversa en español dentro de la tienda, recibe políticas consistentes de la KB de Azure y recomendaciones con precio y stock reales de la base de datos, y puede escalar a una persona en cualquier momento — sin exponer credenciales y con auditoría completa de cada interacción.
