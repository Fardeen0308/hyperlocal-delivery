const admin = require("firebase-admin");

const serviceAccount = require("./firebase-service-account.json");

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