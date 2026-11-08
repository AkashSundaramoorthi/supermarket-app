-- Supabase Migration: Complete Supermarket Database Schema
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum Types
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'pending_payment',
    'paid',
    'received',
    'packed',
    'ready_for_pickup',
    'out_for_delivery',
    'collected',
    'delivered',
    'cancelled',
    'refunded'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE fulfilment_type AS ENUM ('pickup', 'delivery');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_method_type AS ENUM ('cod', 'upi', 'card');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT UNIQUE,
  full_name TEXT,
  default_address JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Stores Table
CREATE TABLE IF NOT EXISTS public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  lat NUMERIC(9, 6),
  lng NUMERIC(9, 6),
  pickup_eta_minutes INT NOT NULL DEFAULT 15,
  delivery_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  delivery_fee_paise INT NOT NULL DEFAULT 2500,
  min_free_delivery_paise INT NOT NULL DEFAULT 19900,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 0
);

-- 4. Products Table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_paise INT NOT NULL CHECK (price_paise >= 0),
  mrp_paise INT NOT NULL CHECK (mrp_paise >= price_paise),
  unit TEXT NOT NULL,
  image_url TEXT,
  badge TEXT,
  is_veg BOOLEAN NOT NULL DEFAULT TRUE,
  calories TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category_active ON public.products (category_id, active);

-- 5. Store Stock Table
CREATE TABLE IF NOT EXISTS public.store_stock (
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  qty INT NOT NULL DEFAULT 0 CHECK (qty >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (store_id, product_id)
);

-- 6. Carts Table
CREATE TABLE IF NOT EXISTS public.carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  store_id UUID NOT NULL REFERENCES public.stores(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Cart Items Table
CREATE TABLE IF NOT EXISTS public.cart_items (
  cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  qty INT NOT NULL CHECK (qty > 0),
  PRIMARY KEY (cart_id, product_id)
);

-- 8. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  store_id UUID NOT NULL REFERENCES public.stores(id),
  status public.order_status NOT NULL DEFAULT 'pending_payment',
  fulfilment public.fulfilment_type NOT NULL,
  pickup_slot TIMESTAMPTZ,
  delivery_address JSONB,
  subtotal_paise INT NOT NULL CHECK (subtotal_paise >= 0),
  delivery_fee_paise INT NOT NULL DEFAULT 0 CHECK (delivery_fee_paise >= 0),
  tip_paise INT NOT NULL DEFAULT 0 CHECK (tip_paise >= 0),
  total_paise INT NOT NULL CHECK (total_paise >= 0),
  payment_method public.payment_method_type NOT NULL,
  collection_code TEXT,
  razorpay_order_id TEXT UNIQUE,
  razorpay_payment_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_created ON public.orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_rzp ON public.orders (razorpay_order_id);

-- 9. Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  name_snapshot TEXT NOT NULL,
  unit_price_paise INT NOT NULL CHECK (unit_price_paise >= 0),
  qty INT NOT NULL CHECK (qty > 0)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);

-- Helper Function: Generate Counter Collection Code (e.g. A104)
CREATE OR REPLACE FUNCTION public.generate_collection_code()
RETURNS TEXT AS $$
DECLARE
  letters TEXT[] := ARRAY['A', 'B', 'C', 'D', 'E'];
  random_letter TEXT;
  random_digits INT;
  code TEXT;
BEGIN
  random_letter := letters[1 + floor(random() * array_length(letters, 1))::int];
  random_digits := 100 + floor(random() * 900)::int;
  code := random_letter || random_digits::text;
  RETURN code;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Stored Procedure: Atomic Stock Decrement on Order Payment
CREATE OR REPLACE FUNCTION public.decrement_order_stock(target_order_id UUID)
RETURNS VOID AS $$
DECLARE
  item RECORD;
BEGIN
  FOR item IN
    SELECT product_id, qty
    FROM public.order_items
    WHERE order_id = target_order_id AND product_id IS NOT NULL
  LOOP
    UPDATE public.store_stock
    SET qty = GREATEST(0, qty - item.qty),
        updated_at = NOW()
    WHERE product_id = item.product_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Order State Transition Trigger Function (Domain State Machine enforcement)
CREATE OR REPLACE FUNCTION public.check_order_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  is_valid BOOLEAN := FALSE;
  was_paid BOOLEAN := (OLD.status != 'pending_payment');
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  CASE OLD.status
    WHEN 'pending_payment' THEN
      is_valid := (NEW.status IN ('paid', 'cancelled'));
    WHEN 'paid' THEN
      is_valid := (NEW.status IN ('received', 'cancelled'));
    WHEN 'received' THEN
      is_valid := (NEW.status IN ('packed', 'cancelled'));
    WHEN 'packed' THEN
      IF NEW.status = 'cancelled' THEN
        is_valid := TRUE;
      ELSIF OLD.fulfilment = 'pickup' THEN
        is_valid := (NEW.status = 'ready_for_pickup');
      ELSE
        is_valid := (NEW.status = 'out_for_delivery');
      END IF;
    WHEN 'ready_for_pickup' THEN
      is_valid := (NEW.status = 'collected');
    WHEN 'out_for_delivery' THEN
      is_valid := (NEW.status = 'delivered');
    WHEN 'cancelled' THEN
      is_valid := (NEW.status = 'refunded' AND was_paid);
    ELSE
      is_valid := FALSE;
  END CASE;

  IF NOT is_valid THEN
    RAISE EXCEPTION 'Illegal order status transition from % to % for order %',
      OLD.status, NEW.status, OLD.id;
  END IF;

  -- Auto-generate collection code when order moves to paid/ready_for_pickup if pickup
  IF OLD.fulfilment = 'pickup' AND NEW.status IN ('paid', 'ready_for_pickup') AND NEW.collection_code IS NULL THEN
    NEW.collection_code := public.generate_collection_code();
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_order_status ON public.orders;
CREATE TRIGGER trg_validate_order_status
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.check_order_status_transition();

-- Trigger: Automatically Create Profile on User Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, phone, full_name, created_at)
  VALUES (NEW.id, NEW.phone, NEW.raw_user_meta_data->>'full_name', NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public read active stores" ON public.stores
  FOR SELECT USING (active = true);

CREATE POLICY "Public read categories" ON public.categories
  FOR SELECT USING (true);

CREATE POLICY "Public read active products" ON public.products
  FOR SELECT USING (active = true);

CREATE POLICY "Public read store stock" ON public.store_stock
  FOR SELECT USING (true);

CREATE POLICY "User read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "User update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "User insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "User read own cart" ON public.carts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "User write own cart" ON public.carts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "User read own cart items" ON public.cart_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid())
  );

CREATE POLICY "User write own cart items" ON public.cart_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid())
  );

-- Orders RLS: Customer reads own orders. Client cannot directly insert or update orders; handled via Edge Functions or Service Role.
CREATE POLICY "User read own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "User read own order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
  );

-- Realtime Setup: Publish orders for real-time delivery tracking
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.store_stock;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
