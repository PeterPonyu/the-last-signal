import {CAMPAIGN} from '../../content/campaign.mjs';
import {JOURNEY} from '../../content/journey.mjs';

const formations=['pursuit','flank','guarded','support'];
export function nextEncounter(run,random){
 const c=run.campaign,stage=Math.min(c.stage,3),index=(c.encounterIndex+++(run.initialSeed%4))%formations.length;
 c.groupType=formations[index];c.lastEncounter=c.groupType;
 c.spawnRemaining=3+stage+(run.difficulty==='hard'?2:0);
 c.history.push({kind:'encounter',id:c.groupType,time:run.time});
 // Keep diagnostic history bounded independently of how long a player explores.
 if(c.history.length>150)c.history.splice(c.history.findIndex(e=>e.kind==='encounter'),1);
 c.entryAngle=random()*Math.PI*2;
}
export function encounterRole(run,random){
 const c=run.campaign,roll=random(),regional=JOURNEY[run.areaIndex].roles;
 if(c.stage>0&&roll>0.57)return regional[(c.encounterIndex+c.spawnRemaining)%regional.length];
 if(c.groupType==='flank')return roll<0.5?'skirmisher':'runner';
 if(c.groupType==='guarded')return roll<0.4?'sentinel':'walker';
 if(c.groupType==='support')return roll<0.3?'cantor':roll<0.65?'pack':'walker';
 return roll<0.25?'pack':roll<0.5?'runner':'walker';
}
export function directorStep(run,dt,spawn,random){
 if(run.gateOpen)return;
 const c=run.campaign,cap=run.difficulty==='hard'?60:48;
 run.spawnClock-=dt;
 if(c.stage>=2&&!c.championSpawned){c.championSpawned=spawn(true,CAMPAIGN[run.areaIndex].champion.role,false,'champion');}
 if(c.stage>=3&&c.championDefeated&&!c.lieutenantSpawned){c.lieutenantSpawned=spawn(false,CAMPAIGN[run.areaIndex].lieutenant,true);}
 if(c.stage>=4&&c.championDefeated&&!run.bossSpawned)run.bossSpawned=spawn(true);
 if(run.spawnClock>0||run.enemies.length>=cap)return;
 if(!c.spawnRemaining)nextEncounter(run,random);
 if(spawn(false,encounterRole(run,random)))c.spawnRemaining--;
 const crisis=run.player.hp<run.player.maxHp*0.25;
 run.spawnClock=c.spawnRemaining>0?0.42:Math.max(2.5,5.8-c.stage*0.5)+(crisis?2:0);
 if(run.difficulty==='hard')run.spawnClock*=0.86;
 if(run.difficulty==='easy')run.spawnClock*=1.08;
 if(run.bossSpawned)run.spawnClock*=1.55;
}
