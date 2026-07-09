let wishlist =
JSON.parse(localStorage.getItem("wishlist")) || [];

let container =
document.getElementById("wishlist");

wishlist.forEach(product => {

    container.innerHTML += `
    <div class="card">

        <img src="${product.image}"
             width="200"
             height="200">

        <h2>${product.name}</h2>

        <p>₹${product.price}</p>

    </div>
    `;

});