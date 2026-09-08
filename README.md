# 🤖 Job Search Agent

An intelligent job search agent that automatically finds jobs matching your profile and sends them to your Slack channel.

## ✨ Features

- 🔍 **Multi-Source Search** — Fetches jobs from LinkedIn, Indeed, Glassdoor, ZipRecruiter, Himalayas, Jobicy, The Muse, We Work Remotely, Remotive, Arbeitnow, and RemoteOK
- 🕒 **Fresh listings** — Defaults to jobs posted in the last week; tighten to 24 hours / 3 days or widen it from Settings
- 📬 **Slack Notifications** — Sends formatted job alerts to your Slack channel
- 🔄 **Deduplication** — Removes duplicate jobs across sources
- ⚙️ **Customizable** — Edit job titles, technologies, and locations from the UI

## 🚀 Quick Start

### 1. Clone the repo

```bash
git clone https://github.com/Achyuth09/job-search-agent.git
cd job-search-agent
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env`. Do **not** prefix these with `VITE_` — that would expose them in the browser.

```
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
SLACK_CHANNEL=JONSEARCHAUTO
RAPIDAPI_KEY=
```

On Vercel / similar hosts:
- `SLACK_WEBHOOK_URL` → **Sensitive / Secret**
- `SLACK_CHANNEL` → **Config** (safe to be public; it is only a channel name)
- `RAPIDAPI_KEY` → **Sensitive / Secret**

#### Optional: LinkedIn, Indeed, Glassdoor, ZipRecruiter

Those sites do not offer public job APIs. This app uses [JSearch on RapidAPI](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch) as an aggregator:

1. Create a free RapidAPI account
2. Subscribe to the JSearch API (free tier)
3. Put the key in `.env` as `RAPIDAPI_KEY=...` (no `VITE_` prefix)
4. Restart `npm run dev`

Without this key, the public boards (Himalayas, Jobicy, The Muse, We Work Remotely, Remotive, Arbeitnow, RemoteOK) still work.

#### How to get your Slack webhook URL:

1. Go to [api.slack.com/messaging/webhooks](https://api.slack.com/messaging/webhooks)
2. Create a new Slack app (or use existing)
3. Enable **Incoming Webhooks**
4. Click **Add New Webhook to Workspace**
5. Select your channel and authorize
6. Copy the webhook URL

### 4. Deploy (Vercel)

1. Import the GitHub repo
2. Add environment variables — **no `VITE_` prefix**:
   - `SLACK_WEBHOOK_URL` as **Sensitive**
   - `SLACK_CHANNEL` as **Config** (e.g. `JONSEARCHAUTO`)
   - `RAPIDAPI_KEY` as **Sensitive** (optional)
3. Deploy. The app uses `/api/search` and `/api/slack` so secrets stay on the server.

### 5. Run the app locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 6. Search for jobs

1. Click **"Search for Jobs"**
2. Review scored results
3. Click **"Send to Slack"** on individual jobs or **"Send All"**

## 📁 Project Structure

```
job-search-agent/
├── src/
│   ├── App.tsx              # Main application UI
│   ├── main.tsx             # Entry point
│   ├── index.css            # Tailwind CSS
│   ├── vite-env.d.ts        # Vite type definitions
│   ├── types/
│   │   └── index.ts         # TypeScript types
│   ├── data/
│   │   └── defaults.ts      # Default preferences
│   └── services/
│       ├── jobApis.ts       # Job source API integrations
│       ├── scorer.ts        # Job matching/scoring engine
│       └── slack.ts         # Slack webhook integration
├── .env                     # Your environment variables (NOT committed)
├── .env.example             # Environment template
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.ts
```

## 🎯 Default Profile

The agent is pre-configured for:

- **Job Titles**: ReactJS, Node.js, Full Stack, Software Engineer, Backend/Frontend Developer
- **Technologies**: ReactJS, Node.js, TypeScript, MongoDB, Azure, Docker, Express.js
- **Locations**: Remote, Bangalore, Pune, Hyderabad, India
- **Experience**: 3–5 years

You can change all of these from the Settings tab in the UI.

## 📊 How Scoring Works

Each job is scored based on:

| Factor | Weight |
|--------|--------|
| Technology/Skill Match | 40% |
| Job Title Match | 30% |
| Location Match | 20% |
| Base Score | 10% |

Jobs below the minimum match score threshold are filtered out.

## 🛠️ Tech Stack

- **React** + **TypeScript** — Frontend
- **Vite** — Build tool
- **Tailwind CSS** — Styling
- **Lucide React** — Icons
- **Slack Incoming Webhooks** — Notifications

## 🔒 Security

- Slack webhook and RapidAPI keys stay on the server (`SLACK_WEBHOOK_URL`, `RAPIDAPI_KEY`) — never `VITE_`
- The browser only calls `/api/search`, `/api/slack`, and `/api/config`
- `SLACK_CHANNEL` is a public Config value (channel name only)
- `.env` is gitignored and is not committed

## 📝 License

MIT
