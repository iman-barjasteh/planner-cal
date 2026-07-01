// FirestoreBackend — cloud persistence with realtime multi-user sync.
// The Firebase SDK is imported lazily from the CDN so LOCAL mode stays
// dependency-free and works fully offline.
//
// Data model:
//   trips/{tripId}                  -> { name, start, end, version }
//   trips/{tripId}/events/{eventId} -> { dayKey, time, text, cat, done, link }
// Moving an event between days = updating its `dayKey` field on the same doc.

import { FIREBASE_CONFIG, FIREBASE_SDK_VERSION } from "../firebaseConfig.js";

const BASE = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;
const EXPORT_VERSION = 2;

let sdk = null;
async function loadSdk() {
  if (sdk) return sdk;
  const appMod = await import(`${BASE}/firebase-app.js`);
  const fs = await import(`${BASE}/firebase-firestore.js`);
  sdk = { appMod, fs };
  return sdk;
}

function eventDocData(dayKey, ev) {
  return {
    dayKey: dayKey || "backlog",
    time: ev.time || "",
    text: ev.text || "",
    cat: ev.cat || "other",
    done: !!ev.done,
    link: ev.link || "",
  };
}

export function createFirestoreBackend(tripId) {
  let ctx = { getState: () => ({}), applyRemote: () => {} };
  let fs; // firestore namespace
  let db;
  let metaRef;
  let eventsRef;

  // Local mirrors of the remote docs, rebuilt into app state on every snapshot.
  let metaCache = { name: "", start: "", end: "" };
  const eventsCache = new Map(); // eventId -> { dayKey, time, text, cat, done, link }

  function rebuildAndApply() {
    const days = { backlog: [] };
    for (const [id, data] of eventsCache) {
      const dk = data.dayKey || "backlog";
      if (!days[dk]) days[dk] = [];
      days[dk].push({
        id,
        time: data.time || "",
        text: data.text || "",
        cat: data.cat || "other",
        done: !!data.done,
        link: data.link || "",
      });
    }
    ctx.applyRemote({ trip: metaCache, days });
  }

  return {
    mode: "cloud",
    tripId,

    attach(context) {
      ctx = context;
    },

    async start() {
      const { appMod, fs: firestore } = await loadSdk();
      fs = firestore;
      const app = appMod.getApps().length
        ? appMod.getApp()
        : appMod.initializeApp(FIREBASE_CONFIG);
      db = fs.getFirestore(app);
      metaRef = fs.doc(db, "trips", tripId);
      eventsRef = fs.collection(db, "trips", tripId, "events");

      // Prime caches from the current server state.
      const metaSnap = await fs.getDoc(metaRef);
      if (metaSnap.exists()) {
        const d = metaSnap.data();
        metaCache = { name: d.name || "", start: d.start || "", end: d.end || "" };
      }
      const evSnap = await fs.getDocs(eventsRef);
      evSnap.forEach((doc) => eventsCache.set(doc.id, doc.data()));

      // Live subscriptions: keep caches in sync and push into the store.
      fs.onSnapshot(metaRef, (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          metaCache = { name: d.name || "", start: d.start || "", end: d.end || "" };
        }
        rebuildAndApply();
      });
      fs.onSnapshot(eventsRef, (snap) => {
        snap.docChanges().forEach((chg) => {
          if (chg.type === "removed") eventsCache.delete(chg.doc.id);
          else eventsCache.set(chg.doc.id, chg.doc.data());
        });
        rebuildAndApply();
      });

      const days = { backlog: [] };
      for (const [id, data] of eventsCache) {
        const dk = data.dayKey || "backlog";
        if (!days[dk]) days[dk] = [];
        days[dk].push({ id, ...data });
      }
      return { version: EXPORT_VERSION, trip: metaCache, days };
    },

    saveMeta(trip) {
      fs.setDoc(
        metaRef,
        { name: trip.name || "", start: trip.start || "", end: trip.end || "", version: EXPORT_VERSION },
        { merge: true }
      ).catch((e) => console.error("saveMeta failed", e));
    },

    upsertEvent(dayKey, ev) {
      fs.setDoc(fs.doc(eventsRef, ev.id), eventDocData(dayKey, ev)).catch((e) =>
        console.error("upsertEvent failed", e)
      );
    },

    removeEvent(dayKey, id) {
      fs.deleteDoc(fs.doc(eventsRef, id)).catch((e) => console.error("removeEvent failed", e));
    },

    async replace(state) {
      // Overwrite the whole trip (used by Import / Upload-to-cloud).
      const batch = fs.writeBatch(db);
      batch.set(metaRef, {
        name: state.trip.name || "",
        start: state.trip.start || "",
        end: state.trip.end || "",
        version: EXPORT_VERSION,
      });
      // Remove events that no longer exist, then write the incoming set.
      const incoming = new Set();
      for (const [dayKey, list] of Object.entries(state.days)) {
        for (const ev of list) {
          incoming.add(ev.id);
          batch.set(fs.doc(eventsRef, ev.id), eventDocData(dayKey, ev));
        }
      }
      for (const id of eventsCache.keys()) {
        if (!incoming.has(id)) batch.delete(fs.doc(eventsRef, id));
      }
      await batch.commit().catch((e) => console.error("replace failed", e));
    },

    async clear() {
      const batch = fs.writeBatch(db);
      for (const id of eventsCache.keys()) batch.delete(fs.doc(eventsRef, id));
      batch.delete(metaRef);
      await batch.commit().catch((e) => console.error("clear failed", e));
    },
  };
}
