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