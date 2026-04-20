# Agent 01 — Database Schema, Migrations, RLS, Seed

## Context

You are building the database layer for **My Stay**, a multi-tenant hotel guest experience SaaS platform.

Stack: Supabase (PostgreSQL + Auth + Realtime + Storage), Next.js (App Router), Vercel.

**No custom backend.** All business logic lives in the database (SQL, functions, RLS).

The working directory is `/home/ouss/Desktop/Coding/MyStay`.

---

## Your Task

Create all Supabase migration files and seed data. Write these files to disk — do NOT just describe them.

Output files:
- `supabase/migrations/001_initial_schema.sql` — all tables, indexes, views, functions, triggers
- `supabase/migrations/002_rls_policies.sql` — all Row Level Security policies
- `supabase/seed.sql` — seed data for development and testing

---

## Schema Requirements

### Tables to create (in dependency order):

#### `hotels`
```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid()
name text NOT NULL
slug text NOT NULL UNIQUE
logo_url text
created_at timestamptz DEFAULT now()
```

#### `profiles`
```sql
id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE
role text NOT NULL CHECK (role IN ('client', 'staff', 'admin'))
full_name text NOT NULL
phone text
language text DEFAULT 'en' CHECK (language IN ('en', 'fr', 'ar'))
created_at timestamptz DEFAULT now()
```

#### `rooms`
```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid()
hotel_id uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE
number text NOT NULL
type text NOT NULL -- 'single' | 'double' | 'suite' | 'deluxe'
floor integer
created_at timestamptz DEFAULT now()
UNIQUE (hotel_id, number)
```

#### `stays`
```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid()
hotel_id uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE
guest_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE
check_in date NOT NULL
check_out date NOT NULL
status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived'))
created_at timestamptz DEFAULT now()
```

#### `menu_categories`
```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid()
hotel_id uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE
name text NOT NULL
sort_order integer DEFAULT 0
created_at timestamptz DEFAULT now()
```

#### `menu_items`
```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid()
hotel_id uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE
category_id uuid NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE
name text NOT NULL
description text
price numeric(10, 2) NOT NULL
image_url text
is_available boolean NOT NULL DEFAULT true
sort_order integer DEFAULT 0
created_at timestamptz DEFAULT now()
```

#### `orders`
```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid()
hotel_id uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE
stay_id uuid NOT NULL REFERENCES stays(id) ON DELETE CASCADE
guest_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
status text NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'confirmed', 'preparing', 'delivering', 'delivered', 'cancelled'))
total_amount numeric(10, 2) NOT NULL DEFAULT 0
notes text
created_at timestamptz DEFAULT now()
updated_at timestamptz DEFAULT now()
```

#### `order_items`
```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid()
order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE
menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT
quantity integer NOT NULL CHECK (quantity > 0)
unit_price numeric(10, 2) NOT NULL
created_at timestamptz DEFAULT now()
```

#### `service_requests`
```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid()
hotel_id uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE
stay_id uuid NOT NULL REFERENCES stays(id) ON DELETE CASCADE
guest_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
type text NOT NULL CHECK (type IN ('cleaning', 'towels', 'maintenance', 'other'))
description text
priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent'))
status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'))
created_at timestamptz DEFAULT now()
updated_at timestamptz DEFAULT now()
```

#### `messages`
```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid()
hotel_id uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE
stay_id uuid NOT NULL REFERENCES stays(id) ON DELETE CASCADE
sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
content text NOT NULL
created_at timestamptz DEFAULT now()
```

#### `push_subscriptions`
```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE
subscription jsonb NOT NULL
created_at timestamptz DEFAULT now()
```

---

### Views to create:

#### `expenses` (derived from orders)
```sql
CREATE VIEW expenses AS
SELECT
  o.id,
  o.hotel_id,
  o.stay_id,
  o.guest_id,
  o.total_amount AS amount,
  o.status,
  o.created_at
FROM orders o
WHERE o.status != 'cancelled';
```

---

### Indexes to create (for performance):
- `profiles(hotel_id)`
- `profiles(hotel_id, role)`
- `stays(guest_id)`
- `stays(hotel_id, status)`
- `orders(stay_id)`
- `orders(hotel_id, status)`
- `orders(hotel_id, created_at DESC)`
- `service_requests(hotel_id, status)`
- `service_requests(stay_id)`
- `messages(stay_id, created_at ASC)`
- `messages(hotel_id, created_at DESC)`
- `menu_items(hotel_id, category_id)`
- `menu_items(hotel_id, is_available)`

---

### Triggers to create:

#### 1. Auto-update `updated_at` on orders and service_requests
Create a generic trigger function:
```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```
Attach to `orders` and `service_requests` on UPDATE.

#### 2. Auto-create profile on user signup
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Profile is created explicitly by the app after signup
  -- This is a no-op trigger placeholder for future hooks
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```
Note: Profiles are created explicitly by the app in a server action after signup (not auto-created from auth trigger), because we need hotel_id and role which aren't known at auth time.

#### 3. Auto-archive stay messages on checkout (no deletion — archive only)
No trigger needed. Status change to 'archived' is done via app layer.

---

### Postgres RPC Functions:

#### `get_active_stay(guest_id uuid)`
Returns the active stay for a guest:
```sql
CREATE OR REPLACE FUNCTION get_active_stay(p_guest_id uuid)
RETURNS TABLE (
  id uuid, hotel_id uuid, room_id uuid, check_in date, check_out date, status text,
  room_number text, room_type text, room_floor integer
) AS $$
  SELECT
    s.id, s.hotel_id, s.room_id, s.check_in, s.check_out, s.status,
    r.number AS room_number, r.type AS room_type, r.floor AS room_floor
  FROM stays s
  JOIN rooms r ON r.id = s.room_id
  WHERE s.guest_id = p_guest_id AND s.status = 'active'
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;
```

#### `get_hotel_stats(p_hotel_id uuid)`
Returns basic stats for the admin dashboard:
```sql
CREATE OR REPLACE FUNCTION get_hotel_stats(p_hotel_id uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_orders_today', (
      SELECT COUNT(*) FROM orders
      WHERE hotel_id = p_hotel_id AND created_at::date = CURRENT_DATE
    ),
    'pending_orders', (
      SELECT COUNT(*) FROM orders
      WHERE hotel_id = p_hotel_id AND status = 'pending'
    ),
    'pending_requests', (
      SELECT COUNT(*) FROM service_requests
      WHERE hotel_id = p_hotel_id AND status = 'pending'
    ),
    'active_stays', (
      SELECT COUNT(*) FROM stays
      WHERE hotel_id = p_hotel_id AND status = 'active'
    ),
    'revenue_today', (
      SELECT COALESCE(SUM(total_amount), 0) FROM orders
      WHERE hotel_id = p_hotel_id
        AND created_at::date = CURRENT_DATE
        AND status != 'cancelled'
    )
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## RLS Policies (002_rls_policies.sql)

Enable RLS on ALL tables. The core pattern: every policy checks `hotel_id` against the user's `profiles.hotel_id`.

Helper function (create first):
```sql
CREATE OR REPLACE FUNCTION get_my_hotel_id()
RETURNS uuid AS $$
  SELECT hotel_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### `hotels`
- SELECT: authenticated users whose hotel_id matches
- No INSERT/UPDATE/DELETE via RLS (done by super admin outside app for now)

### `profiles`
- SELECT: users in same hotel can see each other's profiles
- INSERT: user can insert their own profile (id = auth.uid())
- UPDATE: user can update their own profile only
- DELETE: none

### `rooms`
- SELECT: users in same hotel
- INSERT/UPDATE/DELETE: admin only

### `stays`
- SELECT: guest sees own stays; staff/admin see all in their hotel
- INSERT: admin only
- UPDATE: admin only (to archive)
- DELETE: none

### `menu_categories`
- SELECT: all hotel members
- INSERT/UPDATE/DELETE: admin only

### `menu_items`
- SELECT: all hotel members (only available items for clients)
- INSERT/UPDATE/DELETE: admin only

### `orders`
- SELECT: guest sees own orders; staff/admin see all in hotel
- INSERT: client only (own guest_id, must have active stay in hotel)
- UPDATE: staff/admin can update status; guest cannot update
- DELETE: none

### `order_items`
- SELECT: follows parent order permissions
- INSERT: client only (via order creation)
- UPDATE/DELETE: none

### `service_requests`
- SELECT: guest sees own; staff/admin see all in hotel
- INSERT: client only
- UPDATE: staff/admin can update status; guest cannot
- DELETE: none

### `messages`
- SELECT: guest sees messages for their stay; staff/admin see all in hotel
- INSERT: any authenticated hotel member (client, staff, admin)
- UPDATE/DELETE: none (messages are immutable)

### `push_subscriptions`
- SELECT: user sees own only
- INSERT: user inserts own (id = auth.uid())
- UPDATE: user updates own
- DELETE: user deletes own

Write these as complete, working SQL `CREATE POLICY` statements. Use `get_my_hotel_id()` and `get_my_role()` helper functions in every policy. Be precise — wrong RLS = data leaks across tenants.

---

## Seed Data (seed.sql)

Create realistic seed data for 2 hotels with all roles:

### Hotel 1: "Le Grand Hôtel" (slug: `le-grand-hotel`)
- Admin: admin@legrand.com / password: `Admin1234!`
- Staff 1: staff1@legrand.com / `Staff1234!`
- Staff 2: staff2@legrand.com / `Staff1234!`
- Guest 1: guest1@legrand.com / `Guest1234!` (active stay, room 101)
- Guest 2: guest2@legrand.com / `Guest1234!` (active stay, room 202)
- Rooms: 101 (single, floor 1), 202 (double, floor 2), 301 (suite, floor 3)
- Menu: 3 categories (Breakfast, Drinks, Snacks) with 3 items each
- 2 pending orders for guest1
- 1 service request from guest2
- 5 chat messages between guest1 and staff1

### Hotel 2: "Seaside Resort" (slug: `seaside-resort`)
- Admin: admin@seaside.com / `Admin1234!`
- Guest: guest@seaside.com / `Guest1234!` (active stay)
- Rooms: 101, 201
- Menu: 2 categories, 4 items
- 1 order

**Important**: Supabase seed data requires using `auth.users` inserts via the service role. Write the seed assuming it will be run with `supabase db seed` or via the Supabase SQL editor with service role. Use `INSERT INTO auth.users` directly for test users (this is standard Supabase seeding practice).

---

## Instructions

1. Create the directory `supabase/migrations/` and `supabase/` at the project root `/home/ouss/Desktop/Coding/MyStay/`
2. Write `001_initial_schema.sql` — tables, indexes, views, triggers, functions
3. Write `002_rls_policies.sql` — all RLS policies
4. Write `seed.sql` — complete seed data
5. Double-check: every table that stores hotel data has `hotel_id` and is protected by an RLS policy scoped to `get_my_hotel_id()`
6. All SQL must be valid PostgreSQL 15+ syntax compatible with Supabase

Do not create any Next.js files. Your scope is the database layer only.
