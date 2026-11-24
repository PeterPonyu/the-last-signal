import { ASSETS,AREAS,KITS } from '../../content/game.mjs';
import { ANIMATIONS } from '../../content/animations.mjs';
export const INITIAL_ASSETS=['heroActions','heroReactions','companionActions','companionSupport','props','garden','gardenKit','commonCast','gardenCast','rootBoss','keepersCast','guideActions','radiance','worldDetails','openGate'];
const pending=new WeakMap();
export async function loadAssets(onProgress=()=>{},fetcher=fetch,ImageType=Image,keys=null,images={}){
  const response=await fetcher('asset-catalog.json');if(!response.ok)throw new Error('Asset catalog unavailable');
  const catalog=await response.json();if(!Array.isArray(catalog.assets))throw new Error('Invalid asset catalog');
  const entries=Object.entries(ASSETS).filter(([key])=>!key.endsWith('Portrait')&&(!keys||keys.includes(key)));let completed=0;
  if(!pending.has(images))pending.set(images,new Map());const jobs=pending.get(images);
  await Promise.all(entries.map(async([key,name])=>{
    if(!images[key]){
      if(!jobs.has(name))jobs.set(name,(async()=>{
        const shared=Object.entries(ASSETS).find(([other,file])=>file===name&&images[other]);if(shared)return images[shared[0]];
        const entry=catalog.assets.find(a=>a.output==='assets/'+name);if(!entry)throw new Error('Image missing from catalog: '+name);
        const image=new ImageType();image.src='assets/'+name;await image.decode();
        if(image.naturalWidth!==entry.width||image.naturalHeight!==entry.height)throw new Error('Image differs from catalog: '+name);
        const animation=ANIMATIONS[key];
        if(animation&&(!entry.atlas||entry.atlas.rows!==animation.rows||entry.atlas.frames?.length!==animation.rows*animation.columns))throw new Error('Image has invalid frame bindings: '+name);
        image.atlas=entry.atlas;return image;
      })().finally(()=>jobs.delete(name)));
      images[key]=await jobs.get(name);
    }
    onProgress(++completed,entries.length);
  }));
  return images;
}
export function loadAreaAssets(images,index,fetcher=fetch,ImageType=Image){
 if(!AREAS[index])return Promise.reject(new RangeError('Unknown map'));
 // Each map brings its floor, its cast, its Warden and its own scenery kit.
 const area=AREAS[index],keys=[area.id,area.regionalAsset,area.bossAsset,KITS[area.id].asset,...(index>0?['solActions']:[])];
 if(keys.every(key=>images[key]))return Promise.resolve(images);
 return loadAssets(()=>{},fetcher,ImageType,keys,images);
}
