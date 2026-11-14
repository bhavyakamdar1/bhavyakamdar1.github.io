# Life Log: connect the Google Sheet (about 3 minutes)

The private page at `/life/` can keep your data in a Google Sheet in your own Google account, so it is always saved there and you can also edit it in Sheets.

1. Signed in as **cabhavyakamdar@gmail.com**, create a new Google Sheet (or use your existing Excel data: File → Import → Upload).
2. **Extensions → Apps Script.** Delete the sample code and paste all of `backend/life-sheet.gs`.
3. Change `TOKEN` on the first line to a long random string (a password-manager generated one is ideal). Save.
4. **Deploy → New deployment → Web app.** Execute as: **Me**. Who has access: **Anyone**. Deploy and authorise when asked. Copy the **Web app URL**.
5. Open `/life/`, unlock, go to **Data → Google Sheet sync**, paste the URL and the same token, then **Connect & sync**.

Notes

- "Anyone" only means the URL can be called; every call without the token is rejected, and the sheet itself is never shared. The URL and token are stored inside the encrypted vault, not in the public repo.
- Sheet tabs are created for you: Movies, Food, Social, Reminders. Keep the `id` column; rows you add by hand without an id get one on the next sync.
- If you change the script later, use Deploy → Manage deployments → Edit → New version (the URL stays the same).
- Rotate the token any time: edit it in the script, redeploy a new version, and update it in the page.
