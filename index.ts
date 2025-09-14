import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { NewMessage } from "telegram/events";
import { config } from "dotenv";
import { writeFileSync, readFileSync } from "fs";
import responses from "./responses.json";
import { checkScammer } from "./gemini";
// Load environment variables
config();

// Telegram API configuration
const API_ID = parseInt(process.env.API_ID || "0");
const API_HASH = process.env.API_HASH || "";
const SESSION_STRING = process.env.SESSION_STRING || "";

// Track users currently being replied to
const currentUsers = new Set<number>();

if (!API_ID || !API_HASH) {
  console.error("❌ Error: API_ID and API_HASH are required in .env file");
  console.log("📝 Get them from https://my.telegram.org/apps");
  process.exit(1);
}

// Configuration from environment
const CONFIG = {
  triggerKeywords:
    process.env.TRIGGER_KEYWORDS?.split(",")
      .map((keyword) => keyword.trim().toLowerCase())
      .filter(Boolean) || [],
  excludeUserIds:
    process.env.EXCLUDE_USER_IDS?.split(",")
      .map((id) => parseInt(id.trim()))
      .filter(Boolean) || [],
};

// Session management
const session = new StringSession(SESSION_STRING);
const client = new TelegramClient(session, API_ID, API_HASH, {
  connectionRetries: 5,
});

// Utility function to check if message should trigger autoreply
async function shouldTriggerAutoreply(
  senderId: number,
  messageText: string
): Promise<boolean> {
  // Check if user is excluded
  if (CONFIG.excludeUserIds.includes(senderId)) return false;

  // Check trigger keywords (if specified)
  if (CONFIG.triggerKeywords.length > 0) {
    const lowerText = messageText.toLowerCase();
    return CONFIG.triggerKeywords.some((keyword) =>
      lowerText.includes(keyword)
    );
  }

  // Check if user is currently being replied to
  if (currentUsers.has(senderId)) {
    console.log(`ℹ️ Already replying to user ${senderId}, skipping...`);
    return false;
  }

  console.log("ℹ️ No trigger keywords set, proceeding to Gemini check");
  const isScammer = await checkScammer(messageText);
  if (isScammer) {
    console.log(`⚠️ Message identified as scam by Gemini AI`);
    return true;
  }
  console.log(`ℹ️ Message not identified as scam by Gemini AI`);

  return false;
}

// Simple input helper
function getUserInput(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    process.stdin.once("data", (data) => {
      resolve(data.toString().trim());
    });
  });
}

// Shuffle array utility
function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j]!, array[i]!];
  }
  return array;
}

async function main() {
  try {
    console.log("🔄 Connecting to Telegram...");
    await client.start({
      phoneNumber: async () => await getUserInput("Enter your phone number: "),
      password: async () => await getUserInput("Enter your password: "),
      phoneCode: async () =>
        await getUserInput("Enter the code you received: "),
      onError: (err: Error) => console.log("❌ Error:", err),
    });

    console.log("✅ Successfully connected to Telegram!");

    // Save session string for future use
    if (!SESSION_STRING) {
      const newSessionString = client.session.save();
      console.log("📝 Auto-saving session string to .env file...");

      try {
        // Read current .env file
        const envPath = ".env";
        const envContent = readFileSync(envPath, "utf8");

        // Replace the empty SESSION_STRING line
        const updatedContent = envContent.replace(
          /SESSION_STRING=.*$/m,
          `SESSION_STRING=${newSessionString}`
        );

        // Write back to .env file
        writeFileSync(envPath, updatedContent);
        console.log(
          "✅ Session string saved! Future runs won't require authentication."
        );
      } catch (error) {
        console.error("❌ Error saving session string:", error);
        console.log("📝 Please manually add this to your .env file:");
        console.log(`SESSION_STRING=${newSessionString}`);
      }
    }

    // Get current user info
    const me = await client.getMe();
    console.log(
      `👤 Logged in as: ${me.firstName} ${me.lastName || ""} (@${
        me.username || "N/A"
      })`
    );

    // Configuration summary
    console.log("\n📋 Autoreply Configuration:");

    if (CONFIG.excludeUserIds.length > 0) {
      console.log(
        `   - Excluded user IDs: ${CONFIG.excludeUserIds.join(", ")}`
      );
    }
    if (CONFIG.triggerKeywords.length > 0) {
      console.log(
        `   - Trigger keywords: ${CONFIG.triggerKeywords.join(", ")}`
      );
    }

    // Listen for new private messages
    client.addEventHandler(async (update) => {
      try {
        const message = update.message;
        if (!message || !message.isPrivate || message.out) return;

        const senderId = message.senderId?.toJSNumber();
        const sender = await message.getSender();
        const senderName = (sender as any)?.firstName || "Unknown";
        const messageText = message.text || "";

        console.log(
          `📨 New DM from ${senderName} (${senderId}): ${messageText}`
        );

        // Check if we should send autoreply
        if (senderId && (await shouldTriggerAutoreply(senderId, messageText))) {
          try {
            currentUsers.add(senderId);
            const replyMessages = shuffleArray(responses);
            console.log(
              `🔄 Sending autoreply to ${senderName} (${senderId})...`
            );
            for (const replyMessage of replyMessages) {
              await client.sendMessage(senderId, { message: replyMessage });
            }
            console.log(
              `✅ Finished sending autoreplies to ${senderName} (${senderId})`
            );
            currentUsers.delete(senderId);
          } catch (error) {
            console.error("❌ Error sending autoreply:", error);
          }
        }
      } catch (error) {
        console.error("❌ Error processing message:", error);
      }
    }, new NewMessage({}));

    console.log("\n🎯 Autoreply is now active! Waiting for messages...");
    console.log("💡 Press Ctrl+C to stop");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down...");
  await client.disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Shutting down...");
  await client.disconnect();
  process.exit(0);
});

// Start the application
main().catch(console.error);
