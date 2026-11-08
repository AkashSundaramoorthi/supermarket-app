-- Supabase Seed Data

-- 1. Insert Campus Store
INSERT INTO public.stores (id, name, address, lat, lng, pickup_eta_minutes, delivery_enabled, delivery_fee_paise, min_free_delivery_paise, active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Campus Fresh Market',
  'Gate 2, College Road, Campus South',
  12.971598,
  77.594562,
  15,
  true,
  2500,
  19900,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address;

-- 2. Insert Categories
INSERT INTO public.categories (id, name, slug, icon, sort_order)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Fresh Produce', 'produce', '🥦', 1),
  ('c0000000-0000-0000-0000-000000000002', 'Dairy & Eggs', 'dairy', '🥛', 2),
  ('c0000000-0000-0000-0000-000000000003', 'Instant & Noodles', 'instant', '🍜', 3),
  ('c0000000-0000-0000-0000-000000000004', 'Snacks & Munchies', 'snacks', '🥨', 4),
  ('c0000000-0000-0000-0000-000000000005', 'Drinks & Juices', 'drinks', '🧃', 5),
  ('c0000000-0000-0000-0000-000000000006', 'Daily Essentials', 'essentials', '🧼', 6)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  icon = EXCLUDED.icon;

-- 3. Insert Products
INSERT INTO public.products (id, category_id, name, description, price_paise, mrp_paise, unit, image_url, badge, is_veg, calories, active)
VALUES
  -- Produce
  ('p0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Robusta Fresh Bananas', 'Naturally ripened, nutrient-rich sweet yellow bananas.', 4900, 6500, '1 dozen (~1.2 kg)', 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=400&q=80', '25% OFF', true, '89 kcal/100g', true),
  ('p0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'Farm Fresh Hybrid Tomatoes', 'Firm, glossy red tomatoes handpicked from local farms.', 3200, 4000, '500 g', 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=400&q=80', 'Fresh Pick', true, '18 kcal/100g', true),
  ('p0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'Nashik Red Onions', 'Crisp and pungent premium quality onions.', 4500, 5500, '1 kg', 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=400&q=80', '18% OFF', true, '40 kcal/100g', true),
  ('p0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 'Fresh Crisp Apples (Himachal)', 'Juicy, crisp, sweet Himachal red apples.', 9900, 13000, '4 pcs (~600 g)', 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=400&q=80', 'Popular', true, '52 kcal/100g', true),

  -- Dairy & Eggs
  ('p0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000002', 'Pasteurized Full Cream Milk', 'Rich, wholesome whole milk homogenized and pasteurized.', 6500, 6800, '1 L Pouch', 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80', 'Daily Essential', true, '62 kcal/100ml', true),
  ('p0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000002', 'Farm Fresh Brown Eggs', 'Naturally laid, high-protein eggs with sturdy shells.', 9500, 11000, '12 pcs pack', 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=400&q=80', 'Best Seller', false, '72 kcal/egg', true),
  ('p0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000002', 'Malai Fresh Cottage Paneer', 'Soft, succulent paneer made from pure cow milk.', 9900, 11500, '200 g block', 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=400&q=80', '14% OFF', true, '265 kcal/100g', true),
  ('p0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000002', 'Salted Butter Block', 'Creamy golden salted butter. Spreads smoothly on warm toasts.', 5400, 6000, '100 g', 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=400&q=80', 'Breakfast', true, '717 kcal/100g', true),

  -- Instant Food
  ('p0000000-0000-0000-0000-000000000009', 'c0000000-0000-0000-0000-000000000003', 'Classic Masala 2-Min Noodles', 'Everyone''s favorite midnight comfort snack.', 5600, 6000, '4 x 70 g Multipack', 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=400&q=80', 'Student Favorite', true, '380 kcal/pack', true),
  ('p0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000003', 'Spicy Korean Hot Chicken Noodles', 'Extra spicy, fiery ramen with chewy noodles.', 13500, 16000, '140 g Bowl', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=400&q=80', 'Trending 🔥', true, '530 kcal/bowl', true),

  -- Snacks & Munchies
  ('p0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000004', 'Classic Salted Crispy Chips', 'Crispy thinly sliced golden potato chips with rock salt.', 2000, 2500, '100 g bag', 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=400&q=80', 'Crunchy', true, '536 kcal/100g', true),
  ('p0000000-0000-0000-0000-000000000012', 'c0000000-0000-0000-0000-000000000004', 'Artisan 70% Dark Chocolate', 'Rich, velvety Belgian cocoa dark chocolate.', 15000, 18000, '90 g bar', 'https://images.unsplash.com/photo-1511381939415-e44015466834?auto=format&fit=crop&w=400&q=80', 'Sweet Treat', true, '598 kcal/100g', true),

  -- Drinks & Beverages
  ('p0000000-0000-0000-0000-000000000013', 'c0000000-0000-0000-0000-000000000005', '100% Squeezed Valencia Orange Juice', 'No added sugar. Pure vitamin C boost.', 12000, 14500, '1 L Bottle', 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=400&q=80', 'No Added Sugar', true, '45 kcal/100ml', true),
  ('p0000000-0000-0000-0000-000000000014', 'c0000000-0000-0000-0000-000000000005', 'Himalayan Mineral Spring Water', 'Naturally purified mountain spring water.', 2000, 2500, '1 L Bottle', 'https://images.unsplash.com/photo-1559839914-ba2ae6b7c538?auto=format&fit=crop&w=400&q=80', 'Chilled', true, '0 kcal', true),

  -- Essentials
  ('p0000000-0000-0000-0000-000000000015', 'c0000000-0000-0000-0000-000000000006', 'Ultra Soft Facial Tissues', 'Gentle 3-ply 100% virgin pulp facial tissues.', 11000, 14000, 'Pack of 3', 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80', 'Value Pack', true, null, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price_paise = EXCLUDED.price_paise,
  mrp_paise = EXCLUDED.mrp_paise;

-- 4. Initial Stock per Product (100 units each)
INSERT INTO public.store_stock (store_id, product_id, qty)
SELECT
  '00000000-0000-0000-0000-000000000001',
  p.id,
  100
FROM public.products p
ON CONFLICT (store_id, product_id) DO UPDATE SET
  qty = EXCLUDED.qty;
