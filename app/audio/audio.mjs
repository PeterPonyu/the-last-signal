export function createAudio(onStatus,host=globalThis) {
  let context=null,node=null,loading=null,music=false,effects=false,running=false,lastMood='',musicRequest=0,effectsRequest=0;
  let idleTimer=null;
  const wantsAudio=()=>running&&(music||effects);
  function settleContext(){
    if(idleTimer!==null){host.clearTimeout(idleTimer);idleTimer=null;}
    if(!context)return;
    if(wantsAudio()){
      if(context.state==='suspended')void context.resume().catch(()=>{});
    }else{
      // Let the final 300 ms effect finish before putting the audio thread to sleep.
      idleTimer=host.setTimeout(()=>{
        idleTimer=null;
        if(wantsAudio()||context.state==='suspended')return;
        void context.suspend().then(()=>{if(wantsAudio())return context.resume();}).catch(()=>{});
      },350);
    }
  }
  async function activate() {
    context ||= new host.AudioContext();
    if(context.state==='suspended')await context.resume();
    if(music&&!node){
      loading ||= context.audioWorklet.addModule(new URL('./music-worklet.mjs',import.meta.url)).then(()=>{
        node=new host.AudioWorkletNode(context,'dawn-score',{numberOfOutputs:1,outputChannelCount:[2]});node.connect(context.destination);
        node.port.onmessage=({data})=>{if(data.kind==='bar'&&music&&running)onStatus('Music on · '+['Garden','Causeway','Court'][data.area]);};
      });
      await loading;
    }
    node?.port.postMessage({kind:'enabled',value:music&&running});
  }
  return {
    async setMusic(value){const request=++musicRequest;music=value;try{if(value)await activate();if(request!==musicRequest)return music;node?.port.postMessage({kind:'enabled',value:music&&running});onStatus(music?'Music ready':'Music off');}catch{if(request===musicRequest){music=false;loading=null;onStatus('Music unavailable · game remains playable');}}settleContext();return music;},
    async setEffects(value){const request=++effectsRequest;effects=value;if(value)try{await activate();}catch{if(request===effectsRequest)effects=false;}settleContext();return effects;},
    sync(run){
      const nextRunning=run?.mode==='running';if(nextRunning!==running){running=nextRunning;node?.port.postMessage({kind:'enabled',value:music&&running});settleContext();}
      if(!node||!run)return;
      const intensity=run.bossSpawned?1:Math.min(0.75,run.enemies.length/24),key=run.areaIndex+':'+Math.round(intensity*4);
      if(key!==lastMood){lastMood=key;node.port.postMessage({kind:'mood',area:run.areaIndex,intensity});}
    },
    sound(kind){
      if(!effects||!context||context.state!=='running')return;
      const notes={pulse:210,dash:480,slash:310,mend:640,hurt:95,upgrade:720,victory:880,defeat:110,boss:135,beacon:790,lantern:540,sunbreak:180,'guard-break':260,ward:560,'ward-hit':340,'area-clear':840,area:660};
      const osc=context.createOscillator(),gain=context.createGain(),now=context.currentTime;osc.type=kind==='hurt'?'sawtooth':'sine';
      osc.frequency.setValueAtTime(notes[kind]||400,now);osc.frequency.exponentialRampToValueAtTime((notes[kind]||400)*1.5,now+0.15);
      gain.gain.setValueAtTime(0.0001,now);gain.gain.exponentialRampToValueAtTime(0.035,now+0.015);gain.gain.exponentialRampToValueAtTime(0.0001,now+0.25);
      osc.connect(gain).connect(context.destination);osc.start();osc.stop(now+0.3);osc.onended=()=>{osc.disconnect();gain.disconnect();};
      if(!wantsAudio())settleContext();
    }
  };
}
