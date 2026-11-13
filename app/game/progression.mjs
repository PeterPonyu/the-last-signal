import {CAMPAIGN,campaignMilestones,NPC_COMBAT} from '../../content/campaign.mjs';
import {AREAS} from '../../content/game.mjs';
import {distance,moveBody,navigationField,directionTo} from './geometry.mjs';
import {moveAlly,resetAllyMotion} from './ally-ai.mjs';

export function createCampaignArea(run){
 const def=CAMPAIGN[run.areaIndex],seed=(run.initialSeed+run.areaIndex*17)>>>0;
 const routes=def.routes.map((r,i)=>({...r,...r.sites[(seed+i)%r.sites.length],status:'locked',progress:0,completed:false,failures:0}));
 const barriers=Array.from({length:4},(_,i)=>({x:1960,y:1080+i*75,radius:34,type:2,height:100,barrier:true}));
 const obstacles=[...AREAS[run.areaIndex].obstacles,...barriers];
 return {barriers,obstacles,npcNavigation:navigationField(obstacles,def.hub),eventNavigation:navigationField(obstacles,def.arena),changedAt:0,areaIndex:run.areaIndex,defeats:0,stage:0,milestones:[],choice:null,routes,event:{...def.hub,progress:0,complete:false},lieutenantSpawned:false,lieutenantDefeated:false,bossPhases:[],bossDistance:0,history:[],lastEncounter:null,encounterIndex:0,spawnRemaining:0,groupType:'pursuit',heavyClock:0,npcs:def.npcs.map((npc,i)=>({...npc,body:i?npc.body:npc.id,...(i?{x:routes[i-1].x,y:routes[i-1].y,hp:NPC_COMBAT[npc.body].health,maxHp:NPC_COMBAT[npc.body].health,state:'waiting',invulnerable:0,hit:0,cast:0,fireClock:0.6,shield:0,shieldTime:0,respawnIn:0}:{}),homeX:i?routes[i-1].x:npc.x,homeY:i?routes[i-1].y:npc.y,faceX:1,met:false,walkPhase:0,moving:false})),notice:def.messages[0],noticeUntil:12};
}
export function campaignNotice(run,text){run.campaign.notice=text;run.campaign.noticeUntil=run.time+9;}
export function creditDefeat(run,enemy){
 if(enemy.storyCredit===false)return;
 const c=run.campaign;c.defeats++;
 if(enemy.lieutenant)c.lieutenantDefeated=true;
 for(const [index,count] of campaignMilestones(run.areaIndex,run.difficulty).entries())if(c.defeats>=count&&!c.milestones.includes(count)){
  c.milestones.push(count);c.history.push({kind:'milestone',count,time:run.time});run.events.push('milestone');
  campaignNotice(run,index===0?CAMPAIGN[run.areaIndex].messages[1]:count+' Hollow freed. Your next encounter is ready.');
 }
}
export function areaObstacles(run){return run.campaign?.areaIndex===run.areaIndex?run.campaign.obstacles:AREAS[run.areaIndex].obstacles;}
export function chooseRoute(run,id){
 const c=run.campaign,r=c.routes.find(r=>r.id===id);
 if(!r||!['available','retry'].includes(r.status)||r.completed||distance(run.player,r)>130)return false;
 if(!c.choice){c.choice=id;c.history.push({kind:'choice',id,time:run.time});run.routeChoices[run.areaIndex]=id;}
 r.status='active';const npc=c.npcs.find(n=>n.id===r.npc);Object.assign(npc,{met:true,state:'active',hp:npc.maxHp,invulnerable:1.5,cast:0,fireClock:0.6,shield:0,shieldTime:0});resetAllyMotion(npc);
 campaignNotice(run,'Protect '+npc.name+' while '+(r.kind==='repair'?'they repair the mechanism.':'you escort them to the gathering.')+' E shields nearby keepers; Dawnweaver can heal them. If captured, they return here and this mission restarts with F.');return true;
}
export function failRoute(run,npc){
 const c=run.campaign,route=c.routes.find(r=>r.npc===npc.id);
 if(!route||route.status!=='active'||route.completed)return false;
 route.status='recovering';route.progress=0;route.failures++;npc.state='captured';npc.hp=0;npc.cast=0;npc.respawnIn=3;npc.shield=0;resetAllyMotion(npc);
 run.stats.npcDefeats++;c.history.push({kind:'route-failed',id:route.id,time:run.time});run.events.push('npc-captured');
 campaignNotice(run,npc.name+' was overcome by the Hollow. They will return to their starting point. Return and press F to try again.');return true;
}
function finishRoute(run,route){
 if(route.completed)return;
 route.completed=true;route.status='complete';route.progress=1;
 const c=run.campaign,npc=c.npcs.find(n=>n.id===route.npc);npc.state='safe';npc.cast=0;resetAllyMotion(npc);c.history.push({kind:'route-complete',id:route.id,time:run.time});
 if(!run.rewards.includes(route.reward)){
  run.rewards.push(route.reward);
  if(route.reward==='forge')run.player.bladePower+=0.18;
  if(route.reward==='grove')run.player.maxHp+=12;
  if(route.reward==='courier')run.player.speed*=1.05;
  if(route.reward==='memory')run.player.damage*=1.12;
  if(route.reward==='cover'||route.reward==='guard')run.player.armor+=0.06;
 }
 run.player.hp=Math.min(run.player.maxHp,run.player.hp+28);campaignNotice(run,route.story);run.events.push('route-complete');
}
export function updateProgression(run,dt){
 const c=run.campaign,def=CAMPAIGN[run.areaIndex],p=run.player;
 c.heavyClock=Math.max(0,c.heavyClock-dt);
 if(c.milestones.length>0)for(const r of c.routes)if(r.status==='locked')r.status='available';
 for(const route of c.routes){
  const npc=c.npcs.find(n=>n.id===route.npc);if(!npc.evading)npc.moving=false;
  if(route.status==='recovering'){
   npc.respawnIn=Math.max(0,npc.respawnIn-dt);
   if(npc.respawnIn===0){Object.assign(npc,{x:npc.homeX,y:npc.homeY,hp:npc.maxHp,state:'waiting',hit:0,invulnerable:0,cast:0,shield:0,shieldTime:0});resetAllyMotion(npc);route.status='retry';campaignNotice(run,npc.name+' is back at '+route.name+'. Press F there to restart. Your other progress is kept.');}
  }
  if(route.status==='active'&&npc.hp>0){
   if(route.kind==='repair'){
    if(!npc.evading&&npc.cast<=0){
     if(distance(npc,route)>30)moveAlly(npc,route,c.obstacles,dt,{speed:95,start:30,stop:20});
     if(distance(p,route)<135&&distance(npc,route)<100)route.progress=Math.min(1,route.progress+dt/18);
    }
   }else{
    const d=distance(npc,def.hub);
    if(distance(p,npc)<240&&d>30&&npc.cast<=0&&!npc.evading)moveAlly(npc,def.hub,c.obstacles,dt,{speed:95,start:32,stop:25});
    route.progress=Math.max(route.progress,1-Math.min(1,d/Math.max(1,distance({x:npc.homeX,y:npc.homeY},def.hub))));
    if(d<45)route.progress=1;
   }
   if(route.progress>=1)finishRoute(run,route);
  }
  if(route.completed&&route.kind==='repair'&&distance(npc,def.hub)>50&&distance(p,npc)<500)moveAlly(npc,def.hub,c.obstacles,dt,{speed:60,start:50,stop:40});
 }
 const selected=c.routes.find(r=>r.id===c.choice),previous=c.stage;
 if(c.milestones.length)c.stage=Math.max(c.stage,1);
 if(c.milestones.length>=2&&selected?.completed)c.stage=Math.max(c.stage,2);
 if(c.stage>=2&&!c.event.complete){
  const event=c.event;
  if(def.event.kind==='convoy'){
   const target=def.arena,d=distance(event,target);
   if(distance(p,event)<230&&d>25){const step=Math.min(48*dt,d);const dir=directionTo(event,target,c.obstacles,c.eventNavigation);moveBody(event,dir.x*step,dir.y*step,c.obstacles,20);event.progress=Math.max(event.progress,1-d/Math.max(1,distance(def.hub,target)));}
   if(d<35)event.complete=true;
  }else if(distance(p,event)<155){event.progress=Math.min(1,event.progress+dt/def.event.duration);event.complete=event.progress===1;}
  if(event.complete){event.progress=1;c.history.push({kind:'event-complete',time:run.time});campaignNotice(run,'The gathering is safe. Defeat the counterattack and its keeper.');run.events.push('event-complete');}
 }
 if(c.milestones.length>=3&&c.event.complete)c.stage=Math.max(c.stage,3);
 if(c.milestones.length===4&&c.lieutenantDefeated)c.stage=Math.max(c.stage,4);
 if(run.gateOpen)c.stage=5;
 if(c.stage!==previous){if(run.areaIndex===2&&c.stage>=2&&!c.visitorsArrived){c.visitorsArrived=true;for(let i=0;i<2;i++){const road=CAMPAIGN[i].routes.find(r=>r.id===run.routeChoices[i]);if(road){const npc=CAMPAIGN[i].npcs.find(n=>n.id===road.npc);c.npcs.push({...npc,x:def.hub.x-120+i*240,y:def.hub.y+115,met:false,moving:false,walkPhase:0,text:npc.name+' reached the Court because you opened '+road.name+'. Time and voice now belong to the people gathered here.'});}}}c.changedAt=run.time;campaignNotice(run,def.messages[Math.min(c.stage,4)]);if(c.stage>=2&&c.barriers.length){c.barriers=[];c.obstacles=[...AREAS[run.areaIndex].obstacles];c.npcNavigation=navigationField(c.obstacles,def.hub);c.eventNavigation=navigationField(c.obstacles,def.arena);run.navClock=0;}c.history.push({kind:'stage',stage:c.stage,time:run.time});run.events.push('stage');}
}
export function campaignTarget(run){
 const c=run.campaign,def=CAMPAIGN[run.areaIndex];
 if(run.gateOpen)return null;
 const boss=run.enemies.find(e=>e.boss&&e.hp>0);if(boss)return {...boss,kind:'boss',label:AREAS[run.areaIndex].boss};
 const lieutenant=run.enemies.find(e=>e.lieutenant&&e.hp>0);if(lieutenant)return {...lieutenant,kind:'boss',label:'Counterattack keeper'};
 const route=c.routes.find(r=>r.id===c.choice);
 if(c.stage===1&&!route)return {...c.routes[0],kind:'route',label:'Choose a road · F'};
 if(route&&!route.completed){const npc=c.npcs.find(n=>n.id===route.npc);return {...(route.kind==='escort'&&route.status==='active'?npc:route),kind:'route',label:route.status==='retry'?'Restart '+npc.name+'’s mission · F':route.status==='recovering'?npc.name+' is returning':route.verb};}
 if(c.stage>=2&&!c.event.complete)return {...c.event,kind:'event',label:def.event.name};
 return {...(c.stage>=2?def.arena:c.stage===1?def.hub:AREAS[run.areaIndex].spawn),kind:'battle',label:'Free the Hollow'};
}
export function campaignObjective(run){
 const c=run.campaign,def=CAMPAIGN[run.areaIndex],milestones=campaignMilestones(run.areaIndex,run.difficulty),next=milestones.find(n=>n>c.defeats)||milestones.at(-1);
 if(c.stage===0)return `Free the Hollow · ${c.defeats} / ${next} · Two roads will awaken`;
 if(!c.choice)return `Choose a road · ${def.routes.map(r=>r.name).join(' or ')} · F`;
 const route=c.routes.find(r=>r.id===c.choice);
 if(!route.completed){const npc=c.npcs.find(n=>n.id===route.npc);if(route.status==='recovering')return `${npc.name} was captured · Returning in ${Math.ceil(npc.respawnIn)}s`;if(route.status==='retry')return `Return to ${route.name} · Restart ${npc.name}’s mission · F`;return `${route.verb} · ${Math.floor(route.progress*100)}% · Protect ${npc.name}: ${Math.ceil(npc.hp)} / ${npc.maxHp}`;}
 if(c.stage>=2&&!c.event.complete)return `${def.event.name} · ${Math.floor(c.event.progress*100)}% · Stay nearby`;
 if(run.bossSpawned)return `Defeat ${AREAS[run.areaIndex].boss} · Read its next move`;
 if(c.stage>=3&&!c.lieutenantDefeated)return 'Break the counterattack keeper · '+c.defeats+' freed';
 return `Free the Hollow · ${c.defeats} / ${next} · ${['Discovery','Resistance','Counterattack','The final seal','Warden'][c.stage]}`;
}
