let users = JSON.parse(localStorage.getItem("users")) || [];

const usersGrid = document.getElementById("usersGrid");

function loadUsers() {

    usersGrid.innerHTML = "";

    if (users.length === 0) {
        usersGrid.innerHTML = `
            <div class="card">
                <h2>No Users Found</h2>
            </div>
        `;
        return;
    }

    users.forEach((user, index) => {

        let orders = user.orders || 0;
        let spending = user.spending || 0;

        usersGrid.innerHTML += `

        <div class="card">

            <h2>${user.name}</h2>

            <p>📧 ${user.email}</p>

            <p>📱 ${user.phone || "Not Available"}</p>

            <p>📍 ${user.address || "Not Available"}</p>

            <p>🛒 Orders : ${orders}</p>

            <h3>₹${spending}</h3>

            <button onclick="blockUser(${index})">
                ${user.blocked ? "✅ Unblock" : "🚫 Block"}
            </button>

            <button onclick="deleteUser(${index})">
                🗑 Delete
            </button>

        </div>

        `;
    });

}

function blockUser(index){

    users[index].blocked = !users[index].blocked;

    localStorage.setItem("users", JSON.stringify(users));

    loadUsers();

}

function deleteUser(index){

    if(confirm("Delete this user?")){

        users.splice(index,1);

        localStorage.setItem("users", JSON.stringify(users));

        loadUsers();

    }

}

document.getElementById("searchUser").addEventListener("input", function(){

    const keyword = this.value.toLowerCase();

    document.querySelectorAll(".card").forEach(card=>{

        card.style.display = card.innerText.toLowerCase().includes(keyword)
            ? "block"
            : "none";

    });

});

loadUsers();