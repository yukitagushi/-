import { getAllLogs, getAllReports, importBundle, addLog } from "./db.js";
import { encryptString, decryptString } from "./crypto.js";

function downloadBlob(filename, blob){
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
}

export async function exportEncryptedFlow() {
  const password = prompt("エクスポート用パスワードを入力してください（受け渡し時に共有）");
  if (!password) return;
  const payload = {
    exportedAt: new Date().toISOString(),
    reports: await getAllReports(""), // 全件
    logs: await getAllLogs()
  };
  // 本文は平文保存していないため、暗号化はバンドル全体の防御 + 添付の秘匿
  const json = JSON.stringify(payload);
  const bundle = await encryptString(json, password);
  const blob = new Blob([JSON.stringify(bundle)], { type: "application/json" });
  downloadBlob(`sv_bundle_${Date.now()}.json`, blob);
  await addLog("export.encrypted", "", `count=${payload.reports.length}`);
}

export async function importEncryptedFlow(file) {
  const password = prompt("インポート用パスワードを入力してください");
  if (!password) return;
  const text = await file.text();
  let bundle;
  try { bundle = JSON.parse(text); } catch { alert("ファイル形式が不正です"); return; }
  try {
    const json = await decryptString(bundle, password);
    const data = JSON.parse(json);
    await importBundle(data);
    await addLog("import.encrypted", "", `reports=${data.reports?.length||0}`);
    alert("インポートしました。案件一覧を再読み込みしてください。");
  } catch (e) {
    console.error(e);
    alert("復号に失敗しました。パスワードまたはファイルを確認してください。");
  }
}

export async function exportAuditCSV() {
  const logs = await getAllLogs();
  const header = ["at","action","targetId","detail"];
  const rows = [header.join(",")].concat(
    logs.map(l => [l.at, l.action, safe(l.targetId), safe(l.detail)].join(","))
  );
  const blob = new Blob([rows.join("\n")], { type:"text/csv" });
  downloadBlob(`audit_${Date.now()}.csv`, blob);
}
function safe(s){ return `"${String(s||"").replace(/"/g,'""')}"`; }