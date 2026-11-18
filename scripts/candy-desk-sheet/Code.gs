/**
 * Candy Desk: Google Apps Script for the front-desk candy sheet.
 *
 * Bound to the staff Google Sheet (Extensions → Apps Script). One row per
 * Gumball Slice candy voucher. Staff change Status to "Redeemed" when they hand
 * over a coin; that's saved to Supabase straight away. Every minute the script
 * pulls every voucher from Supabase: new wins are added, rows are corrected
 * from the database, unsaved changes are retried, and rows for deleted
 * accounts are removed.
 *
 * Talks only to the candy-desk edge function (supabase/functions/candy-desk).
 * Setup and ownership handoff: README.md next to this file.
 */

const SHEET_NAME = 'Candy desk';

const STATUS = {
  READY: 'Ready to claim',
  REDEEMED: 'Redeemed',
  CANCELLED: 'Cancelled',
};

const STATUS_LABEL = { issued: STATUS.READY, redeemed: STATUS.REDEEMED, void: STATUS.CANCELLED };

// 1-based columns. VOUCHER_ID and SYNCED are hidden: SYNCED is the status
// Supabase last confirmed, so a Status cell that differs from it is a staff
// change that hasn't been saved yet.
const COL = {
  WON_AT: 1,
  NAME: 2,
  EMAIL: 3,
  CODE: 4,
  STATUS: 5,
  REDEEMED_AT: 6,
  NOTES: 7,
  VOUCHER_ID: 8,
  SYNCED: 9,
};
const NUM_COLS = 9;
const HEADERS = ['won at', 'name', 'me2you email', 'code', 'status', 'redeemed at', 'notes', 'voucher id', 'synced status'];

const TIMEZONE = 'America/New_York';
const DATE_FORMAT = 'ddd mmm d, h:mm am/pm';

// Consecutive failed syncs (one a minute) before the owner gets an email.
const ALERT_AFTER_FAILURES = 10;

// ------------------------------------------------------------
// Menu + setup
// ------------------------------------------------------------

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Candy desk')
    .addItem('Sync now', 'syncNow')
    .addItem('Set up / repair sheet', 'setUp')
    .addToUi();
}

/** Builds the sheet, its formatting and protection, and installs the triggers. Safe to re-run. */
function setUp() {
  // Google lets people approve only some permissions; the triggers need all of them.
  ScriptApp.requireAllScopes(ScriptApp.AuthMode.FULL);
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('CANDY_DESK_URL') || !props.getProperty('CANDY_DESK_SECRET')) {
    ui.alert(
      'Missing settings',
      'Add the script properties CANDY_DESK_URL and CANDY_DESK_SECRET first ' +
        '(Apps Script editor → Project Settings → Script Properties). See README.md.',
      ui.ButtonSet.OK,
    );
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone(TIMEZONE);
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME, 0);

  formatSheet_(sheet);

  ScriptApp.getProjectTriggers()
    .filter((t) => ['sync', 'handleEdit'].includes(t.getHandlerFunction()))
    .forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('sync').timeBased().everyMinutes(1).create();
  ScriptApp.newTrigger('handleEdit').forSpreadsheet(ss).onEdit().create();

  const result = sync();
  if (result.error) {
    ui.alert('Set up, but the first sync failed', result.error, ui.ButtonSet.OK);
  } else {
    ui.alert('Candy desk is set up', 'New wins will appear within a minute.', ui.ButtonSet.OK);
  }
}

/** Headers, formats, dropdown, colours and protection over every row. Re-run when the sheet grows. */
function formatSheet_(sheet) {
  sheet.getRange(1, 1, 1, NUM_COLS).setValues([HEADERS]).setFontWeight('bold').setBackground('#e44805').setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  sheet.setColumnWidths(COL.WON_AT, 1, 170);
  sheet.setColumnWidths(COL.NAME, 2, 200);
  sheet.setColumnWidth(COL.CODE, 80);
  sheet.setColumnWidth(COL.STATUS, 140);
  sheet.setColumnWidth(COL.REDEEMED_AT, 170);
  sheet.setColumnWidth(COL.NOTES, 260);
  sheet.hideColumns(COL.VOUCHER_ID, 2);

  const rows = sheet.getMaxRows() - 1;
  sheet.getRange(2, COL.WON_AT, rows, 1).setNumberFormat(DATE_FORMAT);
  sheet.getRange(2, COL.REDEEMED_AT, rows, 1).setNumberFormat(DATE_FORMAT);
  // Plain text, or a code like 2345 would be read as a number.
  sheet.getRange(2, COL.CODE, rows, 1).setNumberFormat('@').setFontFamily('Roboto Mono').setFontWeight('bold');

  // Staff can only pick these two; the script also writes "Cancelled".
  sheet.getRange(2, COL.STATUS, rows, 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList([STATUS.READY, STATUS.REDEEMED], true)
      .setAllowInvalid(false)
      .build(),
  );

  const body = sheet.getRange(2, 1, rows, COL.NOTES);
  sheet.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(`=$E2="${STATUS.READY}"`)
      .setBackground('#d9f2d0')
      .setRanges([body])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(`=$E2="${STATUS.REDEEMED}"`)
      .setBackground('#eeeeee')
      .setFontColor('#777777')
      .setRanges([body])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(`=$E2="${STATUS.CANCELLED}"`)
      .setFontColor('#999999')
      .setStrikethrough(true)
      .setRanges([body])
      .build(),
  ]);

  // Everything but Status and Notes asks "are you sure?" before an edit;
  // sync puts any changed values back anyway.
  sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET).forEach((p) => p.remove());
  sheet
    .protect()
    .setDescription('Filled in by the candy desk script')
    .setWarningOnly(true)
    .setUnprotectedRanges([sheet.getRange(2, COL.STATUS, rows, 1), sheet.getRange(2, COL.NOTES, rows, 1)]);
}

// ------------------------------------------------------------
// Staff edits (installable onEdit trigger)
// ------------------------------------------------------------

function handleEdit(e) {
  const range = e.range;
  const sheet = range.getSheet();
  if (sheet.getName() !== SHEET_NAME) return;
  if (range.getColumn() > COL.STATUS || range.getLastColumn() < COL.STATUS) return;

  const firstRow = Math.max(range.getRow(), 2);
  const lastRow = range.getLastRow();
  if (lastRow < firstRow) return;

  // Pasting or dragging over several statuses is too easy to do by accident.
  if (range.getNumRows() > 1 || range.getNumColumns() > 1) {
    const synced = sheet.getRange(firstRow, COL.SYNCED, lastRow - firstRow + 1, 1).getValues();
    sheet.getRange(firstRow, COL.STATUS, synced.length, 1).setValues(synced);
    toast_('Change one row at a time. That edit was undone.');
    return;
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10 * 1000)) {
    toast_(`Row ${firstRow} isn't saved yet. It will retry automatically.`);
    return;
  }
  try {
    const row = sheet.getRange(firstRow, 1, 1, NUM_COLS).getValues()[0];
    const id = row[COL.VOUCHER_ID - 1];
    if (!id || row[COL.STATUS - 1] === row[COL.SYNCED - 1]) return;

    const pushed = pushStatus_(sheet, firstRow, row);
    if (pushed) {
      writeVoucher_(sheet, firstRow, row, {
        voucher_id: id,
        issued_at: row[COL.WON_AT - 1],
        player_name: row[COL.NAME - 1],
        player_email: row[COL.EMAIL - 1],
        code: row[COL.CODE - 1],
        status: pushed.status,
        redeemed_at: pushed.redeemed_at,
      });
      toast_(`${row[COL.CODE - 1]} saved as ${STATUS_LABEL[pushed.status]}.`);
    }
  } finally {
    lock.releaseLock();
  }
}

// ------------------------------------------------------------
// Sync (time-driven trigger every minute; "Sync now" in the menu)
// ------------------------------------------------------------

/** The menu's "Sync now": like the minute trigger, but says what happened. */
function syncNow() {
  ScriptApp.requireAllScopes(ScriptApp.AuthMode.FULL);
  const ui = SpreadsheetApp.getUi();
  const result = sync();
  if (result.error) {
    ui.alert('Sync failed', result.error, ui.ButtonSet.OK);
  } else if (result.busy) {
    toast_('Another sync is running. Try again in a moment.');
  } else {
    toast_(`Synced ${result.count} voucher${result.count === 1 ? '' : 's'}.`);
  }
}

/** Returns { count } on success, { error } on failure, or { busy } if another sync holds the lock. */
function sync() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30 * 1000)) return { busy: true };

  const props = PropertiesService.getScriptProperties();
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error(`No "${SHEET_NAME}" tab. Run Candy desk → Set up / repair sheet.`);

    const vouchers = callDesk_({ action: 'list' }).vouchers;
    const byId = new Map(vouchers.map((v) => [v.voucher_id, v]));

    const lastRow = sheet.getLastRow();
    const rows = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, NUM_COLS).getValues() : [];
    const seen = new Set();
    const gone = [];

    rows.forEach((row, i) => {
      const rowNum = i + 2;
      const id = row[COL.VOUCHER_ID - 1];
      if (!id) return; // a row staff added by hand: leave it alone
      seen.add(id);

      let voucher = byId.get(id);
      if (!voucher) {
        gone.push(rowNum); // account deleted, so its vouchers are too
        return;
      }

      if (row[COL.STATUS - 1] !== row[COL.SYNCED - 1]) {
        const pushed = pushStatus_(sheet, rowNum, row);
        if (!pushed) return; // still pending, or put back
        voucher = Object.assign({}, voucher, pushed);
      }
      writeVoucher_(sheet, rowNum, row, voucher);
    });

    // An empty list with rows on the sheet is far more likely a fault than
    // every account being deleted, so never purge on one.
    if (vouchers.length > 0) {
      for (let i = gone.length - 1; i >= 0; i--) sheet.deleteRow(gone[i]);
    }

    const fresh = vouchers.filter((v) => !seen.has(v.voucher_id));
    if (fresh.length > 0) {
      const needed = sheet.getLastRow() + fresh.length - sheet.getMaxRows();
      if (needed > 0) {
        sheet.insertRowsAfter(sheet.getMaxRows(), needed + 500);
        formatSheet_(sheet);
      }
      sheet.getRange(sheet.getLastRow() + 1, 1, fresh.length, NUM_COLS).setValues(fresh.map((v) => rowFor_(v, '')));
    }

    if (props.getProperty('FAILURES')) props.deleteProperty('FAILURES');
    return { count: vouchers.length };
  } catch (err) {
    const failures = Number(props.getProperty('FAILURES') || 0) + 1;
    props.setProperty('FAILURES', String(failures));
    console.error(`Candy desk sync failed (${failures} in a row): ${err.message}`);
    if (failures === ALERT_AFTER_FAILURES) alertOwner_(err);
    return { error: err.message };
  } finally {
    lock.releaseLock();
  }
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

/**
 * Saves a row's changed Status to Supabase. Returns the voucher's new
 * { status, redeemed_at }, or null if it wasn't saved: put back when Supabase
 * refused it for good, left pending for the next sync otherwise.
 */
function pushStatus_(sheet, rowNum, row) {
  const status = row[COL.STATUS - 1];
  const synced = row[COL.SYNCED - 1];
  const action = status === STATUS.REDEEMED ? 'redeem' : status === STATUS.READY ? 'unredeem' : null;

  if (!action) {
    sheet.getRange(rowNum, COL.STATUS).setValue(synced);
    toast_('Status can only be "Ready to claim" or "Redeemed".');
    return null;
  }

  try {
    return callDesk_({ action, voucher_id: row[COL.VOUCHER_ID - 1] }).voucher;
  } catch (err) {
    if (err.permanent) {
      sheet.getRange(rowNum, COL.STATUS).setValue(synced);
      toast_(`${row[COL.CODE - 1]}: ${err.message}`);
    } else {
      toast_(`${row[COL.CODE - 1]} isn't saved yet. It will retry automatically.`);
    }
    return null;
  }
}

/** The sheet row for a voucher from candy_desk_vouchers(). */
function rowFor_(v, notes) {
  const label = STATUS_LABEL[v.status] || v.status;
  return [
    new Date(v.issued_at),
    v.player_name || '',
    v.player_email || '',
    v.code,
    label,
    v.redeemed_at ? new Date(v.redeemed_at) : '',
    notes,
    v.voucher_id,
    label,
  ];
}

/** Rewrites a row only if something differs, keeping the staff's notes. */
function writeVoucher_(sheet, rowNum, row, voucher) {
  const want = rowFor_(voucher, row[COL.NOTES - 1]);
  const same = want.every((value, i) => {
    const have = row[i];
    if (value instanceof Date) return have instanceof Date && have.getTime() === value.getTime();
    return have === value;
  });
  if (!same) sheet.getRange(rowNum, 1, 1, NUM_COLS).setValues([want]);
}

/** Calls the candy-desk edge function. Errors carry .permanent when retrying won't help. */
function callDesk_(payload) {
  const props = PropertiesService.getScriptProperties();
  const url = props.getProperty('CANDY_DESK_URL');
  const secret = props.getProperty('CANDY_DESK_SECRET');
  if (!url || !secret) throw new Error('Script properties CANDY_DESK_URL and CANDY_DESK_SECRET are not set');

  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-candy-desk-secret': secret },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  const code = res.getResponseCode();
  let body = {};
  try {
    body = JSON.parse(res.getContentText());
  } catch (_) {
    // not JSON; handled below
  }
  if (code === 200 && body.success) return body;

  const err = new Error(body.error || `Candy desk returned HTTP ${code}`);
  // Bad request, unknown voucher, cancelled or past the undo window. A 401
  // (wrong secret) is a setup problem, so those edits stay pending instead.
  err.permanent = [400, 404, 409].includes(code);
  throw err;
}

function toast_(message) {
  SpreadsheetApp.getActiveSpreadsheet().toast(message, 'Candy desk', 8);
}

function alertOwner_(err) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  MailApp.sendEmail(
    Session.getEffectiveUser().getEmail(),
    'Candy desk sheet has stopped syncing',
    `The candy desk sheet hasn't been able to reach me2you for about ${ALERT_AFTER_FAILURES} minutes.\n\n` +
      `Last error: ${err.message}\n\nSheet: ${ss.getUrl()}\n\n` +
      'New wins won\'t appear and redemptions won\'t save until this is fixed. ' +
      'Try Candy desk → Sync now, and check the setup steps in scripts/candy-desk-sheet/README.md.',
  );
}
