# 07 · Despliegue en Azure (Static Web Apps)

Guía para publicar el frontend de InnovVentas en Azure. El sitio es una **SPA
React + Vite estática** (salida en `dist/`), así que el servicio indicado es
**Azure Static Web Apps** (plan **Free**), no un Azure App Service: no existe
backend Node que alojar — toda la lógica sensible corre en las **Edge Functions
de Supabase** y Azure solo sirve los archivos estáticos.

| Opción | ¿Cuándo usarla? | Costo |
|---|---|---|
| **Static Web Apps (esta guía)** | SPA estática + backend en Supabase ✔ | Free |
| Azure App Service (Node) | Solo si hubiera un servidor SSR propio — no aplica aquí | De pago |
| Vercel/Netlify | Alternativa equivalente (ver `04-deploy.md`) | Gratis |

## Prerrequisitos

```bash
npm ci
npm run build     # tsc --noEmit + vite build → dist/
npm test          # vitest
```

- Ambos deben pasar en local (el workflow de Azure ejecuta exactamente esto).
- El repo en GitHub (por ejemplo tu fork de `spimentel1201/Innoventas`) en la
  rama `main`.
- `.env` local con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (los necesitas
  a mano para el paso 2).

## 1. Crear el Static Web Apps (portal de Azure)

1. [portal.azure.com](https://portal.azure.com) → **Crear un recurso** → buscar
   **Static Web Apps** → **Crear**.
2. **Plan de precios**: *Free (consumption)*.
3. **Repository source**: *GitHub* → autorizar acceso → elegir el repositorio y
   la rama `main`.
4. **Build details**:
   - **Build type**: *Custom* (o *React*, que usa los mismos valores).
   - **App location**: `/` (raíz del repo, donde vive `package.json`).
   - **Api location: dejar vacío** — no hay API de Azure Functions; las Edge
     Functions (`chat`, `create-order`, `admin-products`) ya están en Supabase
     Cloud.
   - **Output location**: `dist`.
5. **Revisar y crear**.

Azure despliega y **commita automáticamente un workflow** en el repo:
`.github/workflows/azure-static-web-apps-<nombre>.yml`. Si el portal no tuvo
permiso de escritura en GitHub, créalo tú con la plantilla que sugiere la
[documentación oficial](https://learn.microsoft.com/azure/static-web-apps/build-configuration)
con esos mismos valores (`app_location: "/"`, `api_location: ""`,
`output_location: "dist"`).

Resultado: una URL pública `https://<nombre>-<hash>.azurestaticapps.net`.

## 2. Variables de entorno de build (`VITE_*`) — paso crítico

Vite **inyecta** `VITE_*` en el bundle **en tiempo de build**, y ese build lo
ejecuta **GitHub Actions**, no Azure. Por eso:

- **NO sirve** configurarlas en el portal (Portal → tu SWA → *Configuration* →
  *Application settings*): ese panel aplica al runtime del sitio y no llega al
  JavaScript estático.
- **Sí funcionan** como *variables de GitHub Actions* referenciadas en el
  workflow:

1. GitHub → tu repo → **Settings → Secrets and variables → Actions** → pestaña
   **Variables** (van aquí, no en *Secrets*, porque `VITE_*` es público por
   diseño):

   ```
   VITE_SUPABASE_URL      = https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY = <anon-key>
   ```

2. Edita el workflow generado y añade `env:` al job de build:

   ```yaml
   jobs:
     build_and_deploy_job:
       runs-on: ubuntu-latest
       env:
         VITE_SUPABASE_URL: ${{ vars.VITE_SUPABASE_URL }}
         VITE_SUPABASE_ANON_KEY: ${{ vars.VITE_SUPABASE_ANON_KEY }}
       steps:
         - uses: actions/checkout@v3
           with:
             submodules: true
         - name: Build And Deploy
           uses: Azure/static-web-apps-deploy@v1
           # ... el resto se mantiene igual
   ```

3. Cada *push* a `main` vuelve a construir y desplegar.

> ⚠️ **Las claves de Azure (`AZURE_CQA_*`) NUNCA van aquí ni en ninguna
> variable del sitio**: viven como secretos de la Edge Function
> (`supabase secrets set ...`, ver `02-azure-cqa-setup.md`) y jamás aparecen en
> el bundle.

## 3. Rutas SPA (incluido en el repo)

El refresh en una ruta profunda (`/catalogo/<slug>`, `/pedido/<INV>`) devolvería
404 sin fallback. El repo incluye **`public/staticwebapp.config.json`** con
`navigationFallback` hacia `/index.html` (Vite copia `public/` a `dist/` en cada
build) y con `exclude` de assets, para que un JS/CSS perdido devuelva 404 real
y no un HTML con *content-type* equivocado.

## 4. Auth y CORS en Supabase

- Dashboard Supabase → **Auth → URL Configuration**:
  - **Site URL**: `https://<nombre>-<hash>.azurestaticapps.net` (o tu dominio).
  - **Redirect URLs**: añadir `.../login` y `.../recuperar-password`.
- **CORS**: las tres Edge Functions responden `Access-Control-Allow-Origin: *`,
  así que no hay que registrar el origen de Azure en ninguna parte.

## 5. Dominio propio (opcional)

Portal → tu Static Web Apps → **Custom domain** → añadir el dominio con su
registro DNS (CNAME/TXT de validación). El plan Free incluye SSL administrado y
hasta **2 dominios por app**
([planes y límites](https://learn.microsoft.com/azure/static-web-apps/plans)).

## Alternativa sin portal: CLI

```bash
npm run build
npx @azure/static-web-apps-cli deploy ./dist --deployment-token <DEPLOYMENT_TOKEN>
```

El token está en el portal → tu SWA → *Management → Deployment tokens*. La CLI
**sube** lo que ya construiste en `dist/` (no ejecuta el build ni genera
variables: si `VITE_*` no estaban en el entorno, el bundle quedará sin ellas).

## 6. Smoke test post-deploy

1. La app carga sin el aviso de "Supabase no configurado" (las `VITE_*`
   llegaron al bundle).
2. Deep link: abrir `https://<site>/catalogo` en una pestaña nueva y **F5** →
   no da 404.
3. Login/registro con redirect correcto (URLs del paso 4).
4. Chat: DevTools → Network → `functions/v1/chat` con respuesta 200.
5. Sin secretos en el bundle:
   ```bash
   curl -s https://<site>/ | grep -o 'service_role\|AZURE_CQA'
   # → vacío
   ```

## 7. Rollback

- **Frontend**: GitHub → Actions → re-ejecutar un run anterior, o
  `git revert` del commit y push (el workflow redespliega).
- **Edge Functions / BD**: ver `04-deploy.md` (secciones 6 y 7) — no dependen de
  Azure.
