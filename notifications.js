const user = JSON.parse(localStorage.getItem("user"));

if (!user || user.role !== "customer") {
    alert("Access Denied");
    window.location.href = "login.html";
}
function showNotification(message) {

    const box = document.createElement("div");

    box.className = "notification";

    box.innerText = message;

    document.body.appendChild(box);

    setTimeout(() => {
        box.remove();
    }, 4000);

}