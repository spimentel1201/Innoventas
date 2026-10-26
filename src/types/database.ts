export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'customer' | 'admin'
export type ProductStatus = 'draft' | 'published'
export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
export type PaymentMethod = 'transfer' | 'cod' | 'demo_card'
export type ChatRole = 'user' | 'assistant' | 'system'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          phone: string | null
          role: UserRole
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string
          phone?: string | null
          role?: UserRole
        }
        Update: {
          email?: string
          full_name?: string
          phone?: string | null
          role?: UserRole
        }
      }
      categories: {
        Row: {
          id: string
          slug: string
          name: string
          description: string
          icon: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          description?: string
          icon?: string
          is_active?: boolean
        }
        Update: {
          slug?: string
          name?: string
          description?: string
          icon?: string
          is_active?: boolean
        }
      }
      products: {
        Row: {
          id: string
          category_id: string
          name: string
          slug: string
          description: string
          brand: string
          price: number
          compare_at_price: number | null
          stock: number
          specifications: Json
          status: ProductStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id: string
          name: string
          slug: string
          description?: string
          brand: string
          price: number
          compare_at_price?: number | null
          stock?: number
          specifications?: Json
          status?: ProductStatus
        }
        Update: {
          category_id?: string
          name?: string
          slug?: string
          description?: string
          brand?: string
          price?: number
          compare_at_price?: number | null
          stock?: number
          specifications?: Json
          status?: ProductStatus
        }
      }
      product_images: {
        Row: {
          id: string
          product_id: string
          url: string
          alt: string
          position: number
          is_primary: boolean
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          url: string
          alt?: string
          position?: number
          is_primary?: boolean
        }
        Update: {
          alt?: string
          position?: number
          is_primary?: boolean
        }
      }
      offers: {
        Row: {
          id: string
          product_id: string
          discount_percent: number
          starts_at: string
          ends_at: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          discount_percent: number
          starts_at: string
          ends_at: string
          is_active?: boolean
        }
        Update: {
          discount_percent?: number
          starts_at?: string
          ends_at?: string
          is_active?: boolean
        }
      }
      cart_items: {
        Row: {
          id: string
          user_id: string
          product_id: string
          quantity: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          product_id: string
          quantity: number
        }
        Update: {
          quantity?: number
        }
      }
      orders: {
        Row: {
          id: string
          order_number: string
          user_id: string
          email: string
          status: OrderStatus
          payment_method: PaymentMethod
          subtotal: number
          discount_total: number
          shipping_total: number
          total: number
          item_count: number
          shipping: Json
          created_at: string
          updated_at: string
        }
        Insert: never // se crean solo vía Edge Function + RPC
        Update: {
          status?: OrderStatus
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          brand: string
          slug: string
          image_url: string | null
          unit_price: number
          discount_percent: number
          unit_price_final: number
          quantity: number
          line_total: number
          created_at: string
        }
        Insert: never // se crean solo vía RPC place_order
        Update: never
      }
      chat_conversations: {
        Row: {
          id: string
          user_id: string | null
          session_id: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: never // se crean solo vía Edge Function
        Update: never
      }
      chat_messages: {
        Row: {
          id: string
          conversation_id: string
          role: ChatRole
          content: string
          confidence: number | null
          metadata: Json
          created_at: string
        }
        Insert: never // se crean solo vía Edge Function
        Update: never
      }
      chat_events: {
        Row: {
          id: string
          conversation_id: string | null
          user_id: string | null
          session_id: string | null
          event_type: string
          payload: Json
          created_at: string
        }
        Insert: never // se registran solo vía Edge Function
        Update: never
      }
      support_requests: {
        Row: {
          id: string
          name: string
          email: string
          subject: string
          message: string
          attachments: Json
          status: string
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          subject: string
          message: string
          attachments?: Json
          status?: string
          admin_notes?: string | null
        } // insert público anon (RLS policy), lectura y updates solo admins
        Update: {
          status?: string
          admin_notes?: string | null
        }
      }
    }
    Views: {
      published_products: {
        Row: PublishedProductRow
      }
      category_counts: {
        Row: { id: string; product_count: number }
      }
    }
    Functions: {
      place_order: {
        Args: { p_items: Json; p_shipping: Json; p_payment_method: PaymentMethod }
        Returns: { id: string; order_number: string }[]
      }
      admin_set_order_status: {
        Args: { p_order: string; p_status: OrderStatus }
        Returns: boolean
      }
      track_order: {
        Args: { p_order_number: string; p_email: string }
        Returns: unknown
      }
      best_selling_products: {
        Args: { p_limit?: number }
        Returns: unknown
      }
      admin_dashboard: {
        Args: Record<string, never>
        Returns: unknown
      }
    }
  }
}

/** Fila de la vista published_products (productos visibles al público con oferta efectiva). */
export interface PublishedProductRow {
  id: string
  category_id: string
  name: string
  slug: string
  description: string
  brand: string
  price: number
  compare_at_price: number | null
  stock: number
  specifications: Json | null
  status: string
  created_at: string
  updated_at: string
  category_slug: string
  category_name: string
  image_url: string | null
  offer_discount_percent: number | null
  offer_price: number | null
  offer_ends_at: string | null
}

export interface ProductImageRow {
  id: string
  url: string
  alt: string
  position: number
  is_primary: boolean
}
