const token = localStorage.getItem("token");

const authHeaders = {
    "Authorization": "Bearer " + token
};


// Load Orders
async function loadOrders() {

    try {

        const response = await fetch(
            "https://hyperlocal-backend-84rs.onrender.com/my-store/orders",
            {
                headers: authHeaders
            }
        );

        const orders = await response.json();

        if (!response.ok) {
            console.error("Orders error:", orders);
            return;
        }

        const container =
            document.getElementById("orders");

        container.innerHTML = "";

        if (!orders.length) {

            container.innerHTML = `
                <div class="card">
                    <h2>📦 No Orders Yet</h2>
                    <p>Your store has no orders.</p>
                </div>
            `;

            return;
        }


        orders.forEach(order => {

            let productNames = "";

            if (Array.isArray(order.products)) {

                order.products.forEach(product => {

                    productNames +=
                        `${product.name} × ${product.quantity || 1}<br>`;

                });

            }


            container.innerHTML += `

            <div class="card">

                <h2>📦 Order #${order.id}</h2>

                <p>
                    <b>Customer:</b>
                    ${order.customerName}
                </p>

                <p>
                    📞 ${order.phone}
                </p>

                <p>
                    🏠 ${order.address}
                </p>

                <p>
                    🛍️ <b>Products:</b><br>
                    ${productNames}
                </p>

                <p>
                    💰 <b>Total:</b>
                    ₹${Number(order.grandTotal || 0).toFixed(2)}
                </p>

                <p>
                    <b>Payment:</b>
                    ${order.payment || "N/A"}
                </p>

                <p>
                    <b>Status:</b>
                    ${order.status}
                </p>


                <button
                    onclick="updateStatus('${order.id}')">
                    🔄 Update Status
                </button>


                <button
                    onclick="viewOrder('${order.id}')">
                    👁 View
                </button>


                <button
                    onclick="printInvoice('${order.id}')">
                    🖨 Print Invoice
                </button>

            </div>

            `;

        });

    } catch (error) {

        console.error("Load store orders error:", error);

    }

}


// Update Order Status
async function updateStatus(id) {

    const newStatus = prompt(
        "Enter new status:\n\nPending\nPreparing\nOut for Delivery\nDelivered"
    );

    if (!newStatus) return;

    const response = await fetch(

        "https://hyperlocal-backend-84rs.onrender.com/my-store/orders/" + id,

        {
            method: "PUT",

            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },

            body: JSON.stringify({
                status: newStatus
            })
        }

    );

    const data = await response.json();

    alert(data.message);

    loadOrders();

}


// View Order
async function viewOrder(id) {

    const response = await fetch(

        "https://hyperlocal-backend-84rs.onrender.com/my-store/orders",

        {
            headers: authHeaders
        }

    );

    const orders = await response.json();

    const order =
        orders.find(o => String(o.id) === String(id));

    if (!order) {

        alert("Order not found");

        return;

    }


    let products = "";

    if (Array.isArray(order.products)) {

        order.products.forEach(product => {

            products += `
                <p>
                    ${product.name}
                    × ${product.quantity || 1}
                </p>
            `;

        });

    }


    alert(
        "Order #" + order.id +
        "\n\nCustomer: " + order.customerName +
        "\nPhone: " + order.phone +
        "\nAddress: " + order.address +
        "\nStatus: " + order.status +
        "\nTotal: ₹" + Number(order.grandTotal || 0).toFixed(2)
    );

}


// Print Invoice
function printInvoice(id) {

    window.open(
        "invoice.html?id=" + id,
        "_blank"
    );

}


// Initial Load
loadOrders();


// Refresh every 10 seconds
setInterval(loadOrders, 10000);