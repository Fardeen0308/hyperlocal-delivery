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

        </div>
        `;

    });

}

loadUsers();