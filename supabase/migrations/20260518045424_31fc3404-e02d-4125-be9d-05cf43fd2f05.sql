
-- SHOP CATALOG
CREATE TABLE public.shop_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('emoji','color')),
  value text NOT NULL,
  name text NOT NULL,
  cost integer NOT NULL DEFAULT 100,
  rarity text NOT NULL DEFAULT 'common' CHECK (rarity IN ('common','uncommon','rare','epic','legendary')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, value)
);
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct shop" ON public.shop_items FOR SELECT USING (false);

-- USER INVENTORY
CREATE TABLE public.account_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('emoji','color')),
  value text NOT NULL,
  source text NOT NULL DEFAULT 'shop',
  acquired_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, kind, value)
);
CREATE INDEX idx_inventory_acct ON public.account_inventory(account_id);
ALTER TABLE public.account_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct inv" ON public.account_inventory FOR SELECT USING (false);

-- PACKS
CREATE TABLE public.pack_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  cost integer NOT NULL DEFAULT 200,
  -- weights are JSON e.g. {"common":60,"uncommon":25,"rare":10,"epic":4,"legendary":1}
  weights jsonb NOT NULL DEFAULT '{"common":60,"uncommon":25,"rare":10,"epic":4,"legendary":1}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pack_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct packs" ON public.pack_definitions FOR SELECT USING (false);

-- GAMBLING LOGS
CREATE TABLE public.gamble_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  game text NOT NULL,
  wager integer NOT NULL,
  payout integer NOT NULL,
  outcome jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_gamble_acct ON public.gamble_logs(account_id, created_at DESC);
ALTER TABLE public.gamble_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct gamble" ON public.gamble_logs FOR SELECT USING (false);

-- SEED EMOJI CATALOG (common -> legendary)
INSERT INTO public.shop_items (kind, value, name, cost, rarity) VALUES
  ('emoji','🎮','Gamepad',100,'common'),
  ('emoji','🎯','Bullseye',100,'common'),
  ('emoji','🚀','Rocket',150,'common'),
  ('emoji','👾','Invader',150,'common'),
  ('emoji','🤖','Bot',200,'uncommon'),
  ('emoji','👻','Ghost',200,'uncommon'),
  ('emoji','🦊','Fox',250,'uncommon'),
  ('emoji','🐉','Dragon',400,'rare'),
  ('emoji','⚡','Bolt',300,'rare'),
  ('emoji','🔥','Fire',350,'rare'),
  ('emoji','💀','Skull',500,'epic'),
  ('emoji','🎲','Dice',500,'epic'),
  ('emoji','🏆','Trophy',750,'epic'),
  ('emoji','💎','Diamond',1000,'legendary'),
  ('emoji','🌟','Star',900,'legendary'),
  ('emoji','🦄','Unicorn',1500,'legendary'),
  ('emoji','🐱','Cat',150,'common'),
  ('emoji','🐺','Wolf',300,'rare'),
  ('emoji','🦁','Lion',600,'epic'),
  ('emoji','🐼','Panda',250,'uncommon');

-- SEED COLOR CATALOG
INSERT INTO public.shop_items (kind, value, name, cost, rarity) VALUES
  ('color','#a78bfa','Purple Haze',0,'common'),
  ('color','#60a5fa','Sky Blue',100,'common'),
  ('color','#34d399','Mint',100,'common'),
  ('color','#fbbf24','Gold',300,'rare'),
  ('color','#f472b6','Hot Pink',250,'uncommon'),
  ('color','#f87171','Crimson',200,'uncommon'),
  ('color','#fb923c','Sunset',300,'rare'),
  ('color','#22d3ee','Cyan',400,'rare'),
  ('color','#e879f9','Magenta',600,'epic'),
  ('color','#a3e635','Lime',500,'epic'),
  ('color','#fde047','Lightning',1000,'legendary'),
  ('color','#ff0080','Neon Rose',1500,'legendary');

-- Default starting cosmetics — give all existing accounts the base purple
INSERT INTO public.account_inventory (account_id, kind, value, source)
SELECT id, 'color', '#a78bfa', 'default' FROM public.accounts
ON CONFLICT DO NOTHING;
INSERT INTO public.account_inventory (account_id, kind, value, source)
SELECT id, 'emoji', '🎮', 'default' FROM public.accounts
ON CONFLICT DO NOTHING;

-- SEED PACK DEFINITIONS
INSERT INTO public.pack_definitions (key, name, description, cost, weights) VALUES
  ('starter','Starter Pack','Mostly commons, occasional rare drops.',200,
    '{"common":70,"uncommon":22,"rare":7,"epic":1,"legendary":0}'::jsonb),
  ('premium','Premium Pack','Better odds for rare and epic cosmetics.',600,
    '{"common":40,"uncommon":30,"rare":20,"epic":8,"legendary":2}'::jsonb),
  ('legendary','Legendary Pack','High chance of epic or legendary drops.',1500,
    '{"common":10,"uncommon":20,"rare":30,"epic":30,"legendary":10}'::jsonb);
