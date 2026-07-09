async function placeOrder() {

    const customerName =
    document.getElementById("customerName").value;

    const phone =
    document.getElementById("phone").value;

    const address =
    document.getElementById("address").value;

    const products =
    JSON.parse(localStorage.getItem("cart")) || [];

    let total = 0;

    products.forEach(product => {
        total += Number(product.price);
    });

    const response = await fetch(
        "http://localhost:5000/orders",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                customerName,
                phone,
                address,
                products,
                total,
                status: "Order Placed"
            })
        }
    );

    const data = await response.json();

    alert(data.message);

    localStorage.removeItem("cart");

    window.location.href = "orders.html";
}