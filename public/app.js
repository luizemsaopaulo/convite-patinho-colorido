'use strict';
(function () {
  const $ = (s) => document.querySelector(s);
  const intro = $('#abertura');
  const invite = $('#convite');
  const audio = $('#themeAudio');
  const music = $('#musicBtn');
  const form = $('#rsvpForm');
  const status = $('#status');
  const success = $('#success');
  const nameEl = $('#guestName');
  const submit = form.querySelector('[type=submit]');

  const setMusicLabel = () => {
    music.innerHTML = audio.paused ? '♫ <span>Tocar música</span>' : '❚❚ <span>Pausar música</span>';
    music.setAttribute('aria-label', audio.paused ? 'Tocar música' : 'Pausar música');
  };
  $('#openBtn').addEventListener('click', async () => {
    invite.hidden = false;
    music.hidden = false;
    invite.scrollIntoView({behavior: 'smooth', block: 'start'});
    try { await audio.play(); } catch (e) { /* navegador pode bloquear; botão habilitado */ }
    setMusicLabel();
  });
  music.addEventListener('click', async () => {
    if (audio.paused) {
      try { await audio.play(); } catch (e) { status.textContent='Use o controle do navegador para permitir o áudio.'; }
    } else { audio.pause(); }
    setMusicLabel();
  });
  audio.addEventListener('pause',setMusicLabel);
  audio.addEventListener('play',setMusicLabel);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = nameEl.value.trim().replace(/\s+/g, ' ');
    const answer = form.querySelector('input[name="attending"]:checked');
    status.textContent = '';
    if (name.length < 2 || name.length > 100) { status.textContent = 'Digite seu nome (entre 2 e 100 caracteres).'; nameEl.focus(); return; }
    if (!answer) { status.textContent = 'Escolha se vai ou não poderá comparecer.'; return; }
    submit.disabled = true;
    submit.textContent = 'Enviando...';
    try {
      const response = await fetch('/api/rsvp', {
        method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},
        body:JSON.stringify({name,attending:answer.value === 'yes',website:$('#website').value}),
      });
      const data = await response.json().catch(()=>({}));
      if (!response.ok || !data.ok) throw new Error(data.error || 'Não foi possível salvar. Tente novamente.');
      form.hidden = true;
      success.hidden = false;
      $('#successMessage').textContent = data.attending
        ? name + ', que alegria! Sua presença foi confirmada. 💛'
        : name + ', sua resposta foi registrada. Obrigado por avisar! 💛';
      success.scrollIntoView({behavior:'smooth',block:'center'});
    } catch (error) { status.textContent = error.message || 'Não foi possível salvar. Tente novamente.'; }
    finally { submit.disabled = false; submit.textContent = 'Enviar minha resposta'; }
  });
  $('#editBtn').addEventListener('click', () => {
    success.hidden = true; form.hidden = false; status.textContent='';
    form.scrollIntoView({behavior:'smooth',block:'center'});
  });
})();