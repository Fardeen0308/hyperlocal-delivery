async function placeOrder() {

    const customerName =
    document.getElementById("customerName").value;

    const phone =
    document.getElementById("phone").value;

    const address =
    document.getElementById("address").value;

    const user = JSON.parse(localStorage.getItem("user"));
let products = JSON.parse(localStorage.getItem("cart")) || [];

const buyNowProduct = JSON.parse(localStorage.getItem("buyNowProduct"));

if (buyNowProduct) {
    products = [buyNowProduct];
}
    let total = 0;

    products.forEach(product => {
        total += Number(product.price);
    });

    const response = await fetch(
        "https://hyperlocal-backend-84rs.onrender.com/orders",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
          body: JSON.stringify({
    customerName,
    email: user.email,
    phone,
    address,
    products,
    subtotal: total,
    delivery,
    gst,
    discount,
    grandTotal,
    payment: "Cash on Delivery",
    status: "Pending"
})
        }
    );

    const data = await response.json();

    alert(data.message);

    localStorage.removeItem("cart");

    window.location.href = "orders.html";
}

async function payNow(totalAmount) {

    const response = await fetch("https://hyperlocal-backend-84rs.onrender.com/create-order", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            amount: totalAmount
        })
    });

    const order = await response.json();

    const options = {
        key:"rzp_live_TCB78B9Fjaa5kd" ,
        amount: order.amount,
        currency: order.currency,
        name: "HyperLocal Delivery",
        description: "Order Payment",
        order_id: order.id,

        handler: function (response) {

            alert("Payment Successful 🎉");

            console.log(response);

        }
    };

    const rzp = new Razorpay(options);

    rzp.open();
}