const fs = require('fs');
const vm = require('vm');

console.log('=== TEST 4 : SIMULATION RUNTIME & DÉMARRAGE APPLICATIF ===');

function testRuntime(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');

  // Extraire JSON
  const sIdxUp = html.indexOf('<script id="upgrade-data" type="application/json">');
  const eIdxUp = html.indexOf('</script>', sIdxUp);
  const upJson = (sIdxUp !== -1) ? html.substring(sIdxUp + '<script id="upgrade-data" type="application/json">'.length, eIdxUp) : '{}';

  const sIdxApp = html.indexOf('<script id="app-data" type="application/json">');
  const eIdxApp = html.indexOf('</script>', sIdxApp);
  const appJson = (sIdxApp !== -1) ? html.substring(sIdxApp + '<script id="app-data" type="application/json">'.length, eIdxApp) : '{}';

  // Extraire JS
  const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let jsCode = '';
  let m;
  while ((m = scriptRegex.exec(html)) !== null) {
    if (!m[1].includes('application/json')) {
      jsCode += m[2] + '\n';
    }
  }

  class MockEl {
    constructor(tag = 'div') {
      this.tagName = tag.toUpperCase();
      this.children = [];
      this.classList = { toggle: () => {}, add: () => {}, remove: () => {}, contains: () => false };
      this.style = {};
      this.dataset = {};
      this.attributes = {};
      this._innerHTML = '';
    }
    setAttribute(k, v) { this.attributes[k] = v; }
    getAttribute(k) { return this.attributes[k] || null; }
    removeAttribute(k) { delete this.attributes[k]; }
    toggleAttribute(attr, force) { if (force) this.setAttribute(attr, ""); else this.removeAttribute(attr); }
    focus() {}
    remove() { if (this.parentNode && this.parentNode.children) { const idx = this.parentNode.children.indexOf(this); if (idx !== -1) this.parentNode.children.splice(idx, 1); } }
    scrollIntoView() {}
    appendChild(c) { this.children.push(c); return c; }
    append(...children) { for (const c of children) this.appendChild(c); }
    insertAdjacentHTML(pos, h) { this._innerHTML += h; }
    addEventListener() {}
    removeEventListener() {}
    get innerHTML() { return this._innerHTML; }
    set innerHTML(v) { this._innerHTML = v; }
    get textContent() { return this._innerHTML.replace(/<[^>]+>/g, ''); }
    set textContent(v) { this._innerHTML = v; }
    querySelector() { return new MockEl(); }
    querySelectorAll() { return [new MockEl()]; }
  }

  const doc = {
    documentElement: new MockEl('html'),
    head: new MockEl('head'),
    body: new MockEl('body'),
    querySelector: (s) => {
      if (s === '#upgrade-data') return { textContent: upJson };
      if (s === '#app-data') return { textContent: appJson };
      return new MockEl();
    },
    querySelectorAll: () => [new MockEl()],
    getElementById: (id) => {
      if (id === 'upgrade-data') return { textContent: upJson };
      if (id === 'app-data') return { textContent: appJson };
      return new MockEl();
    },
    createElement: (t) => new MockEl(t),
    addEventListener: () => {},
    removeEventListener: () => {}
  };

  const win = {
    document: doc,
    location: { hash: '#subjects' },
    addEventListener: () => {},
    removeEventListener: () => {},
    scrollTo: () => {},
    speechSynthesis: { cancel: () => {}, getVoices: () => [], speak: () => {} },
    setTimeout: setTimeout,
    clearTimeout: clearTimeout
  };

  const sandbox = {
    window: win,
    document: doc,
    location: win.location,
    navigator: { userAgent: 'Node' },
    speechSynthesis: win.speechSynthesis,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    console: { log: () => {}, warn: () => {}, info: () => {}, error: console.error }
  };

  try {
    vm.createContext(sandbox);
    vm.runInContext(jsCode, sandbox);

    if (typeof sandbox.route !== 'function' || typeof sandbox.unifiedRoute !== 'function') {
      console.error(`  ❌ ${filePath} : Fonctions route/unifiedRoute non trouvées.`);
      return false;
    }

    // Tester plusieurs routes
    ['#subjects', '#weeks', '#week/1', '#english', '#profiles'].forEach(h => {
      sandbox.location.hash = h;
      sandbox.route();
    });

    console.log(`  ✓ ${filePath} : Simulation runtime réussie (boot & navigation conformes).`);
    return true;
  } catch(err) {
    console.error(`  ❌ ${filePath} : Erreur simulation:`, err.message);
    return false;
  }
}

const targets = [
  'index.html',
  'courses/francais_cp/index.html',
  'courses/english_starship_1/index.html'
];

let allOk = true;
targets.forEach(t => {
  if (!testRuntime(t)) allOk = false;
});

if (!allOk) process.exit(1);
console.log('✅ TEST 4 RÉUSSI AVEC SUCCÈS.\n');
