export const WORLD = { width: 3600, height: 2400, left: 65, right: 3535, top: 75, bottom: 2340 };

export const DIFFICULTIES = {
  easy: { name: 'Dawn', label: 'Easy', description: 'Longer warnings, softer hits, more healing.', health: 160, damage: 0.65, enemyHealth: 0.85, championHealth: 1.5, speed: 0.88, pressure: 0.75, warning: 1.3, heal: 24 },
  normal: { name: 'Resolve', label: 'Normal', description: 'The intended challenge. Move and use cover.', health: 120, damage: 1, enemyHealth: 1, championHealth: 1, speed: 1, pressure: 1, warning: 1, heal: 18 },
  hard: { name: 'Defiance', label: 'Hard', description: 'More enemies, faster foes, stronger Wardens.', health: 100, damage: 1.2, enemyHealth: 1.22, championHealth: 1.22, speed: 1.13, pressure: 1.35, warning: 0.82, heal: 16 }
};

const prop = (x, y, type, radius, height) => ({ x, y, type, radius, height });
// Per-map scenery kits, painted by tools/art/kit_<map>.py into assets/production/<map>-kit.png (4 columns
// of 320 px cells). Sprite fields: frame = atlas cell; height = drawn height in world units; radius =
// collision footprint (absent for decorations); parts = extra collision circles [dx,dy,r] for long props;
// reach = half the drawn width (shadow and see-through); flat = ground decal; light = painted light
// [dx,dy,r,colour] that breathes softly. pieces name the landmark, gathering object, sealed and open gate,
// barricade, ground foliage and crossing art: a kit sprite, a world-details index or an open-gate frame.
export const KITS = {
  garden: { asset:'gardenKit',
    sprites:{
      hedge:{frame:0,height:90,radius:30,parts:[[-44,0,28],[44,0,28]],reach:73}, 'hedge-post':{frame:1,height:125,radius:36,reach:44}, 'tree-blossom':{frame:2,height:171,radius:26,reach:67},
      'tree-fruit':{frame:3,height:171,radius:26,reach:67}, roots:{frame:4,height:98,radius:42,parts:[[-49,4,28],[49,4,28]],reach:80,light:[0,-57,42,'#ffcf6a33']}, planter:{frame:5,height:103,radius:34,parts:[[-28,0,25],[28,0,25]],reach:51},
      urn:{frame:6,height:141,radius:26,reach:30}, flowerbed:{frame:7,height:54,reach:66}, leaves:{frame:8,height:62,flat:true},
      'seed-lantern':{frame:9,height:103,reach:18,light:[22,-71,27,'#e8f5a055']}, 'gear-moss':{frame:10,height:59,flat:true}, stepping:{frame:11,height:64,flat:true}
    },
    pieces:{ landmark:{detail:0,height:190}, event:{detail:1,height:135}, gate:{detail:2,height:200}, open:{gate:0,height:200}, barrier:{detail:15,height:120}, foliage:{detail:12} } },
  causeway: { asset:'causewayKit',
    sprites:{
      balustrade:{frame:0,height:89,radius:27,parts:[[-47,0,26],[47,0,26]],reach:75}, 'lamp-pier':{frame:1,height:145,radius:30,parts:[[32,-1,18]],reach:50,light:[-4,-114,30,'#8fe3e044']}, 'bell-pillar':{frame:2,height:164,radius:30,reach:33},
      'broken-stones':{frame:3,height:74,radius:34,parts:[[-45,5,24],[45,6,24]],reach:71}, 'banner-post':{frame:4,height:169,radius:20,reach:43}, 'cart-wreck':{frame:5,height:82,radius:31,parts:[[-40,6,24],[40,0,26]],reach:67},
      puddle:{frame:6,height:62,flat:true}, chimes:{frame:7,height:107,reach:24}, 'rope-coil':{frame:8,height:45,flat:true},
      bundles:{frame:9,height:98,reach:51}, barrier:{frame:10,height:104}, 'fallen-bell':{frame:11,height:48,reach:40}
    },
    pieces:{ landmark:{detail:4,height:190}, event:{detail:5,height:135}, gate:{detail:6,height:200}, open:{gate:1,height:200}, barrier:{sprite:'barrier',height:104}, foliage:{detail:13}, crossing:{detail:7,height:156} } },
  court: { asset:'courtKit',
    sprites:{
      column:{frame:0,height:164,radius:26,reach:32}, 'column-broken':{frame:1,height:107,radius:26,parts:[[43,1,18]],reach:62}, statue:{frame:2,height:157,radius:31,reach:35,light:[1,-98,18,'#ffe39a44']},
      throne:{frame:3,height:94,radius:34,parts:[[-42,4,24],[42,4,24]],reach:67}, brazier:{frame:4,height:148,radius:22,reach:29,light:[0,-102,46,'#d9a2ff55']}, shelf:{frame:5,height:137,radius:30,parts:[[-36,0,26],[36,0,26]],reach:65},
      scrolls:{frame:6,height:75,flat:true}, petals:{frame:7,height:60,flat:true}, sigil:{frame:8,height:70,flat:true},
      candles:{frame:9,height:66,reach:43,light:[0,-42,26,'#ffd27a44']}, barrier:{frame:10,height:104}, carpet:{frame:11,height:88,flat:true}
    },
    pieces:{ landmark:{detail:8,height:190}, event:{detail:9,height:155}, gate:{detail:10,height:200}, open:{gate:2,height:200}, barrier:{sprite:'barrier',height:104}, foliage:{detail:14}, crossing:{detail:11,height:132} } },
  foundry: { asset:'foundryKit',
    sprites:{
      furnace:{frame:0,height:166,radius:47,reach:58,light:[-8,-32,48,'#ff8a3a66']}, anvil:{frame:1,height:106,radius:28,reach:42,light:[8,-71,20,'#ff9a4a55']}, crates:{frame:2,height:126,radius:34,parts:[[-41,2,28],[43,4,25]],reach:70},
      'chain-post':{frame:3,height:119,radius:26,reach:42}, tank:{frame:4,height:151,radius:47,reach:55}, coal:{frame:5,height:103,reach:54},
      sparks:{frame:6,height:62,flat:true}, gears:{frame:7,height:60,flat:true}, pipes:{frame:8,height:67,reach:77},
      crucible:{frame:9,height:200,light:[0,-138,82,'#ffa04a55']}, 'heart-cart':{frame:10,height:165,light:[-7,-112,75,'#ffc05a55']}, gate:{frame:11,height:225},
      'gate-open':{frame:12,height:230}, barrier:{frame:13,height:104}, slag:{frame:14,height:30},
      turntable:{frame:15,height:150,flat:true}, kiln:{frame:16,height:165,radius:52,reach:58,light:[-2,-22,42,'#ff8a3a55']}, ingots:{frame:17,height:49,reach:54},
      'slag-dark':{frame:18,height:30}, rails:{frame:19,height:82,flat:true}
    },
    pieces:{ landmark:{sprite:'crucible',height:200}, event:{sprite:'heart-cart',height:165}, gate:{sprite:'gate',height:225}, open:{sprite:'gate-open',height:230}, barrier:{sprite:'barrier',height:104}, foliage:{sprite:['slag','slag-dark']}, crossing:{sprite:'turntable',height:150} } },
  observatory: { asset:'observatoryKit',
    sprites:{
      telescope:{frame:0,height:167,radius:27,reach:51}, 'lens-frame':{frame:1,height:157,radius:31,reach:40,light:[0,-94,36,'#9fc8ff33']}, globe:{frame:2,height:144,radius:29,reach:36},
      crystal:{frame:3,height:133,radius:35,parts:[[-40,5,24],[40,5,24]],reach:66,light:[-2,-66,39,'#9fc8ff33']}, shelf:{frame:4,height:134,radius:30,parts:[[-36,0,26],[36,0,26]],reach:64}, chart:{frame:5,height:80,flat:true},
      lenses:{frame:6,height:43,flat:true}, tile:{frame:7,height:68,flat:true}, books:{frame:8,height:80,reach:36},
      'sky-engine':{frame:9,height:210,light:[0,-141,91,'#9fc8ff44']}, 'align-lens':{frame:10,height:170,light:[0,-113,56,'#9fc8ff44']}, gate:{frame:11,height:220},
      'gate-open':{frame:12,height:224}, barrier:{frame:13,height:100}, shards:{frame:14,height:34},
      'star-disc':{frame:15,height:150,flat:true}
    },
    pieces:{ landmark:{sprite:'sky-engine',height:210}, event:{sprite:'align-lens',height:170}, gate:{sprite:'gate',height:220}, open:{sprite:'gate-open',height:224}, barrier:{sprite:'barrier',height:100}, foliage:{sprite:'shards'}, crossing:{sprite:'star-disc',height:150} } }
};
// Expands authored placements [type,x,y] into collision obstacles (with any extra footprint parts)
// and decorations, reading footprint and size from the map's kit.
function scenery(id, placements) {
  const kit = KITS[id], obstacles = [], decorations = [];
  for (const [type, x, y] of placements) {
    const s = kit.sprites[type];
    if (!s) throw new Error('Unknown scenery for ' + id + ': ' + type);
    const entry = { x, y, type, radius: s.radius || 0, height: s.height, ...(s.reach ? { reach: s.reach } : {}) };
    if (!s.radius) { decorations.push(entry); continue; }
    obstacles.push(entry);
    for (const [dx, dy, r] of s.parts || []) obstacles.push({ x: x + dx, y: y + dy, radius: r, part: true });
  }
  return { obstacles, decorations };
}
// Authored scenery, one place per map. Every placement keeps clear of all road variants, objectives,
// wells, lanterns, keeper paths, the gathering convoy, the barricade, the gate and the spawn
// (tests/maps-layout.test.mjs), and props either touch (a wall) or leave a lane the navigation grid can use.
// Sunken Garden: a clipped parterre framing the open lawn west of the Clock of Tomorrow, hedge posts and
// urns lining the Pilgrim's Approach, root knots where the Warden broke through by the Root Archive, a
// hedged avenue to the arena, and the Orchard of First Light planted in rows along Luma's road.
const GARDEN = [
  ['hedge',300,330],['hedge-post',560,300],['hedge',820,330],['urn',550,500],['planter',170,540],['planter',940,520],
  ['hedge',300,1010],['hedge',820,1010],['urn',1040,1000],
  ['hedge-post',870,1290],['hedge-post',1000,1480],['urn',470,1430],['urn',520,1760],['hedge',840,1770],['planter',300,1880],
  ['roots',1420,330],['roots',1760,300],['roots',2120,350],['roots',1600,1180],['tree-blossom',2460,300],['tree-fruit',2700,330],
  ['hedge',2470,1430],['tree-fruit',3150,1000],['hedge-post',3200,1400],['tree-blossom',2700,850],['roots',3250,500],
  ['tree-fruit',2700,2000],['tree-blossom',2890,2000],['tree-fruit',3080,2000],['tree-blossom',3270,2000],
  ['tree-blossom',2700,2190],['tree-fruit',2890,2190],['tree-blossom',3080,2190],['tree-fruit',3270,2190],
  ['tree-fruit',1420,2170],['tree-blossom',1620,2170],['tree-fruit',1820,2170],['tree-blossom',2020,2170],['tree-fruit',2220,2170],['tree-blossom',2420,2170],
  ['flowerbed',380,760],['flowerbed',660,760],['gear-moss',760,1140],['stepping',1330,1460],['stepping',1250,560],
  ['leaves',2790,2100],['leaves',3170,2100],['leaves',1720,2250],['leaves',2320,2250],['seed-lantern',1520,2060],['seed-lantern',2120,2060],
  ['seed-lantern',2600,1700],['flowerbed',3330,1150],['leaves',1650,1240],['seed-lantern',300,1180],['gear-moss',2300,700],['flowerbed',1080,700]
];
// Echo Causeway: bell pillars ring the West Bell and stand by Maelin's signal towers, balustrades and lamp
// piers line the causeway from the hub to the Far Crossing and the Open Voice Arch, and the broken
// procession (carts, bundles, banners) lies along Vesper's southern road.
const CAUSEWAY = [
  ['bell-pillar',520,560],['bell-pillar',780,380],['bell-pillar',1040,540],['chimes',640,470],['chimes',920,470],
  ['lamp-pier',470,1420],['lamp-pier',470,1720],['balustrade',830,1780],['balustrade',300,1250],
  ['bell-pillar',1300,330],['bell-pillar',1640,300],['bell-pillar',1980,330],['broken-stones',2200,330],
  ['balustrade',2300,950],['lamp-pier',2620,1180],['balustrade',2950,1250],['lamp-pier',3200,1050],['balustrade',3300,1300],
  ['lamp-pier',2620,560],['balustrade',2950,420],['lamp-pier',3240,380],['bell-pillar',3400,900],
  ['banner-post',1300,2050],['cart-wreck',1600,2150],['banner-post',1900,2080],['cart-wreck',2220,2180],['banner-post',2500,2180],
  ['broken-stones',2750,1750],['banner-post',3000,1700],['broken-stones',3300,1950],['broken-stones',1150,800],['broken-stones',300,2000],
  ['puddle',700,1040],['puddle',1640,1300],['puddle',2400,1600],['puddle',3100,1450],['puddle',1300,780],['rope-coil',1880,1080],
  ['rope-coil',2700,1350],['bundles',1450,2120],['bundles',2060,2160],['fallen-bell',1180,420],['fallen-bell',2900,1950],['chimes',3100,560],
  ['puddle',1100,1920],['rope-coil',600,1250],['bundles',2900,2150]
];
// Hollow Sun Court: colonnades line the processional way from the hub past the arena to the Sun Engine
// Stair, the nameless stand veiled on their plinths in the Court of Unspoken Names, archive shelves hold
// the lost names, the fallen throne lies by the Crown's Horizon, and braziers keep the steps lit.
const COURT = [
  ['column',2420,1110],['column',2560,1170],['column',3080,1250],
  ['column',2440,1430],['column',2620,1560],['column',3144,1419],['column',3290,1460],['column-broken',3190,1830],
  ['statue',1320,300],['statue',1560,280],['statue',1800,300],['statue',2040,280],['brazier',1180,350],['brazier',2180,350],
  ['shelf',1140,820],['shelf',1640,1360],['column-broken',1680,1140],
  ['column',450,1250],['column',780,1330],['brazier',350,1480],['brazier',420,1800],['statue',900,1900],['column-broken',1200,1900],
  ['shelf',400,700],['shelf',700,400],['statue',980,640],['column-broken',300,420],
  ['throne',2900,2050],['brazier',3150,1980],['brazier',2680,1980],['throne',2700,700],['column',3000,600],['column',3300,850],
  ['statue',2350,2150],['brazier',2100,2060],['column-broken',1700,2200],
  ['carpet',2520,1310],['carpet',2700,1360],['carpet',3080,1520],['sigil',2560,1280],['sigil',1110,1550],['petals',2760,1700],
  ['petals',2000,820],['scrolls',1480,1240],['scrolls',650,620],['candles',1450,420],['candles',1930,420],['petals',600,1820],['scrolls',2050,1600],
  ['candles',2950,1800],['sigil',700,1050],['petals',3200,1150]
];
// Emberfoundry: a gallery of furnaces and kilns along the west wall with an anvil at each mouth, the
// cooling galleries' tanks and pipes along the north wall above Rivet's sluices, crate stacks in the
// workers' yard and the central workshop, and the Crucible of the Unchained's forge row along the south wall.
const FOUNDRY = [
  ['furnace',300,380],['kiln',560,360],['furnace',820,380],['anvil',320,560],['anvil',580,560],['anvil',840,560],
  ['chain-post',180,760],['chain-post',1010,760],
  ['crates',330,1880],['crates',760,1980],['anvil',540,2130],['chain-post',200,1430],['tank',220,1150],
  ['tank',1380,300],['tank',1640,260],['tank',1900,300],['tank',2160,260],
  ['crates',1560,1250],['anvil',1700,1120],['chain-post',1500,1420],
  ['furnace',1500,2190],['kiln',1760,2210],['furnace',2020,2190],['anvil',1630,2060],['anvil',1890,2060],
  ['furnace',2700,2200],['kiln',2960,2210],['furnace',3220,2200],
  ['crates',3250,1180],['tank',3100,1000],['tank',2560,1250],['furnace',3130,1370],['chain-post',2560,1700],['crates',2440,1060],
  ['furnace',2700,300],['kiln',2960,320],['furnace',3220,300],['crates',3300,560],['anvil',2830,520],
  ['coal',440,1720],['coal',2860,2040],['coal',1640,1980],['pipes',1510,420],['pipes',2030,420],['gears',880,1720],['gears',1300,1100],
  ['sparks',700,640],['sparks',2560,1450],['sparks',1820,1450],['coal',2600,560],['gears',3060,740],['ingots',460,2010],['ingots',3400,1450],
  ['rails',1500,1260],['rails',2250,1400]
];
// Starfall Observatory: telescope pedestals stand in an arc around the Sky Engine, lens frames in an arc
// above Eiran's broken lens array, star globes and crystal outcrops ring the Open Sky's arena, fallen
// stars crystallise on the Fallen Star Steps, and the Horizon Library's shelves stand along Mira's road.
const OBSERVATORY = [
  ['telescope',790,1180],['telescope',850,990],['telescope',1000,880],['telescope',740,1360],
  ['lens-frame',1300,330],['lens-frame',1560,280],['lens-frame',1820,280],['lens-frame',2080,330],
  ['globe',2560,1230],['crystal',3150,1150],['globe',3200,560],['crystal',2620,560],['globe',3380,1180],
  ['crystal',450,500],['crystal',1060,480],['crystal',320,900],['telescope',600,300],
  ['shelf',1450,2160],['shelf',1760,2190],['shelf',2070,2160],['globe',2380,2120],['shelf',1000,1900],
  ['crystal',2800,1700],['globe',3150,1900],['crystal',3350,1550],['telescope',2650,2150],['crystal',1600,1300],['globe',1650,1140],
  ['chart',1900,1990],['chart',2300,1600],['lenses',1500,450],['lenses',1950,450],['tile',2480,1420],['tile',620,820],['tile',1110,1050],
  ['books',1300,2000],['books',1600,2040],['chart',600,1100],['tile',3000,1300],['lenses',2900,1400],['books',2200,2040],['chart',3100,620]
];
export const AREAS = [
  { id: 'garden', name: 'The Sunken Garden', chapter: 'I', subtitle: 'Learn to make a road.', art: 'garden-floor.png', regionalAsset:'gardenCast', detailTheme:0, bossAsset:'rootBoss', boss: 'The Root Warden',
    intro: 'Free the Hollow, protect a keeper and escort the mainspring. Then face the Root Warden.',
    outro: 'The roots let go of the stones. Sol, a small mechanical fox, wakes and joins you.',
    spawn: {x:650,y:1550},
    districts: [{x:720,y:1480,name:'Pilgrim’s Approach'},{x:1800,y:650,name:'The Root Archive'},{x:2920,y:1710,name:'Orchard of First Light'}],
    lanterns: [{x:850,y:1480},{x:1910,y:650},{x:3040,y:1710}],
    beacons: [{x:720,y:1480},{x:1800,y:650},{x:2920,y:1710}],
    ...scenery('garden',GARDEN) },
  { id: 'causeway', name: 'The Echo Causeway', chapter: 'II', subtitle: 'Find shelter. Refuse the echo.', art: 'causeway-floor.png', regionalAsset:'causewayCast', detailTheme:1, bossAsset:'bellBoss', boss: 'The Bell Warden',
    intro: 'The Choir strikes from afar here. Stone blocks its bolts.',
    outro: 'The bell cracks, and the city hears silence without an order. Ahead, the Court burns gold.',
    spawn: {x:650,y:1550},
    districts: [{x:780,y:650,name:'The West Bell'},{x:1840,y:1800,name:'The Broken Procession'},{x:2940,y:760,name:'The Far Crossing'}],
    lanterns: [{x:900,y:650},{x:1960,y:1800},{x:3060,y:760}],
    beacons: [{x:780,y:650},{x:1840,y:1800},{x:2940,y:760}],
    ...scenery('causeway',CAUSEWAY) },
  { id: 'court', name: 'The Hollow Sun Court', chapter: 'III', subtitle: 'Give the forgotten their names.', art: 'court-floor.png', regionalAsset:'courtCast', detailTheme:2, bossAsset:'crownBoss', boss: 'The Crown of Stillness',
    intro: 'Free an archive wing, defeat the Nameless Judge and protect the gathering.',
    outro: 'The erased names return as a thousand lights. Sera opens the stair to the Emberfoundry.',
    spawn: {x:650,y:1550},
    districts: [{x:790,y:1670,name:'The Refusing Steps'},{x:1760,y:650,name:'Court of Unspoken Names'},{x:2920,y:1650,name:'The Crown’s Horizon'}],
    lanterns: [{x:910,y:1670},{x:1880,y:650},{x:3040,y:1650}],
    beacons: [{x:790,y:1670},{x:1760,y:650},{x:2920,y:1650}],
    ...scenery('court',COURT) },
  { id:'foundry', name:'The Emberfoundry', chapter:'IV', subtitle:'Build a heart that cannot be commanded.', art:'foundry-floor.png', regionalAsset:'foundryCast', detailTheme:0, bossAsset:'furnaceBoss', boss:'The Furnace Sovereign',
    intro:'Help Rivet or Orin, break the Ash Marshal and carry the new sun-heart through the foundry.',
    outro:'Asha lifts the Unchained Heart. Sol follows its sparks toward the Starfall Observatory.',
    spawn:{x:650,y:1550},
    districts:[{x:780,y:1520,name:'The Workers’ Stair'},{x:1760,y:590,name:'The Cooling Galleries'},{x:2890,y:1780,name:'Crucible of the Unchained'}],
    lanterns:[{x:900,y:1520},{x:1880,y:590},{x:3010,y:1780}],
    beacons:[{x:780,y:1520},{x:1760,y:590},{x:2890,y:1780}],
    ...scenery('foundry',FOUNDRY) },
  { id:'observatory', name:'The Starfall Observatory', chapter:'V', subtitle:'Let the horizon belong to everyone.', art:'observatory-floor.png', regionalAsset:'observatoryCast', detailTheme:2, bossAsset:'constellationBoss', boss:'The Last Constellation',
    intro:'Restore a lens or escort Mira, defeat the Horizon Eater and align the stars.',
    outro:'Zeyu releases the light instead of keeping it. A thousand roads greet the same dawn.',
    spawn:{x:650,y:1550},
    districts:[{x:770,y:720,name:'The Fallen Star Steps'},{x:1740,y:1810,name:'The Horizon Library'},{x:2910,y:800,name:'The Open Sky'}],
    lanterns:[{x:890,y:720},{x:1860,y:1810},{x:3030,y:800}],
    beacons:[{x:770,y:720},{x:1740,y:1810},{x:2910,y:800}],
    ...scenery('observatory',OBSERVATORY) }
];


export const ENEMIES = {
  skirmisher: { health: 48, speed: 76, radius: 17, damage: 11 },
  pack: { health: 22, speed: 105, radius: 12, damage: 7 },
  walker: { health: 42, speed: 44, radius: 18, damage: 12 },
  runner: { health: 30, speed: 89, radius: 15, damage: 10 },
  cantor: { health: 62, speed: 32, radius: 19, damage: 14 },
  sentinel: { health: 110, speed: 29, radius: 24, damage: 19 }
};

export const COMBAT = {
  slash: {duration:0.44, impact:0.14, cooldown:0.62, range:112},
  sunbreak: {duration:0.66, impact:0.28, cooldown:10, range:285},
  cast: {duration:0.32}, dash: {duration:0.2, cooldown:2.5},
  allyCast: {duration:0.55, impact:0.27}, mend: {duration:0.8, impact:0.42},
  solarLance: {duration:0.6, impact:0.28, cooldown:12, range:620, width:32},
  lunarNova: {duration:0.8, impact:0.42, cooldown:9, range:240},
  solVolley: {duration:0.55, impact:0.33, cooldown:7, range:430},
  nurture: {amount:18, range:230, recipientCooldown:4},
  hurt: {duration:0.28}, death: {duration:0.8},
  charge: {windup:0.8, duration:0.42, recovery:0.65}
};

export const ASSETS = {
  guideActions:'road-guides.png',
  heroActions: 'hero-painted.png', companionActions: 'dawnweaver-painted.png',
  heroReactions:'hero-painted.png', companionSupport:'dawnweaver-painted.png',
  solActions:'sol-painted.png',
  commonCast:'common-cast.png',gardenCast:'garden-cast.png',causewayCast:'causeway-cast.png',courtCast:'court-cast.png',foundryCast:'foundry-cast.png',observatoryCast:'observatory-cast.png',
  rootBoss:'root-boss.png',bellBoss:'bell-boss.png',crownBoss:'crown-boss.png',furnaceBoss:'furnace-boss.png',constellationBoss:'constellation-boss.png',keepersCast:'keepers-cast.png',radiance:'radiance-effects.png',worldDetails:'world-details.png',openGate:'gateways-open.png',
  heroPortrait:'zeyu-golden.png', companionPortrait:'dawnweaver.png',
  props: 'battlefield-props.png', garden:'garden-floor.png',causeway:'causeway-floor.png',court:'court-floor.png',foundry:'foundry-floor.png',observatory:'observatory-floor.png',
  gardenKit:'garden-kit.png',causewayKit:'causeway-kit.png',courtKit:'court-kit.png',foundryKit:'foundry-kit.png',observatoryKit:'observatory-kit.png'
};
