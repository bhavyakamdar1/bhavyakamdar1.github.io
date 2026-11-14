// Site-wide settings. Fill this in after following backend/SETUP.md.
window.SITE_CONFIG = {
  // Life Log (private page /life/): Apps Script web app URL for your own Google Sheet. See backend/LIFE-SETUP.md.
  // The URL alone is harmless: every call also needs the secret token, which is never stored in this repo.
  LIFE_ENDPOINT: 'https://script.google.com/macros/s/AKfycbzltkQ6g4uvkX3_VMPz7xa5RnFwE7Dk0ejHUH9P88lEmt7UMtsLgtL1N45W7t2rB20/exec',
  // Google Apps Script "Web app" URL (ends in /exec) that saves game events to your Google Sheet
  SHEETS_ENDPOINT: 'https://script.google.com/macros/s/AKfycbz8f24qn5e1zbayFSk-dr-MksZ5ZjQpKa_A1TEd5c14n3xDK6mxPCXl3Gx2A9sx0fl2/exec'
};
