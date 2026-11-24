import {castDisplay,partyDisplay,motionMemory,castHeight,PARTY_HEIGHT} from './motion.mjs';
import {drawSprite} from './sprites.mjs';

// Per-ghost opacity of a smear (nearest first) and one reusable motion layer: no allocations per actor per frame.
const GHOST=[0.42,0.26,0.14],layer={offsetX:0,offsetY:0,tilt:0,stretchX:1,stretchY:1,blend:''};
function paint(ctx,images,s,x,y,height,opacity){
 const m=s.motion;
 for(let i=s.ghosts;i>0;i--){
  layer.offsetX=m.offsetX+s.ghostX*i;layer.offsetY=m.offsetY+s.ghostY*i;layer.tilt=m.tilt+s.ghostTilt*i;layer.stretchX=m.stretchX;layer.stretchY=m.stretchY;layer.blend=s.ghostBlend;
  drawSprite(ctx,images,s.pose,x,y,height,s.face,opacity*s.ghostAlpha*GHOST[i-1],layer);
 }
 if(s.fadeAlpha>0)drawSprite(ctx,images,s.fadePose,x,y,height,s.face,opacity*s.fadeAlpha,s.fadeMotion);
 drawSprite(ctx,images,s.pose,x,y,height,s.face,opacity*s.alpha,m);
 // Hit flash: the same frame redrawn additively brightens painted art without an offscreen canvas (at most two passes).
 if(s.flash>0.02){Object.assign(layer,m);layer.blend='lighter';for(let pass=s.flash;pass>0.02;pass-=0.55)drawSprite(ctx,images,s.pose,x,y,height,s.face,opacity*s.alpha*Math.min(0.85,pass),layer);}
}
// Hero, Dawnweaver and Sol (kind 'hero'|'companion'|'sol'; body heights 98/96/54).
export function drawParty(ctx,images,actor,kind,time,reduced=false,opacity=1){
 const s=partyDisplay(motionMemory,actor,kind,time,reduced);
 paint(ctx,images,s,actor.x,actor.y,PARTY_HEIGHT[kind],opacity);
 return s;
}
// Hollow, champions, Wardens, their remains, and route keepers.
export function drawCast(ctx,images,actor,time,reduced=false,opacity=1){
 const height=castHeight(actor),s=castDisplay(motionMemory,actor,time,reduced,height);
 paint(ctx,images,s,actor.x,actor.y,height,opacity);
 return s;
}
