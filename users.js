const usersGrid = document.getElementById("usersGrid");

async function loadUsers() {

    const response = await fetch("https://hyperlocal-backend-84rs.onrender.com/users");

    const users = await response.json();

    usersGrid.innerHTML = "";

    if(users.length === 0){
        usersGrid.innerHTML = "<div class='card'><h2>No Users Found</h2></div>";
        return;
    }

    users.forEach(user=>{

       usersGrid.innerHTML += `
<div class="card">

    <h2>${user.name}</h2>

    <p>📧 ${user.email}</p>

    <p>👤 ${user.role}</p>

    <div class="buttons">

        <button onclick="editUser('${user.id}')">
            ✏ Edit
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