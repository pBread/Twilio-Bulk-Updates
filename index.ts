import dotenv from "dotenv";
import { pRateLimit } from "p-ratelimit";
import twilio from "twilio";

dotenv.config();

const { ACCOUNT_SID, AUTH_TOKEN, CHAT_SVC_SID } = process.env;
const client = twilio(ACCOUNT_SID, AUTH_TOKEN);

const CONCURRENCY = 100;

let deleted = 0;
let queued = 0;

const start = Date.now();

const limit = pRateLimit({
  concurrency: CONCURRENCY,
  interval: 1000,
  rate: 200,
});

(async () => {
  try {
    client.messages.each({ to: "+12223334444" }, (msg, done) => {
      limit(async () => {
        queued++;
        await client.messages(msg.sid).remove();
        queued--;
        deleted++;
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
    `Deleted ${deleted}; Seconds: ${seconds.toLocaleString()}; Deleted/Sec: ${(
      deleted / seconds
    ).toFixed(2)}; Queued: ${queued}`
  );
}
