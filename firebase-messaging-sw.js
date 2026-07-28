importScripts("https://www.gstatic.com/firebasejs/12.1.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.1.0/firebase-messaging-compat.js");

firebase.initializeApp({
    apiKey: "AIzaSyBNbxBY01TBJE5XazEv7opWfPGSaAWsYS0",
    authDomain: "hyperlocal-delivery-275bf.firebaseapp.com",
    projectId: "hyperlocal-delivery-275bf",
    storageBucket: "hyperlocal-delivery-275bf.firebasestorage.app",
    messagingSenderId: "1030862973699",
    appId:"1:1030862973699:web:cb240492c664ed7f405736"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    self.registration.showNotification(payload.notification.title, {
        body: payload.notification.body,
        icon: "/logo.png"
    });
});