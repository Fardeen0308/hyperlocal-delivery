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
        <div class="card">

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
    <option>Pending</option>
    <option>Preparing</option>
    <option>Out for Delivery</option>
    <option>Delivered</option>
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

    const status =
    document.getElementById("status-" + id).value;

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

setInterval(loadOrders,10000);

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

function printInvoice(id){

window.open("invoice.html?id="+id,"_blank");

}

async function viewOrder(id){

const response=await fetch(
"https://hyperlocal-backend-84rs.onrender.com/orders"
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