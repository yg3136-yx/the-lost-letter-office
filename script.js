const root = document.documentElement;
const body = document.body;
const lamp = document.querySelector('#lampBrightness');
const weatherButton = document.querySelector('#weatherToggle');
const weatherText = weatherButton.querySelector('.weather-text');
const weatherIcon = weatherButton.querySelector('.weather-icon');
const weatherCaption = document.querySelector('.weather-caption');
const resetButton = document.querySelector('#resetButton');
const whisper = document.querySelector('#whisper');
const count = document.querySelector('#discoveredCount');
const dots = [...document.querySelectorAll('.dot')];
const reader = document.querySelector('#letterReader');
const readerPaper = reader.querySelector('.reader-paper');
const readerTitle = document.querySelector('#readerTitle');
const readerTheme = document.querySelector('#readerTheme');
const readerMessage = document.querySelector('#readerMessage');
const readerSignoff = document.querySelector('#readerSignoff');
const readerClose = document.querySelector('#readerClose');
const readerBackdrop = document.querySelector('#readerBackdrop');
const letters = {
  yesterday: document.querySelector('.letter-yesterday'),
  unsent: document.querySelector('.letter-unsent'),
  tomorrow: document.querySelector('.letter-tomorrow')
};

const stories = {
  yesterday: {
    title: 'To Yesterday',
    theme: 'Nostalgia',
    message: 'You do not have to return to be held by what was. Keep the small rooms of memory, but leave their doors open to the light.',
    signoff: '— from the part of you that remembers'
  },
  unsent: {
    title: 'Never Sent',
    theme: 'Regret',
    message: 'I was silent because the truth felt heavier than losing you. If this reaches no one, let it at least be honest: I was afraid, and I am sorry.',
    signoff: '— from the words that finally found a voice'
  },
  tomorrow: {
    title: 'To Tomorrow',
    theme: 'Hope',
    message: 'You are not late. Morning has been keeping a place for you. Bring what remains of your courage; even a small light can find the road ahead.',
    signoff: '— from the day that is waiting for you'
  }
};

const discovered = new Set();
let yesterdayTimer = null;
let yesterdayRestartTimer = null;
let yesterdayClicks = [];
let lastFocusedLetter = null;
let whisperOverride = '';
let whisperTimer = null;
let regretWeatherTimer = null;

function brightness() {
  return Number(lamp.value);
}

function conditions() {
  const clear = body.dataset.weather === 'clear';
  const rainy = !clear;
  const light = brightness();
  return {
    yesterday: clear && light >= 25 && light <= 45,
    unsent: rainy && light < 30,
    tomorrow: discovered.has('yesterday') && discovered.has('unsent') && clear && light > 70
  };
}

function setWhisper(message, duration = 0) {
  window.clearTimeout(whisperTimer);
  whisperOverride = message;
  renderWhisper();
  if (duration) {
    whisperTimer = window.setTimeout(() => {
      whisperOverride = '';
      renderWhisper();
    }, duration);
  }
}

function renderWhisper() {
  if (whisperOverride) {
    whisper.textContent = whisperOverride;
    return;
  }
  const state = conditions();
  if (!discovered.has('yesterday') && state.yesterday) whisper.textContent = 'Something old is surfacing. Let the room remain undisturbed.';
  else if (!discovered.has('unsent') && state.unsent) whisper.textContent = 'One envelope seems less guarded in the hush.';
  else if (!discovered.has('tomorrow') && state.tomorrow) whisper.textContent = 'The blue seal catches the light, warm as a held breath.';
  else if (!discovered.has('tomorrow') && discovered.has('yesterday') && discovered.has('unsent')) whisper.textContent = 'The final seal is awake, listening for a different hour.';
  else if (discovered.size === 3) whisper.textContent = 'Every lost word has found somewhere to rest.';
  else if (brightness() < 38) whisper.textContent = 'The room draws close. The letters become shadows.';
  else if (brightness() > 82) whisper.textContent = 'Under the amber glow, every postmark holds its breath.';
  else whisper.textContent = 'Three letters wait beneath the lamplight.';
}

function setState(name, state) {
  const letter = letters[name];
  letter.dataset.state = state;
  letter.classList.remove('locked', 'ready', 'discovered');
  letter.classList.add(state);
  const spokenState = state === 'discovered' ? 'discovered; open to read again' : `currently ${state}`;
  letter.setAttribute('aria-label', `${stories[name].title}, ${spokenState}`);
}

function clearYesterdayWait() {
  window.clearTimeout(yesterdayTimer);
  window.clearTimeout(yesterdayRestartTimer);
  yesterdayTimer = null;
  yesterdayRestartTimer = null;
  yesterdayClicks = [];
  letters.yesterday.classList.remove('waiting', 'impatient');
}

function startYesterdayWait(delay = 0) {
  if (discovered.has('yesterday') || yesterdayTimer || yesterdayRestartTimer || !conditions().yesterday) return;
  const begin = () => {
    yesterdayRestartTimer = null;
    if (discovered.has('yesterday') || !conditions().yesterday) return;
    void letters.yesterday.offsetWidth;
    letters.yesterday.classList.add('waiting');
    yesterdayTimer = window.setTimeout(() => {
      yesterdayTimer = null;
      if (conditions().yesterday && !discovered.has('yesterday')) discover('yesterday', true);
    }, 4000);
  };
  if (delay) yesterdayRestartTimer = window.setTimeout(begin, delay);
  else begin();
}

function restartYesterdayWait() {
  window.clearTimeout(yesterdayTimer);
  window.clearTimeout(yesterdayRestartTimer);
  yesterdayTimer = null;
  yesterdayRestartTimer = null;
  yesterdayClicks = [];
  letters.yesterday.classList.remove('waiting');
  letters.yesterday.classList.add('impatient');
  setWhisper('The memory withdraws, waiting for the room to become still again.', 2100);
  window.setTimeout(() => letters.yesterday.classList.remove('impatient'), 700);
  startYesterdayWait(720);
}

function evaluate() {
  const state = conditions();
  if (discovered.has('yesterday')) setState('yesterday', 'discovered');
  else if (state.yesterday) {
    setState('yesterday', 'ready');
    startYesterdayWait();
  } else {
    setState('yesterday', 'locked');
    clearYesterdayWait();
  }

  if (discovered.has('unsent')) setState('unsent', 'discovered');
  else setState('unsent', state.unsent ? 'ready' : 'locked');
  if (discovered.has('unsent') || state.unsent) {
    window.clearTimeout(regretWeatherTimer);
    regretWeatherTimer = null;
    letters.unsent.classList.remove('weather-rain-response', 'weather-clear-response', 'weather-rain-residue');
  }

  const hopeAwake = discovered.has('yesterday') && discovered.has('unsent');
  letters.tomorrow.classList.toggle('awakened', hopeAwake && !discovered.has('tomorrow'));
  if (discovered.has('tomorrow')) setState('tomorrow', 'discovered');
  else setState('tomorrow', state.tomorrow ? 'ready' : 'locked');
  renderWhisper();
}

function respondRegretToWeather(weather) {
  window.clearTimeout(regretWeatherTimer);
  regretWeatherTimer = null;
  letters.unsent.classList.remove('weather-rain-response', 'weather-clear-response');

  if (discovered.has('unsent')) {
    letters.unsent.classList.remove('weather-rain-residue');
    return;
  }

  void letters.unsent.offsetWidth;
  if (weather === 'rainy') {
    if (letters.unsent.dataset.state === 'ready') return;
    letters.unsent.classList.add('weather-rain-residue');
    letters.unsent.classList.add('weather-rain-response');
    regretWeatherTimer = window.setTimeout(() => {
      letters.unsent.classList.remove('weather-rain-response');
      regretWeatherTimer = null;
    }, 1700);
  } else {
    letters.unsent.classList.add('weather-clear-response');
    regretWeatherTimer = window.setTimeout(() => {
      letters.unsent.classList.remove('weather-clear-response', 'weather-rain-residue');
      regretWeatherTimer = null;
    }, 1500);
  }
}

function updateCounter() {
  count.textContent = String(discovered.size);
  dots.forEach((dot, index) => dot.classList.toggle('active', index < discovered.size));
  document.querySelector('.discovery').setAttribute('aria-label', `${discovered.size} of 3 letters discovered`);
}

function openReader(name) {
  const story = stories[name];
  lastFocusedLetter = letters[name];
  readerTitle.textContent = story.title;
  readerTheme.textContent = story.theme;
  readerMessage.textContent = story.message;
  readerSignoff.textContent = story.signoff;
  reader.classList.toggle('final-reader', name === 'tomorrow');
  reader.setAttribute('aria-hidden', 'false');
  reader.classList.add('open');
  body.style.overflow = 'hidden';
  window.setTimeout(() => readerPaper.focus(), 50);
}

function closeReader() {
  if (!reader.classList.contains('open')) return;
  reader.classList.remove('open');
  reader.setAttribute('aria-hidden', 'true');
  body.style.overflow = '';
  if (lastFocusedLetter) lastFocusedLetter.focus();
}

function celebrateFinalLetter() {
  body.classList.remove('final-discovery');
  void body.offsetWidth;
  body.classList.add('final-discovery');
  const discovery = document.querySelector('.discovery');
  discovery.classList.remove('celebrate');
  void discovery.offsetWidth;
  discovery.classList.add('celebrate');
  window.setTimeout(() => {
    body.classList.remove('final-discovery');
    discovery.classList.remove('celebrate');
  }, 5400);
}

function discover(name, automatic = false) {
  if (!discovered.has(name)) {
    discovered.add(name);
    if (name === 'yesterday') clearYesterdayWait();
    updateCounter();
    evaluate();
    if (name === 'tomorrow') {
      celebrateFinalLetter();
      setWhisper('For a moment, the office feels less empty.', 4800);
    } else {
      setWhisper(automatic ? 'The oldest seal opens on its own, as quietly as remembering.' : 'A seal gives way. The room seems to exhale.', 2200);
    }
  }
  openReader(name);
}

function handleYesterdayClick() {
  if (discovered.has('yesterday')) return openReader('yesterday');
  if (conditions().yesterday && (yesterdayTimer || yesterdayRestartTimer)) {
    const now = Date.now();
    yesterdayClicks = yesterdayClicks.filter(time => now - time <= 2000);
    yesterdayClicks.push(now);
    letters.yesterday.classList.remove('touched');
    void letters.yesterday.offsetWidth;
    letters.yesterday.classList.add('touched');
    window.setTimeout(() => letters.yesterday.classList.remove('touched'), 340);
    const touchMessages = ['The paper yields, then settles.', 'The half-formed ink grows faint beneath your hand.'];
    setWhisper(touchMessages[Math.min(yesterdayClicks.length - 1, 1)], 1100);
    if (yesterdayClicks.length >= 3) restartYesterdayWait();
  } else if (body.dataset.weather === 'rainy') setWhisper('The oldest postmark shivers beneath the sound of rain.', 1900);
  else setWhisper('A memory moves beneath the page, then disappears into the light.', 1900);
}

function handleUnsentClick() {
  if (discovered.has('unsent')) return openReader('unsent');
  if (conditions().unsent) discover('unsent');
  else if (body.dataset.weather === 'rainy' && brightness() >= 30) {
    letters.unsent.classList.add('blurred-peek');
    setWhisper('Ink stirs, but the bright room washes it away.', 1900);
    window.setTimeout(() => letters.unsent.classList.remove('blurred-peek'), 1400);
  } else setWhisper('The grey envelope keeps its silence.', 1700);
}

function handleTomorrowClick() {
  if (discovered.has('tomorrow')) return openReader('tomorrow');
  if (conditions().tomorrow) discover('tomorrow');
  else if (!discovered.has('yesterday') || !discovered.has('unsent')) setWhisper('The star-marked seal seems to be waiting for other words.', 1900);
  else if (body.dataset.weather === 'rainy') setWhisper('The awakened seal catches on the rain, then dims.', 1900);
  else setWhisper('A pale warmth gathers at the final seal, but does not yet hold.', 1900);
}

function setLamp(value) {
  root.style.setProperty('--lamp-level', Number(value) / 100);
  lamp.setAttribute('aria-valuetext', `${value} percent`);
  evaluate();
}

function setWeather(weather, withEmotionalResponse = true) {
  const previousWeather = body.dataset.weather;
  const rainy = weather === 'rainy';
  body.dataset.weather = weather;
  weatherButton.setAttribute('aria-pressed', String(rainy));
  weatherButton.setAttribute('aria-label', `Change weather. Currently ${rainy ? 'rainy' : 'clear'}`);
  weatherText.textContent = rainy ? 'Rain' : 'Clear';
  weatherIcon.textContent = rainy ? '☂' : '☾';
  weatherCaption.textContent = rainy ? 'Rain gathers softly on the glass.' : 'A patient moon watches the rooftops.';
  evaluate();
  if (withEmotionalResponse && previousWeather !== weather) respondRegretToWeather(weather);
}

lamp.addEventListener('input', event => setLamp(event.target.value));
weatherButton.addEventListener('click', () => setWeather(body.dataset.weather === 'rainy' ? 'clear' : 'rainy'));
letters.yesterday.addEventListener('click', handleYesterdayClick);
letters.unsent.addEventListener('click', handleUnsentClick);
letters.tomorrow.addEventListener('click', handleTomorrowClick);
readerClose.addEventListener('click', closeReader);
readerBackdrop.addEventListener('click', closeReader);
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeReader(); });

resetButton.addEventListener('click', () => {
  closeReader();
  clearYesterdayWait();
  discovered.clear();
  updateCounter();
  lamp.value = 72;
  root.style.setProperty('--lamp-level', .72);
  setWeather('rainy', false);
  window.clearTimeout(regretWeatherTimer);
  regretWeatherTimer = null;
  letters.unsent.classList.remove('weather-rain-response', 'weather-clear-response', 'weather-rain-residue');
  document.querySelectorAll('.blurred-peek, .awakened, .impatient, .touched').forEach(element => element.classList.remove('blurred-peek', 'awakened', 'impatient', 'touched'));
  body.classList.remove('final-discovery');
  document.querySelector('.discovery').classList.remove('celebrate');
  setWhisper('The evening begins again. Three letters wait beneath the lamplight.', 1800);
  resetButton.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-2deg)' }, { transform: 'rotate(0)' }], { duration: 280 });
});

updateCounter();
setWeather('rainy', false);
