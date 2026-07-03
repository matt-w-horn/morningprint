// --- CONFIGURATION ---
const CALENDAR_ID =
  'REDACTED_CALENDAR_ID';
const EMAIL_ALERTS_TO = 'redacted@example.com';
const MAX_RETRIES = 3;

// --- FORMATTING LIBRARY ---
const CMD = {
  INIT: [0x1b, 0x40],
  CP437: [0x1b, 0x74, 0x00],

  ALIGN_CENTER: [0x1b, 0x61, 0x01],
  ALIGN_LEFT: [0x1b, 0x61, 0x00],

  BOLD_ON: [0x1b, 0x45, 0x01],
  BOLD_OFF: [0x1b, 0x45, 0x00],

  INVERT_ON: [0x1d, 0x42, 0x01], // White text on black background
  INVERT_OFF: [0x1d, 0x42, 0x00],

  // Font Sizes
  SIZE_NORMAL: [0x1d, 0x21, 0x00], // Fits ~48 Chars
  SIZE_DOUBLE_HEIGHT: [0x1d, 0x21, 0x01], // Fits ~48 Chars (Tall)
  SIZE_2X: [0x1d, 0x21, 0x11], // Fits ~24 Chars (Big)

  FEED_LINES: (n) => [0x1b, 0x64, n],
  CUT_PAPER: [0x1d, 0x56, 0x42, 0x00],

  // Line Spacing
  SET_LINE_SPACING: (n) => [0x1b, 0x33, n],
  RESET_LINE_SPACING: [0x1b, 0x32],

  GET_BORDER_TOP: function () {
    let line = [0xc9];
    for (let i = 0; i < 40; i++) line.push(0xcd);
    line.push(0xbb);
    line.push(0x0a);
    return line;
  },

  GET_BORDER_BOTTOM: function () {
    let line = [0xc8];
    for (let i = 0; i < 40; i++) line.push(0xcd);
    line.push(0xbc);
    line.push(0x0a);
    return line;
  },
};

// --- TIME WINDOW SETTINGS ---
const LOOKBACK_HOURS = 12;

function checkAndPrintRobust() {
  Logger.log('🔒 [System] Attempting to acquire script lock...');

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    return;
  }

  try {
    const now = new Date();
    const scriptProperties = PropertiesService.getScriptProperties();

    let memory = JSON.parse(
      scriptProperties.getProperty('PRINT_MEMORY') || '{"printedEventIds":[]}',
    );

    const timeWindowStart = new Date(now.getTime() - LOOKBACK_HOURS * 60 * 60 * 1000);
    const timeWindowEnd =
      now.getHours() >= 6
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
        : now;

    const events = CalendarApp.getCalendarById(CALENDAR_ID).getEvents(
      timeWindowStart,
      timeWindowEnd,
    );

    events.forEach((event) => {
      const eventId = event.getId() + '_' + event.getStartTime().getTime();
      if (memory.printedEventIds.includes(eventId)) return;

      let shouldPrint = false;
      const startTime = event.getStartTime();

      if (event.isAllDayEvent()) {
        shouldPrint = true;
      } else {
        if (startTime >= timeWindowStart && startTime <= timeWindowEnd) {
          shouldPrint = true;
        }
      }

      if (shouldPrint) {
        const binaryPayload = generateReceiptPayload(event);
        const printSuccess = callWithRetry(() => sendToPi(binaryPayload));

        if (printSuccess) {
          Logger.log(`✅ Printed: ${event.getTitle()}`);
          memory.printedEventIds.push(eventId);
          if (memory.printedEventIds.length > 100) memory.printedEventIds.shift();
          scriptProperties.setProperty('PRINT_MEMORY', JSON.stringify(memory));
          Utilities.sleep(2000);
        } else {
          throw new Error(`Failed to print '${event.getTitle()}'`);
        }
      }
    });
  } catch (e) {
    Logger.log('💥 [Critical Error] ' + e.toString());
    sendAlertEmail('Printing Failed', e.toString());
  } finally {
    lock.releaseLock();
  }
}

// --- HELPER: GENERATE RECEIPT ---
function generateReceiptPayload(event) {
  let payload = [];

  const now = new Date();
  const dateString = now
    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    .toUpperCase();
  const timeHeader = event.isAllDayEvent()
    ? 'ALL DAY'
    : event.getStartTime().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // --- CLEAN DESCRIPTION ---
  let rawDesc = event.getDescription() || '';
  let cleanDesc = rawDesc
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>?/gm, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\[\s*\]/g, '\n[ ] ') // Ensure newline before checkboxes
    .replace(/\n\s*\n/g, '\n') // Collapse empty lines
    .trim();

  // --- BUILD RECEIPT ---

  // 1. Init
  payload = payload.concat(CMD.INIT);
  payload = payload.concat(CMD.CP437);
  payload = payload.concat(CMD.ALIGN_CENTER);

  // 2. Top Border
  payload = payload.concat(CMD.GET_BORDER_TOP());

  // 3. Header
  payload = payload.concat(CMD.INVERT_ON);
  payload = payload.concat(stringToBytes(' ' + dateString + ' - ' + timeHeader + ' \n'));
  payload = payload.concat(CMD.INVERT_OFF);

  // 4. TITLE
  payload = payload.concat(CMD.FEED_LINES(1));
  payload = payload.concat(CMD.SIZE_2X);

  let titleLines = wrapText(event.getTitle().toUpperCase(), 24);
  titleLines.forEach((line) => {
    payload = payload.concat(stringToBytes(line + '\n'));
  });

  payload = payload.concat(CMD.SIZE_NORMAL);
  payload = payload.concat(CMD.FEED_LINES(1));

  // 5. Bottom Border
  payload = payload.concat(CMD.GET_BORDER_BOTTOM());

  // 6. Description Logic
  if (cleanDesc.length > 0) {
    payload = payload.concat(CMD.FEED_LINES(1));
    payload = payload.concat(CMD.ALIGN_LEFT);
    payload = payload.concat(CMD.SET_LINE_SPACING(100)); // Wide spacing for Double Height

    // Split paragraphs first to preserve intended structure
    let paragraphs = cleanDesc.split('\n');

    paragraphs.forEach((paragraph) => {
      let line = paragraph.trim();
      if (line.length === 0) return;

      // --- CHECKBOX LOGIC ---
      if (line.indexOf('[ ]') === 0) {
        // This is a checkbox line.
        // Strip the "[ ]" prefix to handle the text separately
        let itemText = line.substring(3).trim();

        // Wrap the Item Text aggressively (30 chars) to account for the wide Checkbox
        let wrappedLines = wrapText(itemText, 30);

        wrappedLines.forEach((wLine, index) => {
          if (index === 0) {
            // First line: Print Checkbox (2X Bold) + First part of text (Double Height Bold)
            payload = payload.concat(CMD.SIZE_2X);
            payload = payload.concat(CMD.BOLD_ON);
            payload = payload.concat(stringToBytes('[ ]')); // Icon

            payload = payload.concat(CMD.SIZE_DOUBLE_HEIGHT);

            payload = payload.concat(CMD.BOLD_OFF);
            // Keep Bold ON for the item header
            payload = payload.concat(stringToBytes(' ' + wLine + '\n'));
          } else {
            // Subsequent wrapped lines: Indent slightly, Double Height, No Bold
            payload = payload.concat(CMD.SIZE_DOUBLE_HEIGHT);
            payload = payload.concat(stringToBytes('    ' + wLine + '\n'));
          }
        });
      } else {
        // --- STANDARD TEXT LOGIC ---
        // Just wrap to 42 chars and print Double Height
        let wrappedLines = wrapText(line, 42);
        wrappedLines.forEach((wLine) => {
          payload = payload.concat(CMD.SIZE_DOUBLE_HEIGHT);
          payload = payload.concat(stringToBytes(wLine + '\n'));
        });
      }
    });

    payload = payload.concat(CMD.SIZE_NORMAL);
    payload = payload.concat(CMD.RESET_LINE_SPACING);
  }

  // 7. Feed & Cut
  payload = payload.concat(CMD.FEED_LINES(2)); // Padding restored
  payload = payload.concat(CMD.CUT_PAPER);

  return payload;
}

// --- UTILITY: WORD WRAPPER ---
function wrapText(text, maxChars) {
  let resultLines = [];
  // Note: We only wrap single paragraphs here because the main loop handles \n splitting
  let words = text.split(' ');
  let currentLine = '';

  words.forEach((word) => {
    let spaceNeeded = currentLine.length > 0 ? 1 : 0;
    if (currentLine.length + spaceNeeded + word.length <= maxChars) {
      currentLine += (currentLine.length > 0 ? ' ' : '') + word;
    } else {
      if (currentLine.length > 0) resultLines.push(currentLine);
      currentLine = word;
      while (currentLine.length > maxChars) {
        resultLines.push(currentLine.slice(0, maxChars));
        currentLine = currentLine.slice(maxChars);
      }
    }
  });
  if (currentLine.length > 0) resultLines.push(currentLine);

  return resultLines;
}

// --- UTILITY: COMMUNICATIONS ---
function sendToPi(byteArray) {
  if (!byteArray || !Array.isArray(byteArray) || byteArray.length === 0) {
    Logger.log('⚠️ Error: Payload is empty.');
    return false;
  }

  // 🛠️ DEBUG: LOG HEX PAYLOAD
  const hexString = byteArray
    .map(function (byte) {
      return ('0' + (byte & 0xff).toString(16)).slice(-2).toUpperCase();
    })
    .join(' ');
  Logger.log('📦 API PAYLOAD (HEX): ' + hexString);

  var signedBytes = byteArray.map(function (b) {
    var val = parseInt(b, 10);
    return val < 128 ? val : val - 256;
  });

  const blob = Utilities.newBlob(signedBytes, 'application/octet-stream');
  const scriptProps = PropertiesService.getScriptProperties();
  const USER = scriptProps.getProperty('NGROK_USER');
  const PASS = scriptProps.getProperty('NGROK_PASS');
  const URL = scriptProps.getProperty('PI_URL');

  if (!USER || !PASS || !URL) throw new Error('Configuration Error');

  const options = {
    method: 'post',
    contentType: 'application/octet-stream',
    payload: blob,
    headers: { Authorization: 'Basic ' + Utilities.base64Encode(USER + ':' + PASS) },
    muteHttpExceptions: true,
  };

  const response = UrlFetchApp.fetch(URL, options);
  if (response.getResponseCode() === 200) return true;
  throw new Error(
    `Ngrok Error ${response.getResponseCode()}: ${response.getContentText()}`,
  );
}

function stringToBytes(str) {
  var bytes = [];
  for (var i = 0; i < str.length; ++i) bytes.push(str.charCodeAt(i));
  return bytes;
}

function callWithRetry(func) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (func() === true) return true;
    } catch (e) {
      if (attempt < MAX_RETRIES) Utilities.sleep(Math.pow(2, attempt) * 1000);
      else return false;
    }
  }
}

function sendAlertEmail(subject, body) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const lastAlert = parseInt(scriptProperties.getProperty('LAST_ALERT_TIME') || '0');
  const now = new Date().getTime();
  if (now - lastAlert > 14400000) {
    MailApp.sendEmail({
      to: EMAIL_ALERTS_TO,
      subject: '⚠️ PRINTER ALERT: ' + subject,
      body: body,
    });
    scriptProperties.setProperty('LAST_ALERT_TIME', now.toString());
  }
}

// --- TEST SUITE ---
function testPrinter() {
  Logger.log('🧪 Starting Printer Test Suite...');

  const createMock = (title, desc, isAllDay, hourOffset) => {
    const t = new Date();
    t.setHours(t.getHours() + hourOffset);
    return {
      getId: () => 'TEST_' + Math.random(),
      getTitle: () => title,
      getDescription: () => desc,
      getStartTime: () => t,
      isAllDayEvent: () => isAllDay,
    };
  };

  const testCases = [
    createMock(
      'TEST: Checkboxes',
      'Description joined:[ ] Item 1[ ] Item 2 [ ] Fix Printer Now',
      true,
      0,
    ),
    createMock('TEST: Standard', 'Short description. Should look normal.', false, 1),
  ];

  testCases.forEach((mockEvent, i) => {
    try {
      Logger.log(
        `🖨️ Printing Test ${i + 1}/${testCases.length}: ${mockEvent.getTitle()}`,
      );
      sendToPi(generateReceiptPayload(mockEvent));
      Utilities.sleep(3000);
    } catch (e) {
      Logger.log(`❌ Test ${i + 1} Failed: ${e.toString()}`);
    }
  });

  Logger.log('✅ Test Suite Complete.');
}
