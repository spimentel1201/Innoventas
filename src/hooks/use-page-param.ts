import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'

/** Estado de paginación derivado de la URL (?page=n). */
export function usePageParam(defaultPage = 1) {
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page') ?? defaultPage)
  const safePage = Number.isFinite(page) && page >= 1 ? Math.floor(page) : defaultPage
  const setPage = (next: number) => {
    const copy = new URLSearchParams(params)
    if (next <= 1) copy.delete('page')
    else copy.set('page', String(next))
    setParams(copy, { replace: true })
  }
  const [lastPage, setLastPage] = useState(defaultPage)
  return { page: safePage, setPage, lastPage, setLastPage }
}
