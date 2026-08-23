const token = localStorage.getItem("token");

const authHeaders = {
    "Authorization": "Bearer " + token
};
const user = JSON.parse(localStorage.getItem("user"));

if (!user || user.role !== "admin") {
    alert("Access Denied");
    window.location.href = "login.html";
}

async function loadPartners() {

    const response = await fetch(
    "https://hyperlocal-backend-84rs.onrender.com/delivery-partners",
    {
        headers: authHeaders
    }
);
    const partners = await response.json();

    document.getElementById("totalPartners").innerText =
partners.length;

document.getElementById("availablePartners").innerText =
partners.filter(p => p.status === "Available").length;

document.getElementById("busyPartners").innerText =
partners.filter(p => p.status === "Busy").length;

document.getElementById("offlinePartners").innerText =
partners.filter(p => p.status === "Offline").length;

    const search = document
        .getElementById("search")
        .value
        .toLowerCase();

        const filter =
document.getElementById("statusFilter").value;

    const container = document.getElementById("partners");

    container.innerHTML = "";

    partners
        .filter(partner=>{

const matchSearch=
partner.name.toLowerCase().includes(search);

const matchStatus=
filter==="" || partner.status===filter;

return matchSearch && matchStatus;

})
        .forEach(partner => {

            container.innerHTML += `
            <div class="card">

                <h2>${partner.name}</h2>

                <p>📧 ${partner.email}</p>

                <p>📱 ${partner.phone}</p>

                <p>📦 Deliveries: ${partner.totalDeliveries || 0}</p>

<p>💰 Earnings: ₹${partner.totalEarnings || 0}</p>

<p>⭐ Rating: ${partner.rating || 0}/5</p>

<p>📦 Current Order:

${partner.currentOrder || "None"}

</p>

                <p>Status</p>

                <select id="status-${partner.id}">
                    <option value="Available" ${partner.status === "Available" ? "selected" : ""}>Available</option>
                    <option value="Busy" ${partner.status === "Busy" ? "selected" : ""}>Busy</option>
                    <option value="Offline" ${partner.status === "Offline" ? "selected" : ""}>Offline</option>
                </select>

                <br><br>

                <button onclick="updateStatus('${partner.email}','${partner.id}')">
                    💾 Update Status
                </button>

                <button onclick="deletePartner('${partner.id}')">
                    ❌ Delete
                </button>

                <button>

🚫 Block

</button>

            </div>
            `;

        });

}

async function updateStatus(email, id) {

    const status =
        document.getElementById("status-" + id).value;

    const response = await fetch(
        "https://hyperlocal-backend-84rs.onrender.com/delivery-partners/status",
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                status
            })
        }
    );

    const data = await response.json();

    alert(data.message);

   loadPartners();

setInterval(loadPartners,10000);

}

async function deletePartner(id) {

    if (!confirm("Delete this delivery partner?")) return;

    const response = await fetch(
        "https://hyperlocal-backend-84rs.onrender.com/delivery-partners/" + id,
        {
            method: "DELETE"
        }
    );

    const data = await response.json();

    alert(data.message);

    loadPartners();

}

loadPartners();