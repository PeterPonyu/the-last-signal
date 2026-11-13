import { ASSETS,AREAS } from '../../content/game.mjs';
import { ANIMATIONS } from '../../content/animations.mjs';
export const INITIAL_ASSETS=['heroActions','heroReactions','enemyActions','companionActions','companionSupport','props','garden'];
const pending=new WeakMap();
export async function loadAssets(onProgress=()=>{},fetcher=fetch,ImageType=Image,keys=null,images={}){
  const response=await fetcher('asset-catalog.json');if(!response.ok)throw new Error('Asset catalog unavailable');
  const catalog=await response.json();if(!Array.isArray(catalog.assets))throw new Error('Invalid asset catalog');
  const entries=Object.entries(ASSETS).filter(([key])=>!key.endsWith('Portrait')&&(!keys||keys.includes(key)));let completed=0;
  if(!pending.has(images))pending.set(images,new Map());const jobs=pending.get(images);
  await Promise.all(entries.map(async([key,name])=>{
    if(!images[key]){
      if(!jobs.has(key))jobs.set(key,(async()=>{
        const entry=catalog.assets.find(a=>a.output==='assets/'+name);if(!entry)throw new Error('Image missing from catalog: '+name);
        const image=new ImageType();image.src='assets/'+name;await image.decode();
        if(image.naturalWidth!==entry.width||image.naturalHeight!==entry.height)throw new Error('Image differs from catalog: '+name);
        const animation=ANIMATIONS[key];
        if(animation&&(!entry.atlas||entry.atlas.rows!==animation.rows||entry.atlas.frames?.length!==animation.rows*animation.columns))throw new Error('Image has invalid frame bindings: '+name);
        image.atlas=entry.atlas;images[key]=image;
      })().finally(()=>jobs.delete(key)));
      await jobs.get(key);
    }
    onProgress(++completed,entries.length);
  }));
  return images;
}
export function loadAreaAssets(images,index,fetcher=fetch,ImageType=Image){
 if(!AREAS[index])return Promise.reject(new RangeError('Unknown map'));
 const keys=[AREAS[index].id,...(index>0?['solActions']:[])];
 if(keys.every(key=>images[key]))return Promise.resolve(images);
 return loadAssets(()=>{},fetcher,ImageType,keys,images);
}
