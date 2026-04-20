export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      hotels: {
        Row: { id: string; name: string; slug: string; logo_url: string | null; created_at: string }
        Insert: { id?: string; name: string; slug: string; logo_url?: string | null; created_at?: string }
        Update: { id?: string; name?: string; slug?: string; logo_url?: string | null }
      }
      profiles: {
        Row: { id: string; hotel_id: string; role: 'client' | 'staff' | 'admin'; full_name: string; phone: string | null; language: string; created_at: string }
        Insert: { id: string; hotel_id: string; role: 'client' | 'staff' | 'admin'; full_name: string; phone?: string | null; language?: string }
        Update: { full_name?: string; phone?: string | null; language?: string }
      }
      rooms: {
        Row: { id: string; hotel_id: string; number: string; type: string; floor: number | null; created_at: string }
        Insert: { id?: string; hotel_id: string; number: string; type: string; floor?: number | null }
        Update: { number?: string; type?: string; floor?: number | null }
      }
      stays: {
        Row: { id: string; hotel_id: string; guest_id: string; room_id: string; check_in: string; check_out: string; status: 'active' | 'archived'; created_at: string }
        Insert: { id?: string; hotel_id: string; guest_id: string; room_id: string; check_in: string; check_out: string; status?: 'active' | 'archived' }
        Update: { status?: 'active' | 'archived'; check_out?: string }
      }
      menu_categories: {
        Row: { id: string; hotel_id: string; name: string; sort_order: number; created_at: string }
        Insert: { id?: string; hotel_id: string; name: string; sort_order?: number }
        Update: { name?: string; sort_order?: number }
      }
      menu_items: {
        Row: { id: string; hotel_id: string; category_id: string; name: string; description: string | null; price: number; image_url: string | null; is_available: boolean; sort_order: number; created_at: string }
        Insert: { id?: string; hotel_id: string; category_id: string; name: string; description?: string | null; price: number; image_url?: string | null; is_available?: boolean; sort_order?: number }
        Update: { name?: string; description?: string | null; price?: number; image_url?: string | null; is_available?: boolean; sort_order?: number; category_id?: string }
      }
      orders: {
        Row: { id: string; hotel_id: string; stay_id: string; guest_id: string; status: 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'delivered' | 'cancelled'; total_amount: number; notes: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; hotel_id: string; stay_id: string; guest_id: string; status?: string; total_amount: number; notes?: string | null }
        Update: { status?: string; notes?: string | null }
      }
      order_items: {
        Row: { id: string; order_id: string; menu_item_id: string; quantity: number; unit_price: number; created_at: string }
        Insert: { id?: string; order_id: string; menu_item_id: string; quantity: number; unit_price: number }
        Update: never
      }
      service_requests: {
        Row: { id: string; hotel_id: string; stay_id: string; guest_id: string; type: 'cleaning' | 'towels' | 'maintenance' | 'other'; description: string | null; priority: 'normal' | 'urgent'; status: 'pending' | 'in_progress' | 'completed' | 'cancelled'; created_at: string; updated_at: string }
        Insert: { id?: string; hotel_id: string; stay_id: string; guest_id: string; type: string; description?: string | null; priority?: string; status?: string }
        Update: { status?: string; priority?: string; description?: string | null }
      }
      messages: {
        Row: { id: string; hotel_id: string; stay_id: string; sender_id: string; content: string; created_at: string }
        Insert: { id?: string; hotel_id: string; stay_id: string; sender_id: string; content: string }
        Update: never
      }
      push_subscriptions: {
        Row: { id: string; user_id: string; subscription: Json; created_at: string }
        Insert: { id?: string; user_id: string; subscription: Json }
        Update: { subscription?: Json }
      }
    }
    Views: {
      expenses: {
        Row: { id: string; hotel_id: string; stay_id: string; guest_id: string; amount: number; status: string; created_at: string }
      }
    }
    Functions: {
      get_active_stay: {
        Args: { p_guest_id: string }
        Returns: Array<{ id: string; hotel_id: string; room_id: string; check_in: string; check_out: string; status: string; room_number: string; room_type: string; room_floor: number | null }>
      }
      get_hotel_stats: {
        Args: { p_hotel_id: string }
        Returns: Json
      }
    }
  }
}
