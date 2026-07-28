const admin = require("firebase-admin");

const serviceAccount = require("./firebase-service-account.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

async function sendNotification(token, title, body) {

    const message = {
        notification: {
            title,
            body
        },
        token
    };

    try {
        await admin.messaging().send(message);
        console.log("Notification sent successfully");
    } catch (err) {
        console.error(err);
    }
}

module.exports = {
    sendNotification
};