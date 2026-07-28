import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getMessaging } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-messaging.js";

const firebaseConfig = {
    apiKey:  "AIzaSyBNbxBY01TBJE5XazEv7opWfPGSaAWsYS0",
    authDomain: "hyperlocal-delivery-275bf.firebaseapp.com",
    projectId: "hyperlocal-delivery-275bf",
    storageBucket: "hyperlocal-delivery-275bf.firebasestorage.app",
    messagingSenderId: "1030862973699",
    appId: "1:1030862973699:web:cb240492c664ed7f405736"
};

const app = initializeApp(firebaseConfig);

const messaging = getMessaging(app);

export { messaging };