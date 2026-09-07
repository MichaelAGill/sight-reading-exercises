// Original compositional vocabulary; no source score, tune, or passage is encoded here.
export const styleProfiles = [
  { id:'lyrical', name:'Lyrical miniature', character:'Andante cantabile', tempo:72, articulation:'legato', accompaniment:'sustained', titles:['Quiet light','An open window','Still waters','Evening colours'] },
  { id:'dance', name:'Little dance', character:'Allegretto, lightly', tempo:92, articulation:'staccato', accompaniment:'waltz', titles:['A little promenade','Turning leaves','A small celebration','In the courtyard'] },
  { id:'classical', name:'Classical period', character:'Moderato, with poise', tempo:84, articulation:'legato', accompaniment:'broken', titles:['Morning conversation','A passing thought','Two small phrases','A gentle answer'] },
  { id:'invention', name:'Two-part invention', character:'Andantino, clearly', tempo:80, articulation:'legato', accompaniment:'counterline', titles:['Lines in conversation','A thread of silver','Across the room','Echo and answer'] },
] as const;
export const phraseStructures: Record<number,number[][]> = {1:[[3,3],[2,2,2]],2:[[3,3]],3:[[4,4],[2,2,4]],4:[[4,4],[2,2,4]],5:[[4,4],[4,4,4]],6:[[4,4,4],[4,4,4,4]],7:[[4,4,4,4],[4,4,4,4,4]],8:[[4,4,4,4],[4,4,4,4,4],[4,4,4,4,4,4]]};
export const harmonicProgressions = {
  six: ['I','IV','V','I','V','I'],
  period: ['I','IV','I','V','I','IV','V','I'],
  opening: ['I','vi','IV','V'], development:['I','ii','V','V'], closing:['I','IV','V','I'],
} as const;
export const cadenceRules = { half:['V'], authentic:['V','I'], plagal:['IV','I'], finalMelodyDegree:0, finalBassDegree:0 };
export const melodicContourRules = { motifs:[[0,1,2,1],[2,1,0,1],[0,2,1,0],[0,1,0,-1]], maxUncompensatedLeap:5, minStepRatio:0.5, maxRepeatedPitchRun:4, targetChordToneRatio:0.6 };
// Values are quarter-note units, then converted to integer 48-PPQ ticks.
export const rhythmPatterns = {
  plain:[[1,1],[0.5,0.5,1],[1,0.5,0.5]], dotted:[[1.5,0.5]],
  flowing:[[0.5,0.5],[0.25,0.25,0.5]], triplet:[[1/3,1/3,1/3]],
  compound:[[1.5],[1,0.5],[0.5,0.5,0.5]], syncopated:[[0.5,1,0.5]],
};
export const accompanimentPatterns = { sustained:'one bass per bar', waltz:'bass then chord tones', broken:'root, fifth, third, fifth', counterline:'held inner voice over moving bass' };
export const voiceLeadingRules = { maxChordSpan:12, maxBassLeap:7, preferCommonTones:true, avoidParallelPerfectIntervals:true, minMelodyBassGap:3 };
