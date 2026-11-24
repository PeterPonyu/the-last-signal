// Enemy gifts (affixes): each map grants its two signature gifts, and every map can grant the
// shared ones. One gift per Hollow; the name is a prefix ("Thorned Thorn Sower") and the hint is
// what the gift does, in the player's terms. Damage values are shares of the bearer's own damage.
// `only` limits who may carry a gift: casters, unguarded, mobile (no packs), or first-born (never a
// summoned or split body).
export const AFFIXES={
  thorned:{name:'Thorned',hint:'Bursts into thorns when freed',color:'#c6e39a',bolts:6,damage:0.5},
  rooted:{name:'Rooted',hint:'Resists shards; dig it out',color:'#a9c97c',speed:0.8,ranged:0.6,still:0.5,mend:0.02},
  echoing:{name:'Echoing',hint:'Repeats each spell as a mark',color:'#8de5e7',only:'casters',delay:0.8,radius:62,bossRadius:80,damage:0.7,warning:0.85},
  hastened:{name:'Hastened',hint:'Moves and strikes faster',color:'#bfe8ff',speed:1.3,bossSpeed:1.12,clocks:0.3},
  nameless:{name:'Nameless',hint:'Fades, then appears beside you',color:'#d3acff',every:5.5,first:2.5,fade:0.5,reach:520,near:110,far:150},
  judged:{name:'Judged',hint:'Returns a bolt for shards',color:'#f0c37b',damage:0.5,every:0.8},
  molten:{name:'Molten',hint:'Drips slag that erupts',color:'#ff9f71',every:3.2,first:1.5,reach:520,radius:46,damage:0.6,warning:1.1},
  forged:{name:'Forged',hint:'Iron guard; break with blades',color:'#cfc6b6',only:'unguarded',health:1.25},
  starbound:{name:'Starbound',hint:'Calls small stars on you',color:'#a7cfff',every:6,bossEvery:7.5,first:3,reach:560,radius:58,damage:0.8,warning:1.25},
  eclipsed:{name:'Eclipsed',hint:'Shields nearby Hollow; free it first',color:'#9b88d6',reach:200,guard:0.65},
  stalwart:{name:'Stalwart',hint:'Larger and much tougher',color:'#e6d6ae',health:1.6,radius:1.12,speed:0.9},
  frenzied:{name:'Frenzied',hint:'Rages when badly hurt',color:'#ff8f7a',below:0.4,speed:1.45,clocks:0.5},
  splitting:{name:'Splitting',hint:'Splits in two when freed',color:'#b9e6c9',only:'firstborn',count:2,role:'pack',spread:40,arrive:0.3}
};
// Signature gifts by map, then the shared ones every map can grant.
export const MAP_AFFIXES=[['thorned','rooted'],['echoing','hastened'],['nameless','judged'],['molten','forged'],['starbound','eclipsed']];
export const SHARED_AFFIXES=['stalwart','frenzied','splitting'];
// Chance per spawn = base[map] + perStage[map] * stage (from stage `start[map]`), times the difficulty
// factor; `signature` is the share of gifts drawn from the map's own pair.
export const AFFIX_CHANCE={start:[1,0,0,0,0],base:[0.02,0.08,0.12,0.16,0.2],perStage:[0.035,0.035,0.04,0.045,0.05],signature:0.7,difficulty:{easy:0.6,normal:1,hard:1.15}};
// Bosses carry at most one gift, only one that leaves their guard, phases, damage taken and casts intact.
export const BOSS_AFFIXES={safe:['hastened','echoing','molten','starbound'],champion:[0,0.35,0.45,0.55,0.65],warden:[0,0,0,0.4,0.5]};
