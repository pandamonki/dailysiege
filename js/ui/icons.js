// Inline stat icons

const IC = {
  hp: n => `<span class="ic" title="Health"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 11 1.1 6A3.1 3.1 0 0 1 6 2.1 3.1 3.1 0 0 1 10.9 6z" fill="#d6403a" stroke="#6e1410" stroke-width=".7" stroke-linejoin="round"/><path d="M3 4.4c.3-.8 1-1.1 1.6-.9" stroke="#ffb0a8" stroke-width=".8" fill="none" stroke-linecap="round"/></svg><b>${n}</b></span>`,
  atk: n => `<span class="ic" title="Attack"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M9.8 1.4 10.6 1.4 10.6 2.2 5 8 3.8 6.8z" fill="#dfe6ec" stroke="#3b4650" stroke-width=".7" stroke-linejoin="round"/><path d="M2.4 6.6l3 3M2.6 9.4 1.2 10.8" stroke="#8a5a2b" stroke-width="1.3" stroke-linecap="round"/></svg><b>${n}</b></span>`,
};
