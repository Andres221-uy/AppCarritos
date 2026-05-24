-- ══════════════════════════════════════════════════════════════════
--  CarritosUY — Schema completo para Supabase
--  Ejecutar en: Supabase Dashboard → SQL Editor → New query
--  Orden de ejecución: de arriba hacia abajo, todo de una vez
-- ══════════════════════════════════════════════════════════════════


-- ──────────────────────────────────────────────────────────────────
--  EXTENSIONES NECESARIAS
-- ──────────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";      -- para uuid_generate_v4()
create extension if not exists "postgis";        -- para columnas de geolocalización (lat/lng como punto)


-- ══════════════════════════════════════════════════════════════════
--  1. PROFILES
--     Se crea automáticamente al registrarse un usuario.
--     Vinculada 1:1 con auth.users de Supabase.
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nombre      text,
  email       text,
  telefono    text,
  role        text not null default 'cliente'   -- 'cliente' | 'dueno'
                check (role in ('cliente', 'dueno')),
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Trigger: crear profile automáticamente al registrar usuario
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, nombre, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'cliente')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger: actualizar updated_at automáticamente
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();


-- ══════════════════════════════════════════════════════════════════
--  2. CARRITOS
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.carritos (
  id           uuid primary key default uuid_generate_v4(),
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  nombre       text not null,
  tipo         text not null,                  -- "Chivitos y milanesas"
  emoji        text not null default '🛒',
  barrio       text not null,
  lat          double precision not null,
  lng          double precision not null,
  horario      text,
  telefono     text,
  especialidad text,
  estado       text not null default 'cerrado'
                 check (estado in ('abierto', 'cerrado')),
  rating       numeric(3,2) not null default 0,
  reviews_count integer not null default 0,
  plan         text not null default 'gratis'
                 check (plan in ('gratis', 'pro', 'destacado')),
  plan_vence   date,
  activo       boolean not null default true,  -- soft delete
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger carritos_updated_at
  before update on public.carritos
  for each row execute procedure public.set_updated_at();

-- Índice geográfico para búsquedas por zona (cuando uses PostGIS)
create index if not exists idx_carritos_location on public.carritos using btree (lat, lng);
create index if not exists idx_carritos_estado   on public.carritos (estado);
create index if not exists idx_carritos_plan     on public.carritos (plan);


-- ══════════════════════════════════════════════════════════════════
--  3. CATEGORÍAS DE CARRITO (relación M:M)
--     Ej: un carrito puede ser Chivitos Y Empanadas
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.categorias (
  id     serial primary key,
  nombre text not null unique   -- "Chivitos", "Tortas", "Pizzas", etc.
);

insert into public.categorias (nombre) values
  ('Chivitos'), ('Tortas'), ('Panchos'), ('Pizzas'), ('Empanadas'), ('Bebidas'), ('Dulces')
on conflict do nothing;

create table if not exists public.carrito_categorias (
  carrito_id  uuid not null references public.carritos(id) on delete cascade,
  categoria_id integer not null references public.categorias(id) on delete cascade,
  primary key (carrito_id, categoria_id)
);


-- ══════════════════════════════════════════════════════════════════
--  4. MENÚ (items del menú de cada carrito)
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.menu_items (
  id          uuid primary key default uuid_generate_v4(),
  carrito_id  uuid not null references public.carritos(id) on delete cascade,
  nombre      text not null,
  descripcion text,
  precio      text,          -- guardamos como texto: "$310", "$280/porción"
  disponible  boolean not null default true,
  orden       integer not null default 0,   -- para ordenar en pantalla
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_menu_carrito on public.menu_items (carrito_id, orden);

create trigger menu_items_updated_at
  before update on public.menu_items
  for each row execute procedure public.set_updated_at();


-- ══════════════════════════════════════════════════════════════════
--  5. RESEÑAS
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.resenas (
  id          uuid primary key default uuid_generate_v4(),
  carrito_id  uuid not null references public.carritos(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  stars       integer not null check (stars between 1 and 5),
  texto       text,
  respuesta   text,           -- respuesta del dueño
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (carrito_id, user_id)   -- un usuario = una reseña por carrito
);

create index if not exists idx_resenas_carrito on public.resenas (carrito_id);
create index if not exists idx_resenas_user    on public.resenas (user_id);

create trigger resenas_updated_at
  before update on public.resenas
  for each row execute procedure public.set_updated_at();

-- Trigger: recalcular rating y reviews_count automáticamente
create or replace function public.recalcular_rating()
returns trigger language plpgsql as $$
declare
  v_avg   numeric(3,2);
  v_count integer;
  v_cid   uuid;
begin
  v_cid := coalesce(new.carrito_id, old.carrito_id);
  select round(avg(stars)::numeric, 2), count(*)
    into v_avg, v_count
    from public.resenas
   where carrito_id = v_cid;
  update public.carritos
     set rating        = coalesce(v_avg, 0),
         reviews_count = coalesce(v_count, 0)
   where id = v_cid;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_recalcular_rating on public.resenas;
create trigger trg_recalcular_rating
  after insert or update or delete on public.resenas
  for each row execute procedure public.recalcular_rating();


-- ══════════════════════════════════════════════════════════════════
--  6. FOTOS
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.fotos (
  id          uuid primary key default uuid_generate_v4(),
  carrito_id  uuid not null references public.carritos(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete set null,
  url         text not null,     -- URL pública desde Supabase Storage
  storage_path text,             -- path interno del bucket
  created_at  timestamptz not null default now()
);

create index if not exists idx_fotos_carrito on public.fotos (carrito_id);


-- ══════════════════════════════════════════════════════════════════
--  7. FAVORITOS
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.favoritos (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  carrito_id uuid not null references public.carritos(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, carrito_id)
);

create index if not exists idx_favoritos_user on public.favoritos (user_id);


-- ══════════════════════════════════════════════════════════════════
--  8. ALERTAS (avisame cuando abra)
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.alertas (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  carrito_id uuid not null references public.carritos(id) on delete cascade,
  activa     boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (user_id, carrito_id)
);

create index if not exists idx_alertas_carrito on public.alertas (carrito_id, activa);


-- ══════════════════════════════════════════════════════════════════
--  9. HISTORIAL DE VISITAS
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.historial (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  carrito_id  uuid not null references public.carritos(id) on delete cascade,
  visitas     integer not null default 1,
  ultima_visita timestamptz not null default now(),
  unique (user_id, carrito_id)
);

create index if not exists idx_historial_user on public.historial (user_id, ultima_visita desc);


-- ══════════════════════════════════════════════════════════════════
--  10. NOVEDADES (publicaciones del dueño)
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.novedades (
  id          uuid primary key default uuid_generate_v4(),
  carrito_id  uuid not null references public.carritos(id) on delete cascade,
  texto       text not null,
  badge       text,             -- "Descuento", "Nuevo producto", etc.
  activa      boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists idx_novedades_carrito on public.novedades (carrito_id, created_at desc);
create index if not exists idx_novedades_recientes on public.novedades (created_at desc) where activa = true;


-- ══════════════════════════════════════════════════════════════════
--  11. SUSCRIPCIONES / PAGOS
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.suscripciones (
  id              uuid primary key default uuid_generate_v4(),
  carrito_id      uuid not null references public.carritos(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  plan            text not null check (plan in ('gratis', 'pro', 'destacado')),
  metodo_pago     text check (metodo_pago in ('mercadopago', 'stripe', 'transferencia')),
  estado          text not null default 'pendiente'
                    check (estado in ('pendiente', 'activa', 'vencida', 'cancelada')),
  monto           integer,       -- en pesos uruguayos (sin decimales)
  fecha_inicio    date,
  fecha_vencimiento date,
  referencia_pago text,          -- ID externo de MP o Stripe
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_suscripciones_carrito on public.suscripciones (carrito_id, estado);
create index if not exists idx_suscripciones_vence   on public.suscripciones (fecha_vencimiento) where estado = 'activa';

create trigger suscripciones_updated_at
  before update on public.suscripciones
  for each row execute procedure public.set_updated_at();

-- Trigger: actualizar plan del carrito cuando se activa/vence una suscripción
create or replace function public.sync_plan_carrito()
returns trigger language plpgsql as $$
begin
  if new.estado = 'activa' then
    update public.carritos
       set plan       = new.plan,
           plan_vence = new.fecha_vencimiento
     where id = new.carrito_id;
  elsif new.estado in ('vencida', 'cancelada') then
    -- Solo bajar a gratis si no hay otra suscripción activa
    if not exists (
      select 1 from public.suscripciones
       where carrito_id = new.carrito_id
         and estado = 'activa'
         and id <> new.id
    ) then
      update public.carritos
         set plan = 'gratis', plan_vence = null
       where id = new.carrito_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_plan on public.suscripciones;
create trigger trg_sync_plan
  after insert or update on public.suscripciones
  for each row execute procedure public.sync_plan_carrito();


-- ══════════════════════════════════════════════════════════════════
--  12. ESTADÍSTICAS DE VISTAS
--     Registra cada vez que alguien abre el detalle de un carrito
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.estadisticas_vistas (
  id          bigserial primary key,
  carrito_id  uuid not null references public.carritos(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete set null,   -- null = anónimo
  fuente      text default 'mapa'    -- 'mapa' | 'lista' | 'busqueda' | 'favoritos'
                check (fuente in ('mapa', 'lista', 'busqueda', 'favoritos')),
  fecha       date not null default current_date,
  hora        smallint default extract(hour from now())  -- 0-23 para horarios pico
);

create index if not exists idx_stats_carrito_fecha on public.estadisticas_vistas (carrito_id, fecha desc);


-- ══════════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY (RLS)
--  Controla quién puede leer/escribir cada tabla
-- ══════════════════════════════════════════════════════════════════

alter table public.profiles             enable row level security;
alter table public.carritos             enable row level security;
alter table public.carrito_categorias   enable row level security;
alter table public.menu_items           enable row level security;
alter table public.resenas              enable row level security;
alter table public.fotos                enable row level security;
alter table public.favoritos            enable row level security;
alter table public.alertas              enable row level security;
alter table public.historial            enable row level security;
alter table public.novedades            enable row level security;
alter table public.suscripciones        enable row level security;
alter table public.estadisticas_vistas  enable row level security;

-- ── profiles ──
create policy "profiles: lectura pública"
  on public.profiles for select using (true);
create policy "profiles: solo el dueño puede editar"
  on public.profiles for update using (auth.uid() = id);

-- ── carritos ──
create policy "carritos: lectura pública"
  on public.carritos for select using (activo = true);
create policy "carritos: el dueño puede insertar"
  on public.carritos for insert with check (auth.uid() = owner_id);
create policy "carritos: el dueño puede editar"
  on public.carritos for update using (auth.uid() = owner_id);
create policy "carritos: el dueño puede eliminar"
  on public.carritos for delete using (auth.uid() = owner_id);

-- ── carrito_categorias ──
create policy "carrito_categorias: lectura pública"
  on public.carrito_categorias for select using (true);
create policy "carrito_categorias: solo el dueño"
  on public.carrito_categorias for all
  using (exists (select 1 from public.carritos c where c.id = carrito_id and c.owner_id = auth.uid()));

-- ── menu_items ──
create policy "menu_items: lectura pública"
  on public.menu_items for select using (true);
create policy "menu_items: solo el dueño"
  on public.menu_items for all
  using (exists (select 1 from public.carritos c where c.id = carrito_id and c.owner_id = auth.uid()));

-- ── resenas ──
create policy "resenas: lectura pública"
  on public.resenas for select using (true);
create policy "resenas: usuario autenticado puede insertar"
  on public.resenas for insert with check (auth.uid() = user_id);
create policy "resenas: usuario puede editar la suya"
  on public.resenas for update using (auth.uid() = user_id);
create policy "resenas: dueño puede responder (solo campo respuesta)"
  on public.resenas for update
  using (exists (select 1 from public.carritos c where c.id = carrito_id and c.owner_id = auth.uid()));

-- ── fotos ──
create policy "fotos: lectura pública"
  on public.fotos for select using (true);
create policy "fotos: usuario autenticado puede subir"
  on public.fotos for insert with check (auth.uid() = user_id);
create policy "fotos: el que subió puede borrar"
  on public.fotos for delete using (auth.uid() = user_id);

-- ── favoritos ──
create policy "favoritos: solo el dueño ve los suyos"
  on public.favoritos for select using (auth.uid() = user_id);
create policy "favoritos: insertar propios"
  on public.favoritos for insert with check (auth.uid() = user_id);
create policy "favoritos: eliminar propios"
  on public.favoritos for delete using (auth.uid() = user_id);

-- ── alertas ──
create policy "alertas: solo el dueño ve las suyas"
  on public.alertas for select using (auth.uid() = user_id);
create policy "alertas: insertar propias"
  on public.alertas for insert with check (auth.uid() = user_id);
create policy "alertas: actualizar propias"
  on public.alertas for update using (auth.uid() = user_id);
create policy "alertas: eliminar propias"
  on public.alertas for delete using (auth.uid() = user_id);

-- ── historial ──
create policy "historial: solo el dueño ve el suyo"
  on public.historial for select using (auth.uid() = user_id);
create policy "historial: insertar/actualizar propio"
  on public.historial for insert with check (auth.uid() = user_id);
create policy "historial: actualizar propio"
  on public.historial for update using (auth.uid() = user_id);

-- ── novedades ──
create policy "novedades: lectura pública"
  on public.novedades for select using (activa = true);
create policy "novedades: solo el dueño inserta"
  on public.novedades for insert
  with check (exists (select 1 from public.carritos c where c.id = carrito_id and c.owner_id = auth.uid()));
create policy "novedades: solo el dueño actualiza"
  on public.novedades for update
  using (exists (select 1 from public.carritos c where c.id = carrito_id and c.owner_id = auth.uid()));

-- ── suscripciones ──
create policy "suscripciones: el dueño ve las suyas"
  on public.suscripciones for select using (auth.uid() = user_id);
create policy "suscripciones: insertar propia"
  on public.suscripciones for insert with check (auth.uid() = user_id);

-- ── estadísticas ──
create policy "stats: cualquiera puede insertar"
  on public.estadisticas_vistas for insert with check (true);
create policy "stats: el dueño del carrito puede leer"
  on public.estadisticas_vistas for select
  using (exists (select 1 from public.carritos c where c.id = carrito_id and c.owner_id = auth.uid()));


-- ══════════════════════════════════════════════════════════════════
--  STORAGE BUCKETS
--  Ejecutar en Supabase Dashboard → Storage → New bucket
--  O via SQL con el helper de storage
-- ══════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
values ('fotos-carritos', 'fotos-carritos', true)
on conflict do nothing;

-- Política: cualquiera puede ver las fotos (bucket público)
create policy "fotos storage: lectura pública"
  on storage.objects for select
  using (bucket_id = 'fotos-carritos');

-- Política: usuario autenticado puede subir
create policy "fotos storage: subida autenticada"
  on storage.objects for insert
  with check (
    bucket_id = 'fotos-carritos'
    and auth.role() = 'authenticated'
  );

-- Política: solo quien subió puede borrar
create policy "fotos storage: borrar propias"
  on storage.objects for delete
  using (
    bucket_id = 'fotos-carritos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );


-- ══════════════════════════════════════════════════════════════════
--  DATOS DE EJEMPLO (los mismos del config.js)
--  IMPORTANTE: cambiar los UUIDs de owner_id por IDs reales de usuarios
--  Una vez que crees tu primer usuario dueño, reemplazá 'UUID-DUENO-1'
-- ══════════════════════════════════════════════════════════════════

-- do $$
-- declare
--   c1 uuid := uuid_generate_v4();
--   c2 uuid := uuid_generate_v4();
--   c3 uuid := uuid_generate_v4();
--   c4 uuid := uuid_generate_v4();
--   c5 uuid := uuid_generate_v4();
--   dueno_id uuid := 'REEMPLAZAR-CON-UUID-REAL-DEL-DUENO';
-- begin
--
--   insert into public.carritos (id, owner_id, nombre, tipo, emoji, barrio, lat, lng, horario, telefono, especialidad, estado, rating, reviews_count)
--   values
--     (c1, dueno_id, 'El Chivito de Pancho',       'Chivitos y milanesas',    '🥩', 'Pocitos, Montevideo',        -34.912, -56.152, 'Lun–Sáb 11:00–23:00 · Dom 14:00–22:00', '+598 99 123 456', 'Chivito al pan',                    'abierto', 4.8, 142),
--     (c2, dueno_id, 'Tortas Fritas Doña Carmen',  'Tortas fritas y dulces',  '🥞', 'Ciudad Vieja, Montevideo',  -34.907, -56.201, 'Mar–Dom 07:00–13:00',                   '+598 98 765 432', 'Tortas fritas con dulce de leche',  'abierto', 4.6,  89),
--     (c3, dueno_id, 'La Pizza del Gato',           'Pizzas y fugazzeta',      '🍕', 'Colón, Montevideo',         -34.866, -56.213, 'Jue–Dom 18:00–01:00',                   '+598 91 234 567', 'Fugazzeta rellena',                 'abierto', 4.5,  67),
--     (c4, dueno_id, 'Panchos Don Óscar',           'Panchos y refrescos',     '🌭', 'Punta Carretas, Montevideo',-34.924, -56.160, 'Lun–Vie 17:00–00:00 · Sáb–Dom 12:00–02:00', '+598 93 456 789', 'Pancho triple',                 'cerrado', 4.3, 203),
--     (c5, dueno_id, 'El Carrito de Canelones',    'Chivitos y empanadas',    '🥙', 'Canelones ciudad',          -34.524, -56.284, 'Lun–Dom 10:00–22:00',                   '+598 95 678 901', 'Empanadas caseras',                 'abierto', 4.7,  55);
--
--   insert into public.menu_items (carrito_id, nombre, descripcion, precio, orden) values
--     (c1, 'Chivito al pan',      'Lomo fino, jamón, queso, huevo, aceitunas, tomate, lechuga y mayonesa.', '$310', 1),
--     (c1, 'Chivito canadiense',  'El clásico con panceta ahumada y morrón.',                               '$340', 2),
--     (c1, 'Milanesa completa',   'Milanesa de res, lechuga, tomate, huevo y papas fritas.',                '$290', 3),
--     (c2, 'Torta frita clásica', 'Masa frita con dulce de leche artesanal.',                               '$60',  1),
--     (c2, 'Torta frita salada',  'Con queso y jamón.',                                                     '$75',  2),
--     (c2, 'Combo mate + 3 tortas','Tres tortas a elección más yerbas para el mate.',                       '$160', 3),
--     (c3, 'Fugazzeta rellena',   'Doble masa, mozzarella abundante y cebolla caramelizada.',               '$280/porción', 1),
--     (c3, 'Pizza napolitana',    'Salsa, mozzarella, tomate fresco y albahaca.',                           '$230/porción', 2),
--     (c4, 'Pancho triple',       'Tres salchichas en pan extra largo.',                                    '$220', 1),
--     (c4, 'Pancho clásico',      'Salchicha en pan con mostaza y ketchup.',                                '$120', 2),
--     (c5, 'Empanada de carne',   'Masa artesanal, carne picada con aceitunas.',                            '$85',  1),
--     (c5, 'Combo 6 empanadas',   'Seis empanadas a elección más refresco.',                                '$580', 2);
--
--   insert into public.carrito_categorias (carrito_id, categoria_id)
--   select c1, id from public.categorias where nombre = 'Chivitos'
--   union all
--   select c2, id from public.categorias where nombre = 'Tortas'
--   union all
--   select c3, id from public.categorias where nombre = 'Pizzas'
--   union all
--   select c4, id from public.categorias where nombre = 'Panchos'
--   union all
--   select c5, id from public.categorias where nombre in ('Chivitos', 'Empanadas');
--
-- end $$;


-- ══════════════════════════════════════════════════════════════════
--  VISTA ÚTIL: carrito con categorías como array
--  Usala en el frontend: sb.from('v_carritos').select('*')
-- ══════════════════════════════════════════════════════════════════
create or replace view public.v_carritos as
select
  c.*,
  coalesce(
    array_agg(cat.nombre order by cat.nombre) filter (where cat.nombre is not null),
    '{}'::text[]
  ) as categorias
from public.carritos c
left join public.carrito_categorias cc on cc.carrito_id = c.id
left join public.categorias         cat on cat.id = cc.categoria_id
where c.activo = true
group by c.id;


-- ══════════════════════════════════════════════════════════════════
--  FUNCIÓN RPC: estadísticas del dashboard del dueño
--  Uso: sb.rpc('stats_carrito', { p_carrito_id: '...' })
-- ══════════════════════════════════════════════════════════════════
create or replace function public.stats_carrito(p_carrito_id uuid)
returns json language plpgsql security definer as $$
declare
  v_result json;
begin
  -- Solo el dueño puede llamar esta función
  if not exists (
    select 1 from public.carritos
     where id = p_carrito_id and owner_id = auth.uid()
  ) then
    raise exception 'No autorizado';
  end if;

  select json_build_object(
    'vistas_mes',   (select count(*) from public.estadisticas_vistas
                      where carrito_id = p_carrito_id
                        and fecha >= date_trunc('month', current_date)),
    'vistas_hoy',   (select count(*) from public.estadisticas_vistas
                      where carrito_id = p_carrito_id and fecha = current_date),
    'favoritos',    (select count(*) from public.favoritos where carrito_id = p_carrito_id),
    'alertas',      (select count(*) from public.alertas   where carrito_id = p_carrito_id and activa = true),
    'rating',       (select rating        from public.carritos where id = p_carrito_id),
    'reviews_count',(select reviews_count from public.carritos where id = p_carrito_id),
    'vistas_por_dia', (
      select json_agg(row_to_json(t)) from (
        select fecha, count(*) as total
          from public.estadisticas_vistas
         where carrito_id = p_carrito_id
           and fecha >= current_date - 6
         group by fecha
         order by fecha
      ) t
    )
  ) into v_result;
  return v_result;
end;
$$;


-- ══════════════════════════════════════════════════════════════════
--  FUNCIÓN RPC: upsert historial de visitas
--  Uso: sb.rpc('registrar_visita', { p_carrito_id: '...' })
-- ══════════════════════════════════════════════════════════════════
create or replace function public.registrar_visita(p_carrito_id uuid)
returns void language plpgsql security definer as $$
begin
  -- Estadística (anónima o autenticada)
  insert into public.estadisticas_vistas (carrito_id, user_id, fuente)
  values (p_carrito_id, auth.uid(), 'mapa');

  -- Historial del usuario (solo si está logueado)
  if auth.uid() is not null then
    insert into public.historial (user_id, carrito_id, visitas, ultima_visita)
    values (auth.uid(), p_carrito_id, 1, now())
    on conflict (user_id, carrito_id) do update
      set visitas       = public.historial.visitas + 1,
          ultima_visita = now();
  end if;
end;
$$;