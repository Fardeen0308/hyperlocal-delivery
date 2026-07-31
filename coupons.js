const API = "https://hyperlocal-backend-84rs.onrender.com";

async function loadCoupons() {

    const res = await fetch(`${API}/coupons`);
    const coupons = await res.json();

    const table = document.getElementById("couponTable");
    table.innerHTML = "";

    coupons.forEach(coupon => {

        table.innerHTML += `
        <tr>
            <td>${coupon.code}</td>
            <td>${coupon.discount}</td>
            <td>${coupon.type}</td>
            <td>₹${coupon.minOrder}</td>
            <td>${coupon.expiry}</td>
            <td>
                <button class="delete-btn"
                    onclick="deleteCoupon(${coupon.id})">
                    Delete
                </button>
            </td>
        </tr>
        `;

    });

}

async function addCoupon() {

    const code = document.getElementById("code").value;
    const discount = document.getElementById("discount").value;
    const type = document.getElementById("type").value;
    const minOrder = document.getElementById("minOrder").value;
    const expiry = document.getElementById("expiry").value;

    const res = await fetch(`${API}/coupons`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            code,
            discount,
            type,
            minOrder,
            expiry
        })
    });

    const data = await res.json();

    alert(data.message);

    loadCoupons();

    document.getElementById("code").value = "";
    document.getElementById("discount").value = "";
    document.getElementById("minOrder").value = "";
    document.getElementById("expiry").value = "";
}

async function deleteCoupon(id) {

    if (!confirm("Delete this coupon?")) return;

    const res = await fetch(`${API}/coupons/${id}`, {
        method: "DELETE"
    });

    const data = await res.json();

    alert(data.message);

    loadCoupons();

}

loadCoupons();