const user = JSON.parse(localStorage.getItem("user"));

if (!user || user.role !== "admin") {
    alert("Access Denied");
    window.location.href = "login.html";
}

async function loadProducts() {

    const response = await fetch(
        "https://hyperlocal-backend-84rs.onrender.com/products"
    );

    const products = await response.json();

    const container = document.getElementById("products");

    container.innerHTML = "";

    products.forEach(product => {

        container.innerHTML += `
        <div class="card">

            <img src="${product.image}" width="150">

            <h2>${product.name}</h2>

            <p>💰 ₹${product.price}</p>

            <p>📦 Stock: ${product.stock}</p>

            <p>🏷️ ${product.category}</p>

            <button onclick="editProduct('${product.id}')">
                ✏️ Edit
            </button>

            <button onclick="deleteProduct('${product.id}')">
                ❌ Delete
            </button>

        </div>
        `;

    });

}

async function deleteProduct(id) {

    if (!confirm("Delete this product?")) return;

    const response = await fetch(
        "https://hyperlocal-backend-84rs.onrender.com/products/" + id,
        {
            method: "DELETE"
        }
    );

    const data = await response.json();

    alert(data.message);

    loadProducts();

}

function editProduct(id){

    localStorage.setItem("editProductId", id);

    window.location.href = "edit-product.html";

}

loadProducts();