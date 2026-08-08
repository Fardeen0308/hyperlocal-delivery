let previousOrders = 0;

const user = JSON.parse(localStorage.getItem("user"));

if (!user) {
    window.location.href = "login.html";
}

if (user.role !== "delivery") {
    alert("Access Denied");
    window.location.href = "login.html";
}

async function loadOrders() {

    const response = await fetch(
        "https://hyperlocal-backend-84rs.onrender.com/orders"
    );

    const orders = await response.json();

    const container = document.getElementById("orders");

    container.innerHTML = "";

    orders.forEach(order => {

        if (
            order.status === "Out for Delivery" &&
            order.deliveryPartnerEmail === user.email
        ) {

            container.innerHTML += `
            <div class="card">

                <h3>${order.customerName}</h3>

                <p>${order.address}</p>

                <p><b>Total Paid:</b> ₹${order.grandTotal}</p>

                <input
                    type="text"
                    id="otp-${order.id}"
                    placeholder="Enter OTP">

                <button onclick="verifyOtp('${order.id}')">
                    ✅ Verify & Deliver
                </button>

                <button onclick="openCustomerChat('${order.email}')">
                    💬 Chat Customer
                </button>

            </div>
            `;
        }

    });

    const currentOrders = container.children.length;

    if (currentOrders > previousOrders && previousOrders !== 0) {
        alert("📦 New delivery assigned!");
    }

    previousOrders = currentOrders;
}

async function verifyOtp(id) {

    const otp =
        document.getElementById("otp-" + id).value;

    const response = await fetch(
        "https://hyperlocal-backend-84rs.onrender.com/verify-otp/" + id,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ otp })
        }
    );

    const data = await response.json();

    alert(data.message);

    if (data.success) {
        loadOrders();
        loadStats();
    }
}

function openCustomerChat(email) {

    localStorage.setItem("chatWith", email);

    window.location.href = "chat.html";
}

function sendLocation() {

    if (navigator.geolocation) {

        navigator.geolocation.getCurrentPosition(async (position) => {

            await fetch(
                "https://hyperlocal-backend-84rs.onrender.com/location",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        email: user.email,
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    })
                }
            );

        });

    }
}

async function loadStats() {

    const response = await fetch(
        "https://hyperlocal-backend-84rs.onrender.com/delivery-earnings/" + user.email
    );

    const data = await response.json();

    document.getElementById("completed").innerText =
        data.totalDeliveries;

    document.getElementById("earnings").innerText =
        "₹" + data.totalEarnings;
}

let currentStatus = "Available";

async function toggleStatus() {

    currentStatus =
        currentStatus === "Available"
            ? "Busy"
            : "Available";

    document.getElementById("statusBtn").innerText =
        currentStatus === "Available"
            ? "🟢 Available"
            : "🔴 Busy";

    await fetch(
        "https://hyperlocal-backend-84rs.onrender.com/delivery-partners/status",
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: user.email,
                status: currentStatus
            })
        }
    );
}

function logout() {
    localStorage.removeItem("user");
    window.location.href = "login.html";
}

loadOrders();
loadStats();

setInterval(() => {
    loadOrders();
    loadStats();
    sendLocation();
}, 5000);