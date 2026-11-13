import {CAMPAIGN} from '../../content/campaign.mjs';
import {AREAS} from '../../content/game.mjs';
import {distance,moveBody,navigationField,directionTo} from './geometry.mjs';

export function createCampaignArea(run){
 const def=CAMPAIGN[run.areaIndex],seed=(run.initialSeed+run.areaIndex*17)>>>0;
 const routes=def.routes.map((r,i)=>({...r,...r.sites[(seed+i)%r.sites.length],status:'locked',progress:0,completed:false}));
 const barriers=Array.from({length:4},(_,i)=>({x:1960,y:1080+i*75,radius:34,type:2,height:100,barrier:true}));
 const obstacles=[...AREAS[run.areaIndex].obstacles,...barriers];
 return {barriers,obstacles,npcNavigation:navigationField(obstacles,def.hub),eventNavigation:navigationField(obstacles,def.arena),changedAt:0,areaIndex:run.areaIndex,defeats:0,stage:0,milestones:[],choice:null,routes,event:{...def.hub,progress:0,complete:false},lieutenantSpawned:false,lieutenantDefeated:false,bossPhases:[],bossDistance:0,history:[],lastEncounter:null,encounterIndex:0,spawnRemaining:0,groupType:'pursuit',heavyClock:0,npcs:def.npcs.map((npc,i)=>({...npc,body:i?npc.body:npc.id,...(i?{x:routes[i-1].x,y:routes[i-1].y}:{}),homeX:i?routes[i-1].x:npc.x,homeY:i?routes[i-1].y:npc.y,met:false,walkPhase:0,moving:false})),notice:def.messages[0],noticeUntil:12};
}
export function campaignNotice(run,text){run.campaign.notice=text;run.campaign.noticeUntil=run.time+9;}
export function creditDefeat(run,enemy){
 if(enemy.storyCredit===false)return;
 const c=run.campaign;c.defeats++;
 if(enemy.lieutenant)c.lieutenantDefeated=true;
 for(const [index,count] of CAMPAIGN[run.areaIndex].milestones.entries())if(c.defeats>=count&&!c.milestones.includes(count)){
  c.milestones.push(count);c.history.push({kind:'milestone',count,time:run.time});run.events.push('milestone');
  campaignNotice(run,index===0?CAMPAIGN[run.areaIndex].messages[1]:count+' Hollow freed. Your next encounter is ready.');
 }
}
export function areaObstacles(run){return run.campaign?.areaIndex===run.areaIndex?run.campaign.obstacles:AREAS[run.areaIndex].obstacles;}
export function chooseRoute(run,id){
 const c=run.campaign,r=c.routes.find(r=>r.id===id);
 if(!r||r.status==='locked'||r.completed||distance(run.player,r)>130)return false;
 if(!c.choice){c.choice=id;c.history.push({kind:'choice',id,time:run.time});run.routeChoices[run.areaIndex]=id;}
 r.status='active';const npc=c.npcs.find(n=>n.id===r.npc);npc.met=true;
 campaignNotice(run,r.kind==='repair'?'Stay inside the work circle while '+npc.name+' repairs the mechanism.':'Stay close to '+npc.name+' and escort them to the golden gathering point.');return true;
}
function finishRoute(run,route){
 if(route.completed)return;
 route.completed=true;route.status='complete';route.progress=1;
 const c=run.campaign;c.history.push({kind:'route-complete',id:route.id,time:run.time});
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
  const npc=c.npcs.find(n=>n.id===route.npc);npc.moving=false;
  if(route.status==='active'){
   if(route.kind==='repair'){
    if(distance(p,route)<135)route.progress=Math.min(1,route.progress+dt/18);
   }else{
    const d=distance(npc,def.hub);
    if(distance(p,npc)<240&&d>30){const step=Math.min(75*dt,d);const dir=directionTo(npc,def.hub,c.obstacles,c.npcNavigation);moveBody(npc,dir.x*step,dir.y*step,c.obstacles,16);npc.walkPhase+=dt*7;npc.moving=true;}
    route.progress=Math.max(route.progress,1-Math.min(1,d/Math.max(1,distance({x:npc.homeX,y:npc.homeY},def.hub))));
    if(d<45)route.progress=1;
   }
   if(route.progress>=1)finishRoute(run,route);
  }
  if(route.completed&&route.kind==='repair'&&distance(npc,def.hub)>50){const d=distance(npc,def.hub);if(distance(p,npc)<500){const dir=directionTo(npc,def.hub,c.obstacles,c.npcNavigation);moveBody(npc,dir.x*60*dt,dir.y*60*dt,c.obstacles,16);npc.walkPhase+=dt*5;npc.moving=true;}}
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
 if(route&&!route.completed){const npc=c.npcs.find(n=>n.id===route.npc);return {...(route.kind==='escort'&&route.status==='active'?npc:route),kind:'route',label:route.verb};}
 if(c.stage>=2&&!c.event.complete)return {...c.event,kind:'event',label:def.event.name};
 return {...(c.stage>=2?def.arena:c.stage===1?def.hub:AREAS[run.areaIndex].spawn),kind:'battle',label:'Free the Hollow'};
}
export function campaignObjective(run){
 const c=run.campaign,def=CAMPAIGN[run.areaIndex],next=def.milestones.find(n=>n>c.defeats)||def.milestones.at(-1);
 if(c.stage===0)return `Free the Hollow · ${c.defeats} / ${next} · Two roads will awaken`;
 if(!c.choice)return `Choose a road · ${def.routes.map(r=>r.name).join(' or ')} · F`;
 const route=c.routes.find(r=>r.id===c.choice);
 if(!route.completed)return `${route.verb} · ${Math.floor(route.progress*100)}% · ${c.defeats} freed`;
 if(c.stage>=2&&!c.event.complete)return `${def.event.name} · ${Math.floor(c.event.progress*100)}% · Stay nearby`;
 if(run.bossSpawned)return `Defeat ${AREAS[run.areaIndex].boss} · Read its next move`;
 if(c.stage>=3&&!c.lieutenantDefeated)return 'Break the counterattack keeper · '+c.defeats+' freed';
 return `Free the Hollow · ${c.defeats} / ${next} · ${['Discovery','Resistance','Counterattack','The final seal','Warden'][c.stage]}`;
}
