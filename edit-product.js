const user = JSON.parse(localStorage.getItem("user"));

if (!user || user.role !== "admin") {
    alert("Access Denied");
    window.location.href = "login.html";
}

const productId = localStorage.getItem("editProductId");

async function loadProduct() {

    const response = await fetch(
        "https://hyperlocal-backend-84rs.onrender.com/products"
    );

    const products = await response.json();

    const product = products.find(p => p.id == productId);

    if (!product) {
        alert("Product not found");
        return;
    }

    document.getElementById("name").value = product.name;
    document.getElementById("price").value = product.price;
    document.getElementById("stock").value = product.stock;
    document.getElementById("category").value = product.category;

}

async function updateProduct() {

    const response = await fetch(
        "https://hyperlocal-backend-84rs.onrender.com/products/" + productId,
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: document.getElementById("name").value,
                price: document.getElementById("price").value,
                stock: document.getElementById("stock").value,
                category: document.getElementById("category").value
            })
        }
    );

    const data = await response.json();

    alert(data.message);

    localStorage.removeItem("editProductId");

    window.location.href = "products.html";

}

loadProduct();