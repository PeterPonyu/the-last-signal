// Encounter director: authored line-ups per map and stage (content/waves.mjs), authored first
// appearances at freed counts, and the champion, counterattack leader and Warden at their steps.
import {CAMPAIGN,campaignMilestones} from '../../content/campaign.mjs';
import {JOURNEY} from '../../content/journey.mjs';
import {WAVES,TIERS} from '../../content/waves.mjs';

export const waveTable=run=>WAVES[run.areaIndex]||WAVES[0];
export const waveStage=run=>{const table=waveTable(run);return table.stages[Math.max(0,Math.min(run.campaign.stage,table.stages.length-1))];};
// The freed count at which an introduction is due: authored for Normal, scaled to Hard's longer milestones.
export function introAt(run,intro){
 const scale=campaignMilestones(run.areaIndex,run.difficulty).at(-1)/CAMPAIGN[run.areaIndex].milestones.at(-1);
 return Math.round(intro.at*scale);
}
function introduced(run,tier){
 const done=run.campaign.waveIntros||0;
 return (waveTable(run).intros||[]).slice(0,done).some(intro=>intro.slots.includes(tier));
}
// One group: an introduction when due, else any stage moment, the formation and the stage's adds.
function composeGroup(run){
 const c=run.campaign,table=waveTable(run),stage=waveStage(run),intros=table.intros||[],done=c.waveIntros||0;
 let slots,intro=null;
 if(done<intros.length&&c.defeats>=introAt(run,intros[done])){intro=intros[done];slots=[...intro.slots];c.waveIntros=done+1;}
 else{
  const formation=[...(table.formations[c.groupType]||Object.values(table.formations)[0])];
  if(run.difficulty==='easy'&&formation.length>3)formation.pop();
  slots=[...(c.waveMoment||[]),...formation,...stage.adds];c.waveMoment=null;
 }
 if(run.difficulty==='hard')slots.push(table.extra);
 return {slots,intro};
}
export function nextEncounter(run,random){
 const c=run.campaign,rotation=waveStage(run).rotation;
 let index=(c.encounterIndex+++(run.initialSeed%rotation.length))%rotation.length;
 // A stage change can line two formations up; never repeat the previous one.
 if(rotation[index]===c.lastEncounter&&rotation.length>1)index=(index+1)%rotation.length;
 c.groupType=rotation[index];c.lastEncounter=c.groupType;
 const {slots,intro}=composeGroup(run);
 c.groupSlots=slots;c.spawnRemaining=slots.length;
 c.history.push({kind:'encounter',id:c.groupType,time:run.time,...(intro?{intro:intro.slots[0]}:{})});
 // Keep diagnostic history bounded independently of how long a player explores.
 if(c.history.length>150)c.history.splice(c.history.findIndex(e=>e.kind==='encounter'),1);
 c.entryAngle=random()*Math.PI*2;
}
// Resolves one slot token: 'a|b' picks with the seeded stream, regional tiers become the map's roles.
export function resolveSlot(run,token,random){
 const options=String(token).split('|'),pick=options[Math.min(options.length-1,Math.floor(random()*options.length))];
 const tier=TIERS.indexOf(pick);
 if(tier<0)return pick;
 if(run.campaign.stage===0&&!introduced(run,pick))return 'walker';
 return JOURNEY[run.areaIndex].roles[tier];
}
// The role of the next body in the current group (slots spawn in order as spawnRemaining counts down).
export function encounterRole(run,random){
 const c=run.campaign,table=waveTable(run);
 const slots=c.groupSlots?.length?c.groupSlots:[...(table.formations[c.groupType]||Object.values(table.formations)[0]),...waveStage(run).adds];
 const size=slots.length,index=((size-(c.spawnRemaining||0))%size+size)%size;
 return resolveSlot(run,slots[index],random);
}
export function directorStep(run,dt,spawn,random){
 if(run.gateOpen)return;
 const c=run.campaign,cap=run.difficulty==='hard'?60:48,table=waveTable(run);
 run.spawnClock-=dt;
 if(c.waveStage!==c.stage){c.waveStage=c.stage;const moment=table.moments?.[c.stage];if(moment)c.waveMoment=[...moment];}
 if(c.stage>=2&&!c.championSpawned){c.championSpawned=spawn(true,CAMPAIGN[run.areaIndex].champion.role,false,'champion');}
 if(c.stage>=3&&c.championDefeated&&!c.lieutenantSpawned){c.lieutenantSpawned=spawn(false,CAMPAIGN[run.areaIndex].lieutenant,true);}
 if(c.stage>=4&&c.championDefeated&&!run.bossSpawned)run.bossSpawned=spawn(true);
 if(run.spawnClock>0||run.enemies.length>=cap)return;
 if(!c.spawnRemaining)nextEncounter(run,random);
 if(spawn(false,encounterRole(run,random)))c.spawnRemaining--;
 const crisis=run.player.hp<run.player.maxHp*0.25;
 run.spawnClock=c.spawnRemaining>0?table.interval:waveStage(run).gap+(crisis?2:0);
 if(run.difficulty==='hard')run.spawnClock*=0.86;
 if(run.difficulty==='easy')run.spawnClock*=1.08;
 if(run.bossSpawned)run.spawnClock*=1.55;
}
