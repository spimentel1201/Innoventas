# 04 · Despliegue

## Opciones

| Opción | Frontend | Edge Functions | Costo |
|---|---|---|---|
| A — Vercel/Netlify + Supabase | CI automático | Supabase Cloud | Gratis/demo |
| B — Supabase Hosting (estático) | `supabase functions serve` local | Cloud | Demo |
| C — VPS/estático propio | Buckets o CDNs | Cloud | Varía |
| D — Azure Static Web Apps | CI automático desde GitHub | Supabase Cloud | Free |

Recomendación: **A**. El frontend es estático (Vite); toda la lógica sensible
corre ya en Supabase Cloud. Para la opción D sigue `07-azure-static-web-apps.md`.

## 1. Build de producción

```bash
npm ci
npm run build      # typecheck estricto + bundle → dist/
```

Advertencia aceptable: un chunk >500 kB (supabase-js + router + react-query).
Puedes partirlo con `manualChunks` si lo requieras sin cambiar comportamiento.

## 2. Edge Functions (ya en Supabase Cloud)

```bash
supabase functions deploy chat create-order admin-products
supabase secrets set AZURE_CQA_ENDPOINT=... AZURE_CQA_KEY=... \
  AZURE_CQA_PROJECT=... AZURE_CQA_DEPLOYMENT=...
```

Endpoint público resultante: `https://<ref>.supabase.co/functions/v1/<name>`.
El frontend los invoca con `apikey` + `Authorization: Bearer <access_token>`
(implícito en `invokeEdgeFunction()`).

## 3. Variables de entorno del frontend (build-time)

En el host (Vercel/Netlify → Settings → Environment):

```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

⚠️ Cambian con el build; no hay secretos `service_role` ni llaves Azure en el
bundle — verificados con `grep -r "service_role\|AZURE_CQA" dist`.

## 4. URLs de Auth en producción

Supabase Dashboard → Auth → URL Configuration:

- Site URL: `https://<tu-dominio>`
- Redirect URLs: añade `https://<tu-dominio>/login` y
  `/recuperar-password` (y los de staging).

## 5. CORS y cabeceras

- Vercel/Netlify: single-page app — servir `index.html` para cualquier ruta no-asset
  para que `createBrowserRouter` no dé 404 en refresh. **Vercel ya viene configurado**
  con `vercel.json` en la raíz (catch-all rewrite a `/index.html`); en Netlify haría
  falta un `public/_redirects` con `/*  /index.html  200`.
- Las Edge Functions de Supabase responden con CORS abierto necesario
  (`apikey`/`Authorization` permitidos).

## 6. Post-deploy smoke test

1. Login (o registro) desde el dominio productivo sin errores de redirect.
2. Rastreo de pedido funciona con INV número + correo.
3. Chat consulta Azure (ver Network → `functions/v1/chat` 200).
4. Panel `/admin` con tu usuario admin: crear producto e imagen, actualizar stock.
5. Compra demo + confirmación + timeline de estados.

## 7. Rollback

- Frontend: redeploy de commit anterior en Vercel/Netlify (un click).
- Base de datos: las migraciones son additivas; para rollbacks puntuales usa
  backups automáticos de Supabase (Settings → Database → Backups) y revisa el
  historial antes de destruir datos.
- Edge Functions: redeploy de la versión `git checkout <tag>` +
  `supabase functions deploy ...`.
