// The phone self-test page (selftest.html): fight the golden battles here and compare with the recorded hashes

(async function selfTest() {
  const $ = id => document.getElementById(id), state = window.__selftest = { done: false, pass: false, code: null, expected: null, detmathOk: null, wrong: [], error: null };
  const finish = (cls, verdict, explain, report) => {
    $("verdict").className = cls; $("verdict").textContent = verdict; $("explain").textContent = explain; $("status").textContent = "Finished.";
    $("report").hidden = false; $("report").textContent = report; $("copy").hidden = false; state.done = true;
    $("copy").onclick = async () => { try { await navigator.clipboard.writeText(report); $("copy").textContent = "Copied"; } catch (e) { const r = document.createRange(); r.selectNodeContents($("report")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } };
  };
  const device = navigator.userAgent;
  try {
    const want = await (await fetch("test/golden/hashes.json", { cache: "no-store" })).json();
    state.expected = want.code;
    const t0 = performance.now(), digest = detmathDigest(), got = [];
    state.detmathOk = digest === want.detmath;
    for (let i = 0; i < GOLDEN_COUNT; i++) {
      $("status").textContent = `Battle ${i + 1} of ${GOLDEN_COUNT}…`; $("bar").value = i / GOLDEN_COUNT;
      await new Promise(r => setTimeout(r, 0)); // let the page draw between battles
      got.push(goldenHashes(i));
    }
    $("bar").value = 1;
    const secs = ((performance.now() - t0) / 1000).toFixed(1), code = goldenCode(digest, got);
    const wrong = got.map((g, i) => { const w = want.cases[i] || {}, parts = []; if (g.outcome !== w.outcome) parts.push("outcome"); if (g.fullOutcome !== w.fullOutcome) parts.push("replay outcome"); if (g.replay !== w.replay) parts.push("replay frames"); return parts.length ? `${g.name}: ${parts.join(", ")} differ` : null; }).filter(Boolean);
    Object.assign(state, { code, wrong, pass: code === want.code && state.detmathOk && !wrong.length && got.length === want.cases.length });
    $("codeline").hidden = false; $("code").textContent = code.slice(0, 4) + " " + code.slice(4, 8) + " " + code.slice(8, 12) + " " + code.slice(12);
    const report = [`Daily Siege self-test: ${state.pass ? "PASS" : "FAIL"}`, `Code:     ${code}`, `Expected: ${want.code}`, `Maths fingerprint: ${state.detmathOk ? "ok" : "DIFFERENT (" + digest + ", expected " + want.detmath + ")"}`,
      `Battles: ${got.length - wrong.length} of ${got.length} identical, in ${secs}s`, ...wrong, `Device: ${device}`].join("\n");
    if (state.pass) finish("pass", "✓ Pass", "Every battle on this device matches the recorded result exactly. Any other device showing the same code fights identical battles.", report);
    else finish("fail", "✗ Fail", "This device fought at least one battle differently. Please copy the report below and send it to the host.", report);
  } catch (e) {
    state.error = String((e && e.stack) || e);
    finish("fail", "✗ Could not run", "The test hit an error. Please copy the report below and send it to the host.", `Daily Siege self-test: ERROR\n${state.error}\nDevice: ${device}`);
  }
})();
