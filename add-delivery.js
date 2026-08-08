const user = JSON.parse(localStorage.getItem("user"));

if (!user || user.role !== "admin") {
    alert("Access Denied");
    window.location.href = "login.html";
}

async function addPartner() {

    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const phone = document.getElementById("phone").value;
    const password = document.getElementById("password").value;

    const response = await fetch(
        "https://hyperlocal-backend-84rs.onrender.com/delivery-partners",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name,
                email,
                phone,
                password
            })
        }
    );

    const data = await response.json();

    alert(data.message);

    if (response.ok) {
        window.location.href = "delivery.html";
    }
}