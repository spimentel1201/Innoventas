// ─────────────────────────────────────────────────────────────────────────────
// InnovVentas · Chat · Constructor de kit (pedido guiado por pasos)
//
// El usuario pide armar un kit («armar kit gamer», «kit de estudio»…); el bot
// muestra productos de una categoría a la vez con enlaces a la ficha, el usuario
// elige con los botones del widget, y al terminar ofrece el total y el acceso
// al carrito.
//
// La Edge Function es stateless entre invocaciones: el estado del flujo viaja en
// `metadata.kit` del último mensaje del asistente (se persiste en
// `chat_messages`). Si el usuario hace una pregunta intermedia, la respuesta
// normal se emite conservando ese estado, así el flujo continúa después.
// ─────────────────────────────────────────────────────────────────────────────
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export type KitProfile = "gamer" | "estudio" | "general";

/** Opción de un paso: precio final ya resuelto (oferta vigente incluida). */
export interface KitOption {
  id: string;
  slug: string;
  name: string;
  price: number;
  stock: number;
}

export interface KitSelection {
  id: string;
  slug: string;
  name: string;
  price: number;
  category: string;
}

export interface KitState {
  profile: KitProfile;
  categories: string[];
  stepIndex: number;
  selections: KitSelection[];
  options: KitOption[];
  status: "choosing" | "done";
  total: number;
}

const KIT_SEQUENCES: Record<KitProfile, string[]> = {
  gamer: ["mouse", "teclados", "audifonos", "monitores"],
  estudio: ["mouse", "teclados", "monitores", "almacenamiento"],
  general: ["mouse", "teclados", "audifonos", "monitores"],
};

const KIT_PROFILE_LABEL: Record<KitProfile, string> = {
  gamer: "gamer",
  estudio: "de estudio/oficina",
  general: "para tu escritorio",
};

const KIT_CATEGORY_LABEL: Record<string, string> = {
  mouse: "mouse",
  teclados: "teclados",
  audifonos: "audífonos",
  monitores: "monitores",
  almacenamiento: "almacenamiento",
  accesorios: "accesorios",
};

const KIT_FINISH_PHRASES = [
  "es todo",
  "ya esta",
  "listo",
  "terminar",
  "terminado",
  "finalizar",
  "nada mas",
  "no mas",
  "eso es todo",
];

const KIT_SKIP_PHRASES = ["siguiente", "saltar", "pasar", "ninguno", "otra categoria", "despues"];

// Mismo criterio que index.ts: minúsculas + NFD sin diacríticos.
function normalizeText(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function soles(value: number): string {
  return "S/ " + value.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Detecta la intención de armar un kit y su perfil (gamer / estudio / general). */
export function detectKitIntent(message: string): KitProfile | null {
  const norm = normalizeText(message);
  if (!/\b(kits?|combo|combos|armar|armame)\b/.test(norm)) return null;
  if (/\b(gamer|gaming|juego|juegos|jugar|streaming)\b/.test(norm)) return "gamer";
  if (/\b(estudio|estudiar|universidad|trabajo|oficina|home office)\b/.test(norm)) return "estudio";
  return "general";
}

async function loadKitOptions(supabase: SupabaseClient, categorySlug: string): Promise<KitOption[]> {
  const { data, error } = await supabase
    .from("published_products")
    .select("id, slug, name, price, offer_price, stock")
    .eq("category_slug", categorySlug)
    .gt("stock", 0)
    .order("price", { ascending: true })
    .limit(4);
  if (error) throw new Error("KIT_OPTIONS_QUERY_FAILED");
  const rows = (data ?? []) as Array<{
    id: string;
    slug: string;
    name: string;
    price: number;
    offer_price: number | null;
    stock: number;
  }>;
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    price: r.offer_price ?? r.price,
    stock: r.stock,
  }));
}

/** Avanza hasta la siguiente categoría con opciones; si no queda ninguna, el kit termina. */
async function advanceKit(supabase: SupabaseClient, kit: KitState): Promise<KitState> {
  let stepIndex = kit.stepIndex;
  while (stepIndex < kit.categories.length) {
    const options = await loadKitOptions(supabase, kit.categories[stepIndex]);
    if (options.length > 0) return { ...kit, stepIndex, options, status: "choosing" };
    stepIndex += 1;
  }
  return { ...kit, stepIndex: kit.categories.length, options: [], status: "done" };
}

function kitTotal(kit: KitState): number {
  return kit.selections.reduce((acc, s) => acc + s.price, 0);
}

function describeKitStep(kit: KitState, intro: boolean): string {
  const category = kit.categories[kit.stepIndex] ?? "";
  const label = KIT_CATEGORY_LABEL[category] ?? category;
  const lines: string[] = [];
  if (intro) {
    lines.push(`**Armemos tu kit ${KIT_PROFILE_LABEL[kit.profile]}** 🛒 Te muestro opción por categoría.`);
  }
  lines.push(`**Paso ${kit.stepIndex + 1}/${kit.categories.length} · ${label}**`);
  lines.push(
    ...kit.options.map(
      (o) =>
        `· [${o.name}](/producto/${o.slug}) — ${soles(o.price)}${
          o.stock <= 5 ? ` · quedan ${o.stock}` : ""
        }`,
    ),
  );
  lines.push(
    "Elige con los botones de abajo, escribe «siguiente» para saltarlo o «es todo» para terminar.",
  );
  return lines.join("\n");
}

function describeKitSummary(kit: KitState): string {
  if (kit.selections.length === 0) {
    return "No elegiste nada del kit. Si quieres, pídemos otro (por ejemplo «armar kit gamer») y lo armamos desde cero.";
  }
  return [
    `**Tu kit ${KIT_PROFILE_LABEL[kit.profile]} está listo** ✅`,
    ...kit.selections.map((s) => `· **${s.name}** — ${soles(s.price)}`),
    `**Total: ${soles(kit.total)}** (precios vigentes con oferta aplicada)`,
    "Pulsa **Ir al carrito** abajo para agregar todo de una vez y pasar al checkout.",
  ].join("\n");
}

function finishKit(kit: KitState): { answer: string; kit: KitState } {
  const done: KitState = { ...kit, status: "done", options: [], total: kitTotal(kit) };
  return { answer: describeKitSummary(done), kit: done };
}

/** Inicia un kit nuevo: primer paso con opciones del catálogo en vivo. */
export async function startKit(
  supabase: SupabaseClient,
  profile: KitProfile,
): Promise<{ answer: string; kit: KitState }> {
  const base: KitState = {
    profile,
    categories: KIT_SEQUENCES[profile],
    stepIndex: 0,
    selections: [],
    options: [],
    status: "choosing",
    total: 0,
  };
  const kit = await advanceKit(supabase, base);
  if (kit.status === "done") return finishKit(kit);
  return { answer: describeKitStep(kit, true), kit };
}

/**
 * Procesa un mensaje dentro del flujo de kit.
 * Devuelve `null` cuando el mensaje no es una acción del kit (p. ej. una
 * pregunta aparte): así la ruta normal (Azure/BD) responde y el estado se
 * conserva en el metadata para continuar después.
 */
export async function handleKitMessage(
  supabase: SupabaseClient,
  kit: KitState,
  message: string,
): Promise<{ answer: string; kit: KitState } | null> {
  const norm = normalizeText(message).trim();
  const padded = ` ${norm} `;

  if (KIT_FINISH_PHRASES.some((p) => padded.includes(` ${p} `))) return finishKit(kit);

  const option = kit.options.find((o) => normalizeText(o.name) === norm || o.slug === norm);
  if (option) {
    const selections = [
      ...kit.selections.filter((s) => s.slug !== option.slug),
      {
        id: option.id,
        slug: option.slug,
        name: option.name,
        price: option.price,
        category: kit.categories[kit.stepIndex] ?? "",
      },
    ];
    const next = await advanceKit(supabase, {
      ...kit,
      stepIndex: kit.stepIndex + 1,
      selections,
      options: [],
    });
    if (next.status === "done") return finishKit(next);
    return { answer: describeKitStep(next, false), kit: next };
  }

  if (KIT_SKIP_PHRASES.some((p) => padded.includes(` ${p} `))) {
    const next = await advanceKit(supabase, { ...kit, stepIndex: kit.stepIndex + 1, options: [] });
    if (next.status === "done") return finishKit(next);
    return { answer: describeKitStep(next, false), kit: next };
  }

  return null;
}
