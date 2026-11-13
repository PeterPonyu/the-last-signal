export const WORLD = { width: 3600, height: 2400, left: 65, right: 3535, top: 75, bottom: 2340 };

export const DIFFICULTIES = {
  easy: { name: 'Dawn', label: 'Easy', description: 'Room to learn. Longer warnings, gentler attacks, more healing.', health: 160, damage: 0.65, enemyHealth: 0.85, speed: 0.88, pressure: 0.75, warning: 1.3, heal: 24 },
  normal: { name: 'Resolve', label: 'Normal', description: 'The intended first challenge. Move, use cover, and weave your powers.', health: 120, damage: 1, enemyHealth: 1, speed: 1, pressure: 1, warning: 1, heal: 18 },
  hard: { name: 'Defiance', label: 'Hard', description: 'Denser waves, faster pursuit, stronger Wardens. Every opening matters.', health: 100, damage: 1.4, enemyHealth: 1.22, speed: 1.13, pressure: 1.35, warning: 0.82, heal: 14 }
};

const prop = (x, y, type, radius, height) => ({ x, y, type, radius, height });
export const AREAS = [
  { id: 'garden', name: 'The Sunken Garden', chapter: 'I', subtitle: 'Learn to make a road.', art: 'battlefield-garden.png', boss: 'The Root Warden', bossAt: 38, bossHealth: 480,
    intro: 'Three dormant beacons still remember the sun. Stand in their circles to kindle them. The garden will answer with its Warden.',
    outro: 'Roots loosen their hold on the stones. A small mechanical fox wakes inside the beacon: Sol, the smallest sun. The Dawnweaver kneels beside the first living flower. “It was waiting for someone to try.”',
    spawn: {x:650,y:1550},
    districts: [{x:720,y:1480,name:'Pilgrim’s Approach'},{x:1800,y:650,name:'The Root Archive'},{x:2920,y:1710,name:'Orchard of First Light'}],
    lanterns: [{x:850,y:1480},{x:1910,y:650},{x:3040,y:1710}],
    beacons: [{x:720,y:1480},{x:1800,y:650},{x:2920,y:1710}],
    obstacles: [prop(550,500,0,34,142),prop(620,590,1,40,118),prop(590,300,2,38,134),prop(1010,430,0,34,142),prop(1090,530,1,40,118),prop(850,730,3,36,110),prop(1280,270,2,34,125),prop(320,340,1,36,108)],
    decorations: [prop(200,220,6,0,85),prop(410,780,6,0,90),prop(1030,760,7,0,95),prop(1400,400,6,0,90),prop(700,200,7,0,95)] },
  { id: 'causeway', name: 'The Echo Causeway', chapter: 'II', subtitle: 'Find shelter. Refuse the echo.', art: 'battlefield-causeway.png', boss: 'The Bell Warden', bossAt: 43, bossHealth: 720,
    intro: 'The Choir has learned to strike from afar. Stone breaks its bolts. Keep moving when a teal mark gathers beneath your feet.',
    outro: 'The bell cracks. For a moment the city hears silence without an order inside it. Ahead, the court is burning gold.',
    spawn: {x:650,y:1550},
    districts: [{x:780,y:650,name:'The West Bell'},{x:1840,y:1800,name:'The Broken Procession'},{x:2940,y:760,name:'The Far Crossing'}],
    lanterns: [{x:900,y:650},{x:1960,y:1800},{x:3060,y:760}],
    beacons: [{x:780,y:650},{x:1840,y:1800},{x:2940,y:760}],
    obstacles: [prop(520,300,3,42,125),prop(540,410,0,35,150),prop(530,650,3,42,125),prop(780,480,1,42,125),prop(1050,310,0,36,150),prop(1080,620,3,42,125),prop(1190,700,1,38,115),prop(300,740,0,32,135)],
    decorations: [prop(220,420,7,0,95),prop(680,230,7,0,95),prop(1370,740,7,0,95),prop(950,830,6,0,75)] },
  { id: 'court', name: 'The Hollow Sun Court', chapter: 'III', subtitle: 'Choose who the dawn belongs to.', art: 'battlefield-court.png', boss: 'The Crown of Stillness', bossAt: 48, bossHealth: 1050,
    intro: 'This is the Choir’s last seal. Three beacons will call its crown down to earth. Read the rings, shelter from its volleys, and keep a path open.',
    outro: 'The crown falls. Zeyu opens his hand instead of closing it around the sun. A thousand small lights answer. The Dawnweaver smiles: “Now the road belongs to everyone.”',
    spawn: {x:650,y:1550},
    districts: [{x:790,y:1670,name:'The Refusing Steps'},{x:1760,y:650,name:'Court of Unspoken Names'},{x:2920,y:1650,name:'The Crown’s Horizon'}],
    lanterns: [{x:910,y:1670},{x:1880,y:650},{x:3040,y:1650}],
    beacons: [{x:790,y:1670},{x:1760,y:650},{x:2920,y:1650}],
    obstacles: [prop(490,370,0,38,160),prop(620,680,1,42,125),prop(1010,360,0,38,160),prop(1120,700,1,42,125),prop(800,500,3,40,120),prop(270,430,2,34,125),prop(1380,400,3,40,120)],
    decorations: [prop(220,760,7,0,105),prop(690,180,7,0,105),prop(1450,750,7,0,105),prop(980,830,7,0,105)] }
];


// Scenery keeps its physical scale; districts add cover along the longer roads.
for (const area of AREAS) {
  for (const [i, district] of area.districts.entries()) {
    for (const [j, [dx, dy]] of [[-240,-190],[240,-170],[-230,220],[240,220]].entries()) {
      area.obstacles.push(prop(district.x+dx,district.y+dy,(i+j)%4,34+(j%2)*6,125+(j%2)*20));
    }
    area.decorations.push(prop(district.x-175,district.y+70,6,0,85),prop(district.x+170,district.y-100,7,0,95));
  }
  area.obstacles.push(prop(1370,1250,3,45,135),prop(2190,1170,0,38,150),prop(2430,1470,1,43,120),prop(2210,2080,2,38,138));
}

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
  nurture: {amount:18, range:230, recipientCooldown:4},
  hurt: {duration:0.28}, death: {duration:0.8},
  charge: {windup:0.8, duration:0.42, recovery:0.65}
};

export const ASSETS = {
  guideActions:'road-guides.png',
  heroActions: 'hero-painted.png', companionActions: 'dawnweaver-painted.png',
  heroReactions:'hero-painted.png', companionSupport:'dawnweaver-painted.png',
  solActions:'sol-painted.png',
  commonCast:'common-cast.png',gardenCast:'garden-cast.png',causewayCast:'causeway-cast.png',courtCast:'court-cast.png',
  rootBoss:'root-boss.png',bellBoss:'bell-boss.png',crownBoss:'crown-boss.png',keepersCast:'keepers-cast.png',radiance:'radiance-effects.png',worldDetails:'world-details.png',openGate:'gateways-open.png',
  heroPortrait:'zeyu-golden.png', companionPortrait:'dawnweaver.png',
  props: 'battlefield-props.png', garden:'garden-floor.png',causeway:'causeway-floor.png',court:'court-floor.png'
};
