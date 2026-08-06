const user = JSON.parse(localStorage.getItem("user"));

if (!user || user.role !== "admin") {
    alert("Access Denied");
    window.location.href = "login.html";
}

async function addProduct() {

    const name = document.getElementById("name").value;
    const price = document.getElementById("price").value;
    const stock = document.getElementById("stock").value;
    const category = document.getElementById("category").value;

    const imageFile =
        document.getElementById("image").files[0];

    if (!imageFile) {
        alert("Please select an image");
        return;
    }

    const formData = new FormData();
    formData.append("image", imageFile);

    // Upload image
    const uploadResponse = await fetch(
        "https://hyperlocal-backend-84rs.onrender.com/upload",
        {
            method: "POST",
            body: formData
        }
    );

    const uploadData = await uploadResponse.json();

    // Save product
    const response = await fetch(
        "https://hyperlocal-backend-84rs.onrender.com/products",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name,
                price,
                stock,
                category,
                image: uploadData.imageUrl
            })
        }
    );

    const data = await response.json();

    alert(data.message);

    window.location.href = "products.html";
}