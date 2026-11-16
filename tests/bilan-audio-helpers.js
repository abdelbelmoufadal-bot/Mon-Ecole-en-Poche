async function settle(){for(let i=0;i<8;i++)await Promise.resolve();}
async function finishVoice(f){
 const player=f.w.eval('currentAudio');
 if(player)player.dispatchEvent(new f.w.Event('ended'));
 else {const utterance=f.utterances.at(-1);if(utterance?.onend)utterance.onend();}
 await settle();
}
async function finishFeedback(f){await finishVoice(f);f.flush(500);await settle();await finishVoice(f);f.flush(500);await settle();const next=f.w.document.querySelector('#bilan-next-question,#en-next');if(next&&!next.hidden)next.click();await settle();}
module.exports={settle,finishVoice,finishFeedback};
