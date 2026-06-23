-- Bombay Bicycle Chef — 0015 inventory & supplier management (Phase 10)
-- Self-contained module. Catalogue tables are org-level (any staff read, managers
-- manage); stock/movements/POs/waste carry location_id and scope by
-- role_at_least(role, location). Recipes link menu_items → inventory for costing.

-- Suppliers -------------------------------------------------------------------
create table if not exists suppliers (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  contact_name text,
  email        text,
  phone        text,
  address      text,
  notes        text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
drop trigger if exists suppliers_updated on suppliers;
create trigger suppliers_updated before update on suppliers for each row execute function set_updated_at();

-- Inventory items (catalogue) -------------------------------------------------
create table if not exists inventory_items (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  category   text not null check (category in ('ingredient', 'raw_material', 'packaging', 'beverage')),
  unit       text not null,                  -- 'kg','g','l','ml','each','pack'
  cost_pence int  not null default 0,        -- cost per base unit (maintained on receive)
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists inventory_items_updated on inventory_items;
create trigger inventory_items_updated before update on inventory_items for each row execute function set_updated_at();

-- Per-location stock ----------------------------------------------------------
create table if not exists location_stock (
  location_id   uuid not null references locations(id) on delete cascade,
  item_id       uuid not null references inventory_items(id) on delete cascade,
  qty           numeric not null default 0,
  min_qty       numeric not null default 0,
  reorder_level numeric not null default 0,
  reorder_qty   numeric not null default 0,
  updated_at    timestamptz not null default now(),
  primary key (location_id, item_id)
);
drop trigger if exists location_stock_updated on location_stock;
create trigger location_stock_updated before update on location_stock for each row execute function set_updated_at();

-- Purchase orders -------------------------------------------------------------
create table if not exists purchase_orders (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null default upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6)),
  supplier_id uuid not null references suppliers(id) on delete restrict,
  location_id uuid not null references locations(id) on delete restrict,
  status      text not null default 'draft' check (status in ('draft', 'sent', 'received', 'cancelled')),
  expected_at date,
  received_at timestamptz,
  notes       text,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists po_loc_idx on purchase_orders(location_id, created_at);
drop trigger if exists purchase_orders_updated on purchase_orders;
create trigger purchase_orders_updated before update on purchase_orders for each row execute function set_updated_at();

create table if not exists purchase_order_items (
  id               uuid primary key default gen_random_uuid(),
  po_id            uuid not null references purchase_orders(id) on delete cascade,
  item_id          uuid not null references inventory_items(id) on delete restrict,
  qty_ordered      numeric not null,
  qty_received     numeric not null default 0,
  unit_price_pence int not null default 0,   -- price per pack
  pack_size        numeric not null default 1
);
create index if not exists poi_po_idx on purchase_order_items(po_id);

-- Stock movement ledger (append-only) -----------------------------------------
create table if not exists stock_movements (
  id              uuid primary key default gen_random_uuid(),
  location_id     uuid not null references locations(id) on delete cascade,
  item_id         uuid not null references inventory_items(id) on delete cascade,
  delta           numeric not null,          -- + receive, - waste/usage/adjust-down
  kind            text not null check (kind in ('receive', 'adjust', 'waste', 'transfer', 'correction')),
  reason          text,
  unit_cost_pence int,
  po_id           uuid references purchase_orders(id) on delete set null,
  actor_id        uuid references profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index if not exists movements_loc_item_idx on stock_movements(location_id, item_id, created_at);

-- Supplier catalogue + pricing history ----------------------------------------
create table if not exists supplier_products (
  id          uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers(id) on delete cascade,
  item_id     uuid not null references inventory_items(id) on delete cascade,
  supplier_sku text,
  pack_size   numeric not null default 1,    -- base units per pack
  price_pence int not null default 0,        -- price per pack
  updated_at  timestamptz not null default now(),
  unique (supplier_id, item_id)
);
drop trigger if exists supplier_products_updated on supplier_products;
create trigger supplier_products_updated before update on supplier_products for each row execute function set_updated_at();

create table if not exists supplier_price_history (
  id                  uuid primary key default gen_random_uuid(),
  supplier_product_id uuid not null references supplier_products(id) on delete cascade,
  price_pence         int  not null,
  created_at          timestamptz not null default now()
);

-- Waste -----------------------------------------------------------------------
create table if not exists waste_records (
  id          uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  item_id     uuid not null references inventory_items(id) on delete restrict,
  qty         numeric not null check (qty > 0),
  reason      text not null check (reason in ('damaged', 'expired', 'kitchen', 'other')),
  notes       text,
  actor_id    uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists waste_loc_idx on waste_records(location_id, created_at);

-- Recipes (for costing) -------------------------------------------------------
create table if not exists menu_item_ingredients (
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  item_id      uuid not null references inventory_items(id) on delete cascade,
  qty          numeric not null,             -- base units of the inventory item per dish
  primary key (menu_item_id, item_id)
);

-- Row Level Security ----------------------------------------------------------
alter table suppliers              enable row level security;
alter table inventory_items        enable row level security;
alter table location_stock         enable row level security;
alter table purchase_orders        enable row level security;
alter table purchase_order_items   enable row level security;
alter table stock_movements        enable row level security;
alter table supplier_products      enable row level security;
alter table supplier_price_history enable row level security;
alter table waste_records          enable row level security;
alter table menu_item_ingredients  enable row level security;

-- Catalogue (org-level): any staff read; restaurant managers manage.
do $$
declare t text;
begin
  foreach t in array array['suppliers', 'inventory_items', 'supplier_products', 'supplier_price_history', 'menu_item_ingredients']
  loop
    execute format('drop policy if exists "staff read %1$s" on %1$s', t);
    execute format('drop policy if exists "managers manage %1$s" on %1$s', t);
    execute format('create policy "staff read %1$s" on %1$s for select using (is_staff())', t);
    execute format('create policy "managers manage %1$s" on %1$s for all using (role_at_least(''restaurant_manager'')) with check (role_at_least(''restaurant_manager''))', t);
  end loop;
end $$;

-- Location stock + movements: staff read at location; managers manage.
drop policy if exists "staff read location_stock" on location_stock;
drop policy if exists "managers manage location_stock" on location_stock;
create policy "staff read location_stock" on location_stock for select using (role_at_least('staff', location_id));
create policy "managers manage location_stock" on location_stock for all using (role_at_least('location_manager', location_id)) with check (role_at_least('location_manager', location_id));

drop policy if exists "staff read stock_movements" on stock_movements;
create policy "staff read stock_movements" on stock_movements for select using (role_at_least('staff', location_id));

-- Purchase orders: staff read at location; managers manage.
drop policy if exists "staff read purchase_orders" on purchase_orders;
drop policy if exists "managers manage purchase_orders" on purchase_orders;
create policy "staff read purchase_orders" on purchase_orders for select using (role_at_least('staff', location_id));
create policy "managers manage purchase_orders" on purchase_orders for all using (role_at_least('location_manager', location_id)) with check (role_at_least('location_manager', location_id));

drop policy if exists "staff read po_items" on purchase_order_items;
drop policy if exists "managers manage po_items" on purchase_order_items;
create policy "staff read po_items" on purchase_order_items for select
  using (exists (select 1 from purchase_orders p where p.id = po_id and role_at_least('staff', p.location_id)));
create policy "managers manage po_items" on purchase_order_items for all
  using (exists (select 1 from purchase_orders p where p.id = po_id and role_at_least('location_manager', p.location_id)))
  with check (exists (select 1 from purchase_orders p where p.id = po_id and role_at_least('location_manager', p.location_id)));

-- Waste: staff at the location create + read.
drop policy if exists "staff manage waste" on waste_records;
create policy "staff manage waste" on waste_records for all using (role_at_least('staff', location_id)) with check (role_at_least('staff', location_id));
