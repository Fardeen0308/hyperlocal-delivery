const user = JSON.parse(localStorage.getItem("user"));
const token = localStorage.getItem("token");

const authHeaders = {
    "Authorization": "Bearer " + token
};

if (!user || user.role !== "admin") {
    alert("Access Denied");
    window.location.href = "login.html";
}

let deliveryPartners = [];

async function loadDeliveryPartners() {

    const response = await fetch(
    "https://hyperlocal-backend-84rs.onrender.com/delivery-partners",
    {
        headers: authHeaders
    }
);
    const partners = await response.json();

    deliveryPartners = partners.filter(
        partner => partner.status === "Available"
    );

}

async function loadOrders() {

    const response = await fetch(
    "https://hyperlocal-backend-84rs.onrender.com/orders",
    {
        headers: authHeaders
    }
);

    const orders = await response.json();

    document.getElementById("orderCount").innerHTML =
orders.length;

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
        <div class="card order-card"
     data-payment="${order.paymentMethod || order.payment || ''}"
     data-status="${order.status}">

        <p><b>Order ID:</b> ${order.id}</p>

            <h2>${order.customerName}</h2>

            <p>📞 ${order.phone}</p>

            <p>🏠 ${order.address}</p>

            <p>📅 ${new Date(order.created_at).toLocaleString()}</p>

            <p><b>Subtotal:</b> ₹${Number(order.subtotal).toFixed(2)}</p>

<p><b>Delivery:</b> ₹${Number(order.delivery).toFixed(2)}</p>

<p><b>GST:</b> ₹${Number(order.gst).toFixed(2)}</p>

<p><b>Discount:</b> ₹${Number(order.discount).toFixed(2)}</p>

<h3>Total: ₹${Number(order.grandTotal).toFixed(2)}</h3>

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

            <select id="status-${order.id}">
    <option value="Pending" ${order.status === "Pending" ? "selected" : ""}>
        Pending
    </option>

    <option value="Preparing" ${order.status === "Preparing" ? "selected" : ""}>
        Preparing
    </option>

    <option value="Out for Delivery" ${order.status === "Out for Delivery" ? "selected" : ""}>
        Out for Delivery
    </option>

    <option value="Delivered" ${order.status === "Delivered" ? "selected" : ""}>
        Delivered
    </option>
</select>

<button onclick="updateStatus('${order.id}')">
✅ Update
</button>

            <button onclick="deleteOrder('${order.id}')">
                Delete Order
            </button>

            <button onclick="viewOrder('${order.id}')">
👁 View
</button>

            <button onclick="printInvoice('${order.id}')">

🖨 Print Invoice

</button>



            <br><br>

            <select
    id="partner-${order.id}"
    class="partner-select">
                ${partnerOptions}
            </select>

            <button
    class="assign-partner-btn"
    onclick="assignPartner('${order.id}')">
    🛵 Assign Delivery Partner
</button>

        </div>
        <br>
        `;

    });

}

async function updateStatus(id) {

    const status =
    document.getElementById("status-" + id).value;

    const response = await fetch(
    "https://hyperlocal-backend-84rs.onrender.com/orders/" + id,
    {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
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
        method: "DELETE",
        headers: authHeaders
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
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
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

setInterval(loadOrders,10000);


function filterOrders() {

    const search =
        document.getElementById("searchOrder")
        .value
        .toLowerCase();

    const status =
        document.getElementById("statusFilter").value;

    const payment =
        document.getElementById("paymentFilter").value;

    const cards =
        document.querySelectorAll(".order-card");

    cards.forEach(card => {

        const text =
            card.innerText.toLowerCase();

        const cardStatus =
            card.dataset.status;

        const cardPayment =
            card.dataset.payment;

        const matchesSearch =
            text.includes(search);

        const matchesStatus =
            status === "All" ||
            cardStatus === status;

        const matchesPayment =
            payment === "All" ||
            cardPayment === payment;

        if (
            matchesSearch &&
            matchesStatus &&
            matchesPayment
        ) {

            card.style.display = "";

        } else {

            card.style.display = "none";

        }

    });

}

function printInvoice(id){

window.open("invoice.html?id="+id,"_blank");

}

async function viewOrder(id){

const response = await fetch(
    "https://hyperlocal-backend-84rs.onrender.com/orders",
    {
        headers: authHeaders
    }
);

const orders=await response.json();

const order=orders.find(o=>o.id==id);

document.getElementById("orderDetails").innerHTML=`

<h2>Order #${order.id}</h2>

<p><b>Customer:</b> ${order.customerName}</p>

<p><b>Phone:</b> ${order.phone}</p>

<p><b>Address:</b> ${order.address}</p>

<p><b>Status:</b> ${order.status}</p>

<p><b>Total:</b> ₹${Number(order.grandTotal).toFixed(2)}</p>

`;

document.getElementById("orderModal").style.display="block";

}

function closeOrder(){

document.getElementById("orderModal").style.display="none";

}