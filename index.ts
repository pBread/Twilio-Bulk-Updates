import axios from "axios";
import dotenv from "dotenv";
import { pRateLimit } from "p-ratelimit";
import twilio from "twilio";

dotenv.config();

const { ACCOUNT_SID, AUTH_TOKEN, CHAT_SVC_SID } = process.env;
const client = twilio(ACCOUNT_SID, AUTH_TOKEN);

const CONCURRENCY = 100;
const MAX_CONCURRENCY = 200;

let updated = 0;
let queued = 0;

let concurrency = 0;
const start = Date.now();

const limit = pRateLimit({
  concurrency: CONCURRENCY,
  interval: 1000,
  rate: 200,
});

(async () => {
  try {
    client.chat.v2
      .services(CHAT_SVC_SID)
      .channels.each({ type: "public" }, ({ sid }, done) => {
        if (concurrency > MAX_CONCURRENCY) process.exit();
        limit(async () => {
          queued++;
          await updateChannel(sid);
          queued--;
        }).catch((error) => {
          console.error(error);
          done();
          process.exit();
        });
      });
  } catch (error) {
    console.error(error);
    process.exit();
  }
})();

setInterval(() => {
  print();
}, 500);

function print() {
  const seconds = (Date.now() - start) / 1000;

  console.clear();
  process.stdout.write(
    `Concurrency: ${concurrency}; Updated ${updated}; Seconds: ${seconds.toLocaleString()}; Updates/Sec: ${(
      updated / seconds
    ).toFixed(2)}; Queued: ${queued}`
  );
}

async function updateChannel(channelSid: string) {
  // Docs: https://www.twilio.com/docs/conversations/api/chat-channel-migration-resource

  const result = await axios.post(
    `https://chat.twilio.com/v3/Services/${CHAT_SVC_SID}/Channels/${channelSid}`,
    "Type=private",
    { auth: { username: ACCOUNT_SID, password: AUTH_TOKEN } }
  );

  updated++;
  concurrency = Number(result.headers["twilio-concurrent-requests"]);

  return result;
}
