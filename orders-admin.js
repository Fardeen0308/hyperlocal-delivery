const user = JSON.parse(localStorage.getItem("user"));

if (!user || user.role !== "admin") {
    alert("Access Denied");
    window.location.href = "login.html";
}

let deliveryPartners = [];

async function loadDeliveryPartners() {

    const response = await fetch(
        "https://hyperlocal-backend-84rs.onrender.com/delivery-partners"
    );

    const partners = await response.json();

    deliveryPartners = partners.filter(
        partner => partner.status === "Available"
    );

}

async function loadOrders() {

    const response = await fetch(
        "https://hyperlocal-backend-84rs.onrender.com/orders"
    );

    const orders = await response.json();

    const container = document.getElementById("orders");

    container.innerHTML = "";

    let partnerOptions = "";

    deliveryPartners.forEach(partner => {

        partnerOptions += `
        <option value="${partner.id}">
            ${partner.name}
        </option>
        `;

    });

    orders.forEach(order => {

        let statusColor = "#f39c12";

if(order.status === "Preparing"){
    statusColor = "#3498db";
}
else if(order.status === "Out for Delivery"){
    statusColor = "#9b59b6";
}
else if(order.status === "Delivered"){
    statusColor = "#27ae60";
}

        container.innerHTML += `
        <div class="card">

            <h2>${order.customerName}</h2>

            <p>📞 ${order.phone}</p>

            <p>🏠 ${order.address}</p>

            <p><b>Subtotal:</b> ₹${order.subtotal}</p>

            <p><b>Delivery:</b> ₹${order.delivery}</p>

            <p><b>GST:</b> ₹${order.gst}</p>

            <p><b>Discount:</b> ₹${order.discount}</p>

            <h3>Total: ₹${order.grandTotal}</h3>

            <p>
Status:
<span style="
background:${statusColor};
color:white;
padding:6px 12px;
border-radius:20px;
font-weight:bold;
">
${order.status}
</span>
</p>

            <button onclick="updateStatus('${order.id}')">
                Change Status
            </button>

            <button onclick="deleteOrder('${order.id}')">
                Delete Order
            </button>

            <br><br>

            <select id="partner-${order.id}">
                ${partnerOptions}
            </select>

            <button onclick="assignPartner('${order.id}')">
                Assign Delivery Partner
            </button>

        </div>
        <br>
        `;

    });

}

async function updateStatus(id) {

    const status = prompt(
        "Enter Status:\nPending\nPreparing\nOut for Delivery\nDelivered"
    );

    if (!status) return;

    const response = await fetch(
        "https://hyperlocal-backend-84rs.onrender.com/orders/" + id,
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ status })
        }
    );

    const data = await response.json();

    alert(data.message);

    loadOrders();

}

async function deleteOrder(id) {

    if (!confirm("Delete this order?")) return;

    const response = await fetch(
        "https://hyperlocal-backend-84rs.onrender.com/orders/" + id,
        {
            method: "DELETE"
        }
    );

    const data = await response.json();

    alert(data.message);

    loadOrders();

}

async function assignPartner(orderId) {

    const partnerId =
        document.getElementById("partner-" + orderId).value;

    const partner =
        deliveryPartners.find(p => p.id == partnerId);

    const response = await fetch(
        "https://hyperlocal-backend-84rs.onrender.com/assign-delivery/" + orderId,
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id: partner.id,
                name: partner.name,
                email: partner.email
            })
        }
    );

    const data = await response.json();

    alert(data.message);

    loadOrders();

}

async function start() {

    await loadDeliveryPartners();

    await loadOrders();

}

start();

function searchOrders(){

const input = document
.getElementById("searchOrder")
.value.toLowerCase();

const cards =
document.querySelectorAll(".card");

cards.forEach(card=>{

const text =
card.innerText.toLowerCase();

if(text.includes(input)){
card.style.display="block";
}
else{
card.style.display="none";
}

});

}

function filterOrders(){

const status =
document.getElementById("statusFilter").value;

const cards =
document.querySelectorAll(".card");

cards.forEach(card=>{

if(status==="All"){
card.style.display="block";
return;
}

if(card.innerText.includes(status)){
card.style.display="block";
}
else{
card.style.display="none";
}

});

}