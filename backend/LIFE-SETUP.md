# Life Log: connect your Google Sheet (about 5 minutes)

Same idea as the game data in `SETUP.md`: a small Apps Script web app in front of a Google Sheet, with its URL kept in `assets/js/config.js`. The difference is that this data is private, so every call also needs a **secret token**. The URL is safe to commit; the token never goes in the repo.

You do all of this signed in to **cabhavyakamdar@gmail.com** in your own browser. Nobody else needs your Google login.

1. Upload `Planning_restructured.xlsx` to the Google Drive of that account, open it, and choose **File → Save as Google Sheets**. (Tabs Movies, Food and Social already have the right columns and dropdowns.)
2. In that sheet: **Extensions → Apps Script**. Delete the sample code and paste all of `backend/life-sheet.gs`.
3. Change `TOKEN` on the first line to a long random string (a password manager can generate one). Save.
4. **Deploy → New deployment → Web app.** Execute as: **Me**. Who has access: **Anyone**. Deploy and approve the permissions. Copy the **Web app URL** (ends in `/exec`).
5. Paste the URL into `assets/js/config.js` as `LIFE_ENDPOINT` and commit, or just paste it into the page in step 6.
6. Open `/life/`, unlock, go to **Data → Google Sheet sync**, enter the token (and the URL if it is not in `config.js`), then **Connect & sync**.

## How it behaves
- Saving anything on the page sends it to the sheet within a couple of seconds. Opening the page loads the sheet.
- If the sheet can't be reached, your change is kept on the device and sent on the next save or unlock. It is not lost.
- You can also edit the sheet directly. Keep the header names; you may reorder columns or add your own (the script only touches the columns the page uses). New tabs `Reminders`, `Settings`, `Visits`, `Payments` and `Places` are created automatically, and a `Visit ID` column is added to Movies and Food. The bridge script needs no change for these.
- Don't edit the sheet and the page at the same moment: the last save wins.
- "Anyone" only means the URL can be called. Every call without the token is rejected and the sheet itself is never shared.
- If you edit the script later: **Deploy → Manage deployments → Edit → New version** (the URL stays the same). To rotate the token, change it in the script, redeploy a new version, and update it on the page.

## Asking Claude about the same sheet
In claude.ai, turn on the Google Drive / Google Sheets connector for cabhavyakamdar@gmail.com and ask, e.g. "In my Life Log sheet, how much did I spend on coffee in 2026?". This uses your Claude plan, not extra API billing. Simple questions can be asked on the page itself (Dashboard → Ask your data), which needs no AI at all.

## Visits and Payments
- **Visits** carry a `Visit ID` (V-0001, V-0002, ...). A movie, a meal (all its Food rows) or a payment belongs to a visit when its `Visit ID` column holds that ID. People on a visit are matched to your Social list by name, and their last-met date follows the latest visit.
- **Payments** record `Total Spend` and `My Spend`. `For` is Mine, Mom, Dad or Others; only Mine counts toward your spending. A Mine payment is linked to Movies, Food or Others. Payments linked to Food are not added again, because your Food rows already hold that spend; Movies and Others are counted from `My Spend`.
- Visit times are stored as text such as `18:30-22:00`, so Google Sheets does not turn them into time-of-day values.
