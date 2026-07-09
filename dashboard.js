let imageUrl = "";

// Add Product
async function addProduct() {

    const name = document.getElementById("productName").value;
    const price = document.getElementById("productPrice").value;
    const category = document.getElementById("productCategory").value;
    const stock =
document.getElementById("productStock").value;

    const imageUrl = localStorage.getItem("imageUrl");

    if (!imageUrl) {
        alert("Upload image first");
        return;
    }

    const response = await fetch("http://localhost:5000/products", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name,
            price,
            image: imageUrl,
            category,
            stock,
        })
    });

    const data = await response.json();

    alert(data.message);

    loadProducts();
}

// Load Products
async function loadProducts() {

    const res = await fetch("http://localhost:5000/products");

    const products = await res.json();

    const container = document.getElementById("products");

    container.innerHTML = "";

    products.forEach(product => {

        container.innerHTML += `
        <div class="card">

            <img src="${product.image}" width="150">

            <h3>${product.name}</h3>

            <p>${product.category || "No Category"}</p>

            <p>₹${product.price}</p>

            <button onclick="deleteProduct('${product._id}')">
                🗑️ Delete
            </button>

            <button onclick="editProduct('${product._id}')">
✏️ Edit
</button>

        </div>
        `;

    });

}

// Delete Product
async function deleteProduct(id){

    const ok = confirm("Delete this product?");

    if(!ok) return;

    const response = await fetch(
        `http://localhost:5000/products/${id}`,
        {
            method:"DELETE"
        }
    );

    const data = await response.json();

    alert(data.message);

    loadProducts();

}

loadProducts();

async function editProduct(id){

    const name = prompt("New Product Name");

    const price = prompt("New Price");

    const category = prompt("New Category");

    const stock = prompt("New Stock");

    const response = await fetch(
        `http://localhost:5000/products/${id}`,
        {
            method:"PUT",
            headers:{
                "Content-Type":"application/json"
            },
            body:JSON.stringify({
                name,
                price,
                category,
                stock
            })
        }
    );

    const data = await response.json();

    alert(data.message);

    loadProducts();

}

async function loadStats(){

    // Products
    const productRes =
    await fetch("http://localhost:5000/products");

    const products =
    await productRes.json();

    document.getElementById("productCount").innerText =
    products.length;

    // Orders
    const orderRes =
    await fetch("http://localhost:5000/orders");

    const orders =
    await orderRes.json();

    document.getElementById("orderCount").innerText =
    orders.length;

    // Total Sales
    let totalSales = 0;

    orders.forEach(order=>{
        totalSales += Number(order.total);
    });

    document.getElementById("sales").innerText =
    "₹" + totalSales;

    // Users
    const userRes =
    await fetch("http://localhost:5000/users");

    const users =
    await userRes.json();

    document.getElementById("userCount").innerText =
    users.length;

}

loadStats();

