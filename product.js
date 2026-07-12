let product =
JSON.parse(localStorage.getItem("selectedProduct"));

let container =
document.getElementById("productDetails");

container.innerHTML = `
<div class="card">

    <img src="${product.image}"
         width="250"
         height="250">

    <h2>${product.name}</h2>

    <h3>₹${product.price}</h3>

    <p>Category: ${product.category}</p>

</div>
`;

async function addReview(){

    const product =
    JSON.parse(localStorage.getItem("selectedProduct"));

    const user =
    JSON.parse(localStorage.getItem("user"));

    const rating =
    document.getElementById("rating").value;

    const comment =
    document.getElementById("comment").value;

    const response = await fetch(
        `https://hyperlocal-backend-84rs.onrender.com/products/${product.id}/review`,
        {
            method:"POST",
            headers:{
                "Content-Type":"application/json"
            },
            body:JSON.stringify({
                user:user.name,
                rating,
                comment
            })
        }
    );

    const data = await response.json();

    alert(data.message);

    location.reload();

}

async function loadRelatedProducts(){

    const product =
    JSON.parse(localStorage.getItem("selectedProduct"));

    const response = await fetch(
        "https://hyperlocal-backend-84rs.onrender.com/related/" + product.category
    );

    const products = await response.json();

    const container =
    document.getElementById("relatedProducts");

    container.innerHTML = "";

    products.forEach(item => {

        if(item._id !== product.id){

            container.innerHTML += `
            <div class="card">

                <img src="${item.image}"
                     width="150">

                <h3>${item.name}</h3>

                <p>₹${item.price}</p>

            </div>
            `;

        }

    });

}
loadRelatedProducts();

async function loadReviews(){

    const product =
    JSON.parse(localStorage.getItem("selectedProduct"));

    const response = await fetch(
        "https://hyperlocal-backend-84rs.onrender.com/products"
    );

    const products = await response.json();

    const currentProduct =
    products.find(p => p.id ===
        product.id);
    let html = "";

    currentProduct.reviews.forEach(review => {

        html += `
        <div class="card">

            <h3>${review.user}</h3>

            <p>⭐ ${review.rating}</p>

            <p>${review.comment}</p>

            <small>
            ${new Date(review.date).toLocaleDateString()}
            </small>

        </div>
        `;

    });

    document.getElementById("reviews").innerHTML = html;

}

loadReviews();

async function loadReviews(){

    const product =
    JSON.parse(localStorage.getItem("selectedProduct"));

    const response = await fetch(
        "https://hyperlocal-backend-84rs.onrender.com/products"
    );

    const products = await response.json();

    const currentProduct = products.find(
        p => p.id === product.id
    );

    if(!currentProduct) return;

    let reviewsDiv =
    document.getElementById("reviews");

    reviewsDiv.innerHTML = "";

if(currentProduct.reviews.length === 0){
    reviewsDiv.innerHTML =
    "<p>No reviews yet. Be the first to review!</p>";
    return;
}

    currentProduct.reviews.forEach(review=>{

        reviewsDiv.innerHTML += `
        <div class="card">

            <h3>${review.user}</h3>

            <p>${"⭐".repeat(review.rating)}</p>

            <p>${review.comment}</p>

        </div>
        `;

    });

}
loadReviews();