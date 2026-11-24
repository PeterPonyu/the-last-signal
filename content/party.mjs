// Party tuning: ally health and recovery, how allies fight, and the recruited keepers' roles.
// Owned by the party worker; read by src/game/party.mjs, src/game/ally-ai.mjs and the party renderers.
export const PARTY={
 leash:380,        // a fighting ally never strays farther than this from Zeyu
 engage:420,       // Hollow this close to Zeyu draw the party into a fight
 regroup:160,      // a returning ally may fight again once this close to Zeyu
 calm:2,           // seconds without Hollow near Zeyu before the party regroups
 mendSpill:140,    // allies this close to the one the Dawnweaver mends receive half of the mend
 hitGuard:0.6,     // invulnerability after a hit (seconds)
 // A downed ally returns at half health after `alone` seconds, or after `assisted` seconds with Zeyu
 // standing within `reach`; time beside Zeyu and time alone both count toward the same revive.
 revive:{alone:10,assisted:3,reach:95,health:0.5,guard:1.5,rise:0.45},
 // Below `below` of its health an ally falls back to the formation until it is back to `until`; after
 // `delay` seconds without being hit it recovers `rate` of its maximum health per second.
 rest:{below:0.3,until:0.6,delay:4,rate:0.03},
 health:{companion:160,sol:110},
 difficulty:{easy:1.25,normal:1,hard:0.95}, // ally health by difficulty
 perMap:0.15,      // ally health +15 % per map, keeping pace with the Hollow
 recruitPower:0.12 // recruit damage +12 % per map
};
// Range bands (min, max distance to the target) an engaged ally keeps; `behind` keeps Zeyu between it and the fight.
export const STANCES={
 companion:{band:[220,320],behind:true,speed:255,heroWeight:0.6},
 sol:{band:[55,115],behind:false,speed:280,heroWeight:0.35},
 front:{band:[0.45,0.75],behind:false,speed:240,heroWeight:0.3},
 back:{band:[0.6,0.92],behind:true,speed:240,heroWeight:0.6}
};
// Recruited keepers by body: a short role label, where they stand, and the signature skill every third cast.
// burst: sparks hit Hollow beside the target; heal: mends the most hurt friend; pierce: a bolt through two more;
// twin: two flares at two Hollow; fan: three shards; shield: a ward on the most hurt friend.
export const RECRUIT_ROLES={
 smith:{role:'Forge striker',stance:'front',skill:'burst'},
 keeper:{role:'Seed healer',stance:'back',skill:'heal'},
 engineer:{role:'Signal gunner',stance:'back',skill:'pierce'},
 courier:{role:'Flare scout',stance:'back',skill:'twin'},
 archivist:{role:'Memory caster',stance:'back',skill:'fan'},
 guard:{role:'Shield guard',stance:'front',skill:'shield'}
};
export const ALLY_ROLES={companion:'Support caster',sol:'Fox striker'};
// Skill numbers: burst radius and share, heal amount, shield amount and lifetime, pierce bonus, fan share.
export const RECRUIT_SKILLS={burst:{radius:80,share:0.6},heal:{amount:14},shield:{amount:16,time:5},pierce:{power:1.25,through:2},fan:{share:0.7,spread:0.16},twin:{share:0.85}};
