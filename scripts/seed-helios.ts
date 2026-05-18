/**
 * Seed script — HELIOS Hotel
 * Run: npx tsx scripts/seed-helios.ts
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://iewxxozfyknuyhhfuapf.supabase.co'
const SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlld3h4b3pmeWtudXloaGZ1YXBmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjYxNTgyMCwiZXhwIjoyMDkyMTkxODIwfQ.jqjMdIlls8wEt9s9BM0rKBp-kuAKdirXkSiJou7utF8'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function seed() {
  console.log('🏨  Seeding HELIOS Hotel…')

  // ── 1. Hotel ──────────────────────────────────────────────────────────────
  const { data: hotel, error: hotelErr } = await (supabase as any)
    .from('hotels')
    .upsert({ name: 'HELIOS Hotel', slug: 'helios-hotel' }, { onConflict: 'slug' })
    .select()
    .single()
  if (hotelErr) throw new Error('hotel: ' + hotelErr.message)
  const hotelId: string = hotel.id
  console.log('  ✓ Hotel:', hotelId)

  // ── 2. Rooms ──────────────────────────────────────────────────────────────
  const rooms = [
    { number: '101', type: 'Chambre Standard', floor: 1 },
    { number: '102', type: 'Chambre Standard', floor: 1 },
    { number: '201', type: 'Chambre Vue Mer Partielle', floor: 2 },
    { number: '301', type: 'Chambre Vue Mer', floor: 3 },
    { number: '302', type: 'Chambre Vue Mer', floor: 3 },
    { number: '401', type: 'Chambre Supérieure', floor: 4 },
    { number: '501', type: 'Junior Suite', floor: 5 },
    { number: '502', type: 'Suite Familiale', floor: 5 },
    { number: '601', type: 'Suite Vue Mer', floor: 6 },
    { number: '602', type: 'Suite Prestige', floor: 6 },
    { number: '701', type: 'Suite Royale Helios', floor: 7 },
  ]
  const { data: insertedRooms, error: roomsErr } = await (supabase as any)
    .from('rooms')
    .upsert(rooms.map((r) => ({ ...r, hotel_id: hotelId })), { onConflict: 'hotel_id,number' })
    .select()
  if (roomsErr) throw new Error('rooms: ' + roomsErr.message)
  const roomMap: Record<string, string> = {}
  for (const r of insertedRooms) roomMap[r.number] = r.id
  console.log('  ✓ Rooms:', Object.keys(roomMap).length)

  // ── 3. Auth users ─────────────────────────────────────────────────────────
  const users = [
    { email: 'admin@helioshotel.dz',  password: 'Admin1234!',  fullName: 'Ahmed Benali',    role: 'admin'  },
    { email: 'staff@helioshotel.dz',  password: 'Staff1234!',  fullName: 'Karim Meziane',   role: 'staff'  },
    { email: 'alice@helioshotel.dz',  password: 'RES-240001',  fullName: 'Alice Martin',     role: 'client' },
  ]

  const createdUsers: { id: string; email: string; role: string }[] = []

  for (const u of users) {
    // Try to create; if already exists, look it up
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
    })

    let userId: string
    if (createErr) {
      if (createErr.message.includes('already been registered')) {
        const { data: list } = await supabase.auth.admin.listUsers()
        const existing = list?.users.find((x) => x.email === u.email)
        if (!existing) throw new Error(`Cannot find user ${u.email}`)
        userId = existing.id
      } else {
        throw new Error(`auth user ${u.email}: ${createErr.message}`)
      }
    } else {
      userId = created.user.id
    }

    // Upsert profile
    const { error: profileErr } = await (supabase as any)
      .from('profiles')
      .upsert(
        { id: userId, hotel_id: hotelId, role: u.role, full_name: u.fullName, email: u.email },
        { onConflict: 'id' }
      )
    if (profileErr) throw new Error(`profile ${u.email}: ${profileErr.message}`)
    createdUsers.push({ id: userId, email: u.email, role: u.role })
    console.log(`  ✓ User: ${u.email} (${u.role})`)
  }

  // ── 4. Stay for Alice ─────────────────────────────────────────────────────
  const alice = createdUsers.find((u) => u.role === 'client')!
  const checkIn  = new Date()
  const checkOut = new Date(checkIn.getTime() + 3 * 24 * 60 * 60 * 1000) // +3 nights

  const { error: stayErr } = await (supabase as any)
    .from('stays')
    .upsert(
      {
        hotel_id:  hotelId,
        guest_id:  alice.id,
        room_id:   roomMap['301'],
        check_in:  checkIn.toISOString().split('T')[0],
        check_out: checkOut.toISOString().split('T')[0],
        status:    'active',
      },
      { onConflict: 'guest_id,status', ignoreDuplicates: true }
    )
  if (stayErr) console.warn('  ⚠ Stay (may already exist):', stayErr.message)
  else console.log('  ✓ Stay: Alice → Room 301 (Chambre Vue Mer)')

  // ── 5. Menu ───────────────────────────────────────────────────────────────
  // Clear existing menu for this hotel first
  await (supabase as any).from('menu_items').delete().eq('hotel_id', hotelId)
  await (supabase as any).from('menu_categories').delete().eq('hotel_id', hotelId)

  const venues = [
    {
      name: '🌊 Restaurant AOKAS',
      sortOrder: 1,
      items: [
        // Entrées
        { name: 'Salade de poulpe à la kabyle',      description: 'Poulpe frais, huile d\'olive vierge, ail, persil, citron, paprika doux', price: 1800, category: 'Entrées' },
        { name: 'Chorba aux fruits de mer',           description: 'Crevettes, calamars, poisson blanc, coriandre, tomate, épices maison',   price: 1200, category: 'Entrées' },
        { name: 'Brick au thon & fromage',            description: 'Thon, œuf, fromage fondant, câpres, feuille de dioul',                   price: 900,  category: 'Entrées' },
        { name: 'Salade méchoui revisitée',           description: 'Poivrons grillés, tomate, ail, huile d\'olive, thon émietté',            price: 800,  category: 'Entrées' },
        // Plats
        { name: 'Poisson grillé du jour',             description: 'Loup, dorade ou pageot selon arrivage, citron, herbes, légumes grillés', price: 3800, category: 'Plats principaux' },
        { name: 'Couscous aux fruits de mer',         description: 'Semoule fine, crevettes, moules, calamars, sauce épicée',                price: 3500, category: 'Plats principaux' },
        { name: 'Tajine de lotte aux olives',         description: 'Lotte, olives vertes, citron confit, sauce safranée',                    price: 3200, category: 'Plats principaux' },
        { name: 'Calamars farcis à la sétoise',      description: 'Calamars, riz, herbes, sauce tomate maison',                             price: 3000, category: 'Plats principaux' },
        // Desserts
        { name: 'Kalb el louz revisité',              description: 'Semoule, amandes, sirop de fleur d\'oranger',                           price: 900,  category: 'Desserts' },
        { name: 'Mhencha aux amandes',                description: 'Pâte filo, amandes, miel',                                               price: 1000, category: 'Desserts' },
        { name: 'Fruits frais de saison',             description: 'Sélection locale',                                                       price: 800,  category: 'Desserts' },
      ],
    },
    {
      name: '✨ Restaurant LUXORA',
      sortOrder: 2,
      items: [
        // Entrées
        { name: 'Tartare de saumon & avocat',         description: 'Saumon frais, avocat, citron vert, huile d\'olive',                     price: 2200, category: 'Entrées' },
        { name: 'Carpaccio de bœuf',                  description: 'Bœuf finement tranché, parmesan, roquette, huile truffée',              price: 2000, category: 'Entrées' },
        { name: 'Velouté de patate douce',            description: 'Patate douce, crème, éclats de noisettes',                              price: 1400, category: 'Entrées' },
        // Plats
        { name: 'Filet de bœuf sauce truffe',         description: 'Bœuf premium, purée maison, sauce truffée',                             price: 5500, category: 'Plats principaux' },
        { name: 'Magret de canard aux fruits rouges', description: 'Canard, sauce fruits rouges, légumes rôtis',                            price: 4800, category: 'Plats principaux' },
        { name: 'Risotto aux fruits de mer',          description: 'Riz arborio, crevettes, parmesan, bouillon maison',                     price: 3800, category: 'Plats principaux' },
        { name: 'Pavé de saumon grillé',              description: 'Saumon, sauce citronnée, quinoa',                                       price: 3600, category: 'Plats principaux' },
        // Desserts
        { name: 'Fondant chocolat cœur coulant',      description: 'Chocolat noir 70%, cœur fondant',                                       price: 1300, category: 'Desserts' },
        { name: 'Cheesecake citron yuzu',             description: 'Cheesecake crémeux, coulis citron yuzu',                                price: 1200, category: 'Desserts' },
        { name: 'Tarte fine aux pommes',              description: 'Pommes caramélisées, pâte feuilletée, crème fraîche',                   price: 1000, category: 'Desserts' },
      ],
    },
    {
      name: '☕ Helios Lounge Cafétéria',
      sortOrder: 3,
      items: [
        // Snacks
        { name: 'Salade César',                       description: 'Poulet, parmesan, croûtons, sauce César',                               price: 1500, category: 'Snacks & Sandwichs' },
        { name: 'Sandwich club poulet',               description: 'Poulet, laitue, tomate, mayonnaise',                                    price: 1200, category: 'Snacks & Sandwichs' },
        { name: 'Panini fromage & dinde',             description: 'Fromage fondu, dinde fumée, tomates séchées',                           price: 1000, category: 'Snacks & Sandwichs' },
        { name: 'Viennoiseries',                      description: 'Croissant ou Pain au chocolat',                                         price: 250,  category: 'Snacks & Sandwichs' },
        // Pâtisseries
        { name: 'Mille-feuille',                      description: 'Feuilletage croustillant, crème pâtissière vanille',                    price: 600,  category: 'Pâtisseries' },
        { name: 'Tarte citron',                       description: 'Pâte sablée, crème citron, meringue italienne',                         price: 500,  category: 'Pâtisseries' },
        { name: 'Éclair chocolat',                    description: 'Pâte à choux, ganache chocolat noir',                                   price: 400,  category: 'Pâtisseries' },
        // Boissons chaudes
        { name: 'Chocolat chaud',                     description: 'Chocolat belge, lait chaud mousseux',                                   price: 400,  category: 'Boissons chaudes' },
        { name: 'Cappuccino',                         description: 'Espresso, lait vapeur, mousse',                                         price: 350,  category: 'Boissons chaudes' },
        { name: 'Thé à la menthe',                    description: 'Thé vert, menthe fraîche, sucre à la demande',                          price: 250,  category: 'Boissons chaudes' },
        { name: 'Café espresso',                      description: 'Blend arabica maison, torréfaction artisanale',                         price: 200,  category: 'Boissons chaudes' },
      ],
    },
    {
      name: '🌅 Helios Sky Lounge (Rooftop)',
      sortOrder: 4,
      items: [
        // Mocktails
        { name: 'Tropical Breeze',                    description: 'Ananas, coco, citron vert, sirop de vanille',                           price: 1100, category: 'Mocktails' },
        { name: 'Blue Lagoon Fresh',                  description: 'Jus de citron, sirop de menthe, soda, curaçao sans alcool',             price: 1000, category: 'Mocktails' },
        { name: 'Berry Sparkle',                      description: 'Fruits rouges, citron, eau gazeuse',                                    price: 950,  category: 'Mocktails' },
        { name: 'Sunset Helios',                      description: 'Jus d\'orange, jus de mangue, grenadine, citron',                       price: 900,  category: 'Mocktails' },
        { name: 'Green Detox',                        description: 'Pomme, concombre, citron, gingembre',                                   price: 900,  category: 'Mocktails' },
        // Tapas
        { name: 'Plateau de fromages',                description: 'Sélection de fromages affinés, fruits secs, confiture',                 price: 2200, category: 'Tapas & Petites assiettes' },
        { name: 'Mini brochettes de crevettes',       description: 'Crevettes grillées, sauce aïoli citronnée',                             price: 1800, category: 'Tapas & Petites assiettes' },
        { name: 'Bruschetta tomate & basilic',        description: 'Pain grillé, tomates confites, basilic frais, huile d\'olive',          price: 900,  category: 'Tapas & Petites assiettes' },
        // Boissons fraîches
        { name: 'Smoothie fruits mixtes',             description: 'Fruits de saison mixés, sans sucre ajouté',                             price: 700,  category: 'Boissons fraîches' },
        { name: 'Jus d\'orange pressé',              description: 'Oranges fraîches pressées à la commande',                               price: 400,  category: 'Boissons fraîches' },
        { name: 'Eau minérale',                       description: 'Plate ou gazeuse',                                                      price: 150,  category: 'Boissons fraîches' },
      ],
    },
  ]

  for (const venue of venues) {
    // Insert parent category (venue)
    const { data: cat, error: catErr } = await (supabase as any)
      .from('menu_categories')
      .insert({ hotel_id: hotelId, name: venue.name, sort_order: venue.sortOrder })
      .select()
      .single()
    if (catErr) throw new Error(`category ${venue.name}: ${catErr.message}`)

    // Build sub-category map
    const subCatNames = [...new Set(venue.items.map((i) => i.category))]
    const subCatMap: Record<string, string> = {}
    for (const [idx, scName] of subCatNames.entries()) {
      const { data: sc, error: scErr } = await (supabase as any)
        .from('menu_categories')
        .insert({ hotel_id: hotelId, name: `${venue.name} — ${scName}`, sort_order: venue.sortOrder * 10 + idx })
        .select()
        .single()
      if (scErr) throw new Error(`sub-cat ${scName}: ${scErr.message}`)
      subCatMap[scName] = sc.id
    }

    // Insert items
    const itemRows = venue.items.map((item, idx) => ({
      hotel_id:    hotelId,
      category_id: subCatMap[item.category],
      name:        item.name,
      description: item.description,
      price:       item.price,
      is_available: true,
      sort_order:  idx,
    }))
    const { error: itemsErr } = await (supabase as any).from('menu_items').insert(itemRows)
    if (itemsErr) throw new Error(`items ${venue.name}: ${itemsErr.message}`)
    console.log(`  ✓ Menu: ${venue.name} (${venue.items.length} items)`)
  }

  console.log('\n✅  HELIOS Hotel seeded successfully!')
  console.log(`\n   Admin  → admin@helioshotel.dz    / Admin1234!`)
  console.log(`   Staff  → staff@helioshotel.dz    / Staff1234!`)
  console.log(`   Alice  → alice@helioshotel.dz    / RES-240001`)
}

seed().catch((err) => { console.error('❌', err.message); process.exit(1) })
