// Test-player inputs only: no changes to health, time, enemies or progression.
import {upgradeChoices,CAMPAIGN} from '../../content/campaign.mjs';
import {JOURNEY} from '../../content/journey.mjs';
import {AREAS,WORLD,COMBAT} from '../../content/game.mjs';
import {distance,navigationField,directionTo} from './geometry.mjs';
import {campaignTarget,areaObstacles} from './progression.mjs';
import {useAbility,requestAbility,chooseUpgrade,advanceArea,interact} from './simulation.mjs';
export function createPolicy(policy='tactical',{routePlan=null,upgradeFamily=null}={}){
 if(routePlan!==null&&(!Array.isArray(routePlan)||routePlan.length!==CAMPAIGN.length||routePlan.some((id,i)=>!CAMPAIGN[i].routes.some(r=>r.id===id))))throw new RangeError('Route plan must name one authored route per map');
 if(upgradeFamily!==null&&!['Sunshard','Sunblade','Dawn'].includes(upgradeFamily))throw new RangeError('Unknown upgrade family');
 let goalKey='',field=[],steering={x:0,y:0},decision=0;
 return run=>{
  if(run.mode==='upgrade'){
   const offers=upgradeChoices(run),defense=offers.find(c=>c.family==='Dawn'),preferred=offers.find(c=>c.family===upgradeFamily);
   chooseUpgrade(run,preferred?preferred.id:run.player.hp<run.player.maxHp*0.65&&defense?defense.id:offers[0].id);
  }
  if(run.mode==='area-clear'){advanceArea(run);goalKey='';}
  if(run.mode!=='running')return {};
  const p=run.player,c=run.campaign,area=AREAS[run.areaIndex];
  if(run.gateOpen&&distance(p,JOURNEY[run.areaIndex].exit)<110){interact(run);return {};}
  if(!run.npcMet&&distance(p,c.npcs[0])<105)interact(run);
  const selected=c.routes.find(r=>r.id===c.choice),preferred=routePlan?c.routes.find(r=>r.id===routePlan[run.areaIndex]):c.routes[(run.initialSeed+run.areaIndex)%2];
  if(c.stage>=1&&!c.choice&&distance(p,preferred)<110)interact(run);
  if(selected?.status==='retry'&&distance(p,selected)<110)interact(run);
  if(policy==='stationary')return {};
  if(decision--<=0){
   decision=policy==='tactical'?5:14;
   const boss=run.enemies.find(e=>(e.boss||e.lieutenant)&&e.hp>0);
   let target=campaignTarget(run),hold=false;
   if(c.stage===1&&!c.choice)target=preferred;
   if(target?.kind==='battle')target={x:target.x+230*Math.cos(run.areaTime*0.12),y:target.y+170*Math.sin(run.areaTime*0.12)};
   if(selected&&!selected.completed&&selected.kind==='repair'&&distance(p,selected)<70)hold=true;
   if(selected&&!selected.completed&&selected.kind==='escort'&&selected.status==='active'&&distance(p,target)<60)hold=true;
   if(c.stage>=2&&!c.event.complete&&distance(p,c.event)<75)hold=true;
   if(boss){const angle=run.areaTime*0.25;target={x:Math.max(WORLD.left+100,Math.min(WORLD.right-100,boss.x+235*Math.cos(angle))),y:Math.max(WORLD.top+100,Math.min(WORLD.bottom-100,boss.y+195*Math.sin(angle)))};hold=false;}
   if(run.gateOpen){target=JOURNEY[run.areaIndex].exit;hold=false;}
   if(!target)target=area.spawn;
   const key=run.areaIndex+':'+c.stage+':'+Math.round(target.x/60)+':'+Math.round(target.y/60);
   if(key!==goalKey){field=navigationField(areaObstacles(run),target);goalKey=key;}
   steering=hold?{x:0,y:0}:directionTo(p,target,areaObstacles(run),field);
   if(policy==='tactical'){
    let ax=0,ay=0;
    for(const e of run.enemies){const d=distance(e,p);if(e.warning<=0&&d<105){ax+=(p.x-e.x)/(d||1)*(105-d)/80;ay+=(p.y-e.y)/(d||1)*(105-d)/80;}}
    for(const h of run.hazards){const d=distance(h,p);if(d<h.radius+38&&d>=Math.max(0,(h.inner||0)-18)){ax+=(p.x-h.x)/(d||1)*2.4;ay+=(p.y-h.y)/(d||1)*2.4;}}
    for(const s of run.shots)if(s.hostile&&distance(s,p)<110){const cross=(p.x-s.x)*s.vy-(p.y-s.y)*s.vx,sign=cross<0?-1:1;ax+=s.vy/225*sign;ay-=s.vx/225*sign;}
    if(ax||ay)steering={x:steering.x+ax*1.8,y:steering.y+ay*1.8};
   }
  }
  if(policy==='tactical'){
   const near=run.enemies.filter(e=>e.hp>0&&e.warning<=0&&distance(e,p)<280).sort((a,b)=>distance(a,p)-distance(b,p));
   const target=near.find(e=>e.boss||e.lieutenant||e.guarded)||near[0];
   if(target){const aim={x:target.x-p.x,y:target.y-p.y};if(target.boss||target.lieutenant||near.length>2)requestAbility(run,'sunbreak',aim);if(distance(target,p)<COMBAT.slash.range+p.bladeRange)requestAbility(run,'slash',aim);}
   if(near.filter(e=>distance(e,p)<190).length>=3||near.some(e=>e.boss&&distance(e,p)<165))useAbility(run,'pulse');
   if(c.npcs.some(n=>n.state==='active'&&n.hp<n.maxHp*0.6&&distance(n,p)<200&&n.shield<=0))useAbility(run,'pulse');
   if(run.hazards.some(h=>h.warning<0.3&&distance(h,p)<h.radius&&distance(h,p)>=(h.inner||0)))requestAbility(run,'dash',steering);
  }
  return steering;
 };
}
