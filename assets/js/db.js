// IndexedDB 超薄ラッパー（ネット送信なし）
const DB_NAME = "svlite";
const DB_VER = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = (e) => {
      const db = req.result;
      if (!db.objectStoreNames.contains("reports")) {
        const s = db.createObjectStore("reports", { keyPath: "id" });
        s.createIndex("status", "status", { unique: false });
        s.createIndex("createdAt", "createdAt", { unique: false });
      }
      if (!db.objectStoreNames.contains("logs")) {
        db.createObjectStore("logs", { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(store, mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    const res = fn(s);
    t.oncomplete = () => resolve(res);
    t.onerror = () => reject(t.error);
  });
}

// Reports
export async function addReport(report) {
  return tx("reports", "readwrite", (s) => s.add(report));
}
export async function updateReport(report) {
  return tx("reports", "readwrite", (s) => s.put(report));
}
export async function deleteReport(id) {
  return tx("reports", "readwrite", (s) => s.delete(id));
}
export async function getReport(id) {
  return tx("reports", "readonly", (s) => s.get(id));
}
export async function getAllReports(filterStatus = "") {
  return tx("reports", "readonly", (s) => {
    if (!filterStatus) {
      return new Promise((resolve) => {
        const arr = [];
        s.openCursor(null, "prev").onsuccess = (e) => {
          const cur = e.target.result;
          if (cur) { arr.push(cur.value); cur.continue(); } else resolve(arr);
        };
      });
    } else {
      const idx = s.index("status");
      return new Promise((resolve) => {
        const arr = [];
        idx.openCursor(IDBKeyRange.only(filterStatus)).onsuccess = (e) => {
          const cur = e.target.result;
          if (cur) { arr.push(cur.value); cur.continue(); } else resolve(arr);
        };
      });
    }
  });
}

// Logs
export async function addLog(action, targetId = "", detail = "") {
  const entry = {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    action, targetId, detail
  };
  return tx("logs", "readwrite", (s) => s.add(entry));
}
export async function getAllLogs() {
  return tx("logs", "readonly", (s) => {
    return new Promise((resolve) => {
      const arr = [];
      s.openCursor(null, "prev").onsuccess = (e) => {
        const cur = e.target.result;
        if (cur) { arr.push(cur.value); cur.continue(); } else resolve(arr);
      };
    });
  });
}
export async function importBundle(data) {
  // data: { reports:[], logs:[] }
  await tx("reports", "readwrite", (s) => {
    data.reports.forEach(r => s.put(r));
  });
  await tx("logs", "readwrite", (s) => {
    data.logs.forEach(l => s.put(l));
  });
}