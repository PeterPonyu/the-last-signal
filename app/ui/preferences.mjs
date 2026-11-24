// Player preferences kept on this device: game speed and paint rate.
// Game speed scales real time before it reaches the fixed 60 Hz simulation, so a run
// plays exactly the same steps at every speed; only how fast they arrive changes.
import {FRAME_RATES} from './frame-loop.mjs';

const KEY='last-signal-preferences-v1';
export const GAME_SPEEDS=[0.6,0.8,1,1.25];
export {FRAME_RATES};
export const DEFAULT_PREFERENCES=Object.freeze({version:1,speed:0.8,frameRate:60});
export const STEP=1/60;

export function readPreferences(storage){
  const value={...DEFAULT_PREFERENCES};
  try{
    const saved=JSON.parse(storage.getItem(KEY));
    if(saved?.version===1){
      if(GAME_SPEEDS.includes(saved.speed))value.speed=saved.speed;
      if(FRAME_RATES.includes(saved.frameRate))value.frameRate=saved.frameRate;
    }
  }catch{}
  return value;
}
export function savePreferences(storage,value){
  try{storage.setItem(KEY,JSON.stringify({version:1,speed:value.speed,frameRate:value.frameRate}));return true;}catch{return false;}
}
// How many fixed steps one paint owes the simulation. elapsed is real seconds since the
// last paint; the remainder carries to the next paint (and doubles as the render blend).
// A nanosecond of tolerance keeps float drift from delaying a step that is exactly due.
const DRIFT=1e-9;
export function stepClock(accumulated,elapsed,speed){
  const scale=GAME_SPEEDS.includes(speed)?speed:DEFAULT_PREFERENCES.speed;
  let pending=accumulated+Math.max(0,elapsed)*scale,steps=0;
  while(pending>=STEP-DRIFT){pending-=STEP;steps++;}
  return {steps,accumulated:Math.max(0,pending)};
}
// Labels for the settings menu: speeds read as percentages.
export const speedLabel=speed=>Math.round(speed*100)+'%';
