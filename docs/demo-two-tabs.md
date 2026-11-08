# Demo: Admin tab + Employee tab (buttons only)

Kit laptop **bookmark**: `http://localhost:5173/`  
Admin **brain laptop**: `http://localhost:5173/#/lead`

## Site lock (story)

1. **First open** on a kit laptop (`/`) → **red Gate** (protocol not started).  
2. **Admin** on `#/lead` → **Unlock dashboard** (replaces Lead fob).  
3. **Every later open** on `/` → **employee join** (“Who are you?”) — **no red screen** for employees.

Use **two browser tabs** (mock mode). The gold **Next** bar changes per tab.

## Admin tab

`http://localhost:5173/#/lead`

1. **Admin: Unlock dashboard** — red Gate → Overview  
2. **Admin: Access control** → **Tasks** (tour the three Lead pages)  
3. When someone is waiting: **Admin: Access control (N waiting)** → **Admin: Approve …**  
4. **Open Employee tab** — simulates a second **kit laptop** (same machine in dev; in the field each employee uses their own laptop on OffGrid only)  

## Employee tab

`http://localhost:5173/` (no `#/lead`)

1. **Employee: Submit name (Priya Nair)** — step 1 on the join form  
2. **Employee: Tap keycard** — step 2 (no reader)  
3. **Employee: waiting for Admin** — shows the **screen code**; Lead approves on Admin tab  
4. Dashboard opens automatically after approve (**Employee: in dashboard**)  

Recommended order for the join story: unlock Admin → Employee submit name → Employee tap keycard → Admin approve → Employee dashboard.
