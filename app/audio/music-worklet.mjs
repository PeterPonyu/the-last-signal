const MELODY = [62,69,65,67,69,0,72,69,67,65,62,0,65,67,69,74,72,69,67,0,65,62,60,62,65,0,67,69,65,62,0,0];
const ROOTS = [38,34,41,36];
const frequency = note => 440 * 2 ** ((note - 69) / 12);

class DawnScore extends AudioWorkletProcessor {
  constructor() {
    super(); this.samples=0;this.step=-1;this.area=0;this.intensity=0;this.pending={area:0,intensity:0};this.enabled=false;
    this.leadPhase=0;this.bassPhase=0;this.padPhase=0;this.padHighPhase=0;this.noiseSeed=7391;this.envelope=0;
    this.port.onmessage=({data})=>{if(data.kind==='mood')this.pending={area:Math.max(0,Math.min(2,data.area|0)),intensity:Math.max(0,Math.min(1,data.intensity))};if(data.kind==='enabled')this.enabled=!!data.value;};
  }
  process(inputs,outputs) {
    const channels=outputs[0];if(!channels?.length)return true;
    const stepSeconds=60/120/2;
    for(let i=0;i<channels[0].length;i++){
      if(!this.enabled){for(const channel of channels)channel[i]=0;continue;}
      const t=this.samples/sampleRate, step=Math.floor(t/stepSeconds), local=t%stepSeconds;
      if(step!==this.step){this.step=step;if(step%8===0){this.area=this.pending.area;this.intensity=this.pending.intensity;this.port.postMessage({kind:'bar',area:this.area,intensity:this.intensity,bar:step/8});}}
      const transpose=[0,5,0][this.area], root=ROOTS[Math.floor(step/8)%4]+transpose, note=MELODY[step%MELODY.length];
      const leadFrequency=note?frequency(note+transpose):0,bassFrequency=frequency(root),padFrequency=frequency(root+24);
      this.leadPhase=(this.leadPhase+leadFrequency/sampleRate)%1;this.bassPhase=(this.bassPhase+bassFrequency/sampleRate)%1;
      this.padPhase=(this.padPhase+padFrequency/sampleRate)%1;this.padHighPhase=(this.padHighPhase+padFrequency*1.4983/sampleRate)%1;
      const attack=Math.min(1,local/0.012),decay=Math.exp(-local*7),lead=note?(this.leadPhase<0.3?0.7:-0.3)*attack*decay:0;
      const bass=(1-4*Math.abs(this.bassPhase-0.5))*Math.exp(-local*4), pad=(Math.sin(this.padPhase*Math.PI*2)+0.5*Math.sin(this.padHighPhase*Math.PI*2));
      this.noiseSeed=(Math.imul(this.noiseSeed,1664525)+1013904223)>>>0;
      const noise=this.noiseSeed/2147483648-1,beat=step%8;
      const kick=beat%4===0?Math.sin(2*Math.PI*(52*local+5*(1-Math.exp(-local*25))))*Math.exp(-local*24):0;
      const snare=beat===2||beat===6?noise*Math.exp(-local*30):0,hat=noise*Math.exp(-local*90);
      const drums=(kick*0.13+snare*0.035+hat*0.008)*(0.25+this.intensity*0.75),duck=1-0.18*Math.exp(-local*12);
      this.envelope=Math.min(1,this.envelope+1/(sampleRate*0.1));
      const dry=(lead*0.11+bass*0.055+drums)*this.envelope;
      channels[0][i]=Math.tanh(dry+pad*0.025*duck);
      if(channels[1])channels[1][i]=Math.tanh(dry+(Math.sin(this.padPhase*Math.PI*2+0.14)+0.5*Math.sin(this.padHighPhase*Math.PI*2+0.25))*0.025*duck);
      this.samples++;
    }
    return true;
  }
}
registerProcessor('dawn-score',DawnScore);
