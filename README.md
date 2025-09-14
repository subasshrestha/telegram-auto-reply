# Telegram Personal DM Autoreply Script

A Telegram bot that automatically replies to direct messages using customizable rules and AI-powered scammer detection.

## Features

- 🎯 Optional user filtering (exclude specific users)
- 🔤 Optional keyword triggers
- 🤖 AI-powered scammer detection using Gemini AI
- 💥 Automatic spam messages to detected scammers
- 🔧 Easy configuration via environment variables

## Prerequisites

1. **Telegram API Credentials**: You need to get `API_ID` and `API_HASH` from [my.telegram.org/apps](https://my.telegram.org/apps)
2. **Bun**: This script runs with Bun runtime
3. **Google Gemini API Key**: For AI scammer detection, get an API key from Google AI Studio

## Setup Instructions

### 1. Get Telegram API Credentials

1. Go to [my.telegram.org/apps](https://my.telegram.org/apps)
2. Log in with your Telegram account
3. Create a new application
4. Note down your `API_ID` and `API_HASH`

### 2. Get Google Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Create a new project and enable the Gemini API
3. Generate an API key and note it down

### 3. Configure Environment Variables

Edit the `.env` file and add your credentials:

```env
# Telegram API Configuration
API_ID=your_api_id_here
API_HASH=your_api_hash_here
SESSION_STRING=

# Autoreply Settings
ENABLE_AUTOREPLY=true
AUTOREPLY_DELAY_MIN=1
AUTOREPLY_DELAY_MAX=5

# AI Scammer Detection
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: User IDs to exclude from autoreply (comma-separated)
# EXCLUDE_USER_IDS=123456789,987654321

# Optional: Keywords that trigger autoreply (comma-separated)
# TRIGGER_KEYWORDS=hello,hi,help
```

### 4. Install Dependencies

```bash
bun install
```

### 5. Run

```bash
bun start
```

On first run, you'll be prompted to:

1. Enter your phone number
2. Enter the verification code sent to your Telegram
3. Enter your 2FA password (if enabled)
