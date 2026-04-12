/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║        THOUGHT BISTRO — GOOGLE APPS SCRIPT v2              ║
 * ║        Syncs Meta Ads leads → Lead Machine dashboard        ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  ONE-TIME SETUP (read top to bottom):                       ║
 * ║                                                             ║
 * ║  Step 1. In your Google Sheet:                              ║
 * ║           Extensions → Apps Script                          ║
 * ║           Paste this entire file and save (Ctrl+S / ⌘+S)   ║
 * ║                                                             ║
 * ║  Step 2. Replace WEBHOOK_URL with your Vercel URL           ║
 * ║           e.g. https://my-app.vercel.app/api/webhook        ║
 * ║                                                             ║
 * ║  Step 3. Keep WEBHOOK_SECRET exactly as set in Vercel       ║
 * ║           Environment Variables                             ║
 * ║                                                             ║
 * ║  Step 4. Click ▶ Run → choose "setupTrigger"               ║
 * ║           Accept the Google permissions popup               ║
 * ║                                                             ║
 * ║  Step 5. Optionally: run "syncAllLeads" once to push        ║
 * ║           all existing rows to the dashboard                ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

// ── CONFIG — edit these two lines ────────────────────────────────────────────

const WEBHOOK_URL    = 'https://YOUR_APP.vercel.app/api/webhook';
const WEBHOOK_SECRET = 'tb_secret_2024'; // Must match your Vercel env var

// ─────────────────────────────────────────────────────────────────────────────


/**
 * Reads a single row from the active sheet and POSTs it to the dashboard.
 *
 * @param {number} rowIndex  1-based row index (row 1 = header, data starts at 2)
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 */
function sendLeadToApp(rowIndex, sheet) {
  const lastCol = sheet.getLastColumn();
  if (lastCol < 1) return;

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const values  = sheet.getRange(rowIndex, 1, 1, lastCol).getValues()[0];

  // Build a plain object: { header: value, … }
  var raw = {};
  headers.forEach(function (header, i) {
    raw[String(header).trim()] = (values[i] !== undefined && values[i] !== null)
      ? String(values[i]).trim()
      : '';
  });

  // Skip rows with no useful data
  if (!raw['full_name'] && !raw['phone_number']) {
    Logger.log('Row ' + rowIndex + ': no name or phone — skipped.');
    return;
  }

  // Build the payload our API expects
  var payload = {
    sheet_id:     raw['id']           || ('row_' + rowIndex),
    full_name:    raw['full_name']    || '',
    phone_number: raw['phone_number'] || '',
    company_name: raw['company_name'] || '',

    // Parse created_time → ISO string; fall back to now
    created_at: (raw['created_time'] && raw['created_time'] !== '')
      ? new Date(raw['created_time']).toISOString()
      : new Date().toISOString(),

    // All extra sheet columns go into metadata for display in the dashboard
    metadata: {
      clinic_type:       raw['What type of clinic do you run?']                                  || '',
      treatment_price:   raw['Typical full treatment price?']                                    || '',
      lead_quality_desc: raw['Which of these best describes your current leads?']               || '',
      notes:             raw['anything_else_you_would_like_us_to_know_before_we_contact_you?'] || '',
      ad_id:             raw['ad_id']          || '',
      ad_name:           raw['ad_name']        || '',
      adset_id:          raw['adset_id']       || '',
      adset_name:        raw['adset_name']     || '',
      campaign_id:       raw['campaign_id']    || '',
      campaign_name:     raw['campaign_name']  || '',
      form_id:           raw['form_id']        || '',
      form_name:         raw['form_name']      || '',
      platform:          raw['platform']       || '',
      is_organic:        raw['is_organic']     || '',
      lead_status:       raw['lead_status']    || '',
      india_time:        raw['India Time']     || '',
    },
  };

  var options = {
    method:      'post',
    contentType: 'application/json',
    headers:     { 'X-Webhook-Secret': WEBHOOK_SECRET },
    payload:     JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  try {
    var response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    Logger.log('Row ' + rowIndex + ' → HTTP ' + response.getResponseCode() + ' : ' + response.getContentText());
  } catch (err) {
    Logger.log('Row ' + rowIndex + ' error: ' + err.toString());
  }
}


/**
 * Fires automatically whenever a new row is added to the sheet
 * (e.g. when Zapier / Make pushes a new Meta Ads lead).
 *
 * Do NOT rename this function — it is bound to the onChange trigger.
 */
function onSheetChange(e) {
  if (e.changeType !== 'INSERT_ROW') return;

  var sheet   = SpreadsheetApp.getActive().getActiveSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return; // only header row

  // Brief pause to let the automation tool (Zapier/Make) finish writing the row
  Utilities.sleep(2000);

  Logger.log('New row detected → syncing row ' + lastRow);
  sendLeadToApp(lastRow, sheet);
}


/**
 * Run this ONCE after pasting the script to activate the automatic trigger.
 * Every new row added to the sheet after this will be pushed to the dashboard.
 */
function setupTrigger() {
  // Remove any existing onSheetChange triggers to avoid duplicates
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'onSheetChange') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Install the onChange trigger
  ScriptApp.newTrigger('onSheetChange')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onChange()
    .create();

  Logger.log('✅ Trigger active! New leads will auto-sync to the dashboard.');
  Logger.log('   Webhook target: ' + WEBHOOK_URL);
}


/**
 * Optional: run once manually to push ALL existing rows from the sheet.
 * After this, new leads auto-sync via the trigger set up above.
 */
function syncAllLeads() {
  var sheet   = SpreadsheetApp.getActive().getActiveSheet();
  var lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    Logger.log('No data rows found. Is the sheet empty?');
    return;
  }

  Logger.log('Syncing ' + (lastRow - 1) + ' leads to the dashboard…');

  for (var row = 2; row <= lastRow; row++) {
    sendLeadToApp(row, sheet);
    Utilities.sleep(300); // Rate-limit: ~3 requests/second
  }

  Logger.log('✅ Done — ' + (lastRow - 1) + ' leads sent.');
}
