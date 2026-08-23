const existingUser = localStorage.getItem("user");
const existingToken = localStorage.getItem("token");

if (
    existingUser &&
    existingUser !== "undefined" &&
    existingUser !== "null" &&
    existingToken &&
    existingToken !== "undefined" &&
    existingToken !== "null"
) {

    const user = JSON.parse(existingUser);

    if (user.role === "customer") {
        window.location.replace("index.html");
    }

    else if (user.role === "delivery") {
        window.location.replace("delivery-dashboard.html");
    }

    else if (user.role === "admin") {
        window.location.replace("admin-dashboard.html");
    }
}
async function login() {

    const email =
    document.getElementById("email").value;

    const password =
    document.getElementById("password").value;

    const response = await fetch(
        "https://hyperlocal-backend-84rs.onrender.com/login",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                password
            })
        }
    );

    const data = await response.json();

   console.log("LOGIN RESPONSE:", data);
alert(JSON.stringify(data));

    if (response.ok) {

        localStorage.setItem(
            "user",
            JSON.stringify(data.user)
        );

        localStorage.setItem(
        "token",
        data.token
    );

        alert("Login Successful");

       if(data.user.role === "customer"){

    window.location.href = "index.html";

}
else if(data.user.role === "delivery"){

    window.location.href = "delivery-dashboard.html";

}
else if(data.user.role === "admin"){

    window.location.href = "admin-dashboard.html";

}
else{

    window.location.href = "index.html";
}
    } else {

        alert(data.message);

    }

}

function togglePassword() {

    const password =
    document.getElementById("password");

    if (password.type === "password") {
        password.type = "text";
    } else {
        password.type = "password";
    }

}