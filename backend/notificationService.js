const { initializeApp, cert } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const fs = require("fs");

const serviceAccount = JSON.parse(
    fs.readFileSync("/etc/secrets/firebase-service-account.json", "utf8")
);

initializeApp({
    credential: cert(serviceAccount)
});

async function sendNotification(token, title, body) {
    try {
        await getMessaging().send({
            token,
            notification: {
                title,
                body
            }
        });

        console.log("✅ Notification Sent");
    } catch (err) {
        console.log(err);
    }
}

module.exports = sendNotification;