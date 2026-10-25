let previousOrders = 0;

const deliveryuser = JSON.parse(localStorage.getItem("user"));

if (!deliveryuser) {
    window.location.href = "login.html";
}

if (deliveryuser.role !== "delivery") {
    alert("Access Denied");
    window.location.href = "login.html";
}

async function loadOrders() {

   const response = await fetch(
    "https://hyperlocal-backend-84rs.onrender.com/orders",
    {
        headers: {
            "Authorization": "Bearer " + localStorage.getItem("token")
        }
    }
);

const orders = await response.json();

if (!response.ok) {
    console.error("Orders request failed:", response.status, orders);
    document.getElementById("orders").innerHTML =
        "<p>Unable to load orders. Please check your login.</p>";
    return;
}

if (!Array.isArray(orders)) {
    console.error("Expected an orders array but received:", orders);
    document.getElementById("orders").innerHTML =
        "<p>The server returned an unexpected response.</p>";
    return;
}

    const container = document.getElementById("orders");
    let activeOrders = 0;

    container.innerHTML = "";

    orders.forEach(order => {

        if (
            order.status === "Out for Delivery" &&
            order.deliveryPartnerEmail === deliveryuser.email
        ) {
            activeOrders++;

            container.innerHTML += `
            <div class="card">

                <h3>${order.customerName}</h3>

<p>📞 ${order.phone}</p>

<p>🏠 ${order.address}</p>

<p><b>Total Paid:</b> ₹${Number(order.grandTotal).toFixed(2)}</p>

<p><b>Payment:</b> ${order.payment}</p>

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

                <button onclick="callCustomer('${order.phone}')">
📞 Call Customer
</button>

<button onclick="openMaps('${order.address}')">
📍 Open Maps
</button>

            </div>
            `;
        }
document.getElementById("activeOrders").innerText = activeOrders;
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
                 "Content-Type": 
    "application/json",
                "Authorization":
     "Bearer " + 
     localStorage.getItem("token")
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
    if (!email) {
        alert("Customer email is unavailable.");
        return;
    }

    localStorage.setItem("chatWith", email.trim().toLowerCase());
    window.location.href = "customer-chat.html";
}

function sendLocation() {

    if (navigator.geolocation) {

        navigator.geolocation.getCurrentPosition(async (position) => {

            await fetch(
                "https://hyperlocal-backend-84rs.onrender.com/location",
                {
                    method: "POST",
                    headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + localStorage.getItem("token")
},
                    body: JSON.stringify({
                        email: deliveryuser.email,
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
    "https://hyperlocal-backend-84rs.onrender.com/delivery-earnings/" + deliveryuser.email,
    {
        headers: {
            "Authorization": "Bearer " + localStorage.getItem("token")
        }
    }
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
    "Content-Type": "application/json",
    "Authorization": "Bearer " + localStorage.getItem("token")
},
            body: JSON.stringify({
                email: deliveryuser.email,
                status: currentStatus
            })
        }
    );
}

function logout() {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("chatWith");
    localStorage.removeItem("deliveryEmail");

    window.location.replace("login.html");
}

loadOrders();
loadStats();

setInterval(() => {
    const activeElement = document.activeElement;
    const isTypingOtp =
        activeElement &&
        activeElement.id &&
        activeElement.id.startsWith("otp-");

    if (!isTypingOtp) {
        loadOrders();
    }

    loadStats();
    sendLocation();
}, 5000);

function callCustomer(phone){

window.location.href="tel:"+phone;

}

function openMaps(address){

window.open(
"https://www.google.com/maps/search/?api=1&query="+
encodeURIComponent(address)
);

}