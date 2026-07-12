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

    revenue += Number(order.total);

    if(order.status === "Delivered"){
        delivered++;
    }

   

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

            <p>₹${order.total}</p>

            <p>Status: ${order.status}</p>

            <button onclick="updateStatus('${order._id}')">
                Next Status
            </button>

            <button onclick="deleteOrder('${order._id}')">
    Delete Order
</button>

   
        </div>
        `;

    });

}

loadOrders();

async function updateStatus(id) {

    const response = await fetch(
        "https://hyperlocal-backend-84rs.onrender.com/orders/" + id,
        {
            method: "PUT"
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