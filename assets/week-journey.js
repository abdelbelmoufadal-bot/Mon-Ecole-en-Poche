/* Presentation shared by the three course entry points. Workshop IDs stay intact. */
(function () {
  'use strict';
  window.mountWeekJourney = function (options) {
    const {week, course, progress, completed, journey, saveJourney, stop, speak, phoneme, isAtelierDone} = options;
    const main=document.getElementById('main');
    const grid=main.querySelector('.ritual-steps-grid');
    const original=grid?Array.from(grid.children):[];
    if(original.length!==4)return;
    const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const root=document.createElement('section');root.className='cp-week-journey';root.lang='fr';root.dir='ltr';
    const labels=['J’écoute l’histoire','Je découvre le son '+week.graphies[0],'Je découvre le son '+week.graphies[1],'Je joue et je révise','Mon défi de la semaine'];
    const descriptions=['Lina, Sami et Capi',...progress.map(p=>`${p.totalDone} / ${p.total} ateliers réussis`),'Je retrouve les deux sons',completed?'Défi réussi':'Je montre mes découvertes'];
    descriptions[0]='Les personnages de mon histoire';
    root.innerHTML=`<div class="cp-main"><div class="cp-intro"><div><p class="cp-eyebrow">FRANÇAIS · SEMAINE ${week.weekNum} SUR 12</p><h1>${escape(week.title)}</h1><p class="cp-sub">Une histoire, deux sons et plein de découvertes.</p></div><div class="cp-sounds" aria-label="Les sons de la semaine">${week.graphies.map(g=>`<span>${escape(g)}</span>`).join('')}</div></div><div class="cp-progress-label"><span>Mon petit parcours</span><span class="cp-count" aria-live="polite"></span></div><div class="cp-track" role="progressbar" aria-label="Étapes terminées" aria-valuemin="0" aria-valuemax="5" aria-valuenow="0"><div class="cp-fill"></div></div><div class="cp-layout"><nav class="cp-steps" aria-label="Les cinq étapes de la semaine">${labels.map((label,index)=>`<button type="button" class="cp-step" data-week-step="${index}" aria-controls="week-step-${index}"><span class="cp-number">${index+1}</span><span><strong>${escape(label)}</strong><small>${escape(descriptions[index])}</small></span></button>`).join('')}</nav><div class="cp-activity"><div class="cp-current"><span class="cp-kicker"></span><span>À mon rythme</span></div><div class="cp-panels"></div><p class="cp-status" role="status" aria-live="polite"></p><div class="cp-actions"><button type="button" class="cp-next"></button><a class="cp-book" href="#page/${escape(week.firstPageId)}">Mon livre · pages ${escape(week.bookPages)}</a></div></div></div></div>`;
    const panels=root.querySelector('.cp-panels');
    const nodes=[original[0],original[1],original[2],document.createElement('section'),original[3]];
    nodes.forEach((panel,index)=>{panel.id='week-step-'+index;panel.classList.add('cp-stage');panel.setAttribute('aria-label',labels[index]);panels.append(panel);});
    // Keep the original nodes and their audio handlers, links and exercise IDs.
    nodes[0].querySelector('h2').textContent='Rencontre les personnages de l’histoire';
    nodes[1].querySelector('h2').textContent=labels[1];
    nodes[2].querySelector('h2').textContent=labels[2];
    nodes[4].querySelector('h2').textContent='Prêt pour ton petit défi ?';
    const challengeLink=nodes[4].querySelector('a[href^="#bilan/"]');
    challengeLink.textContent=completed?'Rejouer mon défi':'Commencer mon défi';
    const review=nodes[3];
    review.innerHTML=`<h2>Je joue avec les deux sons</h2><p class="muted">Écoute les sons, puis essaie deux petits jeux.</p><div class="cp-review-sounds">${week.graphies.map((g,index)=>`<button type="button" class="btn secondary" data-review-sound="${index}">Écouter le son ${escape(g)}</button>`).join('')}</div><div class="cp-review-game"></div>`;
    review.querySelectorAll('[data-review-sound]').forEach(button=>button.onclick=()=>phoneme(week.graphies[Number(button.dataset.reviewSound)]));
    const choices=week.tests.filter(q=>q.type==='choice');
    const second=choices.find(q=>q!==choices[0]&&String(q.say||q.prompt).includes('son '+week.graphies[1]));
    const questions=[choices[0],second||choices[1]].filter(Boolean);
    let reviewIndex=0;
    function renderReview(){
      const host=review.querySelector('.cp-review-game');
      if(reviewIndex>=questions.length){host.innerHTML='<p class="cp-review-success">Bravo, tu as terminé tes deux petits jeux !</p>';return;}
      const q=questions[reviewIndex];
      host.innerHTML=`<p class="cp-review-counter">Petit jeu ${reviewIndex+1} sur ${questions.length}</p><h3>${escape(q.prompt)}</h3><button type="button" class="btn secondary cp-review-hear">Écouter la consigne</button><div class="cp-review-choices">${q.options.map((o,i)=>`<button type="button" class="cp-choice" data-review-answer="${i}" aria-pressed="false">${escape(o.text)}</button>`).join('')}</div><p class="cp-review-feedback" role="status"></p><button type="button" class="btn yellow cp-review-more" hidden>${reviewIndex+1===questions.length?'Terminer mes petits jeux':'Petit jeu suivant →'}</button>`;
      host.querySelector('.cp-review-hear').onclick=()=>speak(q.say||q.prompt);
      let answered=false;
      host.querySelectorAll('[data-review-answer]').forEach(button=>button.onclick=()=>{
        if(answered)return;
        stop();
        const option=q.options[Number(button.dataset.reviewAnswer)];
        host.querySelectorAll('[data-review-answer]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
        host.querySelector('.cp-review-feedback').textContent=option.correct?'Bravo, tu as trouvé !':'Essaie encore, prends ton temps.';
        if(option.correct){answered=true;host.querySelector('.cp-review-more').hidden=false;}
      });
      host.querySelector('.cp-review-more').onclick=()=>{stop();reviewIndex++;if(reviewIndex===questions.length){journey.review=true;saveJourney();updateProgress();}renderReview();};
    }
    renderReview();
    let selected=Number.isInteger(journey.step)?journey.step:0;
    const status=root.querySelector('.cp-status'),next=root.querySelector('.cp-next');
    function stageDone(index){return index===0?journey.story===true:index===1||index===2?progress[index-1].totalDone===progress[index-1].total:index===3?journey.review===true:completed;}
    function updateProgress(){
      const count=labels.filter((_,index)=>stageDone(index)).length;
      root.querySelector('.cp-count').textContent=`${count} étape${count>1?'s terminées':' terminée'} sur 5`;
      root.querySelector('.cp-track').setAttribute('aria-valuenow',count);root.querySelector('.cp-fill').style.width=count*20+'%';
      root.querySelectorAll('[data-week-step]').forEach((button,index)=>{button.querySelector('.cp-number').textContent=stageDone(index)?'✓':String(index+1);button.setAttribute('aria-label',labels[index]+(stageDone(index)?' · Terminée':''));});
      if(selected===3){next.disabled=!journey.review;next.textContent=journey.review?'Passer à mon défi →':'Je termine mes deux petits jeux';}
    }
    function select(index,remember=true){
      stop();selected=Math.max(0,Math.min(4,index));
      nodes.forEach((panel,i)=>{panel.hidden=i!==selected;});
      root.querySelectorAll('[data-week-step]').forEach((button,i)=>{if(i===selected)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');});
      root.querySelector('.cp-kicker').textContent=`ÉTAPE ${selected+1} SUR 5`;status.textContent='';
      next.textContent=selected===0?(journey.story?'Passer au son '+week.graphies[0]+' →':'J’ai écouté l’histoire →'):selected===1||selected===2?(stageDone(selected)?'Passer à la suite →':'Continuer mes ateliers →'):selected===3?(journey.review?'Passer à mon défi →':'Je termine mes deux petits jeux'):completed?'Retour aux semaines':'Commencer mon défi →';
      next.disabled=selected===3&&!journey.review;
      updateProgress();
      if(remember){journey.step=selected;saveJourney();}
    }
    function resumeLetter(letter){
      for(const rubric of ['oral','ecrit'])for(let i=0;i<(rubric==='oral'?4:5);i++)if(!isAtelierDone(letter,rubric,i)){location.hash=`#atelier/${week.weekId}-${letter}-${rubric}-${i}`;return;}
    }
    next.onclick=()=>{
      if(selected===0){journey.story=true;saveJourney();select(1);}
      else if(selected===1||selected===2){if(stageDone(selected))select(selected+1);else resumeLetter(selected-1);}
      else if(selected===3){if(journey.review)select(4);}
      else{stop();location.hash=completed?'#weeks':`#bilan/${week.weekId}`;}
    };
    root.querySelectorAll('[data-week-step]').forEach(button=>button.onclick=()=>select(Number(button.dataset.weekStep)));
    const header=main.querySelector('.week-detail-header');
    header.replaceWith(root);grid.remove();
    select(selected,false);
  };
})();
