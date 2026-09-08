# 🤖 Job Search Agent

An intelligent job search agent that automatically finds jobs matching your profile and sends them to your Slack channel.

## ✨ Features

- 🔍 **Multi-Source Search** — Fetches jobs from Remotive, Arbeitnow, and RemoteOK
- 🎯 **Smart Scoring** — Matches jobs against your skills, experience, and location preferences
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

Edit `.env` and add your Slack webhook URL:

```
VITE_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

#### How to get your Slack webhook URL:

1. Go to [api.slack.com/messaging/webhooks](https://api.slack.com/messaging/webhooks)
2. Create a new Slack app (or use existing)
3. Enable **Incoming Webhooks**
4. Click **Add New Webhook to Workspace**
5. Select your channel and authorize
6. Copy the webhook URL

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 5. Search for jobs

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

- Slack webhook URL is stored in `.env` (never committed to git)
- All job sources use public APIs — no credentials needed
- No user data is stored on any server

## 📝 License

MIT
