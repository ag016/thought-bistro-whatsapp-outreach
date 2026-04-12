/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║   THOUGHT BISTRO — GOOGLE APPS SCRIPT v3                    ║
 * ║   Now includes Web App (doGet/doPost) for dashboard writes   ║
 * ╠═══════════════════════════════════════════════════════════════╣
 * ║  SETUP ORDER:                                                ║
 * ║  1. Paste this file → Save                                   ║
 * ║  2. Replace WEBHOOK_URL with your Vercel URL                 ║
 * ║  3. Deploy → New Deployment → Web App                        ║
 * ║     - Execute as: Me                                         ║
 * ║     - Who has access: Anyone                                 ║
 * ║  4. Copy Web App URL → add to Vercel as APPS_SCRIPT_URL      ║
 * ║  5. Run initSheetTabs()  → creates Nurture + Notes tabs      ║
 * ║  6. Run importExistingNotes() → migrates extra note columns  ║
 * ║  7. Run setupTrigger()  → activates auto-sync on new rows    ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

// ── CONFIG ────────────────────────────────────────────────────────────────────

var WEBHOOK_URL    = 'https://thought-bistro-whatsapp-outreach.vercel.app/api/webhook';
var WEBHOOK_SECRET = 'tb_secret_2024';

var NURTURE_TAB = 'Nurture';
var NOTES_TAB   = 'Notes';
var LEADS_TAB   = 'Clinic Mar 31';

var NURTURE_HEADERS = [
  'lead_id', 'current_step', 'status', 'last_sent_at',
  'msg1_sent', 'msg2_sent', 'msg3_sent', 'msg4_sent', 'msg5_sent',
  'msg6_sent', 'msg7_sent', 'msg8_sent', 'msg9_sent', 'msg10_sent',
  'updated_at'
];

var NOTES_HEADERS = ['lead_id', 'note_text', 'created_at', 'source'];

// Standard columns — anything beyond these is treated as extra/notes
var STANDARD_COLS = [
  'id','created_time','ad_id','ad_name','adset_id','adset_name',
  'campaign_id','campaign_name','form_id','form_name','is_organic','platform',
  'What type of clinic do you run?','Typical full treatment price?',
  'Which of these best describes your current leads?',
  'anything_else_you_would_like_us_to_know_before_we_contact_you?',
  'full_name','phone_number','company_name','lead_status','India Time',
  'nurture_step','nurture_status','last_wa_sent'
];

// ── WEB APP: doGet ────────────────────────────────────────────────────────────

function doGet(e) {
  var p      = e.parameter || {};
  var secret = p.secret    || '';

  if (secret !== WEBHOOK_SECRET) {
    return json({ error: 'Unauthorized' });
  }

  var action = p.action || '';

  if (action === 'nurture') {
    return json({ nurture: readNurture() });
  }

  if (action === 'notes') {
    return json({ notes: readNotes(p.leadId || '') });
  }

  return json({ error: 'Unknown action. Use ?action=nurture or ?action=notes' });
}

// ── WEB APP: doPost ───────────────────────────────────────────────────────────

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json({ error: 'Invalid JSON: ' + err.toString() });
  }

  if ((body.secret || '') !== WEBHOOK_SECRET) {
    return json({ error: 'Unauthorized' });
  }

  var action = body.action || '';

  if (action === 'upsertNurture') { return json(upsertNurture(body)); }
  if (action === 'addNote')       { return json(addNote(body)); }
  if (action === 'updateStatus')  { return json(updateLeadStatus(body)); }
  if (action === 'initTabs')      { initSheetTabs(); return json({ success: true }); }

  return json({ error: 'Unknown action: ' + action });
}

function updateLeadStatus(body) {
  var ss    = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName(LEADS_TAB);
  var leadId = String(body.leadId || '').trim();
  var newStatus = String(body.newStatus || '').trim();
  
  if (!sheet || !leadId || !newStatus) return { error: 'Missing requirements' };

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) { return String(h).trim(); });
  var idColIdx     = headers.indexOf('id');
  var statusColIdx = headers.indexOf('lead_status');
  
  if (idColIdx === -1 || statusColIdx === -1) return { error: 'Columns not found in sheet' };

  var ids = sheet.getRange(2, idColIdx + 1, sheet.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === leadId) {
      sheet.getRange(i + 2, statusColIdx + 1).setValue(newStatus);
      break;
    }
  }
  return { success: true };
}

function json(data) {
  var out = ContentService.createTextOutput(JSON.stringify(data));
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}

// ── NURTURE: READ ─────────────────────────────────────────────────────────────

function readNurture() {
  var ss    = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName(NURTURE_TAB);
  if (!sheet || sheet.getLastRow() < 2) return {};

  var numCols = NURTURE_HEADERS.length;
  var data    = sheet.getRange(1, 1, sheet.getLastRow(), numCols).getValues();
  var result  = {};

  for (var i = 1; i < data.length; i++) {
    var row    = data[i];
    var leadId = String(row[0] || '').trim();
    if (!leadId) continue;

    var entry = {};
    NURTURE_HEADERS.forEach(function(h, j) {
      entry[h] = row[j] !== undefined ? String(row[j]) : '';
    });
    result[leadId] = entry;
  }

  return result;
}

// ── NURTURE: UPSERT ───────────────────────────────────────────────────────────

function upsertNurture(body) {
  var ss    = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName(NURTURE_TAB);
  if (!sheet) { initSheetTabs(); sheet = ss.getSheetByName(NURTURE_TAB); }

  var leadId = String(body.leadId || '').trim();
  if (!leadId) return { error: 'leadId required' };

  var now     = new Date().toISOString();
  var lastRow = sheet.getLastRow();
  var existingRow = -1;

  if (lastRow >= 2) {
    var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]).trim() === leadId) { existingRow = i + 2; break; }
    }
  }

  if (existingRow === -1) {
    // New row
    var newRow = new Array(NURTURE_HEADERS.length).fill('');
    newRow[0] = leadId;
    newRow[1] = body.currentStep !== undefined ? body.currentStep : 0;
    newRow[2] = body.status      || 'active';
    newRow[3] = body.lastSentAt  || '';
    if (body.msgIndex && body.sentAt) {
      newRow[3 + parseInt(body.msgIndex)] = body.sentAt;
    }
    newRow[NURTURE_HEADERS.length - 1] = now;
    sheet.appendRow(newRow);
  } else {
    // Update existing
    var range = sheet.getRange(existingRow, 1, 1, NURTURE_HEADERS.length);
    var vals  = range.getValues()[0];
    if (body.currentStep !== undefined) vals[1] = body.currentStep;
    if (body.status)                    vals[2] = body.status;
    if (body.lastSentAt)                vals[3] = body.lastSentAt;
    if (body.msgIndex && body.sentAt)   vals[3 + parseInt(body.msgIndex)] = body.sentAt;
    vals[NURTURE_HEADERS.length - 1] = now;
    range.setValues([vals]);
  }

  // Mirror key fields back into "Clinic Mar 31"
  syncToLeadsTab(leadId, body);

  return { success: true, leadId: leadId };
}

// Write nurture_step / nurture_status / last_wa_sent back into the leads tab
function syncToLeadsTab(leadId, nurtureData) {
  var ss    = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName(LEADS_TAB);
  if (!sheet || sheet.getLastRow() < 2) return;

  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return String(h).trim(); });
  var idColIdx = headers.indexOf('id');
  if (idColIdx === -1) return;

  // Ensure our extra columns exist
  function ensureCol(name) {
    var idx = headers.indexOf(name);
    if (idx === -1) {
      lastCol++;
      sheet.getRange(1, lastCol).setValue(name);
      headers.push(name);
      idx = headers.length - 1;
    }
    return idx;
  }

  var stepColIdx   = ensureCol('nurture_step');
  var statusColIdx = ensureCol('nurture_status');
  var lastWaColIdx = ensureCol('last_wa_sent');

  // Find the lead row by id
  var ids = sheet.getRange(2, idColIdx + 1, sheet.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === leadId) {
      var dataRow = i + 2;
      if (nurtureData.currentStep !== undefined) sheet.getRange(dataRow, stepColIdx + 1).setValue(nurtureData.currentStep);
      if (nurtureData.status)                    sheet.getRange(dataRow, statusColIdx + 1).setValue(nurtureData.status);
      if (nurtureData.lastSentAt)                sheet.getRange(dataRow, lastWaColIdx + 1).setValue(nurtureData.lastSentAt);
      break;
    }
  }
}

// ── NOTES: READ ───────────────────────────────────────────────────────────────

function readNotes(filterLeadId) {
  var ss    = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName(NOTES_TAB);
  if (!sheet || sheet.getLastRow() < 2) return [];

  var data    = sheet.getRange(2, 1, sheet.getLastRow() - 1, NOTES_HEADERS.length).getValues();
  var results = [];

  for (var i = 0; i < data.length; i++) {
    var row   = data[i];
    var rowId = String(row[0] || '').trim();
    if (filterLeadId && rowId !== filterLeadId) continue;
    if (!String(row[1] || '').trim()) continue;
    results.push({
      lead_id:   rowId,
      note_text: String(row[1] || ''),
      created_at: String(row[2] || ''),
      source:    String(row[3] || 'manual'),
    });
  }
  return results;
}

// ── NOTES: ADD ────────────────────────────────────────────────────────────────

function addNote(body) {
  var ss    = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName(NOTES_TAB);
  if (!sheet) { initSheetTabs(); sheet = ss.getSheetByName(NOTES_TAB); }

  var leadId   = String(body.leadId   || '').trim();
  var noteText = String(body.noteText || '').trim();
  if (!leadId || !noteText) return { error: 'leadId and noteText required' };

  sheet.appendRow([leadId, noteText, body.createdAt || new Date().toISOString(), 'manual']);
  return { success: true };
}

// ── INIT: CREATE TABS ─────────────────────────────────────────────────────────

function initSheetTabs() {
  var ss = SpreadsheetApp.getActive();

  if (!ss.getSheetByName(NURTURE_TAB)) {
    var n = ss.insertSheet(NURTURE_TAB);
    n.appendRow(NURTURE_HEADERS);
    n.setFrozenRows(1);
    n.getRange(1, 1, 1, NURTURE_HEADERS.length).setFontWeight('bold').setBackground('#d9ead3');
    Logger.log('Created "Nurture" tab.');
  }

  if (!ss.getSheetByName(NOTES_TAB)) {
    var nt = ss.insertSheet(NOTES_TAB);
    nt.appendRow(NOTES_HEADERS);
    nt.setFrozenRows(1);
    nt.getRange(1, 1, 1, NOTES_HEADERS.length).setFontWeight('bold').setBackground('#fce8b2');
    Logger.log('Created "Notes" tab.');
  }

  Logger.log('initSheetTabs() complete.');
}

// ── IMPORT EXISTING NOTES FROM EXTRA COLUMNS ──────────────────────────────────

function importExistingNotes() {
  var ss         = SpreadsheetApp.getActive();
  var leadsSheet = ss.getSheetByName(LEADS_TAB);
  if (!leadsSheet) { Logger.log('Leads tab not found.'); return; }

  initSheetTabs();
  var notesSheet = ss.getSheetByName(NOTES_TAB);

  var lastRow = leadsSheet.getLastRow();
  var lastCol = leadsSheet.getLastColumn();
  if (lastRow < 2) { Logger.log('No data rows.'); return; }

  var allData = leadsSheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = allData[0].map(function(h) { return String(h).trim(); });
  var idColIdx = headers.indexOf('id');
  if (idColIdx === -1) { Logger.log('No id column found.'); return; }

  var extraCols = [];
  
  for (var i = 0; i < lastCol; i++) {
    var h = headers[i];
    if (!h || STANDARD_COLS.indexOf(h) === -1) {
       extraCols.push({ index: i, header: h || ('Col ' + String.fromCharCode(65 + i)) });
    }
  }

  Logger.log('Extra columns to import: ' + extraCols.map(function(c) { return c.header; }).join(', '));

  var imported = 0;
  for (var row = 1; row < allData.length; row++) {
    var leadId = String(allData[row][idColIdx] || '').trim();
    if (!leadId) continue;

    extraCols.forEach(function(col) {
      var val = String(allData[row][col.index] || '').trim();
      if (val) {
        notesSheet.appendRow([leadId, '(' + col.header + ') ' + val, 'imported', 'imported']);
        imported++;
      }
    });
  }

  Logger.log('Imported ' + imported + ' notes from "' + LEADS_TAB + '".');
}

// ── ORIGINAL WEBHOOK FUNCTIONS (unchanged) ────────────────────────────────────

function sendLeadToApp(rowIndex, sheet) {
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return;

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var values  = sheet.getRange(rowIndex, 1, 1, lastCol).getValues()[0];

  var raw = {};
  headers.forEach(function(header, i) {
    raw[String(header).trim()] = values[i] !== null && values[i] !== undefined ? String(values[i]).trim() : '';
  });

  if (!raw['full_name'] && !raw['phone_number']) {
    Logger.log('Row ' + rowIndex + ': no name or phone — skipped.');
    return;
  }

  var payload = {
    sheet_id:     raw['id'] || 'row_' + rowIndex,
    full_name:    raw['full_name']    || '',
    phone_number: raw['phone_number'] || '',
    company_name: raw['company_name'] || '',
    created_at: raw['created_time'] ? new Date(raw['created_time']).toISOString() : new Date().toISOString(),
    metadata: {
      clinic_type:       raw['What type of clinic do you run?']                                  || '',
      treatment_price:   raw['Typical full treatment price?']                                    || '',
      lead_quality_desc: raw['Which of these best describes your current leads?']               || '',
      notes:             raw['anything_else_you_would_like_us_to_know_before_we_contact_you?'] || '',
      ad_id: raw['ad_id'] || '', ad_name: raw['ad_name'] || '',
      adset_id: raw['adset_id'] || '', adset_name: raw['adset_name'] || '',
      campaign_id: raw['campaign_id'] || '', campaign_name: raw['campaign_name'] || '',
      form_id: raw['form_id'] || '', form_name: raw['form_name'] || '',
      platform: raw['platform'] || '', is_organic: raw['is_organic'] || '',
      lead_status: raw['lead_status'] || '', india_time: raw['India Time'] || '',
    },
  };

  try {
    var res = UrlFetchApp.fetch(WEBHOOK_URL, {
      method: 'post', contentType: 'application/json',
      headers: { 'X-Webhook-Secret': WEBHOOK_SECRET },
      payload: JSON.stringify(payload), muteHttpExceptions: true,
    });
    Logger.log('Row ' + rowIndex + ' → HTTP ' + res.getResponseCode());
  } catch (err) {
    Logger.log('Row ' + rowIndex + ' error: ' + err.toString());
  }
}

function onSheetChange(e) {
  if (e.changeType !== 'INSERT_ROW') return;
  var sheet = SpreadsheetApp.getActive().getActiveSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;
  Utilities.sleep(2000);
  sendLeadToApp(lastRow, sheet);
}

function setupTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'onSheetChange') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('onSheetChange').forSpreadsheet(SpreadsheetApp.getActive()).onChange().create();
  Logger.log('Trigger active. Webhook: ' + WEBHOOK_URL);
}

function syncAllLeads() {
  var sheet = SpreadsheetApp.getActive().getSheetByName(LEADS_TAB);
  if (!sheet) { Logger.log('Sheet "' + LEADS_TAB + '" not found.'); return; }
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) { Logger.log('No data rows.'); return; }
  for (var row = 2; row <= lastRow; row++) {
    sendLeadToApp(row, sheet);
    Utilities.sleep(300);
  }
  Logger.log('Done — ' + (lastRow - 1) + ' leads sent.');
}
