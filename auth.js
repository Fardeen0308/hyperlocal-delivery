const user = JSON.parse(localStorage.getItem("user"));

if (!user) {
    window.location.href = "login.html";
}

const user = JSON.parse(localStorage.getItem("user"));

if (!user) {
    window.location.href = "login.html";
}

function requireRole(role){

    if(!user){
        window.location.href="login.html";
        return;
    }

    if(user.role !== role){

        alert("Access Denied");

        if(user.role==="customer"){
            window.location.href="index.html";
        }

        else if(user.role==="admin"){
            window.location.href="admin-dashboard.html";
        }

        else if(user.role==="delivery"){
            window.location.href="delivery-dashboard.html";
        }

    }

}


