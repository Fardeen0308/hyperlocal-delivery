async function loadOrders() {

    const response = await fetch(
        "http://localhost:5000/orders"
    );

    const orders = await response.json();

    const container =
    document.getElementById("orders");

    container.innerHTML = "";

    orders.forEach(order => {

        let productNames = "";

        order.products.forEach(product => {
            productNames += product.name + "<br>";
        });

        container.innerHTML += `

        <div class="card">

            <h2>${order.customerName}</h2>

            <p>📞 ${order.phone}</p>

            <p>🏠 ${order.address}</p>

            <p>${productNames}</p>

            <p>💰 ₹${order.total}</p>

            <p><b>Payment:</b> ${order.payment}</p>

            <h3>Status : ${order.status}</h3>

            <button onclick="updateStatus('${order._id}')">
                🔄 Next Status
            </button>

            <button onclick="deleteOrder('${order._id}')">
                🗑 Delete
            </button>

        </div>

        `;

    });

}

async function updateStatus(id){

    const response = await fetch(

        "http://localhost:5000/orders/" + id,

        {
            method:"PUT"
        }

    );

    const data = await response.json();

    alert(data.message);

    loadOrders();

}

async function deleteOrder(id){

    if(!confirm("Delete this order?")) return;

    const response = await fetch(

        "http://localhost:5000/orders/" + id,

        {
            method:"DELETE"
        }

    );

    const data = await response.json();

    alert(data.message);

    loadOrders();

}

loadOrders();