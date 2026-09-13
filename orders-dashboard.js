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

    try {

        const response = await fetch(
            "https://hyperlocal-backend-84rs.onrender.com/my-store/orders",
            {
                headers: authHeaders
            }
        );

        const orders = await response.json();

        if (!response.ok) {
            alert(orders.message || "Unable to load order");
            return;
        }

        const order = orders.find(
            o => String(o.id) === String(id)
        );

        if (!order) {
            alert("Order not found");
            return;
        }


        // Products
        let productsHTML = "";

        if (Array.isArray(order.products)) {

            order.products.forEach(product => {

                productsHTML += `
                    <div class="order-product">
                        <b>${product.name}</b>
                        × ${product.quantity || 1}
                        <br>
                        ₹${Number(product.price || 0).toFixed(2)}
                    </div>
                `;

            });

        }


        // Order details
        document.getElementById("orderDetails").innerHTML = `

            <h2>📦 Order #${order.id}</h2>

            <hr>

            <h3>👤 Customer</h3>

            <p>
                <b>Name:</b>
                ${order.customerName}
            </p>

            <p>
                📞 ${order.phone}
            </p>

            <p>
                🏠 ${order.address}
            </p>


            <h3>🛍️ Products</h3>

            ${productsHTML}


            <hr>

            <p>
                <b>Subtotal:</b>
                ₹${Number(order.subtotal || 0).toFixed(2)}
            </p>

            <p>
                <b>Delivery:</b>
                ₹${Number(order.delivery || 0).toFixed(2)}
            </p>

            <p>
                <b>GST:</b>
                ₹${Number(order.gst || 0).toFixed(2)}
            </p>

            <p>
                <b>Discount:</b>
                ₹${Number(order.discount || 0).toFixed(2)}
            </p>

            <h2>
                💰 Grand Total:
                ₹${Number(order.grandTotal || 0).toFixed(2)}
            </h2>


            <p>
                💳 <b>Payment:</b>
                ${order.payment || "N/A"}
            </p>

            <p>
                📋 <b>Status:</b>
                ${order.status}
            </p>

        `;


        // Show popup
        document.getElementById("orderModal").style.display = "block";


    } catch (error) {

        console.error("View order error:", error);

        alert("Unable to load order details");

    }

}

function closeOrder() {
    document.getElementById("orderModal").style.display = "none";
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