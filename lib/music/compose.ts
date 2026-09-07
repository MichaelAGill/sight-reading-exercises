import { type Exercise,type Grade,type Note,type Pitch,type Measure,type Harmony,type DurationType,PPQ,barTicks,midi,mod } from './model';
import { gradeRule } from './abrsmGradeRules';
import { styleProfiles,phraseStructures,harmonicProgressions,melodicContourRules,rhythmPatterns,cadenceRules,voiceLeadingRules } from './settings';
import { seeded,keyInfo,degreePitch,chordDegrees } from './theory';
import { scoreDifficulty } from './difficulty';
import { planLayout } from './layout';
import { validate } from './validate';
const notation:Record<number,[DurationType,number]>={192:['whole',0],144:['half',1],96:['half',0],72:['quarter',1],48:['quarter',0],36:['eighth',1],24:['eighth',0],18:['16th',1],16:['eighth',0],12:['16th',0]};
export function makeNote(id:string,tick:number,duration:number,pitches:Pitch[],role:Note['role'],velocity=0.7):Note {const form=notation[duration];if(!form)throw Error(`Unsupported duration ${duration}`);return {id,tick,duration,type:form[0],dots:form[1]||undefined,pitches,role,velocity};}
function splitDuration(ticks:number) {const result:number[]=[];for(const d of [192,144,96,72,48,24,12])while(ticks>=d){result.push(d);ticks-=d;}if(ticks)throw Error('Unspellable duration');return result;}
export type ComposeOptions={key?:string;metre?:string;style?:string;feature?:'triplets'|'clef'|'octave'|'pedal'|'ornament'|'spread'|'unaCorda'|'tempo'|'chromatic'|'none';bars?:number};
export function compose(grade:Grade,seed:number,options:ComposeOptions={}):Exercise {
 const r=gradeRule(grade),random=seeded(seed),pick=<T,>(a:readonly T[])=>a[Math.floor(random()*a.length)];
 const key=options.key??pick(r.keys);if(!r.keys.includes(key))throw Error(`Key is excluded at Grade ${grade}`);
 const style=styleProfiles.find(s=>s.id===options.style)??pick(styleProfiles.filter(s=>s.id!=='invention'||grade>=6));
 const metre=options.metre??pick(r.metres.filter(m=>grade>=6||m!=='3/8'));
 if(!r.metres.includes(metre))throw Error('Metre excluded at this grade');
 const info=keyInfo(key),ticks=barTicks(metre),units=ticks/PPQ;
 let structure=pick(phraseStructures[grade]);
 if(grade===8)structure=Array(ticks>192?4:ticks<144?6:5).fill(4);
 if(options.bars)structure=options.bars===6?[3,3]:Array(options.bars/4).fill(4);
 const bars=structure.reduce((a,b)=>a+b,0),motif=pick(melodicContourRules.motifs);
 const plan:Harmony[]=bars===6?[...harmonicProgressions.six]:bars===8?[...harmonicProgressions.period]:Array.from({length:bars/4},(_,i)=>i===0?harmonicProgressions.opening:i===bars/4-1?harmonicProgressions.closing:i%2?harmonicProgressions.development:harmonicProgressions.opening).flat() as Harmony[];
 if(grade<5)for(let i=0;i<plan.length;i++)if(plan[i]==='vi'||plan[i]==='ii')plan[i]='IV';
 if(style.id==='lyrical'&&seed%5===0)plan.splice(-2,2,...cadenceRules.plagal as Harmony[]);
 const cell=(pattern:readonly number[])=>pattern.map(v=>Math.round(v*PPQ));
 let feature:NonNullable<ComposeOptions['feature']>=options.feature??(grade>=6?pick(['triplets','clef','pedal','none'] as const):'none');
 const featureGrades={none:1,chromatic:4,triplets:6,clef:6,pedal:6,octave:7,unaCorda:7,tempo:7,ornament:8,spread:8};
 if(grade<featureGrades[feature])throw Error('Feature excluded');
 if(grade===8&&!options.feature&&random()<0.4)feature=pick(['ornament','spread'] as const);
 if(grade>=7&&!options.feature&&random()<0.2)feature='octave';
 const e:Exercise={seed:seed>>>0,grade,title:pick(style.titles),style:style.name,key,...info,metre,tempo:style.tempo-(grade===1?8:0),phraseStructure:structure,motif:[...motif],measures:[],difficulty:{total:0,features:{}},validation:[],layout:{systems:[],weights:[],density:0,complexity:0}};
 let previous=2,prevBass=0;
 const pitch=(d:number,oct=4,h:Harmony='I')=>degreePitch(info.tonic,info.mode,d,oct,(info.mode==='minor'&&h==='V'&&mod(d,7)===6)||(h==='V/V'&&mod(d,7)===3));
 const phraseEnds=new Set(structure.map((_,i)=>structure.slice(0,i+1).reduce((a,b)=>a+b,0)-1));
 for(let b=0;b<bars;b++) {
  const h=plan[b],end=b===bars-1,phraseEnd=phraseEnds.has(b),octave=feature==='octave'&&b>=4&&b<8?1:0;
  const m:Measure={number:b+1,harmony:h,voices:[],phraseEnd};
  if(b===0||b===Math.floor(bars/2))m.dynamic=b===0?'mp':'mf';
  if(grade>=5&&b===bars-1)m.tempoFactor=0.85;
  if(feature==='tempo'&&b>=4&&b<8)m.tempoFactor=0.9;
  if(feature==='unaCorda'&&b<4)m.unaCorda=true;
  if(feature==='clef'&&(b===4||b===8))m.clef=b===4?'treble':'bass';
  if(feature==='octave'&&(b===4||b===8))m.octaveShift=b===4?1:0;
  if(feature==='pedal'&&b%4===0)m.pedal=true;
  // Form a rhythmic sentence from short cells; cadence bars breathe.
  let durations:number[]=[];
  if(end||phraseEnd)durations=grade===1&&ticks===192?[96,96]:splitDuration(ticks);
  else if(grade===8&&ticks<=96)durations=Array(ticks/12).fill(12);
  else if(metre.endsWith('/8')&&Number(metre.split('/')[0])%3===0) {
   for(let u=0;u<units;u+=1.5)durations.push(...cell(rhythmPatterns.compound[b%2===0?1:2]));
  } else {
   let left=ticks;
   if(grade>=5&&left>=96&&b%4===2){durations.push(...cell(rhythmPatterns.syncopated[0]));left-=96;}
   else if(grade>=2&&left>=96&&b%3===1){durations.push(...cell(rhythmPatterns.dotted[0]));left-=96;}
   if(grade>=6&&feature==='triplets'&&b%4===2&&left>=48){durations.push(...cell(rhythmPatterns.triplet[0]));left-=48;}
   while(left>=48){if(grade>=3&&b%4===2&&left===48)durations.push(...cell(rhythmPatterns.flowing[1]));else if((grade>=3||b%2===1)&&left>=48)durations.push(...cell(rhythmPatterns.flowing[0]));else durations.push(48);left-=48;}
   if(left)durations.push(...splitDuration(left));
  }
  const melody:Note[]=[];let tick=0;
  // Each bar develops the same contour around a close harmonic anchor.
  const candidates=Array.from({length:grade<3?5:10},(_,i)=>i+(grade<3?0:-2)).filter(d=>chordDegrees(h).includes(mod(d,7)));
  const arch=b<bars/2?[2,4,3,1]:[2,3,1,0];
  const cost=(d:number)=>Math.abs(d-previous)*0.6+Math.abs(d-arch[b%4])*0.65;
  const anchor=end?0:phraseEnd?(h==='V'?1:0):candidates.reduce((a,c)=>cost(c)<cost(a)?c:a,candidates[0]);
  const preferred=motif[1]>motif[0]?1:-1;
  const neighbour=[preferred,-preferred].find(dir=>candidates.includes(anchor+dir*2))??(anchor>=4?-1:1);
  // A complete neighbour figure has a beginning and a resolution. Its direction
  // comes from the motif; shorten it by omitting decoration, never its resolution.
  const shape=[0,neighbour,candidates.includes(anchor+neighbour*2)?neighbour*2:0,0];
  const wanted=durations.map((_,i)=>anchor+(durations.length>=3?shape[i%4]:0));
  for(let i=0;i<durations.length;i++) {
   let d=end?0:phraseEnd?(h==='V'?1:0):Math.max(grade<3?0:-2,Math.min(grade<3?4:7,wanted[i]));
   if(i===durations.length-1)d=anchor;
   // A neighbour is short and surrounded by its harmonic anchor.
   if(i%4===1&&(durations[i]>48||i===durations.length-1))d=anchor;
   // Avoid an unexplained leap at the join between phrases.
   if(!end&&!phraseEnd&&Math.abs(d-previous)>3)d=candidates.reduce((a,c)=>Math.abs(c-previous)<Math.abs(a-previous)?c:a,candidates[0]);
   const hand=grade===1&&(b===2||b===4)?2:1;
   const n=makeNote(`b${b}m${i}`,tick,durations[i],[pitch(d,(hand===2?3:4)+octave,h)],'melody',b<bars/2?0.7:0.8);
   if(durations[i]===16)n.tuplet=i===0||durations[i-1]!==16?'start':durations[i+1]===16?'middle':'stop';
   if(style.articulation==='staccato'&&!phraseEnd&&i===0)n.articulation='staccato';
   if(feature==='ornament'&&b===4&&i===0)n.grace=pitch(d+1,4,h);
   if(feature==='chromatic'&&b===1&&i===1&&durations.length>=3){const base=pitch(anchor,4,h);n.pitches=[{...base,alter:base.alter+1}];}
   if(style.articulation==='legato'&&durations.length>1&&!n.tuplet&&(i===0||i===durations.length-1))n.slur=i===0?'start':'stop';
   // Cadence length beyond a single note is tied, never re-attacked.
   if(grade>=2&&(end||phraseEnd)&&durations.length>1)n.tie=i===0?'start':i===durations.length-1?'stop':'continue';
   melody.push(n);previous=d;tick+=durations[i];
  }
  // Spell minor-key passing motion without an augmented second. This chooses
  // the connecting pitch from its two harmonic endpoints, not an unrelated pool.
  if(info.mode==='minor')for(let i=1;i<melody.length-1;i++){if(i%4!==1||melody[i].tie)continue;const a=midi(melody[i-1].pitches[0]),z=midi(melody[i+1].pitches[0]),p=melody[i].pitches[0];if(Math.abs(a-z)<=4&&(Math.abs(midi(p)-a)>2||Math.abs(midi(p)-z)>2)){const target=a===z?a+(midi(p)>a?1:-1):Math.round((a+z)/2);p.alter+=target-midi(p);}}
  if(feature==='chromatic'&&b===1&&melody.length>=3)melody[2].pitches=melody[0].pitches.map(p=>({...p}));
  // A deliberate tied gesture in one phrase; all timing stays in the model.
  if(grade>=2&&b===1&&melody.length>=2&&melody[0].duration===72&&melody[1].duration===24){const n=melody[0];const a={...n,duration:48,type:'quarter' as const,dots:undefined,tie:'start' as const};const c={...n,id:n.id+'t',tick:48,duration:24,type:'eighth' as const,dots:undefined,tie:'stop' as const,slur:undefined};melody.splice(0,1,a,c);}
  const activeStaff:1|2=grade===1&&(b===2||b===4)?2:1;
  m.voices.push({id:1,staff:activeStaff,notes:melody});
  if(grade===1){m.voices.push({id:2,staff:activeStaff===1?2:1,notes:splitDuration(ticks).map((d,i,arr)=>makeNote(`b${b}r${i}`,arr.slice(0,i).reduce((a,v)=>a+v,0),d,[],'bass'))});}
  else {
   const bassCandidates=Array.from({length:grade<3?5:12},(_,i)=>i+(grade<3?0:-4)).filter(d=>chordDegrees(h).includes(mod(d,7)));
  const root=end?cadenceRules.finalBassDegree:b===bars-2?chordDegrees(h)[0]:grade<3?(h==='IV'?3:h==='V'?4:0):bassCandidates.reduce((a,c)=>Math.abs(c-prevBass)+(mod(c,7)===chordDegrees(h)[0]?0:1)<Math.abs(a-prevBass)+(mod(a,7)===chordDegrees(h)[0]?0:1)?c:a,bassCandidates[0]);
   prevBass=root;
   const bassUnit=style.accompaniment==='broken'&&grade>=5?24:style.accompaniment==='sustained'&&grade<8?96:metre.endsWith('/8')?72:48;
   let bassDurations=grade<=2||phraseEnd?splitDuration(ticks):Array.from({length:Math.floor(ticks/bassUnit)},()=>bassUnit);
   let remainder=ticks-bassDurations.reduce((a,v)=>a+v,0);if(remainder)bassDurations.push(...splitDuration(remainder));
   const bass:Note[]=[];let bt=0;
   const bassOct=3;
   bassDurations.forEach((d,i)=>{
    let deg=root;
    if(style.accompaniment==='broken'&&grade>=5&&!phraseEnd){const arpeggio=bassCandidates.filter(x=>x>=root&&x<=root+4);deg=arpeggio[[0,2,1,2][i%4]%arpeggio.length];}
    else if(grade>=3&&!phraseEnd&&i%2===1){const other=bassCandidates.filter(x=>x!==root&&Math.abs(x-root)<=3);if(other.length)deg=other.reduce((a,c)=>Math.abs(c-root)<Math.abs(a-root)?c:a,other[0]);}
    let ps=[pitch(deg,bassOct,h)];
    if(grade>=3&&(i%2===1||end)&&!(grade>=6&&b%4===2)&&!(style.accompaniment==='broken'&&grade>=5&&!end)) {const above=[deg+2,deg+3,deg+4].find(x=>chordDegrees(h).includes(mod(x,7)));if(above!==undefined)ps.push(pitch(above,bassOct,h));}
    if(grade===8&&(i===1||end)&&ps.length===2) {const top=[deg+4,deg+5].find(x=>chordDegrees(h).includes(mod(x,7))&&midi(pitch(x,bassOct,h))>midi(ps[1]));if(top!==undefined)ps.push(pitch(top,bassOct,h));}
    // Keep a clear register gap, including clef-change passages.
    const melodyMin=Math.min(...melody.flatMap(n=>n.pitches.map(midi)));
    while(Math.max(...ps.map(midi))>=melodyMin-voiceLeadingRules.minMelodyBassGap)ps=ps.map(p=>({...p,octave:p.octave-1}));
    const bn=makeNote(`b${b}b${i}`,bt,d,ps,'bass',0.43);if(feature==='spread'&&ps.length>=3&&i===1)bn.spread=true;bass.push(bn);bt+=d;
   });
   m.voices.push({id:2,staff:2,notes:bass});
   // Genuine independent inner voice, held over an active bass line.
   if(grade>=6&&b%4===2&&!phraseEnd){const low=Math.max(...bass.flatMap(n=>n.pitches.map(midi)));const melodyLow=Math.min(...melody.flatMap(n=>n.pitches.map(midi)));const inner=[root+2,root+4,root+7].filter(d=>chordDegrees(h).includes(mod(d,7))).map(d=>pitch(d,3,h)).filter(p=>midi(p)>low&&midi(p)<melodyLow-2&&midi(p)-Math.min(...bass.flatMap(n=>n.pitches.map(midi)))<=12);if(inner.length){let it=0;const ds=splitDuration(ticks);m.voices.push({id:3,staff:2,notes:ds.map((d,i)=>{const n=makeNote(`b${b}i${i}`,it,d,[inner[0]],'inner',0.35);it+=d;if(ds.length>1)n.tie=i===0?'start':i===ds.length-1?'stop':'continue';return n;})});}}
  }
  e.measures.push(m);
 }
 e.layout=planLayout(e);e.difficulty=scoreDifficulty(e);e.validation=validate(e);return e;
}
export function generate(grade:Grade,seed:number,options:ComposeOptions={}):Exercise {for(let attempt=0;attempt<64;attempt++){const e=compose(grade,(seed+attempt*104729)>>>0,options);if(e.validation.every(v=>v.passed))return e;}throw Error('Could not compose a balanced exercise within this grade. Please try Generate again.');}
