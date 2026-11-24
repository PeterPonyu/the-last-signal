// The answer screen (level-up cards). Cards come from the answers feature and may be older
// cards without kind, rarity or icon, so every field is read defensively here.
import {iconSvg,hasIcon} from './icons.mjs';

export const CARD_KINDS=['skill','gift','stat','party'];
export const RARITIES=['common','rare','radiant'];
// Icons for cards that bring none: by card id, by the skill a card teaches, then by family.
const ID_ICONS={radiance:'shard',volley:'shard',focus:'shard',tempo:'shard',edge:'slash',cleave:'slash',flow:'slash',finisher:'sunbreak',resolve:'heart',stride:'wind',ward:'shield',mend:'bloom',
  pulse:'pulse',sunbreak:'sunbreak',solarLance:'lance'};
const FAMILY_ICONS={Sunshard:'shard',Sunblade:'slash',Dawn:'heart',Dawnweaver:'bloom',Sol:'comet',Party:'party'};

const clampInt=(value,low,high)=>Math.max(low,Math.min(high,Math.floor(Number(value))||0));
export function cardView(card,run){
  const kind=CARD_KINDS.includes(card?.kind)?card.kind:'stat';
  const rarity=RARITIES.includes(card?.rarity)?card.rarity:'common';
  const max=Math.max(1,clampInt(card?.max,1,99)),owned=clampInt(run?.upgrades?.[card?.id],0,max);
  const icon=[card?.icon,ID_ICONS[card?.id],ID_ICONS[card?.skill],FAMILY_ICONS[card?.family]].find(hasIcon)||kind;
  const text=value=>typeof value==='string'?value:'';
  return {id:String(card?.id??''),name:text(card?.name),text:text(card?.text),family:text(card?.family),kind,rarity,max,owned,icon};
}
// The owned level as the card shows it: pips (owned, then the level this card adds) for cards
// with several levels. A one-level card shows none: its kind tag already says what it is.
export function levelMarkup(view,{t,esc}){
  if(view.max<=1)return '';
  const pips=Array.from({length:view.max},(_,i)=>'<i class="'+(i<view.owned?'on':i===view.owned?'next':'')+'"></i>').join('');
  return '<span class="answer-pips" aria-hidden="true">'+pips+'</span><span class="answer-level-text">'+esc(t('up.level',{n:Math.min(view.max,view.owned+1),m:view.max}))+'</span>';
}
// One card's inner markup; the page wraps it in a button and wires the choice.
export function cardMarkup(view,index,{t,tr,esc}){
  const family=view.family&&view.family!==view.name&&view.kind!=='skill'?'<span class="answer-family">'+esc(tr(view.family))+'</span>':'';
  const rarity=view.rarity==='common'?'':'<span class="answer-rarity">'+esc(t('up.rarity.'+view.rarity))+'</span>';
  return '<span class="answer-top"><kbd class="answer-key">'+(index+1)+'</kbd><span class="answer-kind">'+iconSvg(view.kind)+esc(t('up.kind.'+view.kind))+'</span>'+family+rarity+'</span>'+
    '<span class="answer-icon">'+iconSvg(view.icon,view.kind)+'</span>'+
    '<span class="answer-body"><strong class="answer-name">'+esc(tr(view.name))+'</strong><span class="answer-text">'+esc(tr(view.text))+'</span></span>'+
    '<span class="answer-level">'+levelMarkup(view,{t,esc})+'</span>';
}
