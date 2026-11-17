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
loadDeliveryHistory();
loadReturnPickups();

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
    loadDeliveryHistory();
    loadReturnPickups();
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

// ===============================
// DELIVERY PARTNER RETURN PICKUPS
// ===============================

// ===============================
// DELIVERY PARTNER RETURN PICKUPS
// ===============================

async function loadReturnPickups() {

    const container =
        document.getElementById("returnPickups");

    if (!container) return;

    try {

        const response = await fetch(
            "https://hyperlocal-backend-84rs.onrender.com/delivery/my-return-pickups",
            {
                headers: {
                    "Authorization": "Bearer " +
                        localStorage.getItem("token")
                },
                cache: "no-store"
            }
        );

        const requests = await response.json();

        if (!response.ok) {
            container.innerHTML =
                "<p>Unable to load return pickups.</p>";
            console.error(requests);
            return;
        }

        if (!Array.isArray(requests) || requests.length === 0) {
            container.innerHTML =
                "<p>No return pickups assigned to you.</p>";
            return;
        }

        container.innerHTML = "";

        requests.forEach(request => {

            const card = document.createElement("div");
            card.className = "card";

            const details = document.createElement("div");

            const fields = [
                ["Return ID", request.id],
                ["Order ID", request.order_id],
                ["Product", request.product_name],
                ["Quantity", request.quantity],
                ["Customer", request.customer_name || request.customer_email],
                ["Phone", request.customer_phone],
                ["Pickup Address", request.customer_address],
                ["Pickup status", request.status],
                ["Pickup time", request.pickup_scheduled_at
                    ? new Date(request.pickup_scheduled_at).toLocaleString()
                    : "Not scheduled"],
                ["Pickup note", request.pickup_note || "None"]
            ];

            fields.forEach(([label, value]) => {

                const p = document.createElement("p");

                const strong = document.createElement("strong");
                strong.textContent = label + ": ";

                p.append(
                    strong,
                    document.createTextNode(
                        String(value ?? "Not available")
                    )
                );

                details.appendChild(p);
            });

            card.appendChild(details);

            // CALL CUSTOMER
            if (request.customer_phone) {

                const callButton = document.createElement("a");

                callButton.href =
                    "tel:" + request.customer_phone;

                callButton.textContent = "📞 Call Customer";

                callButton.className = "action-btn";

                card.appendChild(callButton);
            }

            // GET DIRECTIONS
            if (request.customer_address) {

                const mapButton = document.createElement("a");

                mapButton.href =
                    "https://www.google.com/maps/search/?api=1&query=" +
                    encodeURIComponent(request.customer_address);

                mapButton.target = "_blank";
                mapButton.rel = "noopener noreferrer";

                mapButton.textContent = "📍 Get Directions";

                mapButton.className = "action-btn";

                card.appendChild(mapButton);
            }

            // PICKUP STATUS
            if (request.status === "Pickup Scheduled") {

                const button = document.createElement("button");

                button.textContent = "✅ Mark as Picked Up";

                button.onclick = () =>
                    markReturnPickedUp(request.id, button);

                card.appendChild(button);

            } else {

                const status = document.createElement("p");
                status.textContent = "✅ Product picked up";
                card.appendChild(status);

            }

            container.appendChild(card);

        });

    } catch (error) {

        console.error("Return pickup error:", error);

        container.innerHTML =
            "<p>Unable to load return pickups.</p>";

    }
}


async function markReturnPickedUp(id, button) {

    if (!confirm("Have you collected this returned product?")) {
        return;
    }

    button.disabled = true;
    button.textContent = "Updating...";

    try {

        const response = await fetch(
            "https://hyperlocal-backend-84rs.onrender.com/delivery/return-pickups/" +
                id + "/picked-up",
            {
                method: "PUT",
                headers: {
                    "Authorization": "Bearer " +
                        localStorage.getItem("token")
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || "Unable to update pickup.");
            button.disabled = false;
            button.textContent = "✅ Mark as Picked Up";
            return;
        }

        alert(data.message || "Return product picked up successfully!");

        await loadReturnPickups();

        await loadStats();

    } catch (error) {

        console.error("Pickup update error:", error);

        alert("Server error. Please try again.");

        button.disabled = false;
        button.textContent = "✅ Mark as Picked Up";

    }
}
async function loadDeliveryHistory() {
    const history = document.getElementById("history");
    if (!history) return;

    try {
        const response = await fetch(
            "https://hyperlocal-backend-84rs.onrender.com/orders",
            {
                headers: {
                    "Authorization": "Bearer " +
                        localStorage.getItem("token")
                },
                cache: "no-store"
            }
        );

        if (!response.ok) {
            history.textContent =
                "Unable to load delivery history.";
            return;
        }

        const orders = await response.json();

        if (!Array.isArray(orders)) {
            history.textContent =
                "Unexpected delivery history response.";
            return;
        }

        const myEmail = String(deliveryuser.email || "")
            .trim()
            .toLowerCase();

        const completedOrders = orders.filter(order =>
            order.status === "Delivered" &&
            String(order.deliveryPartnerEmail || "")
                .trim()
                .toLowerCase() === myEmail
        );

        if (completedOrders.length === 0) {
            history.innerHTML =
                "<p>No completed deliveries yet.</p>";
            return;
        }

        history.innerHTML = completedOrders.map(order => `
            <div class="history-item">
                <h3>Order #${order.id}</h3>
                <p>Customer: ${order.customerName || "Customer"}</p>
                <p>Status: ✅ Delivered</p>
                <p>Earnings: ₹${Number(order.earning || 0).toFixed(2)}</p>
            </div>
        `).join("");

    } catch (error) {
        console.error("Delivery history error:", error);
        history.textContent =
            "Unable to load delivery history.";
    }
}