const user = JSON.parse(localStorage.getItem("user"));

if (!user || user.role !== "admin") {
    alert("Access Denied");
    window.location.href = "login.html";
}

async function loadProducts() {
    try {
        const response = await fetch(
            "https://hyperlocal-backend-84rs.onrender.com/products"
        );

        const products = await response.json();

        if (!response.ok) {
            alert(products.message || "Unable to load products");
            return;
        }

        const container = document.getElementById("products");
        container.innerHTML = "";

        products.forEach(product => {
            let stockBadge = "🟢 In Stock";

            if (product.stock <= 10) {
                stockBadge = "🟡 Low Stock";
            }

            if (product.stock <= 0) {
                stockBadge = "🔴 Out of Stock";
            }

            container.innerHTML += `
                <div class="card">

                    <img src="${product.image}" alt="Product">

                    <h2>${product.name}</h2>

                    <p>🏷 ${product.category}</p>

                    <h3>₹${product.price}</h3>

                    <p>${stockBadge}</p>

                    <p>Stock : ${product.stock}</p>

                    <hr>

                    <p><strong>Return Policy: 5 Days</strong></p>

                    <label>
                        <input
                            type="checkbox"
                            ${product.is_returnable === true ? "checked" : ""}
                            onchange="updateReturnability('${product.id}', this.checked)"
                        >
                        Allow returns
                    </label>

                    <div class="button-group">

                        <button onclick="editProduct('${product.id}')">
                            ✏ Edit
                        </button>

                        <button onclick="deleteProduct('${product.id}')">
                            🗑 Delete
                        </button>

                    </div>

                </div>
            `;
        });

    } catch (error) {
        console.error("Load products error:", error);
        alert("Unable to load products");
    }
}

async function updateReturnability(id, is_returnable) {
    try {
        const response = await fetch(
            "https://hyperlocal-backend-84rs.onrender.com/products/" + id,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + localStorage.getItem("token")
                },
                body: JSON.stringify({
                    is_returnable: is_returnable
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || "Unable to update return setting");
            loadProducts();
            return;
        }

        alert(
            is_returnable
                ? "Returns enabled for this product!"
                : "Returns disabled for this product!"
        );

    } catch (error) {
        console.error("Return setting error:", error);
        alert("Unable to update return setting");
        loadProducts();
    }
}

async function deleteProduct(id) {
    if (!confirm("Delete this product?")) return;

    const response = await fetch(
        "https://hyperlocal-backend-84rs.onrender.com/products/" + id,
        {
            method: "DELETE",
            headers: {
                "Authorization": "Bearer " + localStorage.getItem("token")
            }
        }
    );

    const data = await response.json();

    alert(data.message);

    loadProducts();
}

function editProduct(id) {
    localStorage.setItem("editProductId", id);
    window.location.href = "edit-product.html";
}

loadProducts();

document
.getElementById("searchProduct")
.addEventListener("input", function () {
    const keyword = this.value.toLowerCase();

    document.querySelectorAll(".card").forEach(card => {
        card.style.display =
            card.innerText.toLowerCase().includes(keyword)
                ? "block"
                : "none";
    });
});

document
.getElementById("categoryFilter")
.addEventListener("change", function () {
    const value = this.value.toLowerCase();

    document.querySelectorAll(".card").forEach(card => {
        card.style.display =
            value === "" ||
            card.innerText.toLowerCase().includes(value)
                ? "block"
                : "none";
    });
});