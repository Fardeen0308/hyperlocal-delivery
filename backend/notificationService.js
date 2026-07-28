const admin = require("firebase-admin");

const fs = require("fs");

const serviceAccount = JSON.parse(
    fs.readFileSync("/etc/secrets/firebase-service-account.json", "utf8")
);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

async function sendNotification(token, title, body) {
    try {
        await admin.messaging().send({
            token,
            notification: {
                title,
                body
            }
        });

        console.log("Notification Sent");
    } catch (err) {
        console.log(err);
    }
}

module.exports = sendNotification;