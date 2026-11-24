// Display-time localisation. The simulation, content and tests stay in English;
// text is translated only where it reaches the player (DOM text and canvas text).
import {ZH as BASE,ZH_PATTERNS as BASE_PATTERNS} from './zh.mjs';
import * as answers from './zh-answers.mjs';
import * as party from './zh-party.mjs';
import * as world from './zh-world.mjs';
import * as maps from './zh-maps.mjs';
// Feature tables are merged over the base table; their patterns are tried before the base patterns.
const FEATURES=[answers,party,world,maps];
const ZH=Object.assign({},BASE,...FEATURES.map(feature=>feature.ZH));
const ZH_PATTERNS=[...FEATURES.flatMap(feature=>feature.ZH_PATTERNS),...BASE_PATTERNS];
import {UI} from './ui.mjs';

export const LANGUAGES=['en','zh'];
const STORAGE_KEY='last-signal-language';
let current='en';
const cache=new Map(),listeners=new Set();
export const missing=new Set();

export function detectLanguage(storage,languages=globalThis.navigator?.languages||[]){
  try{const saved=storage?.getItem(STORAGE_KEY);if(LANGUAGES.includes(saved))return saved;}catch{}
  return [...languages].some(value=>/^zh\b/i.test(value))?'zh':'en';
}
export function language(){return current;}
export function setLanguage(next,storage){
  if(!LANGUAGES.includes(next))return false;
  current=next;cache.clear();
  try{storage?.setItem(STORAGE_KEY,next);}catch{}
  if(globalThis.document)document.documentElement.lang=next==='zh'?'zh-CN':'en';
  for(const listener of listeners)listener(next);
  return true;
}
export function onLanguageChange(listener){listeners.add(listener);return ()=>listeners.delete(listener);}

// Interface strings owned by the page, looked up by key. {name} placeholders are filled from vars.
export function t(key,vars){
  const table=UI[current]||UI.en,template=table[key]??UI.en[key]??key;
  return vars?template.replace(/\{(\w+)\}/g,(match,name)=>vars[name]??match):template;
}

// Content and game text, looked up by its English source. Captured groups in a
// pattern are translated recursively, so names inside sentences are localised too.
export function tr(text){
  if(current==='en'||typeof text!=='string'||!/[A-Za-z]/.test(text))return text;
  const hit=cache.get(text);if(hit!==undefined)return hit;
  let out=ZH[text];
  if(out===undefined){
    const trimmed=text.trim();
    if(trimmed!==text&&ZH[trimmed]!==undefined)out=text.replace(trimmed,ZH[trimmed]);
  }
  if(out===undefined)for(const [pattern,template] of ZH_PATTERNS){
    const match=text.match(pattern);
    if(match){out=template.replace(/\$(\d)/g,(_,index)=>tr(match[Number(index)]??''));break;}
  }
  if(out===undefined){out=text;missing.add(text);}
  if(cache.size>5000)cache.clear();
  cache.set(text,out);
  return out;
}

// Route every string a 2D context draws through tr(), so canvas labels follow the language.
// post (optional) adjusts translated text, e.g. to show the key hint of the active input device.
export function localiseContext(ctx,post=value=>value){
  if(ctx.__localised)return ctx;
  for(const method of ['fillText','strokeText']){const original=ctx[method].bind(ctx);ctx[method]=(value,...rest)=>original(post(tr(String(value))),...rest);}
  const measure=ctx.measureText.bind(ctx);ctx.measureText=value=>measure(post(tr(String(value))));
  ctx.__localised=true;return ctx;
}
