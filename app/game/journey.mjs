import {JOURNEY,REMAINS} from '../../content/journey.mjs';
import {AREAS} from '../../content/game.mjs';
import {campaignTarget,campaignObjective,areaObstacles} from './progression.mjs';
import {distance,clearPath} from './geometry.mjs';

export function nearbyInteraction(run){
  const story=JOURNEY[run.areaIndex],obstacles=areaObstacles(run);
  const c=run.campaign;
  const routes=c.routes.filter(r=>r.status!=='locked'&&r.status!=='active'&&!r.completed).map(r=>({...r,kind:'route'}));
  const targets=[...routes,{...story.exit,kind:'gate'},...c.npcs.map(n=>({...n,kind:'npc'}))];
  return targets.filter(point=>distance(run.player,point)<120&&clearPath(run.player,point,obstacles,8)).sort((a,b)=>distance(run.player,a)-distance(run.player,b))[0]||null;
}
export function gatewayPrompt(run){
  if(!run.gateOpen)return 'Gateway · Sealed';
  if(nearbyInteraction(run)?.kind!=='gate')return run.areaIndex===2?'Approach the Sun Engine':'Approach gateway';
  return run.areaIndex===2?'Release the dawn · F':'Enter gateway · F';
}
export function journeyTarget(run){
  const story=JOURNEY[run.areaIndex],p=run.player;
  if(run.gateOpen)return {...story.exit,kind:'gate',label:story.exit.name};
  return campaignTarget(run);
}
export function objectiveText(run){
  const story=JOURNEY[run.areaIndex],area=AREAS[run.areaIndex];
  if(run.gateOpen)return 'Road open · Reach '+story.exit.name+' · F';
  return campaignObjective(run);
}
export function corpseAppearance(body){
  const hold=body.boss?REMAINS.bossHold:REMAINS.hold,age=body.deathAge||0;
  const fall=Math.min(1,age/0.8);
  return {opacity:Math.max(0,Math.min(1,(hold+REMAINS.fade-age)/REMAINS.fade))*0.72,
    motion:{tilt:fall*0.8,stretchY:1-fall*0.55,offsetY:fall*8}};
}
