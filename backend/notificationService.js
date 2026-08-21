const { initializeApp, cert } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const fs = require("fs");

const path = require("path");

const serviceAccountPath = path.join(
    __dirname,
    "firebase-service-account.json"
);

const serviceAccount = JSON.parse(
    fs.readFileSync(serviceAccountPath, "utf8")
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
    console.error("Firebase send error:");
    console.error(err.code);
    console.error(err.message);
    console.error(err);
}
}

module.exports = sendNotification;