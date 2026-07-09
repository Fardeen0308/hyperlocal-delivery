function showNotification(message) {

    const box = document.createElement("div");

    box.className = "notification";

    box.innerText = message;

    document.body.appendChild(box);

    setTimeout(() => {
        box.remove();
    }, 4000);

}