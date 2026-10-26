import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ImagePlus, Pencil, Plus, Search, Star, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { FieldError, Input, Label, Select, Textarea } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { PageSpinner } from '@/components/ui/spinner'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { Pagination } from '@/components/ui/pagination'
import {
  adminCreateImage,
  adminDeleteImage,
  adminDeleteProduct,
  adminSaveProduct,
  adminSetPrimaryImage,
  fetchAdminProductById,
  useAdminImages,
  useAdminProducts,
} from '@/features/admin/api'
import { useCategories } from '@/features/products/hooks'
import { productFormSchema, type ProductFormInput } from '@/lib/validations/product'
import { asObject, type ProductImage } from '@/types/domain'
import type { Json } from '@/types/database'
import { formatMoney, slugify } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { EdgeError } from '@/lib/edge'
import { useDebounce } from '@/hooks/use-debounce'

const PAGE_SIZE = 10

// FormValues: el input real del form (ya que el campo vacío llega como string),
// mientras TTransformedValues = ProductFormInput (lo que produce el resolver).
type FormValues = Omit<ProductFormInput, 'compareAtPrice'> & { compareAtPrice?: number | '' }

/** Modal de creación/edición de producto (fórmula zod + specs dinámicas). */
function ProductFormModal({
  productId,
  categories,
  onClose,
}: {
  productId: string | null
  categories: Array<{ id: string; name: string; slug: string; productCount: number }>
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [loadingExisting, setLoadingExisting] = useState(productId !== null)

  const form = useForm<FormValues>({
    resolver: zodResolver(productFormSchema) as Resolver<FormValues>,
    defaultValues: {
      name: '',
      slug: '',
      category: '',
      brand: '',
      price: undefined as unknown as number,
      compareAtPrice: '',
      stock: 0,
      status: 'published',
      description: '',
      specs: [],
    },
  })
  const specsArray = useFieldArray({ control: form.control, name: 'specs' })

  // Cargar datos del producto a editar (una sola vez al abrir).
  useEffect(() => {
    if (!productId) return
    void fetchAdminProductById(productId)
      .then((row) => {
        if (!row) {
          toast.error('No se encontró el producto.')
          onClose()
          return
        }
        const specs = asObject(row.specifications as Json)
        form.reset({
          name: row.name,
          slug: row.slug,
          category: row.category_id,
          brand: row.brand,
          price: Number(row.price),
          compareAtPrice: row.compare_at_price != null ? Number(row.compare_at_price) : ('' as const),
          stock: Number(row.stock),
          status: (row.status === 'draft' ? 'draft' : 'published') as 'draft' | 'published',
          description: row.description,
          specs: Object.entries(specs).map(([key, value]) => ({ key, value })),
        })
      })
      .finally(() => setLoadingExisting(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      adminSaveProduct({
        action: productId ? 'product.update' : 'product.create',
        id: productId ?? undefined,
        name: values.name,
        slug: values.slug || slugify(values.name),
        categoryId: values.category,
        brand: values.brand,
        price: values.price,
        // Tras el resolver, '' ya es undefined (el preprocess del schema lo normaliza).
        compareAtPrice: values.compareAtPrice == null ? null : (values.compareAtPrice as number),
        stock: values.stock,
        status: values.status,
        description: values.description,
        specifications: Object.fromEntries(values.specs.map((s) => [s.key, s.value])),
      }),
    onSuccess: () => {
      toast.success(productId ? 'Producto actualizado.' : 'Producto creado.')
      void qc.invalidateQueries({ queryKey: ['admin', 'products'] })
      void qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
      void qc.invalidateQueries({ queryKey: ['products'] })
      onClose()
    },
    onError: (err) => {
      if (err instanceof EdgeError && err.code === 'SLUG_TAKEN') {
        form.setError('slug', { message: `El slug está en uso por otro producto. Prueba uno distinto (${err.message}).` })
      } else {
        toast.error(err instanceof Error ? err.message : 'No se pudo guardar el producto.')
      }
    },
  })

  function onSubmit(values: FormValues) {
    mutation.mutate(values)
  }

  return (
    <Modal open onClose={onClose} title={productId ? 'Editar producto' : 'Nuevo producto'} maxWidth="max-w-3xl">
      {loadingExisting && !form.formState.isDirty ? (
        <PageSpinner label="Cargando producto…" />
      ) : (
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="p-name">Nombre</Label>
              <Input id="p-name" {...form.register('name')}
                onBlur={(e) => {
                  if (!productId && !form.getValues('slug') && e.target.value) form.setValue('slug', slugify(e.target.value))
                }}
              />
              <FieldError message={form.formState.errors.name?.message} />
            </div>
            <div>
              <Label htmlFor="p-slug">URL (slug)</Label>
              <Input id="p-slug" placeholder="novabook-pro-14" {...form.register('slug')} />
              <FieldError message={form.formState.errors.slug?.message} />
            </div>
            <div>
              <Label htmlFor="p-cat">Categoría</Label>
              <Select id="p-cat" {...form.register('category')}>
                <option value="">Selecciona…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
              <FieldError message={form.formState.errors.category?.message} />
            </div>
            <div>
              <Label htmlFor="p-brand">Marca</Label>
              <Input id="p-brand" placeholder="TechNova" {...form.register('brand')} />
              <FieldError message={form.formState.errors.brand?.message} />
            </div>
            <div>
              <Label htmlFor="p-price">Precio (S/)</Label>
              <Input id="p-price" type="number" step="0.01" min="0" {...form.register('price')} />
              <FieldError message={form.formState.errors.price?.message} />
            </div>
            <div>
              <Label htmlFor="p-compare">Precio de comparación (opcional)</Label>
              <Input id="p-compare" type="number" step="0.01" min="0" {...form.register('compareAtPrice')} />
              <FieldError message={form.formState.errors.compareAtPrice?.message} />
            </div>
            <div>
              <Label htmlFor="p-stock">Stock</Label>
              <Input id="p-stock" type="number" min="0" step="1" {...form.register('stock')} />
              <FieldError message={form.formState.errors.stock?.message} />
            </div>
            <div>
              <Label htmlFor="p-status">Estado</Label>
              <Select id="p-status" {...form.register('status')}>
                <option value="published">Publicado</option>
                <option value="draft">Borrador (no visible)</option>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="p-desc">Descripción</Label>
            <Textarea id="p-desc" rows={4} placeholder="Describe el producto…" {...form.register('description')} />
            <FieldError message={form.formState.errors.description?.message} />
          </div>

          {/* Especificaciones dinámicas */}
          <div>
            <div className="flex items-center justify-between">
              <Label className="mb-0">Especificaciones</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => specsArray.append({ key: '', value: '' })}
              >
                <Plus className="h-4 w-4" /> Agregar
              </Button>
            </div>
            {form.formState.errors.specs?.message && (
              <FieldError message={form.formState.errors.specs.message} />
            )}
            <div className="mt-2 space-y-2">
              {specsArray.fields.map((field, i) => (
                <div key={field.id} className="flex items-start gap-2">
                  <div className="flex-1">
                    <Input placeholder="Ej. Pantalla" aria-label={`Nombre de especificación ${i + 1}`} {...form.register(`specs.${i}.key` as const)} />
                    <FieldError message={form.formState.errors.specs?.[i]?.key?.message} />
                  </div>
                  <div className="flex-1">
                    <Input placeholder="Ej. OLED 14''" aria-label={`Valor de especificación ${i + 1}`} {...form.register(`specs.${i}.value` as const)} />
                    <FieldError message={form.formState.errors.specs?.[i]?.value?.message} />
                  </div>
                  <Button type="button" variant="ghost" size="icon" aria-label="Quitar especificación"
                    onClick={() => specsArray.remove(i)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {specsArray.fields.length === 0 && (
                <p className="text-xs text-slate-400">Sin especificaciones. Agrégalas para que aparezcan en la ficha del producto.</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={mutation.isPending}>
              {productId ? 'Guardar cambios' : 'Crear producto'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}

/** Modal administrador de imágenes por producto: subir a Storage, principal y borrar. */
function ImagesModal({ productId, productName, onClose }: { productId: string; productName: string; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: images, isLoading } = useAdminImages(productId)
  const [url, setUrl] = useState('')
  const [uploading, setUploading] = useState(false)

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'images', productId] })
    void qc.invalidateQueries({ queryKey: ['products'] })
  }

  const createImage = useMutation({
    mutationFn: (input: { url: string; mimeType: 'image/png' | 'image/jpeg' | 'image/webp'; makePrimary?: boolean }) =>
      adminCreateImage({ productId, url: input.url, mimeType: input.mimeType, makePrimary: input.makePrimary }),
    onSuccess: () => { toast.success('Imagen agregada.'); setUrl(''); invalidate() },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'No se pudo agregar la imagen.'),
  })

  async function handleUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const input = e.currentTarget.elements.namedItem('file') as HTMLInputElement | null
    const file = input?.files?.[0]
    if (!file) return
    const okTypes = ['image/png', 'image/jpeg', 'image/webp']
    if (!okTypes.includes(file.type)) { toast.error('Formato permitido: PNG, JPG o WebP.'); return }
    if (file.size > 3 * 1024 * 1024) { toast.error('Máximo 3 MB.'); return }
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
      // La RLS exige la carpeta 'products/<id>/…' en el bucket.
      const path = `products/${productId}/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage.from('product-images').upload(path, file, {
        contentType: file.type,
        upsert: false,
      })
      if (error) throw new Error(error.message)
      const { data } = supabase.storage.from('product-images').getPublicUrl(path)
      await createImage.mutateAsync({ url: data.publicUrl, mimeType: file.type as 'image/png' | 'image/jpeg' | 'image/webp', makePrimary: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo subir la imagen.')
    } finally {
      setUploading(false)
      input!.value = ''
    }
  }

  const deleteImage = useMutation({
    mutationFn: (imageId: string) => adminDeleteImage(imageId),
    onSuccess: () => { toast.info('Imagen eliminada.'); invalidate() },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'No se pudo eliminar.'),
  })

  const setPrimary = useMutation({
    mutationFn: (imageId: string) => adminSetPrimaryImage(productId, imageId),
    onSuccess: () => { toast.success('Imagen principal actualizada.'); invalidate() },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'No se pudo marcar como principal.'),
  })

  return (
    <Modal open onClose={onClose} title={`Imágenes · ${productName}`} maxWidth="max-w-2xl">
      <form onSubmit={handleUpload} className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-700">Subir imagen</p>
        <p className="mt-0.5 text-xs text-slate-500">PNG, JPG o WebP · máx. 3 MB · se marca como principal.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="file"
            name="file"
            accept="image/png,image/jpeg,image/webp"
            className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700"
          />
          <Button type="submit" size="sm" loading={uploading || createImage.isPending}>
            <ImagePlus className="h-4 w-4" /> Subir
          </Button>
        </div>
      </form>

      <div className="mt-4">
        <Label htmlFor="img-url">…o pega una URL de imagen</Label>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!url.trim()) return
            // Deduce el mimeType de la extensión; default PNG (control de tipos en la Edge Function).
            const lower = url.toLowerCase()
            const mimeType = lower.endsWith('.jpg') || lower.endsWith('.jpeg')
              ? 'image/jpeg'
              : lower.endsWith('.webp') ? 'image/webp' : 'image/png'
            createImage.mutate({ url: url.trim(), mimeType, makePrimary: !images?.length })
          }}
          className="flex gap-2"
        >
          <Input id="img-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
          <Button type="submit" variant="outline" disabled={!url.trim()} loading={createImage.isPending}>Agregar</Button>
        </form>
      </div>

      <section className="mt-5" aria-label="Lista de imágenes del producto">
        {isLoading ? (
          <PageSpinner label="Cargando imágenes…" />
        ) : !images?.length ? (
          <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">Sin imágenes todavía.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((img: ProductImage & { product_id: string }) => (
              <li key={img.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="relative aspect-[4/3] bg-slate-50">
                  <img src={img.url} alt={img.alt} className="h-full w-full object-cover" />
                  {img.isPrimary && (
                    <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-amber-950">
                      <Star className="h-3 w-3" aria-hidden /> Principal
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between p-1.5">
                  {!img.isPrimary && (
                    <Button size="sm" variant="ghost" onClick={() => setPrimary.mutate(img.id)} type="button">
                      Hacer principal
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => deleteImage.mutate(img.id)} type="button">
                    <Trash2 className="h-4 w-4" /> Borrar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Modal>
  )
}

export function AdminProductsPage() {
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search, 300)
  const { data: products, isLoading, isError, error, refetch } = useAdminProducts(debounced)
  const categoriesQuery = useCategories()

  const [page, setPage] = useState(1)
  const [editId, setEditId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [imagesFor, setImagesFor] = useState<{ id: string; name: string } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminDeleteProduct(id),
    onSuccess: () => { toast.success('Producto eliminado.'); setDeletingId(null) },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'No se pudo eliminar el producto.'),
  })

  const totalPages = Math.max(1, Math.ceil((products?.length ?? 0) / PAGE_SIZE))
  const visible = useMemo(
    () => (products ?? []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [products, page],
  )

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-slate-900">Productos</h1>
          <p className="mt-1 text-sm text-slate-500">Crear, editar, publicar y administrar el catálogo.</p>
        </div>
        <Button onClick={() => { setEditId(null); setShowForm(true) }}>
          <Plus className="h-4 w-4" /> Nuevo producto
        </Button>
      </div>

      <div className="relative mt-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <Input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Buscar por nombre…"
          className="pl-9"
          aria-label="Buscar productos"
        />
      </div>

      {isLoading && <PageSpinner label="Cargando productos…" />}
      {isError && (
        <div className="mt-4">
          <ErrorState description={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />
        </div>
      )}

      {products && (
        products.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="Sin resultados"
              description={debounced ? `Ningún producto coincide con «${debounced}».` : 'Aún no hay productos. Crea el primero.'}
            />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th scope="col" className="px-4 py-3">Producto</th>
                  <th scope="col" className="px-4 py-3">Precio</th>
                  <th scope="col" className="px-4 py-3">Stock</th>
                  <th scope="col" className="px-4 py-3">Estado</th>
                  <th scope="col" className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.brand} · /{p.slug}</p>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatMoney(Number(p.price))}
                      {p.compare_at_price != null && (
                        <span className="ml-1 text-xs text-slate-400 line-through">{formatMoney(Number(p.compare_at_price))}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      <span className={Number(p.stock) <= 5 ? 'font-semibold text-amber-700' : 'text-slate-700'}>{p.stock}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                        {p.status === 'published' ? 'Publicado' : 'Borrador'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setImagesFor({ id: p.id, name: p.name })} type="button" aria-label={`Imágenes de ${p.name}`}>
                          <ImagePlus className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setEditId(p.id); setShowForm(true) }} type="button" aria-label={`Editar ${p.name}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => setDeletingId(p.id)} type="button" aria-label={`Eliminar ${p.name}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      <Pagination className="mt-4" page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Confirmación de borrado */}
      {deletingId && (
        <Modal open onClose={() => setDeletingId(null)} title="Eliminar producto" maxWidth="max-w-md">
          <p className="text-sm text-slate-600">
            ¿Eliminar «{products?.find((p) => p.id === deletingId)?.name}»? Esta acción no se puede deshacer y también
            quita sus imágenes.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeletingId(null)} type="button">Cancelar</Button>
            <Button variant="danger" loading={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deletingId)} type="button">
              Eliminar
            </Button>
          </div>
        </Modal>
      )}

      {showForm && (
        <ProductFormModal
          productId={editId}
          categories={(categoriesQuery.data ?? []).map((c) => ({ id: c.id, name: c.name, slug: c.slug, productCount: c.productCount }))}
          onClose={() => { setShowForm(false); setEditId(null) }}
        />
      )}

      {imagesFor && <ImagesModal productId={imagesFor.id} productName={imagesFor.name} onClose={() => setImagesFor(null)} />}
    </div>
  )
}
