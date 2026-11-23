import {WORLD} from '../../content/game.mjs';

// The map may yield its corner to combat. Keep a safe corner until it is occupied.
// reserved: screen rectangles {left,top,right,bottom} covered by page overlays (touch controls, cards).
// options.top: first free row below page overlays; options.size: scale for small play areas.
export function placeMinimap(run,camera,width,height,uiScale=1,previousCorner=null,reserved=[],options={}){
  const size=options.size??1,mw=Math.min(170*uiScale,width*0.28)*size,mh=Math.round(mw*WORLD.height/WORLD.width);
  const candidates=[
    {corner:'bottom-right',x:width-mw-15,y:height-mh-20},
    {corner:'bottom-left',x:15,y:height-mh-20},
    {corner:'top-left',x:15,y:Math.min(options.top??90*uiScale,height-mh-20)},
    {corner:'top-right',x:width-mw-15,y:Math.min(options.top??90*uiScale,height-mh-20)},
  ];
  const bounds=[];
  const box=(x,y,left,top,right,bottom)=>bounds.push({left:x-camera.x-left,top:y-camera.y-top,right:x-camera.x+right,bottom:y-camera.y+bottom});
  for(const actor of [run.player,run.companion,...(run.sol?.active?[run.sol]:[]),...run.enemies]){
    if(actor.hp<=0)continue;
    const half=actor.boss?125:65;
    box(actor.x,actor.y,half,actor.boss?245:155,half,45);
    if(actor.chargeWarning>0){
      const x=actor.x+actor.chargeX*180,y=actor.y+actor.chargeY*180;
      box((actor.x+x)/2,(actor.y+y)/2,Math.abs(x-actor.x)/2+24,Math.abs(y-actor.y)/2+24,Math.abs(x-actor.x)/2+24,Math.abs(y-actor.y)/2+24);
    }
  }
  for(const hazard of run.hazards){const r=hazard.radius+24;box(hazard.x,hazard.y,r,r,r,r);}
  for(const shot of run.shots){if(shot.hostile)box(shot.x,shot.y,16,16,16,16);}
  const covered=candidate=>reserved.some(r=>candidate.x-6<r.right&&candidate.x+mw+6>r.left&&candidate.y-6<r.bottom&&candidate.y+mh+6>r.top);
  const clear=candidate=>{
    if(covered(candidate))return false;
    const pad=candidate.corner===previousCorner?10:24;
    return !bounds.some(b=>candidate.x-pad<b.right&&candidate.x+mw+pad>b.left&&candidate.y-pad<b.bottom&&candidate.y+mh+pad>b.top);
  };
  const previous=candidates.find(c=>c.corner===previousCorner);
  const chosen=previous&&clear(previous)?previous:candidates.find(clear);
  return chosen?{...chosen,width:mw,height:mh}:null;
}
