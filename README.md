# Telegram Personal DM Autoreply Script

A Telegram bot that automatically replies to direct messages using customizable rules and AI-powered scammer detection.

## Features

- 🎯 Optional user filtering (exclude specific users)
- 🚫 Skip messages from groups, channels, bots, and saved contacts
- 🔤 Optional keyword triggers
- 🤖 AI-powered scammer detection using Gemini AI
- 💥 Automatic spam messages to detected scammers
- 🔧 Easy configuration via environment variables

## Prerequisites

1. **Telegram API Credentials**: You need to get `API_ID` and `API_HASH` from [my.telegram.org/apps](https://my.telegram.org/apps)
2. **Bun**: This script runs with Bun runtime ([https://bun.sh/](https://bun.sh/)). Install Bun if you haven't already.
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

1. Copy the `.env.example` file to `.env`

```bash
cp .env.example .env
```

2. Edit the `.env` file and set your fields appropriately:

```env
API_ID=your_api_id
API_HASH=your_api_hash
GOOGLE_API_KEY=your_google_api_key
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
