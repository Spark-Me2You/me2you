# Candy desk sheet

The front desk's tool for Gumball Slice candy vouchers: a Google Sheet with one row per voucher.
When a student shows their code, staff find the row, change **status** to **Redeemed** and hand
over a coin for the candy machine. The student's phone ("my candy") updates at the same moment.

`Code.gs` is the sheet's Apps Script. It talks to Supabase only through the `candy-desk` edge
function, using a shared secret.

## How it works

- **New wins appear within a minute.** Every minute the script fetches all vouchers and adds any
  that are missing (green "Ready to claim").
- **Redeeming saves straight away.** Changing a status sends it to Supabase. If Supabase can't be
  reached, the row keeps the new status and the script retries every minute until it's saved.
- **Undo for 15 minutes.** Setting a row back to "Ready to claim" undoes a redemption made in the
  last 15 minutes. After that, the change is put back and a message explains why.
- **The database corrects the sheet.** Accidental edits to name, email, code or times are put
  back on the next sync. Deleted rows come back. A voucher cancelled in Supabase shows as
  "Cancelled" (struck through).
- **Deleted accounts disappear.** When a student deletes their me2you account, their rows are
  removed on the next sync.
- **One row at a time.** Pasting or dragging over several statuses is undone.
- **Failure email.** If syncing fails for about 10 minutes in a row, the sheet's owner gets an email.
- **Notes** is free text for staff. The script never changes it.

## One-time setup

You need: the Supabase CLI logged in, and a Google account that will own the sheet.

1. **Make a secret.** In Terminal:
   ```bash
   openssl rand -hex 32
   ```
   Keep it for steps 2 and 5. Don't commit it or paste it in chat.

2. **Configure and deploy the edge function.** `CANDY_DESK_ORG_ID` is the kiosk's organization
   id (Supabase dashboard → Table Editor → `organization`).
   ```bash
   supabase db push   # applies 026_candy_desk.sql
   supabase secrets set CANDY_DESK_SECRET=<secret> CANDY_DESK_ORG_ID=<org id>
   supabase functions deploy candy-desk --no-verify-jwt
   ```

3. **Create the sheet** in Google Sheets with the staff Google account, then open
   **Extensions → Apps Script**.

4. **Paste the script.** Replace everything in `Code.gs` with this folder's `Code.gs` and save.

5. **Add the settings.** In the Apps Script editor: **Project Settings** (gear) →
   **Script Properties** → add:
   | Property | Value |
   |---|---|
   | `CANDY_DESK_URL` | `https://<project-ref>.supabase.co/functions/v1/candy-desk` |
   | `CANDY_DESK_SECRET` | the secret from step 1 |

6. **Run setup.** Reload the sheet. A **Candy desk** menu appears. Choose
   **Candy desk → Set up / repair sheet** and approve the permissions Google asks for (edit this
   sheet, connect to an external service, run on a schedule, send email as you).

7. **Share the sheet** with front-desk staff as **Editors**.

To check it's working, win a round (or create a test claim), claim it on a phone, and wait up to a
minute for the row to appear. Then set it to **Redeemed** and watch the phone's "my candy" page.

## Changing the script later

Paste the new `Code.gs` over the old one and save. Run **Set up / repair sheet** again only if the
change touches the layout or triggers. It's safe to re-run at any time.

## Handing the sheet to a new owner

The triggers run as whoever ran setup, and the failure email goes to them. If that person leaves:

1. The current owner transfers ownership (Share → the new owner → **Transfer ownership**).
2. The new owner opens **Extensions → Apps Script** and checks the Script Properties are there.
3. The new owner runs **Candy desk → Set up / repair sheet**. That replaces the old owner's
   triggers with their own, and the failure email now goes to them.
4. In the Apps Script editor → **Triggers**, delete any triggers still owned by the old owner.
5. Optional: rotate the secret. Make a new one, run
   `supabase secrets set CANDY_DESK_SECRET=<new>`, and update the Script Property.

## Troubleshooting

- **Nothing new appears.** Run **Candy desk → Sync now**. Then check the Apps Script editor →
  **Executions** for the error. "Unauthorized" means the secret in Script Properties doesn't match
  `CANDY_DESK_SECRET`.
- **"isn't saved yet" keeps showing.** Supabase couldn't be reached. The row stays as the staff set
  it and keeps retrying, so the coin can still be handed over.
- **A redemption needs undoing after 15 minutes.** Change the voucher's `status` back to `issued`
  and clear `redeemed_at` in the Supabase Table Editor (`candy_voucher`). The sheet follows on the
  next sync.
