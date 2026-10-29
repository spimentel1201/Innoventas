// ─────────────────────────────────────────────────────────────────────────────
// Edge Function: chat
// Puente hacia Azure Language Custom Question Answering.
// - Autenticación: usuario vía JWT (opcional, invitados permitidos con sessionId).
// - Protege: rate limit por usuario/sesión, persistencia y auditoría de eventos.
// - NUNCA expone la clave de Azure al frontend.
// Despliegue: ver docs/02-azure-cqa-setup.md
// ─────────────────────────────────────────────────────────────────────────────
// Pin exacto (ver comentario en supabase/functions/create-order/index.ts).
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2.118.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { detectKitIntent, handleKitMessage, startKit, type KitState } from "./kit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-innov-session",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const messageSchema = z.object({
  message: z.string().trim().min(1, "MENSAJE_VACIO").max(600, "MENSAJE_MUY_LARGO"),
  sessionId: z.string().min(8).max(64),
});

const eventSchema = z.object({
  event: z.enum(["handoff_requested"]),
  sessionId: z.string().min(8).max(64),
  conversationId: z.string().uuid().optional(),
});

const RATE_LIMIT_MESSAGES = 8;
const RATE_LIMIT_WINDOW_SECONDS = 60;
const FALLBACK_THRESHOLD = 0.35;

function serviceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("SERVICE_CONFIG_MISSING");
  return createClient(url, key, { auth: { persistSession: false } });
}

interface CqaAnswer {
  answer: string;
  confidenceScore: number;
  source?: string;
  questions?: string[];
}

async function askCqa(question: string): Promise<CqaAnswer | null> {
  const endpoint = (Deno.env.get("AZURE_CQA_ENDPOINT") ?? "").replace(/\/$/, "");
  const key = Deno.env.get("AZURE_CQA_KEY");
  const project = Deno.env.get("AZURE_CQA_PROJECT");
  const deployment = Deno.env.get("AZURE_CQA_DEPLOYMENT") ?? "production";

  if (!endpoint || !key || !project) return null; // modo sin configurar → fallback demo

  let res: Response;
  try {
    res = await fetch(
      `${endpoint}/language/:query-knowledgebases` +
        `?api-version=2021-10-01&projectName=${encodeURIComponent(project)}` +
        `&deploymentName=${encodeURIComponent(deployment)}`,
      {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question,
          top: 3,
          includeUnstructuredContent: true,
        }),
      },
    );
  } catch (err) {
    console.error("[chat] Azure fetch falló:", err);
    throw new Error("AZURE_UNAVAILABLE");
  }

  if (!res.ok) {
    console.error("[chat] Azure respondió:", res.status, await res.text().catch(() => ""));
    throw new Error("AZURE_ERROR");
  }

  const data = (await res.json()) as { answers?: CqaAnswer[] };
  const answers = (data.answers ?? [])
    .filter((a) => a.answer && a.answer.trim() !== "")
    .sort((a, b) => (b.confidenceScore ?? 0) - (a.confidenceScore ?? 0));
  return answers[0] ?? null;
}

const DEMO_FALLBACK =
  "¿Te puedo ayudar con un tema específico? Al parecer no tengo la base de conocimiento " +
  "de Azure conectada aún (revisa docs/02-azure-cqa-setup.md). " +
  "Mientras tanto, para productos, envíos, cambios y garantías puedes escribir al equipo humano en la página de contacto.";

const LOW_CONFIDENCE_FALLBACK =
  "No tengo una respuesta con la confianza suficiente en mi base de conocimiento. " +
  "Puedo conectarte con el equipo humano: usa la página de contacto y te respondemos pronto.";

// ── Recomendaciones híbridas: datos vivos del catálogo ────────────────────────
// Cuando el mensaje expresa una intención de recomendación/comparación, se consulta
// `published_products` en servidor (datos reales: precio en S/, stock, specs) y se
// arma la respuesta con ese dato vivo. La KB de Azure queda para políticas fijas.
type RecIntent = "estudio" | "gaming" | "arquitectura" | "creativo" | "comparacion";

function normalizeText(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const REC_KEYWORDS: Array<{ intent: RecIntent; keywords: string[] }> = [
  {
    intent: "gaming",
    keywords: ["gaming", "gamer", "juego", "jugar", "videojuego", "fortnite", "valorant", "cs2", "counter", "dota", "minecraft", "roblox", "fifa", "call of", "fps", "ray tracing", "rtx"],
  },
  {
    intent: "arquitectura",
    keywords: ["arquitectura", "arquitecto", "autocad", "revit", " cad", "cad)", "sketchup", "lumion", "vray", "v-ray", "render", "ingenieria civil", "ciprl", "planos"],
  },
  {
    intent: "creativo",
    keywords: ["photoshop", "premiere", "davinci", "illustrator", "ilustrator", "edicion de video", "editar video", "diseno grafico", "disenar", "animacion", "modelado 3d", "after effects", "figma"],
  },
  {
    intent: "estudio",
    keywords: ["estudi", "universidad", "universitaria", "colegio", "tarea", "apuntes", "clase", "examen", "tesis", "ofimatica", "word", "excel", "laptop para", "economica", "barata"],
  },
];

// Frases que piden "¿por qué una sí y otra no?" → respuesta comparativa completa.
const EXPLAIN_MARKERS = ["por que la", "porque la", "por que recomiendas", "diferencia entre", "vale la pena", "por que elegir", "por que no la"];
// Frases comparativas que solo piden comparar ("¿mejor laptop para gaming?" = recomendación específica).
const COMPARE_MARKERS = ["por que ", "porque ", "diferencia", "comparar", "compara ", "cual de estas"];

function detectRecIntent(message: string): RecIntent | null {
  const norm = " " + normalizeText(message) + " ";
  const specific = REC_KEYWORDS.find(({ keywords }) => keywords.some((k) => norm.includes(k)))?.intent ?? null;
  const asksWhy = EXPLAIN_MARKERS.some((k) => norm.includes(k));
  if (asksWhy) return "comparacion"; // explica por qué una sí y otra no
  if (specific) return specific;
  const asksCompare = COMPARE_MARKERS.some((k) => norm.includes(k));
  if (asksCompare && norm.includes("laptop")) return "comparacion"; // compara el catálogo de laptops
  return null;
}

interface CatalogRow {
  name: string;
  brand: string;
  slug: string;
  price: number;
  stock: number;
  specifications: Record<string, unknown> | null;
  offer_price: number | null;
  category_slug: string;
}

async function fetchCatalogLive(supabase: SupabaseClient): Promise<CatalogRow[]> {
  const { data, error } = await supabase
    .from("published_products")
    .select("name,brand,slug,price,stock,specifications,offer_price,category_slug");
  if (error) throw new Error("CATALOG_QUERY_FAILED");
  return data as CatalogRow[];
}

function soles(value: number): string {
  return "S/ " + value.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function specOf(p: CatalogRow, keys: string[]): string {
  const specs = p.specifications ?? {};
  for (const k of keys) {
    const v = specs[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return "";
}

function solesPriceLine(p: CatalogRow): string {
  const effective = p.offer_price ?? p.price;
  const was = p.offer_price != null ? ` (antes ${soles(p.price)})` : "";
  const stock =
    p.stock > 0 ? `${p.stock} ${p.stock === 1 ? "unidad" : "unidades"} disponibles` : "está sin stock por el momento en la web";
  return `· [${p.name}](/producto/${p.slug}) (${p.brand}) — ${soles(effective)}${was} · ${stock}`;
}

// ── Listado vivo por categoría (botones del widget) ──────────────────────────
// Las píldoras del chat envían preguntas como «¿Qué audífonos tienen disponibles?».
// En lugar de responder con texto fijo de la KB, se consulta `published_products`
// y se devuelven precio (S/), oferta y stock reales de la categoría pedida.
interface CatalogCategory {
  slug: string;
  label: string;
  keywords: string[];
}

// Orden relevante: `accesorios` va antes que `mouse` para que «mousepad» no caiga
// en la categoría de mouse.
const CATALOG_CATEGORIES: CatalogCategory[] = [
  {
    slug: "accesorios",
    label: "accesorios",
    keywords: ["accesorio", "hub usb", "docking", "webcam", "mousepad", "mouse pad"],
  },
  {
    slug: "audifonos",
    label: "audífonos",
    keywords: ["audifon", "auricular", "audiculo", "diadema", "headphone", "earbud", "cascos"],
  },
  { slug: "laptops", label: "laptops", keywords: ["laptop", "notebook", "computadora portatil", "pc portatil"] },
  { slug: "monitores", label: "monitores", keywords: ["monitor", "ultrawide", "pantalla para pc"] },
  { slug: "teclados", label: "teclados", keywords: ["teclado"] },
  { slug: "impresoras", label: "impresoras", keywords: ["impresora", "imprimir documentos", "escaneador"] },
  {
    slug: "almacenamiento",
    label: "almacenamiento",
    keywords: ["almacenamiento", "ssd", "disco duro", "disco externo", "memoria microsd", "memoria sd"],
  },
  { slug: "mouse", label: "mouse", keywords: ["mouse", "raton"] },
];

function detectCatalogCategory(message: string): CatalogCategory | null {
  const norm = " " + normalizeText(message) + " ";
  return CATALOG_CATEGORIES.find((c) => c.keywords.some((k) => norm.includes(k))) ?? null;
}

// Devuelve null si la categoría no existe en el catálogo (→ se continúa con CQA).
async function buildCategoryListing(
  supabase: SupabaseClient,
  category: CatalogCategory,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("published_products")
    .select("name, brand, slug, price, stock, specifications, offer_price, category_slug")
    .eq("category_slug", category.slug)
    .order("price", { ascending: true });
  if (error) throw new Error("CATALOG_QUERY_FAILED");

  const rows = (data ?? []) as CatalogRow[];
  if (rows.length === 0) return null;

  const top = rows.slice(0, 5);
  const rest = rows.length - top.length;
  const withStock = rows.filter((r) => r.stock > 0).length;
  const lines = [
    `Tenemos ${rows.length} ${category.label} en el **Catálogo** (${withStock} con stock inmediato). Precios y stock en vivo:`,
    ...top.map(solesPriceLine),
  ];
  if (rest > 0) lines.push(`…y ${rest} más en la sección **Catálogo**.`);
  lines.push(
    "Dime para qué los vas a usar (gaming, estudio, trabajo, llamadas) y te recomiendo el indicado.",
  );
  return lines.join("\n");
}

interface Picks {
  estudio?: CatalogRow;
  gaming?: CatalogRow;
  arquitectura?: CatalogRow;
  creativo?: CatalogRow;
  laptops: CatalogRow[];
}

function ramGb(p: CatalogRow): number {
  const m = (specOf(p, ["RAM"]) || "").match(/(\d{1,2})\s?GB/i);
  return m ? Number(m[1]) : 0;
}

// Ranking de GPU: número de modelo RTX/GTX (3050 > 2050 > 1650...). 0 = integrada.
function gpuModel(p: CatalogRow): number {
  const m = (specOf(p, ["Gráficos", "GPU"]) || "").match(/(?:RTX|GTX)\s?(\d{3,4})/i);
  return m ? Number(m[1]) : 0;
}

function hasDedicatedGpu(p: CatalogRow): boolean {
  return /RTX|GTX|GeForce|RX\s?\d/i.test(specOf(p, ["Gráficos", "GPU"]));
}

const priceOf = (p: CatalogRow) => p.offer_price ?? p.price;
const byPrice = (a: CatalogRow, b: CatalogRow) => priceOf(a) - priceOf(b);

// Selección por specs (no depende de slugs ni marcas concretas):
// - estudio: la laptop más barata del catálogo.
// - gaming: la de mejor GPU dedicada (modelo RTX/GTX más alto).
// - arquitectura: prioriza GPU dedicada, luego más RAM, luego GPU más potente.
// - creativo: la de más RAM del catálogo (Premiere/Photoshop son hambrientas de RAM).
function computePicks(rows: CatalogRow[]): Picks {
  const laptops = rows.filter((r) => r.category_slug === "laptops" && r.stock > 0);
  if (laptops.length === 0) return { laptops: [] };
  const byGpu = [...laptops].sort((a, b) => gpuModel(b) - gpuModel(a) || byPrice(a, b));
  const byRam = [...laptops].sort((a, b) => ramGb(b) - ramGb(a) || byPrice(a, b));
  const byArch = [...laptops].sort(
    (a, b) =>
      Number(hasDedicatedGpu(b)) - Number(hasDedicatedGpu(a)) ||
      ramGb(b) - ramGb(a) ||
      gpuModel(b) - gpuModel(a) ||
      byPrice(a, b),
  );
  return {
    estudio: [...laptops].sort(byPrice)[0],
    gaming: byGpu.find(hasDedicatedGpu),
    arquitectura: byArch[0],
    creativo: byRam[0],
    laptops: [...laptops].sort(byPrice),
  };
}

function reasonFor(intent: RecIntent, picks: Picks): string {
  switch (intent) {
    case "estudio":
      return picks.estudio
        ? `Para estudiar y tomar apuntes la mejor relación precio–rendimiento es la **${picks.estudio.name}**: ${specOf(picks.estudio, ["Procesador", "CPU"])}, ${specOf(picks.estudio, ["RAM"])}, pantalla ${specOf(picks.estudio, ["Pantalla"])} y ${specOf(picks.estudio, ["Almacenamiento"])}. Va sobrada para Word/Excel, navegación, clases online y Visual Studio Code. Su gráfica (${specOf(picks.estudio, ["Gráficos", "GPU"])}) no corre juegos AAA ni CAD pesado: si eso es lo tuyo, revisa las respuestas de gaming o arquitectura.`
        : "Para estudiar la clave es relación precio–rendimiento: revisa las laptops del Catálogo ordenadas de más económica en adelante.";
    case "gaming":
      return picks.gaming
        ? `Para gaming la indicada es la **${picks.gaming.name}** (${picks.gaming.brand}): ${specOf(picks.gaming, ["Procesador", "CPU"])}, ${specOf(picks.gaming, ["RAM"])} y gráfica dedicada **${specOf(picks.gaming, ["Gráficos", "GPU"])}**. Corre títulos AAA en 1080p a alta tasa de fps y en competitivos (Valorant, CS2, Dota 2) va muy fluida con su pantalla de ${specOf(picks.gaming, ["Pantalla"])}.`
        : "Para gaming la clave es una GPU dedicada (RTX): revisa las laptops del Catálogo con la mayor potencia gráfica y stock disponible.";
    case "arquitectura": {
      if (!picks.arquitectura) {
        return "Para CAD y render necesitas RAM generosa y gráfica dedicada: revisa las laptops con la mayor RAM y GPU dedicada en el Catálogo.";
      }
      const extra =
        picks.creativo && picks.creativo.slug !== picks.arquitectura.slug && ramGb(picks.creativo) > ramGb(picks.arquitectura)
          ? ` Si tu foco es más render/edición que CAD, la **${picks.creativo.name}** tiene más RAM (${specOf(picks.creativo, ["RAM"])}).`
          : "";
      return `Para arquitectura (AutoCAD, Revit, SketchUp, renders en V-Ray/Lumion) la opción sólida del catálogo es la **${picks.arquitectura.name}**: ${specOf(picks.arquitectura, ["Procesador", "CPU"])}, ${specOf(picks.arquitectura, ["RAM"])} y gráfica ${specOf(picks.arquitectura, ["Gráficos", "GPU"])}.${extra}`;
    }
    case "creativo":
      return picks.creativo
        ? `Para edición de video y diseño la mejor del catálogo es la **${picks.creativo.name}**: ${specOf(picks.creativo, ["RAM"])} de RAM y gráfica ${specOf(picks.creativo, ["Gráficos", "GPU"])} — ideal para Premiere, DaVinci y Photoshop con muchas capas abiertas.${picks.gaming && picks.gaming.slug !== picks.creativo.slug ? ` Alternativa con más GPU para efectos 3D: la **${picks.gaming.name}**.` : ""}`
        : "Para edición de video busca una laptop con mucha RAM y GPU dedicada: revisa el Catálogo.";
    case "comparacion":
      return "";
  }
}

function buildRecommendation(intent: RecIntent, rows: CatalogRow[]): string | null {
  const picks = computePicks(rows);

  if (intent === "comparacion") {
    const laptops = picks.laptops;
    if (laptops.length < 2) return null;
    const why = laptops.map((p) => {
      const bits: string[] = [];
      bits.push(hasDedicatedGpu(p) ? `GPU dedicada (${specOf(p, ["Gráficos", "GPU"])})` : "gráfica integrada — ni para juegos AAA ni CAD pesado");
      bits.push(`${specOf(p, ["RAM"])} de RAM`);
      if (p === picks.estudio) bits.push("la más económica: ideal para estudiar y oficina");
      return `· **${p.name}**: ${bits.join(", ")}`;
    });
    return [
      "Comparativa de las laptops del catálogo (precios y stock en vivo):",
      ...laptops.map(solesPriceLine),
      ...why,
      "Regla: compra según tu uso real — potencia que no usarás es peso, calor y dinero de más.",
    ].join("\n");
  }

  const reason = reasonFor(intent, picks);
  if (!reason) return null;
  const pick = intent === "estudio" ? picks.estudio : intent === "gaming" ? picks.gaming : intent === "arquitectura" ? picks.arquitectura : picks.creativo;
  const priceStock = pick
    ? `\n${solesPriceLine(pick)}\nPrecios y stock vigentes en el **Catálogo**, donde también verás ofertas y la ficha completa.`
    : "";
  return `Mi recomendación:\n${reason}${priceStock}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = serviceClient();

  try {
    // ── Identidad (opcional): valida el JWT del usuario si existe ──────────
    const url = new URL(req.url);
    let user: { id: string } | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const { data } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      user = data.user ? { id: data.user.id } : null;
    }

    // ── GET: historial de la conversación ──────────────────────────────────
    if (req.method === "GET") {
      // El backend autentica al usuario y valida previamente su identidad antes de devolver datos.
      const sessionId = req.headers.get("x-innov-session") ?? url.searchParams.get("sessionId");
      const zCheck = z.string().min(8).max(64).safeParse(sessionId);
      if (!zCheck.success) return json({ error: "SESSION_INVALID" }, 400);
      const { data: conv } = await supabase
        .from("chat_conversations")
        .select("id, user_id")
        .eq("session_id", zCheck.data)
        .maybeSingle();
      if (!conv) return json({ conversationId: null, messages: [] });
      if (conv.user_id && conv.user_id !== user?.id) {
        return json({ error: "FORBIDDEN: no puedes leer la conversación de otra persona" }, 403);
      }
      const { data: rows } = await supabase
        .from("chat_messages")
        .select("id, role, content, confidence, created_at, metadata")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: true })
        .limit(50);
      const messages = (rows ?? []).filter((r) => r.role !== "system");
      return json({ conversationId: conv.id, messages });
    }

    if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

    const raw = await req.json().catch(() => null);
    if (!raw) return json({ error: "BODY_INVALID" }, 400);

    // ── Eventos (ej. handoff a humano) ────────────────────────────────────
    if (raw.event) {
      const parsed = eventSchema.safeParse(raw);
      if (!parsed.success) return json({ error: "EVENT_INVALID", detail: parsed.error.issues[0]?.message }, 400);
      const { event, sessionId, conversationId } = parsed.data;
      let convId = conversationId ?? null;
      if (!convId) {
        const { data: conv } = await supabase
          .from("chat_conversations")
          .select("id")
          .eq("session_id", sessionId)
          .maybeSingle();
        convId = conv?.id ?? null;
      }
      await supabase.from("chat_events").insert({
        conversation_id: convId,
        user_id: user?.id,
        session_id: sessionId,
        event_type: event,
        payload: {},
      });
      if (convId) {
        await supabase.from("chat_conversations").update({ status: "handoff" }).eq("id", convId);
      }
      return json({ ok: true });
    }

    // ── Mensajes: validación y rate limit ────────────────────────────────
    const parsed = messageSchema.safeParse(raw);
    if (!parsed.success) {
      return json({ error: parsed.error.issues[0]?.message ?? "PAYLOAD_INVALID" }, 400);
    }
    const { message, sessionId } = parsed.data;

    // Conversación única por sesión (invitando usuarios autenticados a conservarlas).
    let conversationId: string | null = null;
    {
      const { data: conv } = await supabase
        .from("chat_conversations")
        .select("id, user_id")
        .eq("session_id", sessionId)
        .maybeSingle();
      if (conv) {
        if (conv.user_id && conv.user_id !== user?.id) {
          // choose to create a new conversation for this user
          const { data: created, error } = await supabase
            .from("chat_conversations")
            .insert({ user_id: user?.id ?? null, session_id: `${sessionId}:${Date.now()}` })
            .select("id")
            .single();
          if (error) throw error;
          conversationId = created.id;
        } else {
          conversationId = conv.id;
        }
      } else {
        const { data: created, error } = await supabase
          .from("chat_conversations")
          .insert({ user_id: user?.id ?? null, session_id: sessionId })
          .select("id")
          .single();
        if (error) throw error;
        conversationId = created.id;
      }
    }

    // Rate limit: N mensajes de usuario en ventana de 60s por conversación.
    const { count } = await supabase
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversationId)
      .eq("role", "user")
      .gt("created_at", new Date(Date.now() - RATE_LIMIT_WINDOW_SECONDS * 1000).toISOString());
    if ((count ?? 0) >= RATE_LIMIT_MESSAGES) {
      return json({ error: "TOO_MANY_MESSAGES", detail: `Máximo ${RATE_LIMIT_MESSAGES}/minuto` }, 429);
    }

    await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: message,
    });
    await supabase.from("chat_events").insert({
      conversation_id: conversationId,
      user_id: user?.id,
      session_id: sessionId,
      event_type: "message_sent",
      payload: { length: message.length },
    });

    // ── Recomendaciones híbridas (catálogo vivo) ──────────────────────────
    // Si el mensaje expresa una intención de recomendación/comparación, responde
    // con datos reales de `published_products` (precio en S/, stock, specs).
    // ── Rutas de respuesta (en este orden) ──────────────────────────────
    // 0. Kit en curso (pedido guiado): elegir opción, saltar o terminar.
    // 1. Inicio de kit nuevo («armar kit gamer»…).
    // 2. Listado vivo por categoría: manda cuando el mensaje nombra una categoría
    //    concreta (los botones del widget) y no es una recomendación de laptop.
    // 3. Recomendación híbrida por uso (gaming/estudio/arquitectura/creativo).
    // 4. Azure CQA para políticas y dudas generales.
    // ── Constructor de kit: el estado vive en metadata del último mensaje ──
    let kit: KitState | null = null;
    {
      const { data: last } = await supabase
        .from("chat_messages")
        .select("metadata")
        .eq("conversation_id", conversationId)
        .eq("role", "assistant")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const meta = (last?.metadata ?? null) as { kit?: KitState } | null;
      kit = meta?.kit && meta.kit.status === "choosing" ? meta.kit : null;
    }

    let answer: string | undefined;
    let confidence: number | null = null;
    let mode: "azure" | "fallback" | "recommendation" | "catalog" | "kit" = "azure";
    let recIntent: RecIntent | null = detectRecIntent(message);
    // ── 0. Kit en curso: elegir opción, saltar o terminar ────────────────
    let kitHandled = false;
    if (kit) {
      try {
        const step = await handleKitMessage(supabase, kit, message);
        if (step) {
          answer = step.answer;
          kit = step.kit;
          mode = "kit";
          kitHandled = true;
          recIntent = null;
        }
      } catch (e) {
        console.error("[chat] kit: falló el paso, continúa la ruta normal:", e);
      }
    }

    // ── 1. Inicio de kit nuevo («armar kit gamer», «kit de estudio»…) ────
    if (answer === undefined && !kitHandled) {
      const profile = detectKitIntent(message);
      if (profile) {
        try {
          const started = await startKit(supabase, profile);
          answer = started.answer;
          kit = started.kit;
          mode = "kit";
          kitHandled = true;
          recIntent = null;
        } catch (e) {
          console.error("[chat] kit: no se pudo iniciar, continúa la ruta normal:", e);
        }
      }
    }

    const catalogCategory = detectCatalogCategory(message);
    const useListing =
      catalogCategory !== null && !(recIntent !== null && catalogCategory.slug === "laptops");

    if (!kitHandled && useListing && catalogCategory) {
      try {
        const listing = await buildCategoryListing(supabase, catalogCategory);
        if (listing) {
          answer = listing;
          mode = "catalog";
          recIntent = null;
        }
      } catch (e) {
        console.error("[chat] listado de categoría falló, cae a CQA:", e);
      }
    }

    if (!kitHandled && answer === undefined && recIntent) {
      try {
        const rows = await fetchCatalogLive(supabase);
        const rec = buildRecommendation(recIntent, rows);
        if (rec) {
          answer = rec;
          mode = "recommendation";
          await supabase.from("chat_events").insert({
            conversation_id: conversationId,
            user_id: user?.id,
            session_id: sessionId,
            event_type: "recommendation",
            payload: { intent: recIntent },
          });
        } else {
          recIntent = null;
        }
      } catch (e) {
        console.error("[chat] recomendación híbrida falló, cae a CQA:", e);
        recIntent = null;
      }
    }

    // ── Azure CQA (solo si la recomendación híbrida no respondió) ─────────
    if (answer === undefined) {
      recIntent = null;
      const cqa = await askCqa(message);
      if (cqa && cqa.confidenceScore >= FALLBACK_THRESHOLD) {
        answer = cqa.answer;
        confidence = cqa.confidenceScore;
        mode = "azure";
      } else {
        mode = "fallback";
        answer = cqa ? LOW_CONFIDENCE_FALLBACK : DEMO_FALLBACK;
        await supabase.from("chat_events").insert({
          conversation_id: conversationId,
          user_id: user?.id,
          session_id: sessionId,
          event_type: "fallback",
          payload: {
            scored: cqa?.confidenceScore ?? null,
            threshold: FALLBACK_THRESHOLD,
            azureConfigured: cqa !== null,
          },
        });
      }
    }

    const { data: inserted, error: insErr } = await supabase
      .from("chat_messages")
      .insert({
        conversation_id: conversationId,
        role: "assistant",
        content: answer,
        confidence,
        metadata: kit ? { mode, kit } : { mode },
      })
      .select("id, role, content, confidence, created_at, metadata")
      .single();
    if (insErr) throw insErr;

    return json({
      conversationId,
      message: {
      id: inserted.id,
      role: inserted.role,
      content: inserted.content,
      created_at: inserted.created_at,
      confidence: inserted.confidence,
      // metadata.kit alimenta los chips del constructor de kit en el widget.
      metadata: inserted.metadata ?? null,
    },
      mode,
      confidence,
      intent: recIntent,
    });
  } catch (err) {
    console.error("[chat] error:", err);
    const msg = err instanceof Error ? err.message : "UNKNOWN";
    if (msg === "SERVICE_CONFIG_MISSING") {
      return json({ error: "CONFIG_ERROR", detail: "Servicio no configurado (SUPABASE_SERVICE_ROLE_KEY)" }, 500);
    }
    if (msg === "AZURE_UNAVAILABLE" || msg === "AZURE_ERROR") {
      return json({ error: "AZURE_ERROR", detail: "Azure no respondió; intenta de nuevo en unos segundos." }, 502);
    }
    return json({ error: "CHAT_ERROR", detail: "No se pudo procesar la consulta." }, 500);
  }
});
