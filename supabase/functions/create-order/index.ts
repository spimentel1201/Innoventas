// ─────────────────────────────────────────────────────────────────────────────
// Edge Function: create-order
// ÚNICA puerta para crear pedidos: valida identidad, delega el cálculo de
// precios/ofertas/stock a la RPC `place_order` (SECURITY DEFINER) y devuelve
// el pedido consolidado. El cliente NUNCA envía precios.
// ─────────────────────────────────────────────────────────────────────────────
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const shippingSchema = z.object({
  fullName: z.string().trim().min(3).max(80),
  phone: z.string().trim().regex(/^[0-9+\-\s()]{7,20}$/),
  line1: z.string().trim().min(5).max(120),
  line2: z.string().trim().max(120).optional().or(z.literal("")),
  city: z.string().trim().min(2).max(40),
  state: z.string().trim().min(2).max(40),
  postalCode: z.string().trim().min(3).max(10),
  country: z.string().trim().min(2).max(56),
  notes: z.string().trim().max(200).optional().or(z.literal("")),
});

const payloadSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(10),
      }),
    )
    .min(1)
    .max(30),
  shipping: shippingSchema,
  // La tarjeta sólo señala un método DEMO; nunca se recopilan datos de tarjeta aquí
  paymentMethod: z.enum(["transfer", "cod", "demo_card"]),
});

function userClient(authHeader: string | null): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) throw new Error("SERVICE_CONFIG_MISSING");
  return createClient(url, anonKey, {
    auth: { persistSession: false },
    // La identidad del usuario viaja en el JWT: auth.uid() dentro de las RPC
    // (SECURITY DEFINER) sólo existe si la petición lleva su token.
    global: { headers: authHeader ? { Authorization: authHeader } : {} },
  });
}

interface RpcRow {
  id: string;
  order_number: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    // ── Identidad obligatoria ────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "AUTH_REQUIRED", detail: "Inicia sesión para completar el pedido" }, 401);
    const supabase = userClient(authHeader);

    const { data: userData } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!userData.user) return json({ error: "AUTH_REQUIRED", detail: "Sesión inválida" }, 401);
    const userId = userData.user.id;

    // ── Validación de payload ────────────────────────────────────────────
    const raw = await req.json().catch(() => null);
    const parsed = payloadSchema.safeParse(raw);
    if (!parsed.success) {
      return json({ error: "PAYLOAD_INVALID", detail: parsed.error.issues[0]?.message }, 400);
    }
    const { items, shipping, paymentMethod } = parsed.data;

    // ── Creación del pedido vía RPC (server-side pricing, stock y totales) ─
    const { data, error } = await supabase.rpc("place_order", {
      p_items: items.map((it) => ({ product_id: it.productId, quantity: it.quantity })),
      p_shipping: {
        full_name: shipping.fullName,
        phone: shipping.phone,
        line1: shipping.line1,
        line2: shipping.line2 || "",
        city: shipping.city,
        state: shipping.state,
        postal_code: shipping.postalCode,
        country: shipping.country,
        notes: shipping.notes || "",
      },
      p_payment_method: paymentMethod,
    });

    if (error) {
      console.error("[create-order] RPC error:", error.message);
      const msg = error.message;
      const colonIndex = msg.indexOf(":");
      const errorCode = (colonIndex > 0 ? msg.slice(0, colonIndex) : msg).trim();
      const detail = colonIndex > 0 ? msg.slice(colonIndex + 1).trim() : undefined;
      return json({ error: errorCode, detail }, mapStatus(errorCode));
    }

    const row = (data as RpcRow[] | null)?.[0];
    if (!row) return json({ error: "ORDER_FAILED", detail: "El servidor no devolvió pedido" }, 500);

    // ── Respuesta completa con ítems ─────────────────────────────────────
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", row.id)
      .single();
    if (orderErr) throw orderErr;

    return json({ message: "Pedido creado", order });
  } catch (err) {
    console.error("[create-order] unexpected:", err);
    const msg = err instanceof Error ? err.message : "";
    if (msg === "SERVICE_CONFIG_MISSING") {
      return json({ error: "CONFIG_ERROR", detail: "Servicio no configurado" }, 500);
    }
    return json({ error: "ORDER_ERROR", detail: "No se pudo crear el pedido." }, 500);
  }
});

function mapStatus(code: string): number {
  if (code === "AUTH_REQUIRED") return 401;  if (code === "EMPTY_CART" || code === "INVALID_ITEM" || code === "INVALID_PAYMENT" || code === "INVALID_SHIPPING")
    return 400;
  if (code === "INSUFFICIENT_STOCK" || code === "PRODUCT_UNAVAILABLE") return 409;
  if (code === "TOO_MANY_ITEMS") return 400;
  return 500;
}
