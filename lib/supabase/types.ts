export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "received"
  | "packed"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "collected"
  | "delivered"
  | "cancelled"
  | "refunded";

export type FulfilmentType = "pickup" | "delivery";
export type PaymentMethodType = "cod" | "upi" | "card";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          phone: string | null;
          full_name: string | null;
          default_address: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          phone?: string | null;
          full_name?: string | null;
          default_address?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          phone?: string | null;
          full_name?: string | null;
          default_address?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      stores: {
        Row: {
          id: string;
          name: string;
          address: string;
          lat: number | null;
          lng: number | null;
          pickup_eta_minutes: number;
          delivery_enabled: boolean;
          delivery_fee_paise: number;
          min_free_delivery_paise: number;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          address: string;
          lat?: number | null;
          lng?: number | null;
          pickup_eta_minutes?: number;
          delivery_enabled?: boolean;
          delivery_fee_paise?: number;
          min_free_delivery_paise?: number;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string;
          lat?: number | null;
          lng?: number | null;
          pickup_eta_minutes?: number;
          delivery_enabled?: boolean;
          delivery_fee_paise?: number;
          min_free_delivery_paise?: number;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          icon: string | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          icon?: string | null;
          sort_order?: number;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          icon?: string | null;
          sort_order?: number;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          category_id: string;
          name: string;
          description: string | null;
          price_paise: number;
          mrp_paise: number;
          unit: string;
          image_url: string | null;
          badge: string | null;
          is_veg: boolean;
          calories: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          name: string;
          description?: string | null;
          price_paise: number;
          mrp_paise: number;
          unit: string;
          image_url?: string | null;
          badge?: string | null;
          is_veg?: boolean;
          calories?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          name?: string;
          description?: string | null;
          price_paise?: number;
          mrp_paise?: number;
          unit?: string;
          image_url?: string | null;
          badge?: string | null;
          is_veg?: boolean;
          calories?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      store_stock: {
        Row: {
          store_id: string;
          product_id: string;
          qty: number;
          updated_at: string;
        };
        Insert: {
          store_id: string;
          product_id: string;
          qty?: number;
          updated_at?: string;
        };
        Update: {
          store_id?: string;
          product_id?: string;
          qty?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          user_id: string | null;
          store_id: string;
          status: OrderStatus;
          fulfilment: FulfilmentType;
          pickup_slot: string | null;
          delivery_address: Json | null;
          subtotal_paise: number;
          delivery_fee_paise: number;
          tip_paise: number;
          total_paise: number;
          payment_method: PaymentMethodType;
          collection_code: string | null;
          razorpay_order_id: string | null;
          razorpay_payment_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number: string;
          user_id?: string | null;
          store_id: string;
          status?: OrderStatus;
          fulfilment: FulfilmentType;
          pickup_slot?: string | null;
          delivery_address?: Json | null;
          subtotal_paise: number;
          delivery_fee_paise?: number;
          tip_paise?: number;
          total_paise: number;
          payment_method: PaymentMethodType;
          collection_code?: string | null;
          razorpay_order_id?: string | null;
          razorpay_payment_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_number?: string;
          user_id?: string | null;
          store_id?: string;
          status?: OrderStatus;
          fulfilment?: FulfilmentType;
          pickup_slot?: string | null;
          delivery_address?: Json | null;
          subtotal_paise?: number;
          delivery_fee_paise?: number;
          tip_paise?: number;
          total_paise?: number;
          payment_method?: PaymentMethodType;
          collection_code?: string | null;
          razorpay_order_id?: string | null;
          razorpay_payment_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          name_snapshot: string;
          unit_price_paise: number;
          qty: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          name_snapshot: string;
          unit_price_paise: number;
          qty: number;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string | null;
          name_snapshot?: string;
          unit_price_paise?: number;
          qty?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      order_status: OrderStatus;
      fulfilment_type: FulfilmentType;
      payment_method_type: PaymentMethodType;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
