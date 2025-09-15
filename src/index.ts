import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { NewMessage } from "telegram/events";
import { config } from "dotenv";
import { writeFileSync, readFileSync } from "fs";
import responses from "../responses.json";
import { checkScammer } from "./gemini";
import logger from "./logger";
// Load environment variables
config();

// Telegram API configuration
const API_ID = parseInt(process.env.API_ID || "0");
const API_HASH = process.env.API_HASH || "";
const SESSION_STRING = process.env.SESSION_STRING || "";

// Track users currently being replied to
const currentUsers = new Set<number>();

if (!API_ID || !API_HASH) {
  logger.error("❌ Error: API_ID and API_HASH are required in .env file");
  logger.info("📝 Get them from https://my.telegram.org/apps");
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
    logger.info(`ℹ️ Already replying to user ${senderId}, skipping...`);
    return false;
  }

  logger.info("ℹ️ No trigger keywords set, proceeding to Gemini check");
  const isScammer = await checkScammer(messageText);
  if (isScammer) {
    logger.info(`⚠️ Message identified as scam by Gemini AI`);
    return true;
  }
  logger.info(`ℹ️ Message not identified as scam by Gemini AI`);

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
    logger.info("🔄 Connecting to Telegram...");
    await client.start({
      phoneNumber: async () => await getUserInput("Enter your phone number: "),
      password: async () => await getUserInput("Enter your password: "),
      phoneCode: async () =>
        await getUserInput("Enter the code you received: "),
      onError: (err: Error) => logger.error(err, "❌ Error:"),
    });

    logger.info("✅ Successfully connected to Telegram!");

    // Save session string for future use
    if (!SESSION_STRING) {
      const newSessionString = client.session.save();
      logger.info("📝 Auto-saving session string to .env file...");

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
        logger.info(
          "✅ Session string saved! Future runs won't require authentication."
        );
      } catch (error) {
        logger.error(error, "❌ Error saving session string:");
        logger.info("📝 Please manually add this to your .env file:");
        logger.info(`SESSION_STRING=${newSessionString}`);
      }
    }

    // Get current user info
    const me = await client.getMe();
    logger.info(
      `👤 Logged in as: ${me.firstName} ${me.lastName || ""} (@${
        me.username || "N/A"
      })`
    );

    // Configuration summary
    logger.info("📋 Autoreply Configuration:");

    if (CONFIG.excludeUserIds.length > 0) {
      logger.info(
        `   - Excluded user IDs: ${CONFIG.excludeUserIds.join(", ")}`
      );
    }
    if (CONFIG.triggerKeywords.length > 0) {
      logger.info(
        `   - Trigger keywords: ${CONFIG.triggerKeywords.join(", ")}`
      );
    }

    // Listen for new private messages
    client.addEventHandler(async (update) => {
      try {
        const message = update.message;
        if (!message || !message.isPrivate || message.out) return;
        if (message.sender) {
          logger.info("ℹ️ Message is from saved contact, skipping...");
          return;
        }
        const senderId = message.senderId?.toJSNumber();
        const sender = await message.getSender();
        const senderName = (sender as any)?.firstName || "Unknown";
        const messageText = message.text || "";

        logger.info(
          `📨 New DM from ${senderName} (${senderId}): ${messageText}`
        );

        // Check if we should send autoreply
        if (senderId && (await shouldTriggerAutoreply(senderId, messageText))) {
          try {
            currentUsers.add(senderId);
            const replyMessages = shuffleArray(responses);
            logger.info(
              `🔄 Sending autoreply to ${senderName} (${senderId})...`
            );
            for (const replyMessage of replyMessages) {
              await client.sendMessage(senderId, { message: replyMessage });
            }
            logger.info(
              `✅ Finished sending autoreplies to ${senderName} (${senderId})`
            );
            currentUsers.delete(senderId);
          } catch (error) {
            logger.error(error, "❌ Error sending autoreply:");
          }
        }
      } catch (error) {
        logger.error(error, "❌ Error processing message:");
      }
    }, new NewMessage({}));

    logger.info("🎯 Autoreply is now active! Waiting for messages...");
  } catch (error) {
    logger.error(error, "❌ Error:");
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  logger.info("🛑 Shutting down...");
  await client.disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("🛑 Shutting down...");
  await client.disconnect();
  process.exit(0);
});

// Start the application
main().catch(logger.error);
