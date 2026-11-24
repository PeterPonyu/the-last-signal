// What the HUD shows about the party, the map rule, enemy gifts and learned skills.
// These read the feature modules' data defensively: fields may be missing on older runs
// and in tests that build synthetic objects.
import {allyName} from '../game/party.mjs';
import {CAMPAIGN} from '../../content/campaign.mjs';
import * as worldContent from '../../content/environment.mjs';
import {hasIcon,RULE_ICONS} from './icons.mjs';

const fraction=(value,max)=>Number.isFinite(value)&&Number.isFinite(max)&&max>0?Math.max(0,Math.min(1,value/max)):null;
const KIND_COLORS={companion:'#d8edff',sol:'#ffba65',recruit:'#bfe3c4'};
// A recruited keeper wears the colour of the road where you saved them.
function recruitColor(ally){
  const id=ally?.keeperId||ally?.npc||ally?.keeper||ally?.id;
  for(const area of CAMPAIGN)for(const route of area.routes)if(route.npc===id)return route.color;
  return KIND_COLORS.recruit;
}
function allyKind(ally){return ['companion','sol','recruit'].includes(ally?.kind)?ally.kind:ally?.id==='sol'?'sol':ally?.id==='dawnweaver'?'companion':'recruit';}
// Allies currently with the party (Sol only once active), in party order.
export function partyAllies(run){
  const list=Array.isArray(run?.party)?run.party:[run?.companion,run?.sol];
  return list.filter(ally=>ally&&typeof ally==='object'&&ally.active!==false);
}
// Seconds until a downed ally stands again, when the party data tells us.
export function downSeconds(ally){
  if(!ally?.downed)return null;
  for(const key of ['downTime','reviveIn','downFor'])if(Number.isFinite(ally[key]))return Math.max(0,Math.ceil(ally[key]));
  return null;
}
export function rosterView(run){
  return partyAllies(run).map((ally,index)=>{
    const kind=allyKind(ally),name=allyName(ally);
    const hp=fraction(ally.hp,ally.maxHp),shield=Number(ally.shield)>0?fraction(ally.shield,ally.maxHp)??0:0;
    const busy=['cast','mend','nova','volley','pounce','ward','attack'].some(key=>Number(ally[key])>0);
    const revive=ally.downed&&Number.isFinite(ally.revive)?Math.max(0,Math.min(1,ally.revive)):0;
    return {id:String(ally.id??kind+index),kind,name,color:kind==='recruit'?recruitColor(ally):KIND_COLORS[kind],hp,shield,downed:!!ally.downed,seconds:downSeconds(ally),revive,assisted:!!ally.downed&&!!ally.assisted,busy};
  });
}
// The first letter (English) or character (Chinese) of a translated name.
export function initialOf(name){const first=[...String(name).replace(/^(the|der|die|la|le)\s+/i,'').trim()][0];return first?first.toUpperCase():'?';}

// Party changes since the last look: who joined (first time this run), who fell, who stood up.
// A new map resets the down/up comparison so the party standing up at the start is not news.
export function createPartyWatch(){
  let area=null,previous=new Map();const seen=new Set();
  return {
    reset(run){area=run?run.areaIndex:null;previous=new Map();seen.clear();if(run)for(const ally of rosterView(run)){seen.add(ally.id);previous.set(ally.id,ally.downed);}},
    changes(run){
      const roster=rosterView(run),joined=[],down=[],up=[],sameMap=run.areaIndex===area;
      for(const ally of roster){
        if(!seen.has(ally.id)){seen.add(ally.id);joined.push(ally);}
        else if(sameMap&&previous.has(ally.id)){const was=previous.get(ally.id);if(ally.downed&&!was)down.push(ally);if(!ally.downed&&was)up.push(ally);}
      }
      area=run.areaIndex;previous=new Map(roster.map(ally=>[ally.id,ally.downed]));
      return {joined,down,up};
    }
  };
}

// The map-rule chip: icon, short name and whose side the rule is on. The rule's own icon (drawn in
// its map's accent) comes from the map-rule content; the page's icons stand in when it has none.
const RULE_PATTERNS=[[/root/i,'roots'],[/echo|bell|toll/i,'echo'],[/still|column/i,'stillness'],[/heat|furnace|vent|ember/i,'heat'],[/star/i,'stars']];
const text=value=>typeof value==='string'?value:'';
export function ruleView(status,areaIndex=0){
  if(!status||typeof status!=='object'||typeof status.name!=='string'||!status.name)return null;
  const art=worldContent.RULE_ICONS?.[status.icon];
  const byId=RULE_PATTERNS.find(([pattern])=>pattern.test(String(status.id??'')))?.[1];
  const icon=hasIcon(art?.path)?art.path:[status.icon,byId,RULE_ICONS[areaIndex]].find(hasIcon)||'roots';
  const color=typeof art?.color==='string'&&/^#[0-9a-f]{3,8}$/i.test(art.color)?art.color:'';
  return {id:String(status.id??''),name:status.name,text:text(status.text),flip:text(status.flip),phase:status.phase==='kind'?'kind':'hostile',icon,color};
}

// An enemy's gifts: one id (enemy.affix) or a list (enemy.affixes).
export const giftsOf=enemy=>[...(typeof enemy?.affix==='string'?[enemy.affix]:[]),...(Array.isArray(enemy?.affixes)?enemy.affixes.filter(id=>typeof id==='string'):[])];
// Enemy gifts the player has not seen yet: gifted Hollow inside the view, one report per gift.
export function sightAffixes(run,seen,inView=()=>true){
  const found=[];
  for(const enemy of run?.enemies||[]){
    if(!(enemy?.hp>0)||enemy.warning>0||!inView(enemy))continue;
    for(const id of giftsOf(enemy))if(!seen.has(id)){seen.add(id);found.push({id,enemy});}
  }
  return found;
}
// The banner for a first sighting: "Thorned Thorn Sower · Bursts into thorns when freed" when the
// name and the gift's hint fit one glance (8 words, 16 Chinese characters); else just the name.
const words=value=>value.replace(/·/g,' ').trim().split(/\s+/).filter(word=>/[\p{L}\p{N}]/u.test(word)).length;
const zhLength=value=>(value.match(/[\u3000-\u303f\u3400-\u9fff\uff00-\uffef]/g)||[]).length;
export function fitsBanner(value){return words(value)<=8&&zhLength(value)<=16;}

// Skills that come from upgrades; the rest are known from the start.
export const LEARNABLE=['pulse','sunbreak','solarLance'];
export function learnedSkills(run,knows){return LEARNABLE.filter(name=>{try{return !!knows(run,name);}catch{return true;}});}
