const token = localStorage.getItem("token");

const authHeaders = {
    "Authorization": "Bearer " + token
};
const usersGrid = document.getElementById("usersGrid");

async function loadUsers() {

    const response = await fetch(
    "https://hyperlocal-backend-84rs.onrender.com/users",
    {
        headers: authHeaders
    }
);
    const users = await response.json();

    usersGrid.innerHTML = "";

    if(users.length === 0){
        usersGrid.innerHTML = "<div class='card'><h2>No Users Found</h2></div>";
        return;
    }

    users.forEach(user=>{

        document.getElementById("totalUsers").innerText = users.length;

document.getElementById("customerCount").innerText =
users.filter(u => u.role === "customer").length;

document.getElementById("adminCount").innerText =
users.filter(u => u.role === "admin").length;

document.getElementById("blockedCount").innerText =
users.filter(u => u.blocked).length;

       usersGrid.innerHTML += `
<div class="card">

    <h2>${user.name}</h2>

    <p>📧 ${user.email}</p>

    <p>👤 ${user.role}</p>


    <div class="buttons">

    <button onclick="viewUser('${user.id}')">
    👁 View
</button>

        <button onclick="editUser('${user.id}')">
            ✏ Edit
        </button>

        <button onclick="toggleBlock('${user.id}', ${user.blocked})">
    ${user.blocked ? "✅ Unblock" : "🚫 Block"}
</button>

        <button onclick="deleteUser('${user.id}')">
            🗑 Delete
        </button>

    </div>

</div>
`;

    });

}

loadUsers();

async function deleteUser(id){

    if(!confirm("Delete this user?")) return;

    const response = await fetch(
        `https://hyperlocal-backend-84rs.onrender.com/users/${id}`,
        {
            method:"DELETE"
        }
    );

    const data = await response.json();

    alert(data.message);

    loadUsers();

}

async function editUser(id){

    const newName = prompt("Enter New Name");

    if(!newName) return;

    const response = await fetch(
        `https://hyperlocal-backend-84rs.onrender.com/users/${id}`,
        {
            method:"PUT",
            headers:{
                "Content-Type":"application/json"
            },
            body:JSON.stringify({
                name:newName
            })
        }
    );

    const data = await response.json();

    alert(data.message);

    loadUsers();

}

async function toggleBlock(id, blocked){

    const response = await fetch(
        `https://hyperlocal-backend-84rs.onrender.com/users/${id}/block`,
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                blocked: !blocked
            })
        }
    );

    const data = await response.json();

    alert(data.message);

    loadUsers();

}

async function viewUser(id){

    const response = await fetch(
        `https://hyperlocal-backend-84rs.onrender.com/users/${id}`
    );

    const user = await response.json();

    document.getElementById("userDetails").innerHTML = `
        <h2>${user.name}</h2>
        <p>📧 ${user.email}</p>
        <p>👤 ${user.role}</p>
        <p>🚫 Blocked: ${user.blocked ? "Yes" : "No"}</p>
    `;

    document.getElementById("userModal").style.display = "block";
}

function closeModal(){
    document.getElementById("userModal").style.display = "none";
}