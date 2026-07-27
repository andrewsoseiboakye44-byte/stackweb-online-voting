# 🗳 STACKWEB Online Voting System

> A full-featured, real-time online voting platform for schools and institutions — built with Vanilla HTML/CSS/JS and Supabase.

---

## ✅ Quick Setup (4 Steps)

### Step 1 — Create Your Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Enter the project name: **`stackweb-online-voting-system`**
4. Set a strong database password (save it!)
5. Choose your region and click **Create New Project**
6. Wait ~2 minutes for the project to initialize

---

### Step 2 — Run the Database Schema

1. In your Supabase Dashboard, go to **SQL Editor**
2. Click **New Query**
3. Open the file `database/schema.sql` from this project
4. Copy all the SQL and paste it into the editor
5. Click **Run** (▶)
6. You should see: *Success. No rows returned.*

---

### Step 3 — Create a Storage Bucket

1. In Supabase, go to **Storage** → **New Bucket**
2. Name: **`candidate-photos`**
3. Toggle **Public bucket** → ON
4. Click **Create bucket**

---

### Step 4 — Connect Your Project

1. In Supabase, go to **Settings** → **API**
2. Copy your **Project URL** (looks like `https://abcdefgh.supabase.co`)
3. Copy your **anon public** key (long string starting with `eyJ...`)
4. Open `config/supabase.js` in this project and replace:

```js
export const SUPABASE_URL      = 'https://YOUR_PROJECT_ID.supabase.co';
export const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

With your real values:

```js
export const SUPABASE_URL      = 'https://abcdefgh.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

---

## 👤 Creating Your First Admin Account

1. In Supabase → **Authentication** → **Users** → **Add User**
2. Enter your admin email and a strong password
3. Copy the **User UID** that appears
4. Go to **SQL Editor** and run:

```sql
INSERT INTO profiles (id, role, full_name)
VALUES ('PASTE-YOUR-UID-HERE', 'admin', 'Your Name');
```

5. Now go to `http://localhost/STACKWEB-ONLINE-VOTING-SYSTEM/src/pages/admin/` and log in!

---

## 🚀 How to Run

Since this is a Vanilla HTML/CSS/JS project, no build step is needed.

**Option A — XAMPP (Recommended)**
1. Place the project folder in `C:\xampp\htdocs\`
2. Start Apache in XAMPP Control Panel
3. Open: `http://localhost/STACKWEB-ONLINE-VOTING-SYSTEM/`

**Option B — VS Code Live Server**
1. Install the **Live Server** extension
2. Right-click `index.html` → **Open with Live Server**

---

## 📁 Project Structure

```
STACKWEB-ONLINE-VOTING-SYSTEM/
├── index.html                          ← Public landing page
├── config/
│   └── supabase.js                     ← 🔑 YOUR CREDENTIALS GO HERE
├── database/
│   └── schema.sql                      ← Run this in Supabase SQL Editor
├── public/
│   └── favicon/
├── src/
│   ├── assets/
│   │   ├── css/
│   │   │   └── global.css
│   │   └── js/
│   │       ├── supabase-client.js      ← All DB functions
│   │       ├── auth.js                 ← Login/logout/guards
│   │       └── main.js                 ← Shared utilities
│   └── pages/
│       ├── admin/
│       │   ├── index.html              ← Admin login
│       │   ├── dashboard.html          ← Admin home
│       │   ├── manage-elections.html   ← Create/edit elections
│       │   ├── manage-candidates.html  ← Add candidates + photos
│       │   ├── voter-management.html   ← View all voters/tokens
│       │   ├── token-generator.html    ← Generate & export tokens
│       │   ├── voting-control.html     ← Start/pause/end elections
│       │   ├── analytics.html          ← Live results & charts
│       │   ├── audit-logs.html         ← Full system audit trail
│       │   └── settings.html           ← System configuration
│       └── voter/
│           ├── landing.html            ← Voter token entry
│           ├── dashboard.html          ← The ballot (vote here)
│           ├── confirmation.html       ← Vote submitted screen
│           └── results.html            ← Public results page
```

---

## 🔄 Admin Workflow

```
1. Create Election     → manage-elections.html
2. Add Positions       → (within election form)
3. Add Candidates      → manage-candidates.html
4. Generate Tokens     → token-generator.html
5. Distribute Tokens   → Download CSV → hand out to students
6. START Voting        → voting-control.html → ▶ Start
7. Monitor Live        → voting-control.html (real-time feed)
8. END Voting          → voting-control.html → 🛑 End
9. View Results        → analytics.html
```

## 🗳 Voter Workflow

```
1. Receive token       → e.g. SW-A3F2-B8X1-K9P4
2. Go to landing page  → voter/landing.html
3. Enter token         → Auto-formatted as you type
4. Vote                → Select one candidate per position
5. Confirm             → Review selections → Submit
6. Done                → Confirmation page with reference code
```

---

## 🛡️ Security Features

| Feature | Details |
|---------|---------|
| Admin lockout | 5 failed login attempts → 15 min lockout |
| Route guards | Every admin page calls `requireAdmin()` |
| Anonymous votes | Votes stored with no voter identity link |
| One-time tokens | Token marked `used` immediately after voting |
| RLS Policies | Supabase Row-Level Security on all tables |
| No plain passwords | Supabase Auth handles all credentials |

---

## ⚙️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3 (Vanilla), JavaScript ES Modules |
| Backend | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| Charts | Chart.js v4 |
| Fonts | Google Fonts (Inter, Poppins, JetBrains Mono) |
| Server | XAMPP / any static file server |

---

## 🐛 Troubleshooting

**"Invalid token" error on voter page**
- Make sure tokens were generated in Token Generator
- Check that the election is **Active** (not Draft/Paused)
- Tokens are case-insensitive but must match exactly

**Admin login says "Profile not found"**
- Run the `INSERT INTO profiles` SQL above
- Make sure the UID matches your Supabase Auth user

**Realtime not working**
- Enable Realtime in Supabase → Database → Replication → `votes` and `elections` tables

**Photos not uploading**
- Verify the `candidate-photos` bucket exists and is **public**
- Check Storage → Policies → allow insert for authenticated users

---

## 📄 License

MIT License — Free to use for educational institutions.

---

*Built with ❤️ by STACKWEB | Powered by Supabase*
