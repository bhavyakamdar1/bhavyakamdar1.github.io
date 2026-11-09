# Setup: game data (Google Sheets)

Until you do the steps below the site works normally and simply saves nothing.

## A. Game data to Google Sheets (about 5 minutes)
1. Create a new Google Sheet (name it e.g. "Face Your Hope data").
2. **Extensions > Apps Script**. Delete the sample code and paste in `backend/google-apps-script.gs`. Save.
3. **Deploy > New deployment > type: Web app**. Execute as: **Me**. Who has access: **Anyone**. Deploy and approve the permissions.
4. Copy the **Web app URL** (ends in `/exec`).
5. Paste it into `assets/js/config.js` as `SHEETS_ENDPOINT`, then commit and push.

An `Events` tab fills up with one row per action: `page_open`, `click`, `voyage_start` (with the player's name),
`round_start`, `lifeboat_chosen` (how many ms they balanced before choosing it), `capsized`, `out_of_resource`,
`lifeboat_confirm`, `round_end` (outcome, `balancedMs` out of 20000, left/right helm presses) and `voyage_end`.
`player_id` is a random anonymous ID stored in the visitor's browser, so you can follow one person across visits.
If you edit the script later, use **Deploy > Manage deployments > Edit > New version** (the URL stays the same).
