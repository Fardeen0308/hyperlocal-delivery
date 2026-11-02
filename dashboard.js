const token = localStorage.getItem("token");

const authHeaders = {
    "Authorization": "Bearer " + token
};

let uploadedImageUrls = [];

async function uploadImages() {
    const fileInput = document.getElementById("productImages");
    const files = Array.from(fileInput.files);

    if (files.length === 0) {
        alert("Please select images first");
        return;
    }

    if (files.length > 5) {
        alert("Maximum 5 images allowed");
        return;
    }

    const formData = new FormData();

    files.forEach(file => {
        formData.append("images", file);
    });

    try {
        const response = await fetch(
            "https://hyperlocal-backend-84rs.onrender.com/upload-multiple",
            {
                method: "POST",
                headers: authHeaders,
                body: formData
            }
        );

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || "Image upload failed");
            return;
        }

        uploadedImageUrls = data.images || [];

        const preview = document.getElementById("imagePreviews");

        preview.innerHTML = uploadedImageUrls.map(url => `
            <img
                src="${url}"
                width="100"
                style="margin:5px; border-radius:8px;"
            >
        `).join("");

        alert("All images uploaded successfully!");

    } catch (error) {
        console.error("Multiple image upload error:", error);
        alert("Unable to upload images");
    }
}

// Add Product
async function addProduct() {

    const name = document.getElementById("productName").value.trim();
    const price = document.getElementById("productPrice").value;
    const category = document.getElementById("productCategory").value;
    const stock = document.getElementById("productStock").value;

    if (uploadedImageUrls.length === 0) {
        alert("Please upload product images first");
        return;
    }

    const response = await fetch(
        "https://hyperlocal-backend-84rs.onrender.com/products",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...authHeaders
            },
            body: JSON.stringify({
                name,
                price,
                category,
                stock,
                image: uploadedImageUrls[0],
                images: uploadedImageUrls
            })
        }
    );

    const data = await response.json();

    alert(data.message);

    if (response.ok) {
        document.getElementById("productName").value = "";
        document.getElementById("productPrice").value = "";
        document.getElementById("productStock").value = "";
        document.getElementById("productImages").value = "";
        document.getElementById("imagePreviews").innerHTML = "";

        uploadedImageUrls = [];

        loadProducts();
        loadStats();
    }
}
// Load Products
// Load Store Products
async function loadProducts() {

    const res = await fetch(
        "https://hyperlocal-backend-84rs.onrender.com/my-store/products",
        {
            headers: authHeaders
        }
    );

    const products = await res.json();

    const container = document.getElementById("products");

    container.innerHTML = "";

    products.forEach(product => {

        container.innerHTML += `
        <div class="card">

            <div class="product-images">
    ${(product.images && product.images.length
        ? product.images
        : [product.image]
    ).map(url => `
        <img src="${url}" width="100"
             style="margin:4px; border-radius:8px;">
    `).join("")}
</div>

            <h3>${product.name}</h3>

            <p>${product.category || "No Category"}</p>

            <p>₹${product.price}</p>

            <button onclick="deleteProduct('${product.id}')">
                🗑️ Delete
            </button>

            <button onclick="editProduct('${product.id}')">
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
    `https://hyperlocal-backend-84rs.onrender.com/products/${id}`,
    {
        method: "DELETE",
        headers: {
            "Authorization": "Bearer " + token
        }
    }
);

    const data = await response.json();

    alert(data.message);

    loadProducts();

}

loadProducts();

async function editProduct(id) {

    const name = prompt("New Product Name");
    if (name === null) return;

    const price = prompt("New Price");
    if (price === null) return;

    const category = prompt("New Category");
    if (category === null) return;

    const stock = prompt("New Stock");
    if (stock === null) return;

    if (!name.trim() || !price.trim() || !category.trim() || !stock.trim()) {
        alert("Please fill all fields");
        return;
    }

    if (isNaN(Number(price)) || isNaN(Number(stock))) {
        alert("Price and Stock must be numbers");
        return;
    }

    const response = await fetch(
        `https://hyperlocal-backend-84rs.onrender.com/products/${id}`,
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({
                name: name.trim(),
                price: Number(price),
                category: category.trim(),
                stock: Number(stock)
            })
        }
    );

    const data = await response.json();

    alert(data.message);

    if (response.ok) {
        loadProducts();
    }
}
async function loadStats(){

    // Products
    const productRes =
    await fetch(
        "https://hyperlocal-backend-84rs.onrender.com/my-store/products",
        {
            headers: authHeaders
        }
    );
    const products =
    await productRes.json();

    document.getElementById("productCount").innerText =
    products.length;

// Store Orders
const response = await fetch(
    "https://hyperlocal-backend-84rs.onrender.com/my-store/orders",
    {
        headers: authHeaders
    }
);
    const orders =
    await response.json();

    document.getElementById("orderCount").innerText =
    orders.length;

    // Total Sales
    let totalSales = 0;

    orders.forEach(order=>{
        totalSales += Number(order.grandTotal || 0);
    });

    document.getElementById("sales").innerText =
    "₹" + totalSales;

    document.getElementById("earnings").innerText =
"₹" + totalSales;

   // Users
const currentUser =
    JSON.parse(localStorage.getItem("user"));

if (currentUser && currentUser.role === "store_owner") {

    document.getElementById("userCount").innerText = "—";

} else {

    const userRes =
        await fetch(
            "https://hyperlocal-backend-84rs.onrender.com/users",
            {
                headers: authHeaders
            }
        );

    const users =
        await userRes.json();

    document.getElementById("userCount").innerText =
        users.length;
}
}
loadStats();

function logout() {
    localStorage.removeItem("user");
    localStorage.removeItem("token");

    alert("Logged out successfully");

    window.location.href = "login.html";
}

async function loadStoreName() {

    try {

        const response = await fetch(
            "https://hyperlocal-backend-84rs.onrender.com/my-store",
            {
                headers: authHeaders
            }
        );

        const store = await response.json();

        if (!response.ok) {
            console.log("Store error:", store);
            document.getElementById("storeName").innerText =
                "Store not found";
            return;
        }

        document.getElementById("storeName").innerText =
            "🏪 " + store.store_name;

    } catch (error) {

        console.log("Store loading error:", error);

        document.getElementById("storeName").innerText =
            "Unable to load store";
    }
}

loadStoreName();

