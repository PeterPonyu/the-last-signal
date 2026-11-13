import {castPose} from '../game/animation.mjs';
import {drawSprite} from './sprites.mjs';

export function drawCast(ctx,images,actor,time,reduced=false,opacity=1){
 const pose=castPose(actor,reduced?0:time),height=actor.boss?220:actor.type==='pack'?64:actor.lieutenant?130:actor.type==='sentinel'?112:actor.npc?96:100;
 // Artwork supplies articulation. Only tiny grounded breathing remains procedural.
 drawSprite(ctx,images,pose,actor.x,actor.y,height,actor.faceX||1,opacity,{offsetY:reduced||actor.hp<=0?0:Math.sin(time*2+(Number(actor.id)||0))*0.8});
}
