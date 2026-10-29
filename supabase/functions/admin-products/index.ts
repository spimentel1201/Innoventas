// ─────────────────────────────────────────────────────────────────────────────
// Edge Function: admin-products
// CRUD de productos/imagenes/ofertas validado EN SERVIDOR.
// Verifica el rol 'admin' leyendo profiles con service role (nunca confía en
// datos enviados por el cliente). Requiere JWT de usuario autenticado.
// ─────────────────────────────────────────────────────────────────────────────
// Pin exacto (ver comentario en supabase/functions/create-order/index.ts).
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2.118.0";
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

const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);

const productSchema = z.object({
  name: z.string().trim().min(3).max(80),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(3).max(80),
  categoryId: z.string().uuid(),
  brand: z.string().trim().min(2).max(40),
  price: z.number().min(0.01).max(1_000_000),
  compareAtPrice: z.number().min(0).max(1_000_000).nullable().optional(),
  stock: z.number().int().min(0).max(99_999),
  status: z.enum(["draft", "published"]),
  description: z.string().trim().min(10).max(2000),
  specifications: z.record(z.string().min(1).max(40), z.string().min(1).max(120)).default({}),
});

const payloadSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("product.create"), data: productSchema }),
  z.object({ action: z.literal("product.update"), id: z.string().uuid(), data: productSchema }),
  z.object({ action: z.literal("product.delete"), id: z.string().uuid() }),
  z.object({ action: z.literal("stock.set"), id: z.string().uuid(), stock: z.number().int().min(0).max(99_999) }),
  z.object({
    action: z.literal("image.create"),
    productId: z.string().uuid(),
    url: z.string().url().max(600),
    alt: z.string().max(160).optional(),
    mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
    makePrimary: z.boolean().optional(),
  }),
  z.object({ action: z.literal("image.delete"), imageId: z.string().uuid() }),
  z.object({ action: z.literal("image.primary"), productId: z.string().uuid(), imageId: z.string().uuid() }),
  z.object({
    action: z.literal("offer.create"),
    productId: z.string().uuid(),
    discountPercent: z.number().int().min(1).max(90),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
  }),
  z.object({ action: z.literal("offer.end"), offerId: z.string().uuid() }),
]);

function serviceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("SERVICE_CONFIG_MISSING");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function requireAdmin(supabase: SupabaseClient, authHeader: string) {
  const token = authHeader.replace("Bearer ", "");
  const { data } = await supabase.auth.getUser(token);
  if (!data.user) throw new HttpError("AUTH_REQUIRED", 401);
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!profile || profile.role !== "admin") throw new HttpError("PERMISSION_DENIED", 403);
  return data.user;
}

class HttpError extends Error {
  constructor(
    public code: string,
    public status: number,
    public detail?: string,
  ) {
    super(code);
  }
}

function extractStoragePath(url: string): string | null {
  const marker = "/object/public/product-images/";
  const idx = url.indexOf(marker);
  if (idx < 0) return null;
  return url.slice(idx + marker.length);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const supabase = serviceClient();
    const authHeader = req.headers.get("Authorization") ?? "";
    const user = await requireAdmin(supabase, authHeader);
    void user;

    const raw = await req.json().catch(() => null);
    const parsed = payloadSchema.safeParse(raw);
    if (!parsed.success) {
      return json({ error: "PAYLOAD_INVALID", detail: parsed.error.issues[0]?.message }, 400);
    }
    const { action } = parsed.data;

    switch (action) {
      case "product.create": {
        const d = parsed.data.data;
        // Residentes de slug únicos: reintenta con sufijo si está ocupado.
        let slug = d.slug;
        for (let attempt = 0; attempt < 5; attempt++) {
          const { data: inserted, error } = await supabase
            .from("products")
            .insert({
              category_id: d.categoryId,
              name: d.name,
              slug,
              description: d.description,
              brand: d.brand,
              price: d.price,
              compare_at_price: d.compareAtPrice ?? null,
              stock: d.stock,
              status: d.status,
              specifications: d.specifications,
            })
            .select("id")
            .single();
          if (!error) {
            return json({ productId: inserted.id, slug });
          }
          if (error.message.includes("duplicate key") && error.message.includes("slug")) {
            slug = `${d.slug}-${attempt + 2}`;
            continue;
          }
          throw error;
        }
        return json({ error: "SLUG_TAKEN", detail: "Genera un slug distinto" }, 409);
      }

      case "product.update": {
        const d = parsed.data.data;
        const { id } = parsed.data;
        const { error } = await supabase
          .from("products")
          .update({
            category_id: d.categoryId,
            name: d.name,
            slug: d.slug,
            description: d.description,
            brand: d.brand,
            price: d.price,
            compare_at_price: d.compareAtPrice ?? null,
            stock: d.stock,
            status: d.status,
            specifications: d.specifications,
          })
          .eq("id", id);
        if (error) {
          if (error.message.includes("duplicate key")) {
            return json({ error: "SLUG_TAKEN", detail: "Ya existe otro producto con ese slug" }, 409);
          }
          throw error;
        }
        return json({ productId: id, slug: d.slug });
      }

      case "product.delete": {
        const { id } = parsed.data;
        // El registro de pedidos conserva su copia histórica (product_id → set null).
        const { error } = await supabase.from("products").delete().eq("id", id);
        if (error) throw error;
        return json({ ok: true });
      }

      case "stock.set": {
        const { id, stock } = parsed.data;
        const { error } = await supabase.from("products").update({ stock }).eq("id", id);
        if (error) throw error;
        return json({ ok: true });
      }

      case "image.create": {
        const { productId, url, alt, mimeType, makePrimary } = parsed.data;
        if (!ALLOWED_MIME.has(mimeType)) {
          return json({ error: "MIME_NOT_ALLOWED", detail: "Usa PNG, JPG o WEBP" }, 400);
        }
        const { data: countRows, error: countErr } = await supabase
          .from("product_images")
          .select("id", { count: "exact" })
          .eq("product_id", productId);
        if (countErr) throw countErr;
        const total = countRows?.length ?? 0;
        const { data: existingPrimary } = await supabase
          .from("product_images")
          .select("id")
          .eq("product_id", productId)
          .eq("is_primary", true)
          .maybeSingle();
        const shouldPrimary = makePrimary === true || !existingPrimary;
        const { data: created, error: insErr } = await supabase
          .from("product_images")
          .insert({
            product_id: productId,
            url,
            alt: alt ?? "",
            position: total,
            is_primary: shouldPrimary,
          })
          .select("id")
          .single();
        if (insErr) throw insErr;
        return json({ imageId: created.id });
      }

      case "image.delete": {
        const { imageId } = parsed.data;
        const { data: img } = await supabase
          .from("product_images")
          .select("id, url, product_id, is_primary")
          .eq("id", imageId)
          .single();
        if (!img) return json({ error: "IMAGE_NOT_FOUND" }, 404);
        const path = extractStoragePath(img.url);
        if (path) {
          // Elimina el archivo físico del bucket (best-effort).
          await supabase.storage.from("product-images").remove([path]);
        }
        const { error: delErr } = await supabase.from("product_images").delete().eq("id", imageId);
        if (delErr) throw delErr;
        if (img.is_primary) {
          const { data: next } = await supabase
            .from("product_images")
            .select("id")
            .eq("product_id", img.product_id)
            .order("position")
            .limit(1);
          if (next && next.length > 0) {
            await supabase.from("product_images").update({ is_primary: true }).eq("id", next[0].id);
          }
        }
        return json({ ok: true });
      }

      case "image.primary": {
        const { productId, imageId } = parsed.data;
        await supabase.from("product_images").update({ is_primary: false }).eq("product_id", productId);
        const { error } = await supabase
          .from("product_images")
          .update({ is_primary: true })
          .eq("id", imageId)
          .eq("product_id", productId);
        if (error) throw error;
        return json({ ok: true });
      }

      case "offer.create": {
        const { productId, discountPercent, startsAt, endsAt } = parsed.data;
        if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
          return json({ error: "INVALID_DATES", detail: "end > start" }, 400);
        }
        const { data: created, error } = await supabase
          .from("offers")
          .insert({ product_id: productId, discount_percent: discountPercent, starts_at: startsAt, ends_at: endsAt })
          .select("id")
          .single();
        if (error) throw error;
        return json({ offerId: created.id });
      }

      case "offer.end": {
        const { offerId } = parsed.data;
        const { error } = await supabase
          .from("offers")
          .update({ is_active: false, ends_at: new Date().toISOString() })
          .eq("id", offerId);
        if (error) throw error;
        return json({ ok: true });
      }
    }
  } catch (err) {
    if (err instanceof HttpError) {
      return json({ error: err.code, detail: err.detail }, err.status);
    }
    console.error("[admin-products] error:", err);
    const msg = err instanceof Error ? err.message : "";
    if (msg === "SERVICE_CONFIG_MISSING") {
      return json({ error: "CONFIG_ERROR", detail: "Servicio no configurado" }, 500);
    }
    return json({ error: "ADMIN_ERROR", detail: "Operación no realizada." }, 500);
  }
});
