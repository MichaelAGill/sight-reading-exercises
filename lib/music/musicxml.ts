import { type Exercise,type Note,barTicks,PPQ } from './model';
const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function toMusicXML(e:Exercise):string {
 const breaks=new Set(e.layout.systems.slice(1).map(s=>s[0]));
 let xml=`<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><work><work-title>${escape(e.title)}</work-title></work><identification><creator type="composer">Original practice exercise</creator></identification><defaults><scaling><millimeters>7</millimeters><tenths>40</tenths></scaling></defaults><part-list><score-part id="P1"><part-name>Piano</part-name><part-abbreviation></part-abbreviation><score-instrument id="I1"><instrument-name>Piano</instrument-name></score-instrument><midi-instrument id="I1"><midi-channel>1</midi-channel><midi-program>1</midi-program></midi-instrument></score-part></part-list><part id="P1">`;
 const [beats,beatType]=e.metre.split('/');
 e.measures.forEach((m,i)=>{
  xml+=`<measure number="${m.number}">`;
  if(breaks.has(i))xml+='<print new-system="yes"><system-layout><system-distance>110</system-distance></system-layout></print>';
  if(i===0)xml+=`<attributes><divisions>${PPQ}</divisions><key><fifths>${e.fifths}</fifths><mode>${e.mode}</mode></key><time><beats>${beats}</beats><beat-type>${beatType}</beat-type></time><staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes>`;
  if(m.clef)xml+=`<attributes><clef number="2"><sign>${m.clef==='treble'?'G':'F'}</sign><line>${m.clef==='treble'?2:4}</line></clef></attributes>`;
  if(m.octaveShift!==undefined)xml+=`<direction placement="above"><direction-type><octave-shift type="${m.octaveShift?'down':'stop'}" size="8"/></direction-type><staff>1</staff></direction>`;
  if(m.dynamic)xml+=`<direction placement="below"><direction-type><dynamics><${m.dynamic}/></dynamics></direction-type><staff>1</staff></direction>`;
  if(i===0)xml+=`<direction placement="above"><direction-type><words>${escape(e.style==='Little dance'?'Allegretto, lightly':e.style==='Lyrical miniature'?'Andante cantabile':'Moderato, with poise')}</words></direction-type><staff>1</staff></direction>`;
  if((m.tempoFactor??1)!==(e.measures[i-1]?.tempoFactor??1))xml+=`<direction placement="above"><direction-type><words>${!m.tempoFactor?'a tempo':i===e.measures.length-1?'poco rit.':'Meno mosso'}</words></direction-type><staff>1</staff><sound tempo="${e.tempo*(m.tempoFactor??1)}"/></direction>`;
  if(m.pedal)xml+='<direction placement="below"><direction-type><pedal type="start" line="yes"/></direction-type><staff>2</staff></direction>';
  if(m.unaCorda&&!e.measures[i-1]?.unaCorda)xml+='<direction placement="below"><direction-type><words>una corda</words></direction-type><staff>2</staff></direction>';
  if(!m.unaCorda&&e.measures[i-1]?.unaCorda)xml+='<direction placement="below"><direction-type><words>tre corde</words></direction-type><staff>2</staff></direction>';
  m.voices.forEach((v,vi)=>{
   if(vi)xml+=`<backup><duration>${barTicks(e.metre)}</duration></backup>`;
   v.notes.forEach(n=>{
    if(n.grace){const p=n.grace;xml+=`<note><grace slash="yes"/><pitch><step>${p.step}</step><alter>${p.alter}</alter><octave>${p.octave}</octave></pitch><voice>${v.id}</voice><type>eighth</type><staff>${v.staff}</staff></note>`;}
    const pitches=n.pitches.length?n.pitches:[null];
    pitches.forEach((p,pi)=>{
     xml+=`<note id="${n.id}-${pi}">${pi?'<chord/>':''}`;
     // MusicXML pitches remain sounding pitches; octave-shift is an engraving directive.
     xml+=p?`<pitch><step>${p.step}</step><alter>${p.alter}</alter><octave>${p.octave}</octave></pitch>`:'<rest/>';
     xml+=`<duration>${n.duration}</duration>`;
     if(n.tie&&p){if(n.tie==='stop'||n.tie==='continue')xml+='<tie type="stop"/>';if(n.tie==='start'||n.tie==='continue')xml+='<tie type="start"/>';}
     xml+=`<voice>${v.id}</voice><type>${n.type}</type>${n.dots?'<dot/>':''}`;
     if(n.tuplet)xml+='<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes><normal-type>eighth</normal-type></time-modification>';
     if(v.id===3)xml+='<stem>up</stem>';else if(v.staff===2&&m.voices.length===3)xml+='<stem>down</stem>';
     xml+=`<staff>${v.staff}</staff>`;
     const marks:string[]=[];
     if(n.tie&&p){if(n.tie==='stop'||n.tie==='continue')marks.push('<tied type="stop"/>');if(n.tie==='start'||n.tie==='continue')marks.push('<tied type="start"/>');}
     if(n.slur&&pi===0)marks.push(`<slur type="${n.slur}" number="1"/>`);
     if(n.articulation&&pi===0)marks.push(`<articulations><${n.articulation}/></articulations>`);
     if(n.spread)marks.push('<arpeggiate/>');
     if(n.tuplet&&n.tuplet!=='middle')marks.push(`<tuplet type="${n.tuplet}" number="1"/>`);
     if(marks.length)xml+=`<notations>${marks.join('')}</notations>`;
     xml+='</note>';
    });
   });
  });
  if(m.pedal)xml+='<direction placement="below"><direction-type><pedal type="stop" line="yes"/></direction-type><staff>2</staff></direction>';
  if(i===e.measures.length-1)xml+='<barline location="right"><bar-style>light-heavy</bar-style></barline>';
  xml+='</measure>';
 });
 return xml+'</part></score-partwise>';
}
