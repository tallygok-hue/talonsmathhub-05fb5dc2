create table if not exists pack_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  image_url text,
  cost_points integer not null default 500,
  is_seasonal boolean default false,
  is_event_pack boolean default false,
  season_name text,
  event_name text,
  created_at timestamp default now()
);

create table if not exists collectible_cards (
  id uuid primary key default gen_random_uuid(),
  pack_type_id uuid references pack_types(id) on delete cascade,
  name text not null,
  rarity text not null check (rarity in ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  description text,
  image_url text,
  animated boolean default false,
  animation_url text,
  created_at timestamp default now()
);

create table if not exists user_collectibles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_users(id) on delete cascade,
  card_id uuid references collectible_cards(id) on delete cascade,
  count integer default 1,
  is_duplicate boolean default false,
  acquired_at timestamp default now(),
  unique(user_id, card_id)
);

create table if not exists pack_openings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_users(id) on delete cascade,
  pack_type_id uuid references pack_types(id),
  cost_points integer not null,
  opened_at timestamp default now()
);

create index if not exists idx_user_collectibles on user_collectibles(user_id);
create index if not exists idx_pack_openings on pack_openings(user_id);
create index if not exists idx_collectible_cards on collectible_cards(pack_type_id);

-- Rarity-weighted card selection function
create or replace function draw_card_from_pack(pack_id uuid)
returns uuid as $$
declare
  v_card_id uuid;
  v_rarity_roll numeric;
begin
  v_rarity_roll := random();
  
  select id into v_card_id from collectible_cards
  where pack_type_id = pack_id
  and (
    (rarity = 'legendary' and v_rarity_roll > 0.99) or
    (rarity = 'epic' and v_rarity_roll > 0.95 and v_rarity_roll <= 0.99) or
    (rarity = 'rare' and v_rarity_roll > 0.80 and v_rarity_roll <= 0.95) or
    (rarity = 'uncommon' and v_rarity_roll > 0.30 and v_rarity_roll <= 0.80) or
    (rarity = 'common' and v_rarity_roll <= 0.30)
  )
  order by random()
  limit 1;
  
  if v_card_id is null then
    select id into v_card_id from collectible_cards
    where pack_type_id = pack_id
    order by random()
    limit 1;
  end if;
  
  return v_card_id;
end;
$$ language plpgsql;

-- Open pack function
create or replace function open_pack(p_user_id uuid, p_pack_type_id uuid, p_num_cards integer default 3)
returns json as $$
declare
  v_pack_cost integer;
  v_user_balance integer;
  v_opened_cards uuid[] := array[]::uuid[];
  v_duplicates integer := 0;
  v_card_id uuid;
  v_i integer;
  v_result json;
begin
  select cost_points into v_pack_cost from pack_types where id = p_pack_type_id;
  select balance into v_user_balance from user_economy where user_id = p_user_id;
  
  if v_user_balance < v_pack_cost then
    return json_build_object('success', false, 'error', 'Insufficient points');
  end if;
  
  -- Deduct points
  update user_economy set balance = balance - v_pack_cost where user_id = p_user_id;
  
  -- Draw cards
  for v_i in 1..p_num_cards loop
    v_card_id := draw_card_from_pack(p_pack_type_id);
    v_opened_cards := array_append(v_opened_cards, v_card_id);
    
    -- Check if duplicate
    if exists(select 1 from user_collectibles where user_id = p_user_id and card_id = v_card_id) then
      v_duplicates := v_duplicates + 1;
      update user_collectibles set count = count + 1, is_duplicate = true 
        where user_id = p_user_id and card_id = v_card_id;
      -- Award duplicate points
      update user_economy set balance = balance + 25 where user_id = p_user_id;
    else
      insert into user_collectibles (user_id, card_id, count) values (p_user_id, v_card_id, 1);
    end if;
  end loop;
  
  -- Record pack opening
  insert into pack_openings (user_id, pack_type_id, cost_points) values (p_user_id, p_pack_type_id, v_pack_cost);
  
  return json_build_object(
    'success', true,
    'cards', v_opened_cards,
    'duplicates', v_duplicates,
    'duplicate_points_earned', v_duplicates * 25,
    'cost', v_pack_cost
  );
end;
$$ language plpgsql;

-- Get trending packs (most opened this week)
create or replace function get_trending_packs()
returns table(pack_id uuid, name text, opens_count bigint, unique_users bigint) as $$
begin
  return query
  select 
    pt.id,
    pt.name,
    count(po.id)::bigint,
    count(distinct po.user_id)::bigint
  from pack_types pt
  left join pack_openings po on pt.id = po.pack_type_id
    and po.opened_at > now() - interval '7 days'
  group by pt.id, pt.name
  order by count(po.id) desc
  limit 10;
end;
$$ language plpgsql;

-- Get collection stats
create or replace function get_collection_stats(p_user_id uuid)
returns json as $$
declare
  v_total_unique integer;
  v_total_owned integer;
  v_animated_count integer;
  v_rarity_counts json;
begin
  select count(distinct card_id) into v_total_unique from user_collectibles where user_id = p_user_id;
  select coalesce(sum(count), 0) into v_total_owned from user_collectibles where user_id = p_user_id;
  select count(*) into v_animated_count from user_collectibles uc
    join collectible_cards cc on uc.card_id = cc.id
    where uc.user_id = p_user_id and cc.animated = true;
  
  select json_object_agg(rarity, count) into v_rarity_counts
  from (
    select cc.rarity, count(uc.id) as count
    from user_collectibles uc
    join collectible_cards cc on uc.card_id = cc.id
    where uc.user_id = p_user_id
    group by cc.rarity
  ) t;
  
  return json_build_object(
    'total_unique', v_total_unique,
    'total_owned', v_total_owned,
    'animated_count', v_animated_count,
    'rarity_breakdown', v_rarity_counts
  );
end;
$$ language plpgsql;
