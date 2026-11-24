// Answers of the Light: the level-up cards and the seeded offer of three. Owned by the answers worker.
// Card: {id,name,text,family,kind,rarity,max,fromMap,icon}; a skill card also names the ability it
// teaches (`skill`), an evolution names the ability it needs (`needs`). fromMap is the map index
// (0..4) from which a card can be offered, so the pool widens map by map. `icon` names an answer-
// screen icon (src/ui/icons.mjs: shard, heart, wind, orbit, chain, comet, ember, split, bloom,
// party) or a battlefield symbol (slash, dash, pulse, sunbreak, lance, shield).
export const UPGRADES=[
 // The original twelve upgrades keep their ids and effects; they are the Common cards.
 {id:'radiance',name:'Radiance',family:'Sunshard',text:'Sunshard damage +28%.',max:3,kind:'stat',rarity:'common',fromMap:0,icon:'shard'},
 {id:'volley',name:'Twin Dawn',family:'Sunshard',text:'Fire a second Sunshard at 55% power.',max:1,kind:'stat',rarity:'common',fromMap:0,icon:'shard'},
 {id:'focus',name:'Far Horizon',family:'Sunshard',text:'Sunshard range +90.',max:2,kind:'stat',rarity:'common',fromMap:0,icon:'shard'},
 {id:'tempo',name:'Quickening Light',family:'Sunshard',text:'Sunshard fire interval −12%.',max:2,kind:'stat',rarity:'common',fromMap:0,icon:'shard'},
 {id:'edge',name:'Golden Edge',family:'Sunblade',text:'Sunblade and Sunbreak power +25%.',max:3,kind:'stat',rarity:'common',fromMap:0,icon:'slash'},
 {id:'cleave',name:'Open Road',family:'Sunblade',text:'Sunblade reach +24 and a wider arc.',max:2,kind:'stat',rarity:'common',fromMap:0,icon:'slash'},
 {id:'flow',name:'Flowing Resolve',family:'Sunblade',text:'Sunblade cooldown −15%; Sunbreak −12%.',max:2,kind:'stat',rarity:'common',fromMap:0,icon:'slash'},
 {id:'finisher',name:'Dawn’s Answer',family:'Sunblade',text:'Sunblade, Sunbreak +40% below half enemy health.',max:1,kind:'stat',rarity:'common',fromMap:0,icon:'sunbreak'},
 {id:'resolve',name:'Resolve',family:'Dawn',text:'Maximum health +20. Heal 45.',max:3,kind:'stat',rarity:'common',fromMap:0,icon:'heart'},
 {id:'stride',name:'Windward Step',family:'Dawn',text:'Move 10% faster; dash cooldown −15%.',max:2,kind:'stat',rarity:'common',fromMap:0,icon:'wind'},
 {id:'ward',name:'Sheltering Light',family:'Dawn',text:'Gain a 22-point shield every 18s.',max:2,kind:'stat',rarity:'common',fromMap:0,icon:'shield'},
 {id:'mend',name:'Shared Dawn',family:'Dawn',text:'Dawnweaver heals 8 more, 3s sooner.',max:2,kind:'stat',rarity:'common',fromMap:0,icon:'bloom'},
 // Active skills are learned only from answers, one more on each of the first three maps.
 {id:'learn-pulse',skill:'pulse',name:'Dawn Pulse',family:'New skill',text:'A burst that hurts Hollow and clears bolts.',max:1,kind:'skill',rarity:'rare',fromMap:0,icon:'pulse'},
 {id:'learn-sunbreak',skill:'sunbreak',name:'Sunbreak',family:'New skill',text:'A heavy cone strike that breaks guards.',max:1,kind:'skill',rarity:'rare',fromMap:1,icon:'sunbreak'},
 {id:'learn-lance',skill:'solarLance',name:'Solar Lance',family:'New skill',text:'A long beam through a line of Hollow.',max:1,kind:'skill',rarity:'rare',fromMap:2,icon:'lance'},
 // Evolutions of the learned skills.
 {id:'wide-dawn',needs:'pulse',name:'Wide Dawn',family:'Dawn Pulse',text:'Dawn Pulse reaches 40% farther.',max:1,kind:'gift',rarity:'rare',fromMap:0,icon:'pulse'},
 {id:'dawn-aegis',needs:'pulse',name:'Dawn Aegis',family:'Dawn Pulse',text:'Dawn Pulse also shields you for 30.',max:1,kind:'gift',rarity:'common',fromMap:1,icon:'shield'},
 {id:'aftershock',needs:'sunbreak',name:'Aftershock',family:'Sunbreak',text:'Sunbreak strikes the same cone again.',max:1,kind:'gift',rarity:'rare',fromMap:1,icon:'sunbreak'},
 {id:'sunscar',needs:'sunbreak',name:'Sunscar',family:'Sunbreak',text:'Sunbreak scorches the ground for 3s.',max:1,kind:'gift',rarity:'radiant',fromMap:3,icon:'ember'},
 {id:'prism',needs:'solarLance',name:'Prism Lance',family:'Solar Lance',text:'Solar Lance splits into three beams.',max:1,kind:'gift',rarity:'radiant',fromMap:2,icon:'lance'},
 {id:'searing-line',needs:'solarLance',name:'Searing Line',family:'Solar Lance',text:'Solar Lance leaves a burning line.',max:1,kind:'gift',rarity:'rare',fromMap:3,icon:'ember'},
 // Passive gifts: no new buttons.
 {id:'orbit',name:'Orbiting Dawn',family:'Sunblade',text:'Blades circle you and cut Hollow.',max:2,kind:'gift',rarity:'rare',fromMap:0,icon:'orbit'},
 {id:'chain',name:'Chain Light',family:'Sunshard',text:'Sunshards jump to another Hollow.',max:2,kind:'gift',rarity:'rare',fromMap:0,icon:'chain'},
 {id:'ember-step',name:'Ember Step',family:'Dash',text:'Dashing leaves a burning trail.',max:1,kind:'gift',rarity:'rare',fromMap:0,icon:'ember'},
 {id:'bloom',name:'Dawn Bloom',family:'Dawn',text:'Freed Hollow may drop healing petals.',max:2,kind:'gift',rarity:'common',fromMap:0,icon:'bloom'},
 {id:'crescent',name:'Crescent Wave',family:'Sunblade',text:'The third Sunblade strike sends a wave.',max:1,kind:'gift',rarity:'rare',fromMap:1,icon:'slash'},
 {id:'halo',name:'Sunlit Halo',family:'Dawn',text:'Each Hollow freed adds 4 shield, max 40.',max:1,kind:'gift',rarity:'common',fromMap:1,icon:'shield'},
 {id:'split',name:'Splitting Shard',family:'Sunshard',text:'Hollow freed by Sunshards burst into three shards.',max:1,kind:'gift',rarity:'rare',fromMap:2,icon:'split'},
 {id:'comet',name:'Comet Call',family:'Sunshard',text:'Every 6s a comet hits the strongest Hollow.',max:1,kind:'gift',rarity:'radiant',fromMap:2,icon:'comet'},
 {id:'mirage',name:'Mirage Step',family:'Dash',text:'Dashing through Hollow cuts them.',max:1,kind:'gift',rarity:'rare',fromMap:3,icon:'dash'},
 {id:'ascendant',name:'Ascendant Dawn',family:'Dawn',text:'All cooldowns recover 25% faster.',max:1,kind:'gift',rarity:'radiant',fromMap:4,icon:'wind'},
 // Party gifts: they act through the hits of the Dawnweaver, Sol and recruits.
 {id:'fox-fire',name:'Fox Fire',family:'Party',text:'Sol’s strikes set Hollow burning.',max:1,kind:'party',rarity:'rare',fromMap:1,icon:'ember'},
 {id:'starthread',name:'Starthread',family:'Party',text:'Allied bolts jump to another Hollow.',max:1,kind:'party',rarity:'rare',fromMap:2,icon:'chain'},
 {id:'kindred',name:'Kindred Light',family:'Party',text:'Allies deal 30% more damage.',max:1,kind:'party',rarity:'radiant',fromMap:3,icon:'party'}
];
// Offer weight of one card: Rare and Radiant cards grow more likely map by map.
export const RARITY_WEIGHTS={common:{base:1,perMap:0},rare:{base:0.6,perMap:0.1},radiant:{base:0.15,perMap:0.1}};
export const ANSWER_THRESHOLDS=[8,22,42,68,100,138,180,230,285,350,425,510,600,700,810,930,1060,1200];
export const UPGRADE_THRESHOLDS=ANSWER_THRESHOLDS;

const OFFER_SIZE=3,BY_ID=new Map(UPGRADES.map(card=>[card.id,card]));
function cardById(id){return BY_ID.get(id)||null;}
// A skill is known unless the run's skill table marks it unknown; synthetic runs know every skill.
export function knowsSkill(run,name){const skills=run?.player?.skills;return !skills||skills[name]!==false;}
export function cardWeight(card,areaIndex=0){const w=RARITY_WEIGHTS[card.rarity]||RARITY_WEIGHTS.common;return w.base+w.perMap*Math.max(0,areaIndex);}
function isEligible(run,card){
 const owned=run?.upgrades?.[card.id]||0,area=run?.areaIndex||0;
 if(owned>=card.max||card.fromMap>area)return false;
 if(card.skill)return !knowsSkill(run,card.skill);
 if(card.needs)return knowsSkill(run,card.needs);
 return true;
}

// The offer stream is its own: a hash of the journey seed, the answer number and the reroll count
// seeds a small generator, so offers never draw from (or disturb) the simulation's random stream.
function mix(...values){
 let h=0x811c9dc5;
 for(const value of values){h=Math.imul(h^(value>>>0),0x01000193)>>>0;h^=h>>>15;h=Math.imul(h,0x2c1b3c6d)>>>0;h^=h>>>12;}
 return h>>>0;
}
function generator(seed){
 let s=seed>>>0;
 return ()=>{s=(s+0x6d2b79f5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
}
function weightedPick(pool,random,area){
 let total=0;for(const card of pool)total+=cardWeight(card,area);
 let roll=random()*total;
 for(const card of pool){roll-=cardWeight(card,area);if(roll<0)return card;}
 return pool[pool.length-1];
}
function offerSeed(run){return mix(run?.initialSeed??run?.seed??0,run?.level||1,run?.answers?.rerolls||0,0xa5a5);}
// Three distinct eligible cards; a skill card first whenever a learnable skill is unknown. After a
// reroll (run.answers.avoid = {level,ids}) the replaced cards are drawn only when nothing else is left.
function drawOffer(run){
 const area=run?.areaIndex||0,random=generator(offerSeed(run)),replaced=run?.answers?.avoid,pool=UPGRADES.filter(card=>isEligible(run,card)),picks=[];
 const avoid=new Set(replaced&&replaced.level===(run?.level||1)?replaced.ids:[]);
 const take=cards=>{const fresh=cards.filter(card=>!avoid.has(card.id)),card=weightedPick(fresh.length?fresh:cards,random,area);picks.push(card);pool.splice(pool.indexOf(card),1);};
 const skills=pool.filter(card=>card.kind==='skill');
 if(skills.length)take(skills);
 while(picks.length<OFFER_SIZE&&pool.length)take(pool);
 for(let i=picks.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[picks[i],picks[j]]=[picks[j],picks[i]];}
 return picks;
}
// The offer belongs to one journey, answer number, reroll count and map.
export function offerKey(run){return [run?.initialSeed??run?.seed??0,run?.level||1,run?.answers?.rerolls||0,run?.areaIndex||0].join(':');}
// The current offer, cached in run.offer ({key,ids}) so repeated calls return the same cards.
export function upgradeChoices(run){
 const key=offerKey(run),cached=run?.offer;
 if(cached?.key===key&&Array.isArray(cached.ids)){
  const cards=cached.ids.map(cardById);
  if(cards.every(card=>card&&isEligible(run,card)))return cards;
 }
 const cards=drawOffer(run);
 if(run)run.offer={key,ids:cards.map(card=>card.id)};
 return cards;
}
