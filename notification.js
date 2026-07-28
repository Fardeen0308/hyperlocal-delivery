import { messaging } from "./firebase.js";
import {
    getToken
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-messaging.js";

async function requestPermission() {

    const permission = await Notification.requestPermission();

    if (permission === "granted") {

        const token = await getToken(messaging, {
            vapidKey: "BIqCAcR_wd3f_-5F125DQxIQ6r_4PS1bINZC6roCYJD1V6mAQPqm2askTVjgpndaD0DpwCom9BUK5FWcHaL2gQQ"
        });

        console.log("FCM Token:", token);

    } else {

        alert("Notification permission denied.");

    }

}

requestPermission();