import { type Exercise,barTicks,midi,PPQ } from './model';
export type PlaybackEvent={id:string;tick:number;duration:number;midi:number;velocity:number;gate:number;pedal:boolean};
export function playbackEvents(e:Exercise):PlaybackEvent[]{
 const result:PlaybackEvent[]=[],ties=new Map<string,PlaybackEvent>(),bar=barTicks(e.metre);
 for(const m of e.measures)for(const v of m.voices)for(const n of v.notes){
  const onset=(m.number-1)*bar+n.tick,graceTicks=n.grace?Math.min(6,n.duration/4):0,soft=m.unaCorda?0.8:1;
  if(n.grace)result.push({id:n.id+'g',tick:onset,duration:graceTicks,midi:midi(n.grace),velocity:n.velocity*0.7*soft,gate:0.9,pedal:false});
  n.pitches.forEach((p,i)=>{const key=`${v.id}:${midi(p)}`,tick=onset+graceTicks+(n.spread?i*3:0),duration=n.duration-(tick-onset),tied=ties.get(key);
   if((n.tie==='stop'||n.tie==='continue')&&tied){if(tied.tick+tied.duration!==onset)throw Error('Noncontiguous tie');tied.duration+=n.duration;if(n.tie==='stop')ties.delete(key);}
   else {const event={id:n.id,tick,duration,midi:midi(p),velocity:n.velocity*soft,gate:n.articulation==='staccato'?0.48:0.96,pedal:!!m.pedal};result.push(event);if(n.tie==='start')ties.set(key,event);}
  });
 }
 // Sustain is released at the written pedal end (the harmonic barline).
 for(const event of result)if(event.pedal){event.duration=Math.max(event.duration,(Math.floor(event.tick/bar)+1)*bar-event.tick);event.gate=1;}
 return result.sort((a,b)=>a.tick-b.tick||a.midi-b.midi);
}
export function secondsAtTick(e:Exercise,tick:number,tempo:number){const bar=barTicks(e.metre);let seconds=0;for(let i=0;i<e.measures.length;i++){const portion=Math.max(0,Math.min(bar,tick-i*bar));seconds+=portion/PPQ*60/(tempo*(e.measures[i].tempoFactor??1));}return seconds;}
export function tickAtSeconds(e:Exercise,seconds:number,tempo:number){const bar=barTicks(e.metre);let tick=0;for(const m of e.measures){const rate=PPQ*tempo*(m.tempoFactor??1)/60;const duration=bar/rate;if(seconds<=duration)return tick+seconds*rate;seconds-=duration;tick+=bar;}return tick;}
export function remainingEvents(e:Exercise,tick:number){return playbackEvents(e).filter(n=>n.tick+n.duration>tick).map(n=>({...n,duration:n.duration-Math.max(0,tick-n.tick),tick:Math.max(tick,n.tick)}));}
