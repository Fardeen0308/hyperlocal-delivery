import { messaging } from "./firebase.js";
import {
    getToken,
    onMessage
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-messaging.js";

async function requestPermission() {

    const permission = await Notification.requestPermission();

    if (permission === "granted") {

        const token = await getToken(messaging, {
            vapidKey: "BIqCAcR_wd3f_-5F125DQxIQ6r_4PS1bINZC6roCYJD1V6mAQPqm2askTVjgpndaD0DpwCom9BUK5FWcHaL2gQQ"
        });

        console.log("FCM Token:", token);

        const user = JSON.parse(localStorage.getItem("user"));

if (user) {

    await fetch(
        "https://hyperlocal-backend-84rs.onrender.com/save-fcm-token",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: user.email,
                role: user.role,
                token: token
            })
        }
    );

}

    } else {

        alert("Notification permission denied.");

    }

}

requestPermission();

onMessage(messaging, (payload) => {
    console.log("Message received:", payload);

    new Notification(
        payload.notification.title,
        {
            body: payload.notification.body,
            icon: "/logo.png"
        }
    );
});