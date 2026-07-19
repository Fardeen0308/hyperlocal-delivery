async function loadOrders() {

    const response =
    await fetch("https://hyperlocal-backend-84rs.onrender.com/orders");

    const orders =
    await response.json();

    document.getElementById("totalOrders").innerText =
orders.length;

let revenue = 0;
let delivered = 0;

orders.forEach(order => {

    revenue += Number(order.grandTotal);

    if(order.status === "Delivered"){
        delivered++;
    }

   

});

let partnerOptions = "";

deliveryPartners.forEach(partner => {

    partnerOptions += `
    <option value="${partner.id}">
        ${partner.name}
    </option>
    `;

});

document.getElementById("totalRevenue").innerText =
"₹" + revenue;

document.getElementById("deliveredOrders").innerText =
delivered;
    let container =
    document.getElementById("orders");

    container.innerHTML = "";

    orders.forEach(order => {

        container.innerHTML += `
        <div class="card">

            <h3>${order.customerName}</h3>

            <p>${order.phone}</p>

            <p>${order.address}</p>

           <p><b>Products:</b> ₹${order.subtotal}</p>

<p><b>Delivery:</b> ₹${order.delivery}</p>

<p><b>GST:</b> ₹${order.gst}</p>

<p><b>Discount:</b> ₹${order.discount}</p>

<h3>Total Paid: ₹${order.grandTotal}</h3>

            <p>Status: ${order.status}</p>

            <button onclick="updateStatus('${order.id}')">
                Next Status
            </button>

            <button onclick="deleteOrder('${order.id}')">
    Delete Order
</button>

<select id="partner-${order.id}">
${partnerOptions}
</select>

<button onclick="assignPartner('${order.id}')">
🚚 Assign Delivery Partner
</button>

   
        </div>
        `;

    });

}
let deliveryPartners = [];

async function loadDeliveryPartners(){

    const response = await fetch(
        "https://hyperlocal-backend-84rs.onrender.com/delivery-partners"
    );

    deliveryPartners = await response.json();

}

async function start(){

    await loadDeliveryPartners();

    loadOrders();

}

start();

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

    let confirmDelete =
    confirm("Delete this order?");

    if (!confirmDelete) return;

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

async function assignPartner(orderId){

    const partnerId =
    document.getElementById("partner-"+orderId).value;

    const partner =
    deliveryPartners.find(p=>p.id==partnerId);

    const response = await fetch(
        "https://hyperlocal-backend-84rs.onrender.com/assign-delivery/"+orderId,
        {
            method:"PUT",
            headers:{
                "Content-Type":"application/json"
            },
            body:JSON.stringify({
                id:partner.id,
                name:partner.name,
                email:partner.email
            })
        }
    );

    const data = await response.json();

    alert(data.message);

    loadOrders();

}