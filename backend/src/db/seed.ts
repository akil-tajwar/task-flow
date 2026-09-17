/**
 * Seed script — Building Materials vertical (Tiles, Paint, Bathroom Fittings)
 * Run: npx tsx src/db/seed.ts
 *
 * Safe to re-run: exits early if products already exist for the tenant.
 */

import 'dotenv/config';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from './index';
import {
  tenants, stores,
  categories, brands, products,
  vendors, customers, customerLedger,
  inventory, stockMovements,
  financialAccounts, accountTransactions,
} from './schema';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function log(msg: string) { process.stdout.write(`  ${msg}\n`); }
function section(title: string) { process.stdout.write(`\n▸ ${title}\n`); }

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  process.stdout.write('\n╔═══════════════════════════════════════════╗\n');
  process.stdout.write('║   UAMS POS — Building Materials Seed      ║\n');
  process.stdout.write('╚═══════════════════════════════════════════╝\n');

  // ── 1. Resolve tenant & store ────────────────────────────────────────────────
  section('Resolving tenant & store');

  const [tenant] = await db.select().from(tenants).limit(1);
  if (!tenant) {
    process.stderr.write('\n  ✗ No tenant found. Create one via the app first (POST /auth/register).\n\n');
    process.exit(1);
  }
  log(`✓ Tenant: ${tenant.name}  (${tenant.id})`);

  const [store] = await db.select().from(stores)
    .where(eq(stores.tenantId, tenant.id))
    .orderBy(stores.isDefault)
    .limit(1);
  if (!store) {
    process.stderr.write('\n  ✗ No store found. Create a store first via the app.\n\n');
    process.exit(1);
  }
  log(`✓ Store : ${store.name}  (${store.id})`);

  const tenantId = tenant.id;
  const storeId  = store.id;

  // ── 2. Build SKU index of what already exists (additive mode) ───────────────
  const existingSkus = new Set(
    (await db.select({ sku: products.sku })
      .from(products)
      .where(eq(products.tenantId, tenantId)))
      .map((r) => r.sku)
      .filter(Boolean) as string[],
  );
  if (existingSkus.size > 0) {
    log(`ℹ  ${existingSkus.size} products already exist — running in additive mode (skipping duplicate SKUs)`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. CATEGORIES
  // ─────────────────────────────────────────────────────────────────────────────
  section('Categories');

  // Parent categories
  const [catTiles] = await db.insert(categories)
    .values({ tenantId, name: 'Tiles', sortOrder: 1 })
    .onConflictDoNothing()
    .returning();

  const [catPaint] = await db.insert(categories)
    .values({ tenantId, name: 'Paint & Colors', sortOrder: 2 })
    .onConflictDoNothing()
    .returning();

  const [catBath] = await db.insert(categories)
    .values({ tenantId, name: 'Bathroom Fittings', sortOrder: 3 })
    .onConflictDoNothing()
    .returning();

  // Sub-categories: Tiles
  const [catFloor] = await db.insert(categories)
    .values({ tenantId, parentId: catTiles.id, name: 'Floor Tiles', sortOrder: 1 })
    .onConflictDoNothing().returning();
  const [catWall] = await db.insert(categories)
    .values({ tenantId, parentId: catTiles.id, name: 'Wall Tiles', sortOrder: 2 })
    .onConflictDoNothing().returning();
  const [catOutdoor] = await db.insert(categories)
    .values({ tenantId, parentId: catTiles.id, name: 'Outdoor Tiles', sortOrder: 3 })
    .onConflictDoNothing().returning();

  // Sub-categories: Paint
  const [catInterior] = await db.insert(categories)
    .values({ tenantId, parentId: catPaint.id, name: 'Interior Paint', sortOrder: 1 })
    .onConflictDoNothing().returning();
  const [catExterior] = await db.insert(categories)
    .values({ tenantId, parentId: catPaint.id, name: 'Exterior Paint', sortOrder: 2 })
    .onConflictDoNothing().returning();
  const [catPrimer] = await db.insert(categories)
    .values({ tenantId, parentId: catPaint.id, name: 'Primers & Putty', sortOrder: 3 })
    .onConflictDoNothing().returning();

  // Sub-categories: Bathroom
  const [catSanitary] = await db.insert(categories)
    .values({ tenantId, parentId: catBath.id, name: 'Sanitaryware', sortOrder: 1 })
    .onConflictDoNothing().returning();
  const [catFaucets] = await db.insert(categories)
    .values({ tenantId, parentId: catBath.id, name: 'Faucets & Taps', sortOrder: 2 })
    .onConflictDoNothing().returning();
  const [catShower] = await db.insert(categories)
    .values({ tenantId, parentId: catBath.id, name: 'Shower Systems', sortOrder: 3 })
    .onConflictDoNothing().returning();
  const [catAccessory] = await db.insert(categories)
    .values({ tenantId, parentId: catBath.id, name: 'Bath Accessories', sortOrder: 4 })
    .onConflictDoNothing().returning();

  log(`✓ 3 parent + 10 sub-categories created`);

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. BRANDS
  // ─────────────────────────────────────────────────────────────────────────────
  section('Brands');

  const brandRows = await db.insert(brands)
    .values([
      { tenantId, name: 'KAJARIA',       description: 'Kajaria Ceramics Ltd — premium tile manufacturer' },
      { tenantId, name: 'SOMANY',        description: 'Somany Ceramics Pvt Ltd' },
      { tenantId, name: 'ASIAN PAINTS',  description: 'Asian Paints Ltd — India\'s leading paint company' },
      { tenantId, name: 'BERGER PAINTS', description: 'Berger Paints India Ltd' },
      { tenantId, name: 'JAQUAR',        description: 'JAQUAR Group — premium bath fittings' },
      { tenantId, name: 'HINDWARE',      description: 'Hindware Ltd — sanitaryware & fittings' },
    ])
    .onConflictDoNothing()
    .returning();

  const brand = (name: string) => brandRows.find((b) => b.name === name)!;
  log(`✓ ${brandRows.length} brands created`);

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. PRODUCTS  (price = typical retail selling price)
  // ─────────────────────────────────────────────────────────────────────────────
  section('Products');

  const productDefs = [
    // ── Floor Tiles ─────────────────────────────────────────────────────────
    { sku: 'TL-FLR-001', name: 'Kajaria Vitro Floor Tile 600×600 White Gloss',        categoryId: catFloor.id,    brandId: brand('KAJARIA').id,       basePrice: '45.00',    avgCost: '32.00', openQty: 350 },
    { sku: 'TL-FLR-002', name: 'Kajaria Floor Tile 800×800 Bianco Carrara',           categoryId: catFloor.id,    brandId: brand('KAJARIA').id,       basePrice: '88.00',    avgCost: '62.00', openQty: 200 },
    { sku: 'TL-FLR-003', name: 'Somany Floor Tile 600×600 Rustic Brown Matt',         categoryId: catFloor.id,    brandId: brand('SOMANY').id,        basePrice: '36.00',    avgCost: '25.00', openQty: 420 },
    { sku: 'TL-FLR-004', name: 'Somany Marble Tile 800×800 Statuario',                categoryId: catFloor.id,    brandId: brand('SOMANY').id,        basePrice: '98.00',    avgCost: '70.00', openQty: 150 },
    { sku: 'TL-FLR-005', name: 'Kajaria Antiskid Floor Tile 400×400 Sand',            categoryId: catFloor.id,    brandId: brand('KAJARIA').id,       basePrice: '28.00',    avgCost: '19.00', openQty: 300 },
    // ── Wall Tiles ──────────────────────────────────────────────────────────
    { sku: 'TL-WLL-001', name: 'Kajaria Wall Tile 300×450 Ice White Gloss',           categoryId: catWall.id,     brandId: brand('KAJARIA').id,       basePrice: '29.00',    avgCost: '20.00', openQty: 500 },
    { sku: 'TL-WLL-002', name: 'Somany Wall Tile 300×600 Gloss Grey',                 categoryId: catWall.id,     brandId: brand('SOMANY').id,        basePrice: '34.00',    avgCost: '23.00', openQty: 380 },
    { sku: 'TL-WLL-003', name: 'Kajaria Kitchen Tile 300×600 Ivory Travertine',       categoryId: catWall.id,     brandId: brand('KAJARIA').id,       basePrice: '38.00',    avgCost: '27.00', openQty: 260 },
    { sku: 'TL-WLL-004', name: 'Somany Subway Tile 75×300 White Glossy',              categoryId: catWall.id,     brandId: brand('SOMANY').id,        basePrice: '22.00',    avgCost: '14.00', openQty: 600 },
    // ── Outdoor Tiles ───────────────────────────────────────────────────────
    { sku: 'TL-OUT-001', name: 'Kajaria Outdoor Tile 600×600 Granite Grey',           categoryId: catOutdoor.id,  brandId: brand('KAJARIA').id,       basePrice: '42.00',    avgCost: '29.00', openQty: 220 },
    { sku: 'TL-OUT-002', name: 'Somany Outdoor Tile 600×600 Kota Stone',              categoryId: catOutdoor.id,  brandId: brand('SOMANY').id,        basePrice: '35.00',    avgCost: '24.00', openQty: 180 },
    // ── Interior Paint ──────────────────────────────────────────────────────
    { sku: 'PT-INT-001', name: 'Asian Paints Royale Luxury Emulsion 4L',              categoryId: catInterior.id, brandId: brand('ASIAN PAINTS').id,  basePrice: '1200.00',  avgCost: '880.00', openQty: 40 },
    { sku: 'PT-INT-002', name: 'Asian Paints Royale Luxury Emulsion 10L',             categoryId: catInterior.id, brandId: brand('ASIAN PAINTS').id,  basePrice: '2850.00',  avgCost: '2100.00', openQty: 30 },
    { sku: 'PT-INT-003', name: 'Asian Paints Tractor Emulsion 20L',                   categoryId: catInterior.id, brandId: brand('ASIAN PAINTS').id,  basePrice: '1650.00',  avgCost: '1200.00', openQty: 25 },
    { sku: 'PT-INT-004', name: 'Berger Silk Interior Emulsion 4L',                    categoryId: catInterior.id, brandId: brand('BERGER PAINTS').id, basePrice: '1150.00',  avgCost: '820.00', openQty: 35 },
    { sku: 'PT-INT-005', name: 'Berger Silk Interior Emulsion 10L',                   categoryId: catInterior.id, brandId: brand('BERGER PAINTS').id, basePrice: '2700.00',  avgCost: '1950.00', openQty: 20 },
    // ── Exterior Paint ──────────────────────────────────────────────────────
    { sku: 'PT-EXT-001', name: 'Asian Paints Apex Exterior Emulsion 4L',              categoryId: catExterior.id, brandId: brand('ASIAN PAINTS').id,  basePrice: '1400.00',  avgCost: '1020.00', openQty: 30 },
    { sku: 'PT-EXT-002', name: 'Asian Paints Apex Exterior Emulsion 10L',             categoryId: catExterior.id, brandId: brand('ASIAN PAINTS').id,  basePrice: '3300.00',  avgCost: '2400.00', openQty: 20 },
    { sku: 'PT-EXT-003', name: 'Berger WeatherCoat All Guard 4L',                     categoryId: catExterior.id, brandId: brand('BERGER PAINTS').id, basePrice: '1380.00',  avgCost: '980.00', openQty: 25 },
    { sku: 'PT-EXT-004', name: 'Berger WeatherCoat All Guard 10L',                    categoryId: catExterior.id, brandId: brand('BERGER PAINTS').id, basePrice: '3200.00',  avgCost: '2280.00', openQty: 15 },
    // ── Primers & Putty ─────────────────────────────────────────────────────
    { sku: 'PT-PRM-001', name: 'Asian Paints Wall Putty White Cement 20kg',           categoryId: catPrimer.id,   brandId: brand('ASIAN PAINTS').id,  basePrice: '880.00',   avgCost: '620.00', openQty: 50 },
    { sku: 'PT-PRM-002', name: 'Asian Paints Interior Primer 4L',                     categoryId: catPrimer.id,   brandId: brand('ASIAN PAINTS').id,  basePrice: '480.00',   avgCost: '340.00', openQty: 40 },
    { sku: 'PT-PRM-003', name: 'Berger Exterior Weatherproof Primer 4L',              categoryId: catPrimer.id,   brandId: brand('BERGER PAINTS').id, basePrice: '520.00',   avgCost: '370.00', openQty: 30 },
    // ── Sanitaryware ────────────────────────────────────────────────────────
    { sku: 'BT-SAN-001', name: 'JAQUAR Rimless One-Piece WC with Soft Close Seat',    categoryId: catSanitary.id, brandId: brand('JAQUAR').id,        basePrice: '19500.00', avgCost: '13800.00', openQty: 8 },
    { sku: 'BT-SAN-002', name: 'JAQUAR Wall-Hung WC Pan with In-Wall Cistern',        categoryId: catSanitary.id, brandId: brand('JAQUAR').id,        basePrice: '32000.00', avgCost: '22500.00', openQty: 5 },
    { sku: 'BT-SAN-003', name: 'HINDWARE Ambassador Floor-Mount WC S-Trap',           categoryId: catSanitary.id, brandId: brand('HINDWARE').id,      basePrice: '8800.00',  avgCost: '6200.00', openQty: 12 },
    { sku: 'BT-SAN-004', name: 'HINDWARE Contessa Ceramic Pedestal Basin 520mm',      categoryId: catSanitary.id, brandId: brand('HINDWARE').id,      basePrice: '4500.00',  avgCost: '3100.00', openQty: 15 },
    { sku: 'BT-SAN-005', name: 'JAQUAR Fonte Counter-Top Basin 420mm White',          categoryId: catSanitary.id, brandId: brand('JAQUAR').id,        basePrice: '7200.00',  avgCost: '5100.00', openQty: 10 },
    // ── Faucets & Taps ──────────────────────────────────────────────────────
    { sku: 'BT-FCT-001', name: 'JAQUAR Solo+ Single Lever Basin Mixer Chrome',        categoryId: catFaucets.id,  brandId: brand('JAQUAR').id,        basePrice: '3400.00',  avgCost: '2400.00', openQty: 20 },
    { sku: 'BT-FCT-002', name: 'JAQUAR Kubix Bib Cock with Flange Chrome',            categoryId: catFaucets.id,  brandId: brand('JAQUAR').id,        basePrice: '920.00',   avgCost: '640.00', openQty: 35 },
    { sku: 'BT-FCT-003', name: 'HINDWARE Contessa Single Lever Basin Mixer Chrome',   categoryId: catFaucets.id,  brandId: brand('HINDWARE').id,      basePrice: '1900.00',  avgCost: '1320.00', openQty: 25 },
    { sku: 'BT-FCT-004', name: 'JAQUAR Solo Single Lever Sink Mixer Chrome',          categoryId: catFaucets.id,  brandId: brand('JAQUAR').id,        basePrice: '2800.00',  avgCost: '1980.00', openQty: 18 },
    // ── Shower Systems ──────────────────────────────────────────────────────
    { sku: 'BT-SHW-001', name: 'JAQUAR Overhead Rain Shower 200mm Round Chrome',      categoryId: catShower.id,   brandId: brand('JAQUAR').id,        basePrice: '4800.00',  avgCost: '3380.00', openQty: 12 },
    { sku: 'BT-SHW-002', name: 'JAQUAR Kubix Overhead Shower 150mm Square Chrome',   categoryId: catShower.id,   brandId: brand('JAQUAR').id,        basePrice: '3400.00',  avgCost: '2380.00', openQty: 10 },
    { sku: 'BT-SHW-003', name: 'HINDWARE Shower Set with Slide Bar & Hand Shower',    categoryId: catShower.id,   brandId: brand('HINDWARE').id,      basePrice: '2200.00',  avgCost: '1520.00', openQty: 15 },
    // ── Bath Accessories ────────────────────────────────────────────────────
    { sku: 'BT-ACC-001', name: 'JAQUAR Kubix Towel Ring Chrome',                      categoryId: catAccessory.id, brandId: brand('JAQUAR').id,       basePrice: '1280.00',  avgCost: '880.00', openQty: 30 },
    { sku: 'BT-ACC-002', name: 'JAQUAR Kubix Towel Bar 600mm Chrome',                 categoryId: catAccessory.id, brandId: brand('JAQUAR').id,       basePrice: '1650.00',  avgCost: '1140.00', openQty: 25 },
    { sku: 'BT-ACC-003', name: 'HINDWARE Toilet Paper Holder Chrome',                 categoryId: catAccessory.id, brandId: brand('HINDWARE').id,     basePrice: '680.00',   avgCost: '460.00', openQty: 40 },
    { sku: 'BT-ACC-004', name: 'JAQUAR Kubix Soap Dish Holder Chrome',                categoryId: catAccessory.id, brandId: brand('JAQUAR').id,       basePrice: '950.00',   avgCost: '660.00', openQty: 35 },
    { sku: 'BT-ACC-005', name: 'HINDWARE Tumbler Holder Chrome',                      categoryId: catAccessory.id, brandId: brand('HINDWARE').id,     basePrice: '580.00',   avgCost: '390.00', openQty: 30 },
  ];

  const newProductDefs = productDefs.filter((p) => !existingSkus.has(p.sku));

  let productRows: typeof products.$inferSelect[] = [];
  if (newProductDefs.length === 0) {
    log(`⚠  All products already exist — skipping product insert`);
  } else {
    productRows = await db.insert(products)
      .values(newProductDefs.map((p) => ({
        tenantId,
        brandId:    p.brandId,
        categoryId: p.categoryId,
        name:       p.name,
        sku:        p.sku,
        basePrice:  p.basePrice,
        isActive:   true,
      })))
      .returning();
    log(`✓ ${productRows.length} products created (${productDefs.length - newProductDefs.length} skipped — duplicate SKU)`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. INVENTORY (opening stock)
  // ─────────────────────────────────────────────────────────────────────────────
  section('Inventory — opening stock');

  // Map SKU → newly inserted product row
  const productBySku = new Map(productRows.map((p) => [p.sku!, p]));

  if (productRows.length > 0) {
    const inventoryValues = newProductDefs.map((def) => {
      const prod = productBySku.get(def.sku)!;
      return { tenantId, storeId, productId: prod.id, variantId: null, quantity: def.openQty, averageCost: def.avgCost };
    });

    await db.insert(inventory).values(inventoryValues);

    await db.insert(stockMovements).values(
      newProductDefs.map((def) => {
        const prod = productBySku.get(def.sku)!;
        return {
          tenantId, storeId, productId: prod.id, variantId: null,
          type: 'opening_balance' as const, quantity: def.openQty,
          unitCost: def.avgCost, referenceType: 'seed', notes: 'Opening stock balance',
        };
      }),
    );

    log(`✓ ${inventoryValues.length} inventory rows + stock movement records`);
  } else {
    log(`⚠  Skipping inventory — no new products`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. VENDORS
  // ─────────────────────────────────────────────────────────────────────────────
  section('Vendors');

  await db.insert(vendors).values([
    {
      tenantId, name: 'Kajaria Ceramics Ltd',
      phone: '+91-98100-00001', email: 'sales@kajaria.com',
      address: 'Kajaria House, New Delhi', city: 'New Delhi', country: 'India',
      contactPerson: 'Rajesh Mehta',
      notes: 'Primary supplier for floor & wall tiles',
    },
    {
      tenantId, name: 'Somany Ceramics Pvt Ltd',
      phone: '+91-98100-00002', email: 'trade@somany.in',
      address: 'Somany House, Gurugram', city: 'Gurugram', country: 'India',
      contactPerson: 'Vikram Singh',
      notes: 'Tiles — marble finish & subway range',
    },
    {
      tenantId, name: 'Asian Paints Ltd',
      phone: '+91-22-6218-1000', email: 'b2b@asianpaints.com',
      address: '6A Shantinagar, Mumbai', city: 'Mumbai', country: 'India',
      contactPerson: 'Priya Sharma',
      notes: 'Interior & exterior emulsions, primers, putty',
    },
    {
      tenantId, name: 'Berger Paints India Ltd',
      phone: '+91-33-2227-0000', email: 'trade@bergerpaints.com',
      address: 'Berger House, Kolkata', city: 'Kolkata', country: 'India',
      contactPerson: 'Amit Das',
      notes: 'Silk interior, WeatherCoat exterior, primers',
    },
    {
      tenantId, name: 'JAQUAR & Company Pvt Ltd',
      phone: '+91-124-490-0000', email: 'dealer@jaquar.com',
      address: 'JAQUAR Tower, Manesar', city: 'Manesar', country: 'India',
      contactPerson: 'Sandeep Anand',
      notes: 'WC, basins, faucets, shower systems, accessories',
    },
    {
      tenantId, name: 'Hindware Ltd',
      phone: '+91-11-4617-0000', email: 'sales@hindware.com',
      address: 'Hindware House, New Delhi', city: 'New Delhi', country: 'India',
      contactPerson: 'Renu Gupta',
      notes: 'Sanitaryware, faucets, shower sets, accessories',
    },
  ]);

  log(`✓ 6 vendors created`);

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. CUSTOMERS  (with opening balances)
  // ─────────────────────────────────────────────────────────────────────────────
  section('Customers & opening balances');

  const customerDefs = [
    { name: 'Al-Noor Construction Co.',    phone: '+971-50-111-0001', city: 'Dubai',       balance: 125000, notes: 'Contractor — large tile & fitting orders' },
    { name: 'Bright Homes Developers',     phone: '+971-50-111-0002', city: 'Abu Dhabi',   balance: 75000,  notes: 'Real-estate developer — full interior fit-out' },
    { name: 'Gulf Interiors LLC',          phone: '+971-50-111-0003', city: 'Sharjah',     balance: 45000,  notes: 'Interior design firm' },
    { name: 'Premier Renovations',         phone: '+971-50-111-0004', city: 'Dubai',       balance: 30000,  notes: 'Renovation contractor' },
    { name: 'Star Build Group',            phone: '+971-50-111-0005', city: 'Dubai',       balance: 200000, notes: 'Major contractor — credit account' },
    { name: 'Modern Living Décor',         phone: '+971-50-111-0006', city: 'Abu Dhabi',   balance: 15000,  notes: 'Retail & design showroom' },
    { name: 'Desert Properties Ltd',       phone: '+971-50-111-0007', city: 'Fujairah',    balance: 60000,  notes: 'Property developer' },
    { name: 'City Contractors LLC',        phone: '+971-50-111-0008', city: 'Ajman',       balance: 85000,  notes: 'Civil contractor' },
    { name: 'Al-Farooq Trading',           phone: '+971-50-111-0009', city: 'Dubai',       balance: 0,      notes: 'Settled account — walk-in & retail buyer' },
    { name: 'Luxury Spaces Interiors',     phone: '+971-50-111-0010', city: 'Dubai',       balance: 0,      notes: 'High-end fit-out company — all cash' },
  ];

  const customerRows = await db.insert(customers)
    .values(customerDefs.map((c) => ({
      tenantId,
      name:    c.name,
      phone:   c.phone,
      city:    c.city,
      country: 'UAE',
      notes:   c.notes,
    })))
    .returning();

  // Insert opening balance ledger entries for customers with a balance
  const ledgerEntries = customerRows
    .map((row, i) => ({ row, def: customerDefs[i] }))
    .filter(({ def }) => def.balance > 0)
    .map(({ row, def }) => ({
      tenantId,
      customerId:    row.id,
      type:          'adjustment' as const,
      referenceType: 'opening_balance',
      debit:         String(def.balance.toFixed(2)),
      credit:        '0.00',
      balanceAfter:  String(def.balance.toFixed(2)),
      notes:         'Opening balance',
    }));

  if (ledgerEntries.length > 0) {
    await db.insert(customerLedger).values(ledgerEntries);
  }

  log(`✓ ${customerRows.length} customers`);
  log(`✓ ${ledgerEntries.length} opening balance ledger entries`);

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. FINANCIAL ACCOUNTS
  // ─────────────────────────────────────────────────────────────────────────────
  section('Financial accounts');

  const existingAccounts = await db.select({ id: financialAccounts.id })
    .from(financialAccounts)
    .where(eq(financialAccounts.tenantId, tenantId));

  if (existingAccounts.length > 0) {
    log(`⚠  Financial accounts already exist — skipping`);
  } else {
    const acctRows = await db.insert(financialAccounts)
      .values([
        {
          tenantId, storeId,
          category: 'cash', accountType: 'cash_drawer',
          name: 'Main Cash Drawer',
          openingBalance: '50000.00', currentBalance: '50000.00',
          isDefault: true, isActive: true,
          notes: 'Primary in-store cash till',
        },
        {
          tenantId, storeId,
          category: 'bank', accountType: 'current',
          name: 'HBL Current Account',
          bankName: 'Habib Bank Ltd', accountNumber: '0123-4567890-01',
          openingBalance: '500000.00', currentBalance: '500000.00',
          isDefault: false, isActive: true,
          notes: 'Primary business current account',
        },
        {
          tenantId, storeId,
          category: 'bank', accountType: 'current',
          name: 'ABL Business Account',
          bankName: 'Allied Bank Ltd', accountNumber: '0987-6543210-01',
          openingBalance: '200000.00', currentBalance: '200000.00',
          isDefault: false, isActive: true,
          notes: 'Secondary business account',
        },
      ])
      .returning();

    // Record opening balance transactions
    await db.insert(accountTransactions).values(
      acctRows.map((acct) => ({
        tenantId,
        accountId:    acct.id,
        type:         'opening_balance' as const,
        direction:    'in',
        amount:       acct.openingBalance,
        balanceAfter: acct.openingBalance,
        notes:        'Account opening balance',
        referenceType: 'seed',
      })),
    );

    log(`✓ ${acctRows.length} financial accounts + opening balance transactions`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Done
  // ─────────────────────────────────────────────────────────────────────────────
  process.stdout.write('\n╔═══════════════════════════════════════════╗\n');
  process.stdout.write('║   ✓  Seed completed successfully!         ║\n');
  process.stdout.write('╚═══════════════════════════════════════════╝\n\n');
  process.stdout.write('  Summary:\n');
  process.stdout.write(`  • 3 parent categories, 10 sub-categories\n`);
  process.stdout.write(`  • 6 brands\n`);
  process.stdout.write(`  • ${productRows.length} new products with opening inventory\n`);
  process.stdout.write(`  • 6 vendors\n`);
  process.stdout.write(`  • ${customerRows.length} customers (${ledgerEntries.length} with opening balances)\n`);
  process.stdout.write(`  • 3 financial accounts (cash + 2 bank)\n\n`);

  process.exit(0);
}

seed().catch((err) => {
  process.stderr.write(`\n  ✗ Seed failed: ${err.message}\n`);
  console.error(err);
  process.exit(1);
});
