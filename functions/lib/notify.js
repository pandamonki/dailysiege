// Push notifications: who to tell, and what to say. Sending itself is handed in (`send`), so the
// rules here can be tested without Firebase Cloud Messaging.
//
//   - the battle has been fought: every lord in it, with a line for anyone who received an alliance invitation
//   - orders lock in an hour: only lords who have not sealed today's orders
const { FieldValue } = require("firebase-admin/firestore");

const label = p => { const n = String((p && p.nick) || "").trim(), r = String((p && p.real) || "").trim(); return n || r || "A lord"; };
const list = a => (a.length <= 1 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]);

// What each lord is told once a day's battle has been fought. Returns { seatId: { title, body, tag, link } }.
function battleMessages(doc, pubs) {
  const out = {}, plans = (doc.inputs && doc.inputs.plans) || [], winner = (doc.results || []).find(r => r.place === 1), day = plans.length ? doc.day : null;
  const dayKey = doc.dayKey;
  for (const r of doc.results || []) {
    const invites = plans.filter(p => p.pid !== r.pid && p.offers && p.offers[r.pid] && (!dayKey || p.offers[r.pid].day === dayKey)).map(p => label(pubs[p.pid]));
    const outcome = r.place === 1 ? "You won the day!" : winner ? `${label(pubs[winner.pid])} won the day. You placed ${r.place}${["th", "st", "nd", "rd"][r.place % 100 > 10 && r.place % 100 < 14 ? 0 : Math.min(r.place % 10, 4) % 4]}.` : "The battle has been fought.";
    out[r.pid] = { title: `Daily Siege: day ${day} results`, body: outcome + (invites.length ? ` ${list(invites)} invited you to an alliance.` : "") + (doc.inputs && doc.inputs.final ? "" : " Tomorrow's planning is open."), tag: "battle", link: "/" };
  }
  return out;
}

// The accounts that play each seat, and their notification tokens: { seatId: [{ uid, token }] }
async function tokensFor(db, gameRef, seats) {
  const want = new Set(seats), members = await gameRef.collection("members").get(), out = {};
  await Promise.all(members.docs.map(async m => {
    const seat = m.get("seat") || m.id; if (!want.has(seat)) return;
    const u = await db.collection("users").doc(m.id).get();
    for (const token of (u.exists && u.get("fcmTokens")) || []) (out[seat] = out[seat] || []).push({ uid: m.id, token });
  }));
  return out;
}

// Send one message per seat. `send(token, message)` resolves, or rejects with { code } for a dead token, which is then forgotten.
async function deliver(db, gameRef, messages, send) {
  const tokens = await tokensFor(db, gameRef, Object.keys(messages)); let sent = 0;
  await Promise.all(Object.entries(messages).flatMap(([seat, msg]) => (tokens[seat] || []).map(async ({ uid, token }) => {
    try { await send(token, msg); sent++; }
    catch (e) { const code = String((e && e.code) || ""); if (/registration-token-not-registered|invalid-registration-token|invalid-argument/.test(code)) await db.collection("users").doc(uid).update({ fcmTokens: FieldValue.arrayRemove(token) }).catch(() => {}); }
  })));
  return sent;
}

async function notifyBattle(db, gameRef, dayKey, doc, send) {
  const pubs = Object.fromEntries((await gameRef.collection("players").get()).docs.map(d => [d.id, d.data()]));
  return deliver(db, gameRef, battleMessages(Object.assign({ dayKey }, doc), pubs), send);
}

/**
 * "Orders lock in an hour", once per game per day, to the lords who have not sealed.
 * Looks at games whose lock is between now and `ahead` from now and that have not been reminded for that day.
 */
async function remindUnsealed(db, send, { now = Date.now(), ahead = 60 * 60000, wRoster } = {}) {
  const { Timestamp } = require("firebase-admin/firestore");
  const soon = await db.collection("games").where("nextLockAt", ">", Timestamp.fromMillis(now)).where("nextLockAt", "<=", Timestamp.fromMillis(now + ahead)).get(), out = {};
  for (const g of soon.docs) {
    const cfg = g.data(); if (!cfg.planDay || cfg.remindedFor === cfg.planDay) continue;
    const pubs = Object.fromEntries((await g.ref.collection("players").get()).docs.map(d => [d.id, d.data()]));
    const fighting = wRoster ? wRoster(pubs, cfg) : Object.keys(pubs).filter(u => !pubs[u].left && !pubs[u].pending);
    const late = fighting.filter(u => pubs[u].sealedFor !== cfg.planDay), mins = Math.max(1, Math.round((cfg.nextLockAt.toMillis() - now) / 60000));
    await g.ref.update({ remindedFor: cfg.planDay }); // marked first: a reminder must never be sent twice
    const msg = { title: "Daily Siege: orders lock soon", body: `Your orders are not sealed yet, and the battle is in ${mins >= 55 ? "an hour" : mins + " minutes"}.`, tag: "reminder", link: "/" };
    out[g.id] = { reminded: late, sent: late.length && fighting.length >= 2 ? await deliver(db, g.ref, Object.fromEntries(late.map(u => [u, msg])), send) : 0 };
  }
  return out;
}

module.exports = { battleMessages, notifyBattle, remindUnsealed, tokensFor };
