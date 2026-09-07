import { type Exercise,type Check,allNotes,barTicks,midi,PPQ,mod } from './model';
import { gradeRule } from './abrsmGradeRules';
import { isChordTone,keyAlter } from './theory';
import { scoreDifficulty } from './difficulty';
export function validate(e:Exercise):Check[] {
 const r=gradeRule(e.grade),checks:Check[]=[],notes=allNotes(e),bar=barTicks(e.metre);
 const check=(name:string,passed:boolean,detail:string)=>checks.push({name,passed,detail});
 check('key signatures',r.keys.includes(e.key),'Cumulative official key set');
 check('metre',r.metres.includes(e.metre),e.metre);
 check('length',e.measures.length>=r.length.min&&e.measures.length<=r.length.max,`${e.measures.length} bars`);
 check('measure duration',e.measures.every(m=>m.voices.every(v=>{let t=0;return v.notes.every(n=>{const ok=n.tick===t;t+=n.duration;return ok;})&&t===bar;})),'Every voice fills each measure; integer ticks');
 const base={whole:192,half:96,quarter:48,eighth:24,'16th':12};
 check('rhythmic validity',notes.every(n=>n.duration>=r.limits.minNoteTicks&&Number.isInteger(n.duration)&&n.duration===base[n.type]*(n.dots?1.5:1)*(n.tuplet?2/3:1)&&(!n.tuplet||e.grade>=6)&&(!n.tie||e.grade>=2)&&!(e.grade===1&&n.type==='quarter'&&n.dots)),'Written values exactly match ticks, including dots and tuplets');
 const openTies=new Map<string,number>();let tiesValid=true;
 for(const m of e.measures)for(const v of m.voices)for(const n of v.notes)for(const p of n.pitches){const key=v.id+':'+midi(p),time=(m.number-1)*bar+n.tick;if(n.tie==='stop'||n.tie==='continue'){if(openTies.get(key)!==time)tiesValid=false;openTies.delete(key);}if(n.tie==='start'||n.tie==='continue')openTies.set(key,time+n.duration);}
 check('ties',tiesValid&&openTies.size===0,'Tied notes have matching pitch, voice, duration and endpoint');
 check('chords and voices',e.measures.every(m=>m.voices.filter(v=>v.notes.some(n=>n.pitches.length)).length<=r.limits.maxVoices&&m.voices.every(v=>v.notes.every(n=>n.pitches.length<=r.limits.maxNotesPerHand&&(!(n.grace||n.spread)||e.grade>=8)))),'Per-hand chord and voice ceilings; ornaments and spread chords from Grade 8');
 let playable=true,separated=true,handRange=true,simultaneous=true;
 for(const m of e.measures){const onsets=[...new Set(m.voices.flatMap(v=>v.notes.map(n=>n.tick)))];for(const t of onsets){const active=m.voices.flatMap(v=>v.notes.filter(n=>n.tick<=t&&n.tick+n.duration>t).map(n=>({staff:v.staff,notes:n.pitches.map(midi)})));const rh=active.filter(v=>v.staff===1).flatMap(v=>v.notes),lh=active.filter(v=>v.staff===2).flatMap(v=>v.notes);for(const ps of [rh,lh])if(ps.length&&(Math.max(...ps)-Math.min(...ps)>r.limits.maxHandSpan||ps.length>r.limits.maxNotesPerHand))playable=false;if(rh.length+lh.length>r.limits.maxTotalNotes)playable=false;if(rh.length&&lh.length){if(Math.min(...rh)-Math.max(...lh)<2)separated=false;if(e.grade===1)simultaneous=false;}}}
 if(e.grade<=2)for(const staff of [1,2]){const ps=e.measures.flatMap(m=>m.voices.filter(v=>v.staff===staff).flatMap(v=>v.notes.flatMap(n=>n.pitches.map(midi))));if(Math.max(...ps)-Math.min(...ps)>7)handRange=false;}
 check('playability',playable&&simultaneous,'Concurrent notes, chord stretches, Grade 1 hands separately');
 check('hand positions',handRange,'Fixed five-finger range through Grade 2');
 check('melody separation',separated,'Melody remains above supporting voices');
 check('register balance',notes.every(n=>n.pitches.every(p=>midi(p)>=36&&midi(p)<=96)),'C2–C7 conservative piano register');
 check('accidentals',e.measures.every(m=>{let count=0,majorChromatic=false;for(const v of m.voices){const state=new Map<string,number>();for(const n of v.notes)for(const p of n.pitches){const id=p.step+p.octave;if(p.alter!==(state.get(id)??keyAlter(e.fifths,p.step)))count++;state.set(id,p.alter);if(p.alter!==keyAlter(e.fifths,p.step)&&e.mode==='major')majorChromatic=true;}}return count<=r.limits.maxAccidentalsPerBar&&(e.grade>=4||!majorChromatic);}), 'Printed accidental changes; only minor-key alterations before Grade 4');
 const melodic=e.measures.flatMap(m=>m.voices.flatMap(v=>v.notes.filter(n=>n.role==='melody'&&n.pitches.length).map(n=>({n,staff:v.staff,b:m.number}))));
 let steps=0,intervals=0,maxLeap=0,compensated=true,maxRun=1,run=1;
 for(let i=1;i<melodic.length;i++){if(melodic[i].staff!==melodic[i-1].staff)continue;const d=midi(melodic[i].n.pitches.at(-1)!)-midi(melodic[i-1].n.pitches.at(-1)!);if(d!==0){intervals++;if(Math.abs(d)<=2)steps++;}maxLeap=Math.max(maxLeap,Math.abs(d));run=d===0?run+1:1;maxRun=Math.max(maxRun,run);if(Math.abs(d)>5&&i+1<melodic.length){const next=midi(melodic[i+1].n.pitches.at(-1)!)-midi(melodic[i].n.pitches.at(-1)!);if(next!==0&&(Math.sign(next)===Math.sign(d)||Math.abs(next)>2))compensated=false;}}
 check('melodic contour',maxLeap<=r.limits.maxMelodicLeap&&(intervals===0||steps/intervals>=r.musicality.minStepRatio),`Step ratio ${(steps/Math.max(1,intervals)).toFixed(2)}, largest leap ${maxLeap} semitones`);
 check('leap compensation',compensated,'Leaps over a fourth resolve by contrary step or a resting repeated tone');
 check('excessive repetition',maxRun<=r.musicality.maxRepeatedPitchRun,`Longest repeated-pitch run ${maxRun}`);
 let chord=0,total=0,nonChordSupported=true;
 for(const m of e.measures)for(const v of m.voices){const ns=v.notes.filter(n=>n.pitches.length&&n.role==='melody');ns.forEach((n,i)=>{total++;if(isChordTone(n.pitches.at(-1)!,e.tonic,e.mode,m.harmony))chord++;else {const a=ns[i-1],b=ns[i+1];if(!a||!b||Math.abs(midi(a.pitches.at(-1)!)-midi(n.pitches.at(-1)!))>2||Math.abs(midi(b.pitches.at(-1)!)-midi(n.pitches.at(-1)!))>2)nonChordSupported=false;}});}
 check('chord-tone balance',chord/Math.max(total,1)>=r.musicality.minChordToneRatio,`${Math.round(chord/Math.max(total,1)*100)}% chord tones`);
 check('non-chord tones',nonChordSupported,'Passing or neighbour tones must have stepwise preparation and resolution');
 const allowed:Record<string,string[]>={I:['I','ii','IV','V','vi','V/V'],ii:['V'],IV:['IV','I','V','ii'],V:['I','V','vi'],vi:['IV','ii','V'], 'V/V':['V']};
 check('harmonic progression',e.measures.every((m,i)=>i===0||allowed[e.measures[i-1].harmony].includes(m.harmony)),'Functional progression grammar');
 check('tonal-centre clarity',e.measures[0].harmony==='I'&&e.measures.at(-1)?.harmony==='I'&&chord/Math.max(total,1)>=0.55,'Tonic frame and harmonic support');
 check('phrase balance',e.phraseStructure.reduce((a,b)=>a+b,0)===e.measures.length&&e.phraseStructure.every(n=>n>=2&&n<=4),'Phrases of two to four bars');
 check('cadence',e.measures.at(-1)?.harmony==='I'&&['V','IV'].includes(e.measures.at(-2)?.harmony??''),'Final dominant–tonic or subdominant–tonic');
 const last=melodic.at(-1)!.n;
 check('musical ending',mod(midi(last.pitches.at(-1)!)-midi(e.tonic),12)===0&&(last.duration>=PPQ||last.tie==='stop'),'Final melody settles on sustained tonic');
 let bassLeap=0;
 const bass=e.measures.map(m=>m.voices.flatMap(v=>v.notes).find(n=>n.role==='bass'&&n.pitches.length)?.pitches[0]).filter(x=>!!x);
 for(let i=1;i<bass.length;i++)bassLeap=Math.max(bassLeap,Math.abs(midi(bass[i])-midi(bass[i-1])));
 check('bass voice leading',bassLeap<=r.limits.maxBassLeap,`Largest harmonic bass move ${bassLeap} semitones`);
 const downbeats=e.measures.map(m=>({s:m.voices.flatMap(v=>v.notes).find(n=>n.role==='melody'&&n.pitches.length)?.pitches.at(-1),b:m.voices.flatMap(v=>v.notes).find(n=>n.role==='bass'&&n.pitches.length)?.pitches[0]}));let parallels=0;for(let i=1;i<downbeats.length;i++){const a=downbeats[i-1],b=downbeats[i];if(!a.s||!a.b||!b.s||!b.b)continue;const before=mod(midi(a.s)-midi(a.b),12),after=mod(midi(b.s)-midi(b.b),12),s=midi(b.s)-midi(a.s),bass=midi(b.b)-midi(a.b);if([0,7].includes(before)&&before===after&&s!==0&&bass!==0&&Math.sign(s)===Math.sign(bass))parallels++;}
 check('outer voice leading',parallels===0,'Avoid parallel perfect intervals between successive harmonic downbeats');
 check('notation gates',e.measures.every(m=>(!m.clef||e.grade>=6)&&(!m.pedal||e.grade>=6)&&(!m.octaveShift||e.grade>=7)&&(!m.unaCorda||e.grade>=7)&&(!m.tempoFactor||e.grade>=5)),'Treble/bass clefs and expressive feature progression');
 const families=[notes.some(n=>n.tuplet),e.measures.some(m=>m.clef),e.measures.some(m=>m.octaveShift),e.measures.some(m=>m.pedal),/^(5|7)\//.test(e.metre)].filter(Boolean).length;
 check('feature budget',families<=r.limits.maxAdvancedFamilies,`${families} advanced feature families`);
 const difficulty=scoreDifficulty(e).total;
 check('difficulty',difficulty>=r.difficulty.minimum&&difficulty<=r.difficulty.maximum,`${difficulty}; permitted ${r.difficulty.minimum}–${r.difficulty.maximum}`);
 check('layout plan',e.layout.systems.every(s=>s.length>=2&&s.length<=4)&&e.layout.systems.flat().length===e.measures.length,'Balanced systems, no orphan bars');
 check('page density',e.grade!==8||(e.layout.systems.length>=4&&e.layout.systems.length<=6&&e.layout.density>=r.engraving.minOnsetsPerBar&&e.layout.density<=r.engraving.maxOnsetsPerBar&&e.layout.complexity>=1),'Grade 8: 4–6 systems plus rhythmic and notation density; rendered-page check follows engraving');
 return checks;
}
