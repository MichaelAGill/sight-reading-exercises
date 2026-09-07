import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const input=JSON.parse(fs.readFileSync('C:/Users/m1k4/Downloads/abrsmGradeRules.json','utf8'));
fs.mkdirSync('docs',{recursive:true});
fs.writeFileSync('docs/supplied-rules.original.json',JSON.stringify(input,null,2));
const introducedKeys=[['C major','D minor','G major','F major','A minor'],['D major','E minor','G minor'],['A major','B-flat major','E-flat major','B minor'],[],['E major','A-flat major','F-sharp minor','C minor'],['C-sharp minor','F minor'],[],['B major','D-flat major']];
const introducedMetres=[['2/4','3/4','4/4'],[],['3/8'],['6/8'],[],['9/8','5/8','5/4'],['7/8','7/4'],['12/8']];
const featureGrade={dottedHalf:1,dottedQuarter:2,ties:2,semiquavers:3,dyads:3,chromaticism:4,anacrusis:4,tenuto:4,fermata:4,syncopation:5,fourPartChords:5,finalRitardando:5,triplets:6,clefChanges:6,pedal:6,tempoChanges:7,octaveSigns:7,unaCorda:7,triads:8,spreadChords:8,ornaments:8,acceleration:8};
const grades={};
for(let g=1;g<=8;g++) {
 const old=input.grades[g];
 grades[g]={grade:g,label:old.difficultyLabel,rationale:old.rationale.replaceAll('C-sharp/F minor','C-sharp minor and F minor').replaceAll('B/D minor','B major and D-flat major'),
  source:'ABRSM Piano Practical Grades 2025–2026, page 16; cumulative from Initial Grade',
  introducedKeys:introducedKeys[g-1],keys:introducedKeys.slice(0,g).flat(),metres:introducedMetres.slice(0,g).flat(),
  length:{min:[6,6,6,8,8,12,16,16][g-1],max:[6,6,8,8,12,16,20,28][g-1],target:[6,6,8,8,12,16,20,20][g-1],rationale:g===8?'Official requirement: approximately one page. Bar limits are a generous implementation guard only; rendered systems, density and page fit are mandatory.':old.sightReadingRules.lengthBars.rationale},
  limits:{maxNotesPerHand:g===8?3:g>=3?2:1,maxTotalNotes:g>=8?5:g>=5?4:g>=3?3:2,maxVoices:g>=6?3:g>=2?2:1,maxMelodicLeap:[5,5,7,7,9,12,12,12][g-1],maxBassLeap:7,maxHandSpan:g<3?7:12,maxHandRange:g<3?7:g<5?19:28,maxAccidentalsPerBar:g<4?2:g<6?3:5,minNoteTicks:g>=3?12:24,maxAdvancedFamilies:g<5?1:g<8?2:3,clefs:['treble','bass'],handsTogether:g>=2},
  optionalFeatures:Object.entries(featureGrade).filter(([,v])=>v<=g).map(([k])=>k),hardExclusions:Object.entries(featureGrade).filter(([,v])=>v>g).map(([k])=>k),
  dynamics:g===1?['p','mp','mf','f']:g<5?['pp','p','mp','mf','f']:['pp','p','mp','mf','f','ff'],
  musicality:{minChordToneRatio:0.55,minStepRatio:0.5,maxRepeatedPitchRun:5,maxIdenticalBarRun:2,required:['tonic opening','balanced phrases','motif recurrence with variation','supported non-chord tones','functional harmony','cadence','tonic ending','melody above accompaniment']},
  difficulty:{minimum:[3,6,9,11,14,18,21,25][g-1],typical:[ [4,13],[7,18],[11,25],[14,30],[19,38],[24,45],[28,52],[34,65] ][g-1],maximum:[18,24,32,38,46,56,64,78][g-1],rationale:'Local feature-load heuristic, not an ABRSM grade or student score. All components are recomputed from music events; see difficulty.ts.'},
  engraving:{targetSystems:g===8?[4,6]:[1,6],maxBarsPerSystem:4,minBarsPerSystem:2,maxWeightedSymbolsPerSystem:155,minPageFill:g===8?0.55:0,maxPageFill:0.98,minOnsetsPerBar:g===8?4.5:0,maxOnsetsPerBar:g===8?26:24},
  repertoireContext:old.repertoireReference,
  validation:['schema','keys','metre','measure totals','feature gates','hand spans','range','musicality','difficulty','engraving'],
 };
}
grades[1].rationale='Single-line exchanges between hands, each in a fixed five-finger position. D minor is inherited from Initial Grade. No dotted-quarter/quaver patterns before Grade 2.';
grades[2].rationale='Hands together while remaining within five-finger positions; ties and dotted-quarter/quaver patterns become available.';
grades[5].rationale='Adds E and A-flat major, F-sharp and C minor; modest syncopation and four-note textures with at most two notes per hand.';
grades[6].rationale='Adds C-sharp and F minor, irregular metres, triplets, treble/bass clef changes and right pedal. Two notes per hand remains the chord ceiling.';
grades[7].rationale='Longer phrases with optional irregular metres, tempo changes, octave signs and una corda; no three-note hand chords or ornaments yet.';
grades[8].rationale='Adds B and D-flat major, 12/8, three-note hand chords, spread chords, simple ornaments and acceleration; balance approximately one engraved page.';
const rules={schemaVersion:'2.0.0',label:'Original ABRSM-aligned practice exercise',audited:'2026-09-07',syllabus:'Piano Practical Grades 2025 & 2026',upcoming:'2027 & 2028 published; effective 2027-01-01; ABRSM confirms sight-reading unchanged',affiliation:'Independent practice tool. Not official, endorsed by or affiliated with ABRSM.',featureGrade,grades};
fs.mkdirSync('lib/music',{recursive:true});
fs.writeFileSync('lib/music/abrsmGradeRules.json',JSON.stringify(rules,null,2)+'\n');
const p=JSON.parse(fs.readFileSync('package.json','utf8'));
p.name='sight-reading-trainer'; p.scripts={...p.scripts,dev:'vite --host 127.0.0.1',build:'tsc --noEmit && vite build',start:'vite preview --host 127.0.0.1',test:'vitest run', 'test:ui':'playwright test',typecheck:'tsc --noEmit'};
fs.writeFileSync('package.json',JSON.stringify(p,null,2));
