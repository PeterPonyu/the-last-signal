import {WORLD} from '../../content/game.mjs';
import {clamp,distance,clearPath,directionTo,navigationField,CELL} from './geometry.mjs';

const targetFields=new WeakMap();
export function targetNavigation(target,obstacles){
 const cell=Math.floor(target.x/CELL)+':'+Math.floor(target.y/CELL),cached=targetFields.get(target);
 if(cached?.cell===cell&&cached.obstacles===obstacles)return cached.field;
 const field=navigationField(obstacles,target);targetFields.set(target,{cell,obstacles,field});return field;
}

export function enemyTarget(enemy,player,npcs,enemies,time,difficulty){
 const targetById=id=>id===undefined||id==='hero'?player:npcs.find(n=>n.id===id&&n.state==='active'&&n.hp>0);
 if(enemy.attack>0||enemy.spell>0||enemy.chargeWarning>0||enemy.charge>0)return targetById(enemy.focusId)||null;
 if(enemy.boss||enemy.provokedUntil>time){enemy.focusId='hero';return player;}
 const current=targetById(enemy.focusId);
 if(current&&enemy.focusUntil>time)return current;
 const cap=difficulty==='hard'?4:3,raider=enemy.runner||enemy.type==='skirmisher';
 let selected=player,best=distance(enemy,player);
 for(const npc of npcs){
  const gap=distance(enemy,npc);
  if(npc.state!=='active'||npc.hp<=0||gap>560)continue;
  if(enemies.filter(e=>e!==enemy&&e.hp>0&&e.focusId===npc.id).length>=cap)continue;
  const score=gap*(raider?0.65:0.9)-(enemy.focusId===npc.id?45:0);
  if(score<best){selected=npc;best=score;}
 }
 enemy.focusId=selected===player?'hero':selected.id;enemy.focusUntil=time+0.65;return selected;
}

export function predictedTarget(player,seconds=0.2){
  const vx=clamp(player.vx||0,-205,205),vy=clamp(player.vy||0,-205,205);
  return {x:clamp(player.x+vx*seconds,WORLD.left,WORLD.right),y:clamp(player.y+vy*seconds,WORLD.top,WORLD.bottom)};
}

export function enemySteering(enemy,player,obstacles,field){
  const gap=distance(enemy,player),side=enemy.steerSide??(enemy.id%2?1:-1);
  let target=player,intent='pursue';
  if(enemy.bossKind){
    const angle=(enemy.casts||0)*1.9+(enemy.id%3),radius=enemy.bossKind==='root'?175:enemy.bossKind==='bell'?290:340;
    target=gap>650?player:{x:player.x+Math.cos(angle)*radius,y:player.y+Math.sin(angle)*radius*0.7};intent='reposition';
  }else if(enemy.type==='skirmisher'&&gap<470){
    const dx=(player.x-enemy.x)/(gap||1),dy=(player.y-enemy.y)/(gap||1);target={x:player.x-dy*side*155,y:player.y+dx*side*155};intent='flank';
  }else if((enemy.ranged||enemy.type==='cantor')&&!enemy.runner&&!enemy.guarded&&clearPath(enemy,player,obstacles,3)){
    const dx=(enemy.x-player.x)/(gap||1),dy=(enemy.y-player.y)/(gap||1);
    if(gap<230){target={x:enemy.x+dx*140-dy*side*70,y:enemy.y+dy*140+dx*side*70};intent='retreat';}
    else if(gap<390){target={x:enemy.x-dy*side*100,y:enemy.y+dx*side*100};intent='strafe';}
  }else if(enemy.runner&&gap>120&&gap<600){
    const lead=predictedTarget(player,0.28),dx=(player.x-enemy.x)/(gap||1),dy=(player.y-enemy.y)/(gap||1);
    target={x:lead.x-dy*side*100,y:lead.y+dx*side*100};intent='flank';
  }else if((enemy.guarded||enemy.type==='sentinel')&&gap>120&&gap<500){
    target=predictedTarget(player,0.35);intent='intercept';
  }else if(gap>90&&gap<320&&!enemy.boss){
    const dx=(player.x-enemy.x)/(gap||1),dy=(player.y-enemy.y)/(gap||1);
    target={x:player.x-dy*side*55,y:player.y+dx*side*55};intent='surround';
  }
  target={x:clamp(target.x,WORLD.left,WORLD.right),y:clamp(target.y,WORLD.top,WORLD.bottom)};
  if(!clearPath(enemy,target,obstacles,enemy.radius+4)){
    target=player;intent='navigate';
  }
  const direction=directionTo(enemy,target,obstacles,field);
  // Nearby scenery wins over a tactical offset. Try a short tangent, then let
  // the shared field take over on the next step rather than walking into it.
  if((intent==='strafe'||intent==='retreat')&&!clearPath(enemy,{x:enemy.x+direction.x*70,y:enemy.y+direction.y*70},obstacles,enemy.radius))return {...directionTo(enemy,player,obstacles,field),intent:'navigate'};
  return {...direction,intent};
}

export function hasAttackSlot(enemies,enemy,difficulty,kind){
  const limit=kind==='spell'?{easy:1,normal:2,hard:3}[difficulty]:{easy:2,normal:3,hard:4}[difficulty];
  // Let a ready Warden take the next heavy opening instead of losing it to
  // earlier entries in the enemy list on every update.
  if(!enemy.boss&&enemies.some(e=>e.boss&&e.hp>0&&e.warning<=0&&e.phaseShift<=0&&e.spell<=0&&e.spellCooldown<=0.6))return false;
  return enemies.filter(e=>e!==enemy&&e.hp>0&&(e.spell>0||e.chargeWarning>0||e.charge>0)).length<limit;
}

// A new ground warning must leave a nearby, unobstructed escape destination.
// Existing attacks keep their committed timing; only a new mark may be declined.
export function hasHazardEscape(player,hazards,candidate,obstacles){
  const marks=[...hazards.filter(h=>h.life>0&&!h.triggered),candidate];
  const safe=q=>q.x>=WORLD.left&&q.x<=WORLD.right&&q.y>=WORLD.top&&q.y<=WORLD.bottom&&
    clearPath(player,q,obstacles,20)&&marks.every(h=>{const d=distance(q,h);return d>h.radius+20||(h.inner>20&&d<h.inner-20);});
  if(safe(player))return true;
  const reach=Math.min(240,player.speed*Math.max(0.1,candidate.warning-0.18));
  for(const fraction of [0.3,0.65,1])for(let i=0;i<16;i++){
    const angle=i*Math.PI/8,q={x:player.x+Math.cos(angle)*reach*fraction,y:player.y+Math.sin(angle)*reach*fraction};
    if(safe(q))return true;
  }
  return false;
}
