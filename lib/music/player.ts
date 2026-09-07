import { type Exercise,barTicks,PPQ } from './model';
import { remainingEvents,secondsAtTick,tickAtSeconds } from './events';
export type PlaybackState='idle'|'loading'|'playing'|'paused';
export type PlayerOptions={tempo:number;countIn:boolean;metronome:boolean;loop:boolean};
// Audio-clock scheduling. Every scheduled node is retained so Stop also cancels future attacks.
export class PianoPlayer {
 private context?:AudioContext;private buffers=new Map<number,AudioBuffer>();private loading?:Promise<void>;
 private nodes=new Set<AudioScheduledSourceNode>();private interval?:ReturnType<typeof setInterval>;private epoch=0;private offset=0;private next=0;private nextBeat=0;private prelude=0;private events:ReturnType<typeof remainingEvents>=[];
 state:PlaybackState='idle';tick=0;exercise?:Exercise;options:PlayerOptions={tempo:80,countIn:false,metronome:false,loop:false};
 constructor(private onUpdate:(state:PlaybackState,tick:number,count:number)=>void){}
 private async init(){
  if(!this.context)this.context=new AudioContext();
  await this.context.resume();
  if(this.buffers.size)return;
  if(!this.loading)this.loading=(async()=>{const {ToneAudioBuffer,start}=await import('tone');await start();const samples=[36,39,42,45,48,51,54,57,60,63,66,69,72,75,78,81,84];await Promise.all(samples.map(async key=>{const names=['C','Cs','D','Ds','E','F','Fs','G','Gs','A','As','B'];const file=names[key%12]+(Math.floor(key/12)-1);const b=await ToneAudioBuffer.fromUrl(`/audio/${file}.mp3`);const data=b.get();if(!data)throw Error('Piano sample could not be decoded');this.buffers.set(key,data);}));})().catch(err=>{this.buffers.clear();this.loading=undefined;throw err;});
  await this.loading;
 }
 private clear(){if(this.interval)clearInterval(this.interval);this.interval=undefined;for(const n of this.nodes){try{n.stop();}catch{}n.disconnect();}this.nodes.clear();}
 private note(pitch:number,time:number,duration:number,velocity:number){const ctx=this.context!;const sample=[...this.buffers.keys()].reduce((a,b)=>Math.abs(b-pitch)<Math.abs(a-pitch)?b:a);const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=this.buffers.get(sample)!;source.playbackRate.value=2**((pitch-sample)/12);source.connect(gain);gain.connect(ctx.destination);gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(velocity*0.42,time+0.005);gain.gain.setValueAtTime(velocity*0.42,time+Math.max(0.01,duration));gain.gain.exponentialRampToValueAtTime(0.0001,time+duration+0.12);source.start(time);source.stop(time+duration+0.15);this.nodes.add(source);source.onended=()=>{this.nodes.delete(source);gain.disconnect();};}
 private click(time:number,strong:boolean){const ctx=this.context!,o=ctx.createOscillator(),gain=ctx.createGain();o.frequency.value=strong?1300:950;o.connect(gain);gain.connect(ctx.destination);gain.gain.setValueAtTime(0.065,time);gain.gain.exponentialRampToValueAtTime(0.0001,time+0.04);o.start(time);o.stop(time+0.05);this.nodes.add(o);o.onended=()=>{this.nodes.delete(o);gain.disconnect();};}
 async play(e:Exercise,options:PlayerOptions){
  const resume=this.state==='paused'&&this.exercise===e;
  const request=++this.request;
  this.state='loading';this.onUpdate(this.state,this.tick,0);
  try{await this.init();}catch{if(request===this.request){this.state='idle';this.onUpdate('idle',0,0);}throw Error('The piano sound could not load. Check the local audio files and try Play again.');}
  if(request!==this.request)return;
  this.exercise=e;this.options=options;if(!resume)this.tick=0;
  this.begin(!resume&&options.countIn);
 }
 private request=0;
 private begin(countIn:boolean){this.clear();const e=this.exercise!,ctx=this.context!,o=this.options;this.offset=secondsAtTick(e,this.tick,o.tempo);const beat=60/o.tempo;this.prelude=countIn?barTicks(e.metre)/PPQ*beat:0;this.epoch=ctx.currentTime+0.08+this.prelude;this.events=remainingEvents(e,this.tick);this.next=0;this.nextBeat=Math.ceil(this.tick/PPQ);if(countIn){const unit=e.metre.endsWith('/8')?0.5:1;for(let i=0;i<barTicks(e.metre)/PPQ;i+=unit)this.click(this.epoch-this.prelude+i*beat,i===0);}
  this.state='playing';this.schedule();this.interval=setInterval(()=>this.schedule(),20);
 }
 private schedule(){const e=this.exercise!,ctx=this.context!,o=this.options,now=ctx.currentTime;while(this.next<this.events.length){const n=this.events[this.next],time=this.epoch+secondsAtTick(e,n.tick,o.tempo)-this.offset;if(time>now+0.1)break;const end=secondsAtTick(e,n.tick+n.duration,o.tempo),start=secondsAtTick(e,n.tick,o.tempo);this.note(n.midi,Math.max(time,now),Math.max(0.02,(end-start)*n.gate),n.velocity);this.next++;}
  const total=e.measures.length*barTicks(e.metre);if(o.metronome)while(this.nextBeat*PPQ<total){const t=this.nextBeat*PPQ,time=this.epoch+secondsAtTick(e,t,o.tempo)-this.offset;if(time>now+0.1)break;this.click(Math.max(time,now),t%barTicks(e.metre)===0);this.nextBeat++;}
  const elapsed=now-this.epoch;this.tick=tickAtSeconds(e,Math.max(0,elapsed)+this.offset,o.tempo);const count=elapsed<0?Math.ceil(-elapsed/(60/o.tempo)):0;
  this.onUpdate('playing',this.tick,count);
  if(this.tick>=total){if(o.loop){this.tick=0;this.begin(false);}else this.stop();}
 }
 pause(){if(this.state!=='playing')return;this.clear();this.state='paused';this.onUpdate('paused',this.tick,0);}
 stop(){this.request++;this.clear();this.tick=0;this.state='idle';this.onUpdate('idle',0,0);}
 setOptions(options:PlayerOptions){const running=this.state==='playing';if(running)this.pause();this.options=options;if(running)this.begin(false);}
 dispose(){this.stop();void this.context?.close();}
}
