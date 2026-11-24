// Main-thread side of the score. It picks the scene from the game state and mirrors it to the worklet,
// which keeps playing on its own while menus put the frame loop to sleep; it also gates the AudioContext
// and rate-limits sound effects before they reach the worklet's voice pool.
export const SCENES=['title','play','answer','pause','dialogue','clear','victory','defeat'];
const MODE_SCENES={running:'play',ending:'play',upgrade:'answer',paused:'pause','area-clear':'clear',victory:'victory',defeat:'defeat'};
export function sceneOf(run,scene){
  if(SCENES.includes(scene))return scene;
  return run?Object.hasOwn(MODE_SCENES,run.mode)?MODE_SCENES[run.mode]:'play':'title';
}

// Enemy pressure near Zeyu (0..1), boss state (0 none, 1 champion, 2 Warden, 3 Warden phase two) and
// danger (low health, an enraged Warden). Every field is read defensively.
export function moodOf(run){
  if(!run)return {area:0,intensity:0,boss:0,danger:0};
  const area=Math.max(0,Math.min(4,Number(run.areaIndex)|0)),p=run.player||{},px=Number(p.x)||0,py=Number(p.y)||0;
  if(run.mode==='ending')return {area,intensity:0,boss:0,danger:0};
  let pressure=0,boss=0,danger=0;
  for(const e of Array.isArray(run.enemies)?run.enemies:[]){
    if(!e||e.hp!==undefined&&!(e.hp>0))continue;
    if(e.boss){boss=Math.max(boss,e.bossRank==='champion'?1:e.phase===2?3:2);if(e.enraged&&e.guardUp!==false)danger=Math.max(danger,0.6);continue;}
    const d=Math.hypot((Number(e.x)||px)-px,(Number(e.y)||py)-py);
    pressure+=d<260?1:d<720?(720-d)/460:0;
  }
  for(const h of Array.isArray(run.hazards)?run.hazards:[])if(h&&h.targets!=='enemies'&&h.warning>0&&Math.hypot((Number(h.x)||0)-px,(Number(h.y)||0)-py)<(Number(h.radius)||60)+140)pressure+=0.6;
  if(p.maxHp>0&&p.hp>0)danger=Math.max(danger,Math.min(1,Math.max(0,(0.38-p.hp/p.maxHp)/0.26)));
  return {area,intensity:Math.round((1-Math.exp(-pressure/7))*20)/20,boss,danger:Math.round(danger*10)/10};
}

// Per-kind minimum gaps plus a shared token budget: a hundred hits a second become a few designed sounds,
// and frequent low-priority sounds give way first when the budget runs low.
const GAPS={slash:0.045,'slash-finisher':0.09,hurt:0.12,'ward-hit':0.08,mend:0.1,'sol-volley':0.1,'lunar-nova':0.15,'guard-break':0.1,milestone:0.2,
  'gift-orbit':0.11,'gift-chain':0.07,'gift-bloom':0.15,'gift-comet':0.2,affix:0.2,'rule-star':0.12,'rule-vent':0.15,'rule-roots':0.25,'ui-hover':0.05,'ui-select':0.04,'ui-back':0.04};
const LOW=new Set(['ui-hover','slash','ward-hit','mend','sol-volley','gift-orbit','gift-chain','gift-bloom','affix','rule-roots']);
export function createLimiter({gaps=GAPS,fallback=0.03,capacity=10,refill=24}={}){
  const last=new Map();let tokens=capacity,clock=null;
  return {
    allow(kind,now){
      if(clock!==null&&now>clock)tokens=Math.min(capacity,tokens+(now-clock)*refill);clock=now;
      const previous=last.get(kind),gap=gaps[kind]??fallback;
      if(previous!==undefined&&now>=previous&&now-previous<gap)return false;
      if(tokens<(LOW.has(kind)?3:1))return false;
      tokens-=1;last.set(kind,now);return true;
    }
  };
}

export function createAudio(onStatus,host=globalThis){
  let context=null,node=null,loading=null,music=false,effects=false,hidden=false,musicRequest=0,effectsRequest=0,idleTimer=null,status='';
  let scene='title',explicit=null,mood=moodOf(null),sent=null,unlocking=false,muted=false;
  const limiter=createLimiter(),doc=host.document;
  const wantsAudio=()=>(music||effects)&&!hidden;
  const post=message=>node?.port.postMessage(message);
  const report=text=>{status=text;onStatus(text);};
  function pushState(force){
    if(!force&&sent&&sent.scene===scene&&sent.area===mood.area&&sent.intensity===mood.intensity&&sent.boss===mood.boss&&sent.danger===mood.danger)return;
    sent={kind:'mood',scene,...mood};post(sent);
  }
  const mute=(value,fade)=>{if(value!==muted){muted=value;post({kind:'mute',value,fade});}};
  // Suspend only when both switches are off or the page is hidden, after the worklet has faded to silence
  // (music off takes 0.5 s, so nothing still sounding is ever cut by the suspension).
  function settleContext(){
    if(idleTimer!==null){host.clearTimeout(idleTimer);idleTimer=null;}
    if(!context)return;
    if(wantsAudio()){mute(false,0.4);if(context.state==='suspended')void context.resume().catch(()=>{});return;}
    mute(true,hidden?0.25:0.5);
    idleTimer=host.setTimeout(()=>{
      idleTimer=null;
      if(wantsAudio()||context.state==='suspended')return;
      void context.suspend().then(()=>{if(wantsAudio())return context.resume();}).catch(()=>{});
    },650);
  }
  function onVisibility(){
    const next=!!doc?.hidden;if(next===hidden)return;
    hidden=next;settleContext();
  }
  // Browsers may start a context suspended outside a gesture: resume on the next tap or key.
  function unlockOnGesture(){
    if(unlocking||typeof host.addEventListener!=='function')return;unlocking=true;
    const events=['pointerdown','keydown','touchend'],resume=()=>{
      if(context?.state==='suspended'&&wantsAudio())void context.resume().catch(()=>{});
      if(context?.state!=='suspended'){unlocking=false;for(const type of events)host.removeEventListener?.(type,resume,true);}
    };
    for(const type of events)host.addEventListener(type,resume,true);
  }
  async function activate(){
    if(!context){
      context=new host.AudioContext({latencyHint:'interactive'});
      hidden=!!doc?.hidden;doc?.addEventListener?.('visibilitychange',onVisibility);
    }
    if(context.state==='suspended'&&!hidden)await context.resume();
    if(context.state==='suspended')unlockOnGesture();
    if(!node){
      loading||=context.audioWorklet.addModule(new URL('./music-worklet.mjs',import.meta.url)).catch(error=>{loading=null;throw error;}).then(()=>{
        node=new host.AudioWorkletNode(context,'dawn-score',{numberOfOutputs:1,outputChannelCount:[2]});node.connect(context.destination);
        node.port.onmessage=({data})=>{if(data?.kind==='bar'&&music&&status!=='Music on')report('Music on');};
        if(muted)post({kind:'mute',value:true,fade:0.05});
        pushState(true);
      });
      await loading;
    }
    post({kind:'enabled',value:music,fade:music?0:0.5});
  }
  return {
    async setMusic(value){
      const request=++musicRequest;music=!!value;
      try{
        if(music)await activate();
        if(request!==musicRequest)return music;
        post({kind:'enabled',value:music,fade:music?0:0.5});report(music?'Music ready':'Music off');
      }catch{if(request===musicRequest){music=false;loading=null;report('Music unavailable · game remains playable');}}
      settleContext();return music;
    },
    async setEffects(value){
      const request=++effectsRequest;effects=!!value;
      if(effects)try{await activate();}catch{if(request===effectsRequest){effects=false;loading=null;}}
      settleContext();return effects;
    },
    // scene: one of SCENES, or omitted to follow run.mode. An explicit scene holds until the mode moves on
    // (the pause that opening a dialog causes does not count), so a later sync(run) does not undo it.
    sync(run,requested){
      const inferred=sceneOf(run);
      if(SCENES.includes(requested))explicit={scene:requested,inferred};
      else if(explicit&&explicit.inferred!==inferred){if(explicit.inferred==='play'&&inferred==='pause')explicit.inferred=inferred;else explicit=null;}
      scene=explicit?explicit.scene:inferred;mood=moodOf(run);pushState(false);
      if(context?.state==='suspended'&&wantsAudio()&&idleTimer===null)settleContext();
    },
    sound(kind,options){
      if(!effects||!node||hidden||context?.state!=='running')return false;
      const name=String(kind),now=Number(context.currentTime)||0,volume=options?.volume,pan=options?.pan,pitch=options?.pitch;
      if(!limiter.allow(name,now))return false;
      post({kind:'sfx',name,gain:Number.isFinite(volume)?volume:1,pan:Number.isFinite(pan)?pan:0,pitch:Number.isFinite(pitch)?pitch:1});
      return true;
    },
    scene:()=>scene
  };
}
