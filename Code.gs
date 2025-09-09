/****************************
 * UNIFIED WEB APP SYSTEM
 * Code.gs - Main Backend File
 ****************************/

/****************************
 * KONFIGURASI GLOBAL
 ****************************/
const TARGET_SHEET_NAME = 'BROADCAST';
const START_ROW = 9;
const START_COL = 3;
const TARGET_COLS = 6;
const PHONE_COL_INDEX = 3;
const FIRST_DATA_ROW = 9;
const STATUS_COL = 2;
const MIN_DELAY_MS = 2000;
const MAX_DELAY_MS = 6000;
const BATCH_LIMIT = 20;
const SHEET_BC = 'BROADCAST';
const SHEET_DATA_INTERNAL = 'DATA INTERNAL SEKOLAH';
const SHEET_TEMPLATE = 'TEMPLATE TEKS BC';
const TEMPLATE_TARGET_CELL = { row: 4, col: 3 };

/****************************
 * MAIN WEB APP ENTRY POINT
 ****************************/
// REPLACE doGet function di Code.gs dengan ini untuk testing:

function doGet(e) {
  try {
    const page = e.parameter.page || 'Upload';
    
    // Direct loading for optimal performance and compatibility
    if (page === 'Index') {
      return HtmlService.createHtmlOutputFromFile('Index')
        .setTitle('Broadcast WhatsApp - Tracer Study Vokasi')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
    }
    
    if (page === 'Upload') {
      return HtmlService.createHtmlOutputFromFile('Upload')
        .setTitle('Upload & Sinkron Data - Tracer Study Vokasi')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
    }
    
    // Fallback to Upload for invalid pages
    return HtmlService.createHtmlOutputFromFile('Upload')
      .setTitle('Tracer Study Vokasi - Management System')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      
  } catch (error) {
    console.error('Error in doGet:', error);
    return HtmlService.createHtmlOutput(`
      <div style="text-align: center; padding: 50px; font-family: Arial;">
        <h1>⚠️ System Error</h1>
        <p>Terjadi kesalahan saat memuat aplikasi.</p>
        <p><strong>Error:</strong> ${error.message}</p>
        <p>
          <a href="?page=Upload" style="margin: 10px; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">Upload Page</a>
          <a href="?page=Index" style="margin: 10px; padding: 10px 20px; background: #28a745; color: white; text-decoration: none; border-radius: 5px;">Broadcast Page</a>
        </p>
      </div>
    `).setTitle('Error - Tracer Study Vokasi');
  }
}
/****************************
 * HELPER FUNCTIONS
 ****************************/
function include(filename) {
  try {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  } catch (error) {
    console.error(`Error including file ${filename}:`, error);
    return `<div class="alert alert-danger">
              <h5>File Load Error</h5>
              <p>Gagal memuat file "${filename}": ${error.message}</p>
            </div>`;
  }
}

function getPageContent(page) {
  try {
    const validPages = ['Upload', 'Index'];
    if (!validPages.includes(page)) {
      throw new Error(`Invalid page: ${page}`);
    }
    return HtmlService.createHtmlOutputFromFile(page).getContent();
  } catch (error) {
    console.error('Error loading page content:', error);
    return `<div class="alert alert-danger">
              <h5>Error Loading Page</h5>
              <p>Gagal memuat halaman "${page}". ${error.message}</p>
              <button class="btn btn-primary" onclick="location.reload()">Refresh Page</button>
            </div>`;
  }
}

function createErrorPage(errorMessage) {
  const errorHtml = HtmlService.createHtmlOutput(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Error - Tracer Study System</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    </head>
    <body class="bg-light d-flex align-items-center justify-content-center" style="min-height: 100vh;">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-md-6">
            <div class="card">
              <div class="card-body text-center">
                <h3 class="text-danger">⚠️ System Error</h3>
                <p class="text-muted">Terjadi kesalahan saat memuat aplikasi.</p>
                <p><code>${errorMessage}</code></p>
                <button class="btn btn-primary" onclick="location.reload()">Coba Lagi</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `).setTitle('Error - Tracer Study System');
  
  return errorHtml;
}

/****************************
 * UPLOAD DATA FUNCTIONS
 ****************************/
function processUpload(fileObj, options) {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(TARGET_SHEET_NAME);
  if (!sheet) throw new Error(`Sheet '${TARGET_SHEET_NAME}' tidak ditemukan!`);

  if (!fileObj || !fileObj.data || !fileObj.mimeType || !fileObj.name) {
    throw new Error("Objek file tidak lengkap.");
  }

  const encoding = (options && options.encoding) || "utf-8";
  let delimiter = (options && options.delimiter) || "auto";
  const skipHeader = !!(options && options.skipHeader);

  const blob = Utilities.newBlob(
    Utilities.base64Decode(fileObj.data),
    fileObj.mimeType,
    fileObj.name
  );

  const isXlsx = /xlsx$/i.test(fileObj.name);
  const isCsv = /\.csv$/i.test(fileObj.name) || /text\/csv/i.test(fileObj.mimeType);

  let rows = [];
  if (isXlsx) {
    const tempFile = Drive.Files.insert(
      { title: fileObj.name, mimeType: "application/vnd.google-apps.spreadsheet" },
      blob,
      { convert: true }
    );
    try {
      const tempSs = SpreadsheetApp.openById(tempFile.id);
      rows = tempSs.getSheets()[0].getDataRange().getDisplayValues();
    } finally {
      try { Drive.Files.remove(tempFile.id); } catch (_) {}
    }
  } else if (isCsv) {
    let text = blob.getDataAsString(encoding).replace(/^\uFEFF/, "");
    if (delimiter === "auto") delimiter = detectDelimiterServer_(text);
    rows = Utilities.parseCsv(text, delimiter);
  } else {
    throw new Error("Format tidak didukung. Gunakan CSV/XLSX.");
  }

  if (skipHeader && rows.length) rows.shift();
  rows = rows.map(r => r.map(v => (typeof v === "string" ? v.trim() : v)));

  const payload = preparePayload_(rows);
  const stats = writeToBroadcast_(sheet, payload);

  const tz = ss.getSpreadsheetTimeZone() || 'Asia/Jakarta';
  const stamp = formatDateId_(new Date(), tz);
  sheet.getRange('H3').setNumberFormat('@').setValue(stamp);

  return {
    message: `✅ ${fileObj.name} berhasil diunggah (${stats.rows} baris).`,
    source: isCsv ? "CSV" : "XLSX",
    rows: stats.rows,
    cols: TARGET_COLS,
    targetRange: stats.rows ? `C9:H${8 + stats.rows}` : 'C9:H',
    lastSync: stamp
  };
}

function processCSV(csvContent, options) {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(TARGET_SHEET_NAME);
  if (!sheet) throw new Error(`Sheet '${TARGET_SHEET_NAME}' tidak ditemukan!`);

  const provided = (options && options.delimiter) || 'auto';
  const skipHeader = !!(options && options.skipHeader);

  const tryParse = (text, d) => {
    try { return Utilities.parseCsv(text, d); } catch (_e) { return [[]]; }
  };

  let delimiter = ',';
  let data = [];
  if (provided !== 'auto') {
    delimiter = provided;
    data = tryParse(csvContent, delimiter);
  } else {
    const candidates = [',', ';', '\t', '|'];
    let best = { d: ',', data: tryParse(csvContent, ',') };
    let bestCols = (best.data[0] || []).length;
    for (const d of candidates.slice(1)) {
      const parsed = tryParse(csvContent, d);
      const cols = (parsed[0] || []).length;
      if (cols > bestCols) { best = { d, data: parsed }; bestCols = cols; }
    }
    delimiter = best.d;
    data = best.data;
  }

  if (skipHeader && data.length) data.shift();
  data = data.map(row => row.map(v => (typeof v === 'string' ? v.trim() : v)));

  const payload = preparePayload_(data);
  const stats = writeToBroadcast_(sheet, payload);

  const tz = ss.getSpreadsheetTimeZone() || 'Asia/Jakarta';
  const stamp = formatDateId_(new Date(), tz);
  sheet.getRange('H3').setNumberFormat('@').setValue(stamp);

  const endRow = 8 + stats.rows;
  const targetA1 = stats.rows ? `C9:H${endRow}` : 'C9:H';
  return `Berhasil: delimiter='${delimiter}'. Dipindahkan ${stats.rows} baris ke ${TARGET_SHEET_NAME}!${targetA1}. Disinkron pada ${stamp}.`;
}

function getPreviewData() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(TARGET_SHEET_NAME);
  if (!sh) return [];

  const lastRow = sh.getLastRow();
  if (lastRow < START_ROW) return [];

  const header = [
    "NISN",
    "Nama",
    "Kompetensi Keahlian",
    "No WhatsApp Alumni",
    "Status Pengisian",
    "Status Isian Supervisor"
  ];

  const numRows = Math.min(10, lastRow - START_ROW + 1);
  const data = sh.getRange(START_ROW, START_COL, numRows, TARGET_COLS).getDisplayValues();

  return [header, ...data];
}

/****************************
 * BROADCAST FUNCTIONS
 ****************************/
function getBroadcastData(page, pageSize) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET_BC);
  if (!sh) return { headers: [], rows: [], total: 0 };

  const lastRow = sh.getLastRow();
  if (lastRow < FIRST_DATA_ROW) return { headers: [], rows: [], total: 0 };

  const headers = [
    "No",
    "Status WhatsApp",
    "NISN",
    "Nama",
    "Kompetensi Keahlian",
    "No WhatsApp Alumni",
    "Status Pengisian",
    "Status Isian Supervisor"
  ];

  const lastCol = Math.max(sh.getLastColumn(), headers.length);
  const allData = sh.getRange(FIRST_DATA_ROW, 1, lastRow - (FIRST_DATA_ROW - 1), lastCol).getValues();
  const total = allData.length;
  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, total);

  const pageData = allData.slice(start, end).map((r, i) => ({
    sheetRow: FIRST_DATA_ROW + start + i,
    values: r
  }));

  return { headers, rows: pageData, total };
}

function getTemplates() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET_TEMPLATE);
  if (!sh) return [];

  const vals = sh.getRange(4, 4, 4, 1).getValues().flat();

  return [
    { label: "Template Teks Umum", value: vals[0] || "" },
    { label: "Template Teks Broadcast Belum Mengisi", value: vals[1] || "" },
    { label: "Template Teks Broadcast Sedang Mengisi", value: vals[2] || "" },
    { label: "Template Teks Broadcast Sudah Mengisi", value: vals[3] || "" }
  ];
}

function copyTemplateToContainer(index) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const shBroadcast = ss.getSheetByName(SHEET_BC);
  const shTemplate = ss.getSheetByName(SHEET_TEMPLATE);
  if (!shTemplate || !shBroadcast) return "";
  
  const text = shTemplate.getRange(index + 4, 4).getValue() || "";
  if (text !== "") {
    shBroadcast.getRange(TEMPLATE_TARGET_CELL.row, TEMPLATE_TARGET_CELL.col).setValue(text);
  }
  return text;
}

function saveContainerText(text) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_BC);
  sh.getRange(TEMPLATE_TARGET_CELL.row, TEMPLATE_TARGET_CELL.col).setValue(text);
  return true;
}

function getCurrentContainerText() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_BC);
  return sh.getRange(TEMPLATE_TARGET_CELL.row, TEMPLATE_TARGET_CELL.col).getValue() || "";
}

function updateBroadcastCell(sheetRow, colIndex, value) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_BC);
  sh.getRange(sheetRow, colIndex).setValue(value);
  return true;
}

function saveFilterStatus(status) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_BC);
  sh.getRange("D5").setValue(status);
  return true;
}

function broadcast() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_BC);
  const lastRow = sh.getLastRow();
  const jmlRow = lastRow - FIRST_DATA_ROW + 1;
  if (jmlRow <= 0) return [];

  const data = sh.getRange(FIRST_DATA_ROW, 2, jmlRow, 7).getValues();
  const cellNotif = sh.getRange(TEMPLATE_TARGET_CELL.row, TEMPLATE_TARGET_CELL.col).getValue() || "";
  const hari = getHariSekarang();
  const now = new Date();
  const tanggal = Utilities.formatDate(now, "Asia/Jakarta", "dd MMMM yyyy");
  const jam = Utilities.formatDate(now, "Asia/Jakarta", "HH:mm");

  const hasilUpdate = [];

  for (let i = 0; i < jmlRow; i++) {
    const [status, nisn, nama, kompetensi, noTelp, statusIsi, statusSupervisor] = data[i];
    const sheetRow = FIRST_DATA_ROW + i;

    if (status === 'KIRIM WA' && noTelp) {
      const teks = cellNotif
        .replace(/<NISN>/g, nisn)
        .replace(/<NAMA>/g, nama)
        .replace(/<KOMPETENSI>/g, kompetensi)
        .replace(/<STATUS ISI>/g, statusIsi)
        .replace(/<STATUS SUPERVISOR>/g, statusSupervisor)
        .replace(/<HARI>/g, hari)
        .replace(/<TANGGAL>/g, tanggal)
        .replace(/<JAM>/g, jam)
        .replace(/<SALAM>/g, getSalam());

      const ok = sendWhatsAppNotification(noTelp, teks);
      const newStatus = ok ? "TERKIRIM" : "GAGAL KIRIM";
      sh.getRange(sheetRow, STATUS_COL).setValue(newStatus);

      hasilUpdate.push({ row: sheetRow, nisn, nama, newStatus });

      Utilities.sleep(Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1)) + MIN_DELAY_MS);
    }
  }

  return hasilUpdate;
}

function processBroadcast(sheetRow) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_BC);
  const rowValues = sh.getRange(sheetRow, 1, 1, 8).getValues()[0] || [];
  const status = rowValues[1];
  const nisn = rowValues[2] || "";
  const nama = rowValues[3] || "";
  const kompetensi = rowValues[4] || "";
  const noTelp = rowValues[5] || "";
  const statusIsi = rowValues[6] || "";
  const statusSupervisor = rowValues[7] || "";

  if (status !== 'KIRIM WA' || !noTelp) {
    return { row: sheetRow, nisn, nama, newStatus: status || "SKIP" };
  }

  const template = sh.getRange(TEMPLATE_TARGET_CELL.row, TEMPLATE_TARGET_CELL.col).getValue() || "";
  const hari = getHariSekarang();
  const now = new Date();
  const tanggal = Utilities.formatDate(now, "Asia/Jakarta", "dd MMMM yyyy");
  const jam = Utilities.formatDate(now, "Asia/Jakarta", "HH:mm");

  const teks = template
    .replace(/<NISN>/g, nisn)
    .replace(/<NAMA>/g, nama)
    .replace(/<KOMPETENSI>/g, kompetensi)
    .replace(/<STATUS ISI>/g, statusIsi)
    .replace(/<STATUS SUPERVISOR>/g, statusSupervisor)
    .replace(/<HARI>/g, hari)
    .replace(/<TANGGAL>/g, tanggal)
    .replace(/<JAM>/g, jam)
    .replace(/<SALAM>/g, getSalam());

  const ok = sendWhatsAppNotification(noTelp, teks);
  const newStatus = ok ? "TERKIRIM" : "GAGAL KIRIM";

  updateBroadcastCell(sheetRow, STATUS_COL, newStatus);

  Utilities.sleep(Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1)) + MIN_DELAY_MS);

  return { row: sheetRow, nisn, nama, newStatus };
}

function isiNoWhatsAppAlumni_trigger() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const shBroadcast = ss.getSheetByName("BROADCAST");
  const shData = ss.getSheetByName("DATA INTERNAL SEKOLAH");

  const dataValues = shData.getRange(2, 2, shData.getLastRow() - 1, 5).getValues(); 

  const lastRow = shBroadcast.getLastRow();
  for (let r = 9; r <= lastRow; r++) {
    const nisn = shBroadcast.getRange(r, 3).getValue();
    const noWaBroadcast = shBroadcast.getRange(r, 6).getValue();

    if (!noWaBroadcast && nisn) {
      const match = dataValues.find(row => row[0] == nisn);
      if (match && match[4]) {
        shBroadcast.getRange(r, 6).setValue(match[4]);
      }
    }
  }
  return true;
}

/****************************
 * UTILITY FUNCTIONS
 ****************************/
function preparePayload_(rows) {
  let payload = rows.map(r => r.slice(1, 1 + TARGET_COLS));
  payload = payload.map(r => {
    const x = r.slice(0, TARGET_COLS);
    while (x.length < TARGET_COLS) x.push('');
    return x;
  });
  payload = payload.filter(r => r.some(v => String(v).trim() !== ''));
  payload = payload.map(r => {
    r[PHONE_COL_INDEX] = normalizePhoneTo62_(r[PHONE_COL_INDEX]);
    return r;
  });
  return payload;
}

function writeToBroadcast_(sheet, payload) {
  const lastRow = sheet.getLastRow();
  const numClearRows = Math.max(0, lastRow - (START_ROW - 1));
  if (numClearRows > 0) {
    sheet.getRange(START_ROW, START_COL, numClearRows, TARGET_COLS).clearContent();
  }
  if (payload.length > 0) {
    const range = sheet.getRange(START_ROW, START_COL, payload.length, TARGET_COLS);
    range.setNumberFormat("@");
    range.setValues(payload);
  }
  return { rows: payload.length, range: payload.length ? `!C9:H${8 + payload.length}` : '!C9:H' };
}

function normalizePhoneTo62_(raw) {
  if (!raw) return '';
  let s = String(raw).trim();
  if (s === '' || s === '-') return '';
  s = s.replace(/[\s\-\(\)]/g, '');
  if (s.startsWith('+62')) s = '62' + s.slice(3);
  if (s.startsWith('08')) return '628' + s.slice(2);
  if (s.startsWith('0')) return '62' + s.slice(1);
  if (s.startsWith('62')) return s;
  if (/^8\d{6,}$/.test(s)) return '62' + s;
  return s;
}

function formatDateId_(date, timeZone) {
  const dd = Utilities.formatDate(date, timeZone, 'dd');
  const m  = Utilities.formatDate(date, timeZone, 'M');
  const yyyy = Utilities.formatDate(date, timeZone, 'yyyy');
  const hhmm = Utilities.formatDate(date, timeZone, 'HH:mm');
  const bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  return `${dd} ${bulan[parseInt(m, 10) - 1]} ${yyyy} ; ${hhmm}`;
}

function detectDelimiterServer_(text) {
  const candidates = [',', ';', '\t', '|'];
  let best = { d: ',', cols: 0 };
  for (const d of candidates) {
    try {
      const parsed = Utilities.parseCsv(text, d);
      const cols = (parsed[0] || []).length;
      if (cols > best.cols) best = { d, cols };
    } catch (_) {}
  }
  return best.d;
}

function getHariSekarang() {
  var now = new Date();
  var hariIndonesia = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  return hariIndonesia[now.getDay()];
}

function getSalam() {
  var now = new Date();
  var hours = now.getHours();
  
  var salam;
  
  if (hours >= 5 && hours < 11) {
    salam = "Selamat pagi";
  } else if (hours >= 11 && hours < 15) {
    salam = "Selamat siang";
  } else if (hours >= 15 && hours < 18) {
    salam = "Selamat sore";
  } else {
    salam = "Selamat malam";
  }
  
  return salam;
}

function sendWhatsAppNotification(number, message) {
  var sheetWA   = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("NOTE") 
  var apiKey    = sheetWA.getRange(4, 3).getValue(); 
  var sender    = sheetWA.getRange(5, 3).getValue(); 
  var url       = sheetWA.getRange(6, 3).getValue();  
  
  try {
    var options = {
      'method': 'post',
      'contentType': 'application/json',
      'payload': JSON.stringify({
        'api_key': apiKey,
        'sender': sender,
        'number': number,
        'message': message
      })
    };

    var response = UrlFetchApp.fetch(url, options);
    var result = JSON.parse(response.getContentText());

    Logger.log(result);

    if (result.status === true) {
      Logger.log("Sukses mengirim WA Pemberitahuan ke Siswa");
      return true;
    } else {
      Logger.log("Gagal: " + result.msg);
      return false;
    }
  } catch (e) {
    Logger.log("Gagal: " + e.message);
    return false;
  }
}

/****************************
 * LEGACY SPREADSHEET UI FUNCTIONS
 * (Keep existing functions untuk compatibility)
 ****************************/
function onOpen() {
  var ui = SpreadsheetApp.getUi();
 
  ui.createMenu('Tracer Study Vokasi')
    .addSeparator()
    .addSubMenu(ui.createMenu('Set Data Kirim WhatsApp')
                  .addItem("Sinkronkan Via Sidebar", "showSidebar")
                  .addSeparator()
                  .addItem("Sinkronkan Via WebApp", "bukaLinkWebApp")
                  .addSeparator()
                  .addItem("Sinkron Nomor WA Kosong", "isiNoWhatsAppAlumni")
                  )
    .addSeparator()
    .addSubMenu(ui.createMenu('Set Data Kirim WhatsApp')
              .addSeparator()
              .addItem('Set "KIRIM WA" sesuai Status Data Tracer', 'setStatusWATracer_')
              .addSeparator()
              .addItem('Set semua Status : "KIRIM WA"', 'setStatusKirimWA')
              .addSeparator()
              .addItem('Set semua Status : "TERKIRIM"', 'setStatusTerkirim')
              .addSeparator()
              .addItem('Set semua Status : "STOP"',      'setStatusStop')
              ) 
    .addSeparator()
    .addSubMenu(ui.createMenu('Copy Template Broadcast')
              .addSeparator()
              .addItem("Template BC : Belum Mengisi", "setBelumMengisi")
              .addSeparator()
              .addItem("Template BC : Sedang Mengisi", "setSedangMengisi")
              .addSeparator()
              .addItem("Template BC : Sudah Mengisi", "setSudahMengisi")
              )
    .addSeparator()
    .addSubMenu(ui.createMenu('Jalankan Broadcast')
              .addItem('Broadcast Terpilih', 'broadcast')   
              .addSeparator()
              .addItem('Broadcast Batch Otomatis', 'broadcastQuoteHarian')
              .addSeparator()
              .addItem('Broadcast Manual (satu kali)', 'batch50AndBroadcast')             
              )
    .addSeparator()
    .addItem('Informasi Aplikasi', 'Info')
    .addToUi();
}

function showSidebar() {
  const html = HtmlService.createHtmlOutputFromFile("UploadCSV")
    .setTitle("Tracer Study Vokasi");
  SpreadsheetApp.getUi().showSidebar(html);
}

function bukaLinkWebApp() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var url = ss.getSheetByName("NOTE").getRange("C10").getValue();

  if (!url || String(url).trim() === "") {
    SpreadsheetApp.getUi().alert("URL di Sheet 'NOTE' cell C10 kosong.\nSilakan isi dulu alamat WebApp.");
    return;
  }

  var safeUrl = JSON.stringify(String(url).trim());

  var htmlContent = '<!doctype html><html><head><meta charset="utf-8"></head><body>' +
                    '<script>' +
                    '  try {' +
                    '    var url = ' + safeUrl + ';' +
                    '    window.open(url, "_blank");' +
                    '  } catch(e) {' +
                    '    alert("Gagal membuka link: " + e);' +
                    '  } finally {' +
                    '    try { google.script.host.close(); } catch(e) {}' +
                    '  }' +
                    '</script>' +
                    '</body></html>';

  var html = HtmlService.createHtmlOutput(htmlContent)
                        .setWidth(10)
                        .setHeight(10);
  SpreadsheetApp.getUi().showModalDialog(html, "Membuka Web App...");
}

function isiNoWhatsAppAlumni() {
  isiNoWhatsAppAlumni_trigger();
}

function getTemplates() {
  try {
    console.log('getTemplates() called');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    console.log('Spreadsheet found:', ss.getName());
    
    const sh = ss.getSheetByName(SHEET_TEMPLATE);
    console.log('Template sheet found:', !!sh);
    
    if (!sh) {
      console.error('Sheet TEMPLATE TEKS BC not found');
      return [];
    }

    const vals = sh.getRange(4, 4, 4, 1).getValues().flat();
    console.log('Template values:', vals);

    const result = [
      { label: "Template Teks Umum", value: vals[0] || "" },
      { label: "Template Teks Broadcast Belum Mengisi", value: vals[1] || "" },
      { label: "Template Teks Broadcast Sedang Mengisi", value: vals[2] || "" },
      { label: "Template Teks Broadcast Sudah Mengisi", value: vals[3] || "" }
    ];
    
    console.log('Returning templates:', result);
    return result;
    
  } catch (error) {
    console.error('Error in getTemplates:', error);
    throw error;
  }
}

// FUNCTION TEST UNTUK DEBUG DI APPS SCRIPT EDITOR
function testGetTemplates() {
  try {
    const result = getTemplates();
    console.log('Test getTemplates result:', result);
    return result;
  } catch (error) {
    console.error('Test getTemplates error:', error);
    return error.message;
  }
}

// TEST APAKAH SHEET ADA
function testSheetExists() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets().map(s => s.getName());
  console.log('Available sheets:', sheets);
  
  const templateSheet = ss.getSheetByName('TEMPLATE TEKS BC');
  if (templateSheet) {
    const data = templateSheet.getRange(4, 4, 4, 1).getValues();
    console.log('Template data:', data);
  } else {
    console.error('TEMPLATE TEKS BC sheet not found');
  }
  
  return sheets;
}


/**
 * Server-side navigation support
 * Dipanggil dari client untuk handle redirect
 */
function redirectToPage(page) {
  try {
    console.log('Server redirect requested for page:', page);
    
    // Validate page
    const validPages = ['Upload', 'Index'];
    if (!validPages.includes(page)) {
      throw new Error('Invalid page: ' + page);
    }
    
    // Return success - client akan handle actual redirect
    return {
      success: true,
      page: page,
      url: '?page=' + page,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Server redirect error:', error);
    throw error;
  }
}

/**
 * Alternative navigation using HtmlService redirect
 * Returns new HtmlOutput for the requested page
 */
function getNavigationPage(page) {
  try {
    const validPages = ['Upload', 'Index'];
    const targetPage = validPages.includes(page) ? page : 'Upload';
    
    if (targetPage === 'Index') {
      return HtmlService.createHtmlOutputFromFile('Index')
        .setTitle('Broadcast WhatsApp - Tracer Study Vokasi')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
    
    return HtmlService.createHtmlOutputFromFile('Upload')
      .setTitle('Upload & Sinkron Data - Tracer Study Vokasi')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      
  } catch (error) {
    console.error('Navigation page error:', error);
    throw error;
  }
}

// SOLUSI ROBUST - Tambahkan ke Code.gs

/**
 * Dapatkan Web App URL saat ini dari server
 * Akan selalu return URL yang valid
 */
function getCurrentWebAppUrl() {
  try {
    // Method 1: Get dari ScriptApp (paling reliable)
    const webAppUrl = ScriptApp.getService().getUrl();
    if (webAppUrl) {
      return webAppUrl;
    }
    
    // Method 2: Construct dari script ID
    const scriptId = ScriptApp.getScriptId();
    return `https://script.google.com/macros/s/${scriptId}/exec`;
    
  } catch (error) {
    console.error('Error getting Web App URL:', error);
    // Fallback - return null jika gagal
    return null;
  }
}

/**
 * Server-side navigation function
 * Return HTML output untuk halaman yang diminta
 */
function navigateToPageServer(targetPage) {
  try {
    const validPages = ['Upload', 'Index'];
    const page = validPages.includes(targetPage) ? targetPage : 'Upload';
    
    const webAppUrl = getCurrentWebAppUrl();
    
    if (page === 'Index') {
      const template = HtmlService.createTemplateFromFile('Index');
      template.webAppUrl = webAppUrl; // Pass URL ke template
      return template.evaluate()
        .setTitle('Broadcast WhatsApp - Tracer Study')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
    
    const template = HtmlService.createTemplateFromFile('Upload');
    template.webAppUrl = webAppUrl; // Pass URL ke template
    return template.evaluate()
      .setTitle('Upload & Sinkron Data - Tracer Study')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      
  } catch (error) {
    console.error('Navigation error:', error);
    throw new Error('Gagal navigasi ke halaman: ' + error.message);
  }
}
// Add other legacy functions as needed...
