async function login() {

    const email =
    document.getElementById("email").value;

    const password =
    document.getElementById("password").value;

    const response = await fetch(
        "http://localhost:5000/login",
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

    console.log(data.user);

    if (response.ok) {

        localStorage.setItem(
            "user",
            JSON.stringify(data.user)
        );

        alert("Login Successful");

       if(data.user.role === "customer"){

    window.location.href = "f.html";

}
else if(data.user.role === "delivery"){

    window.location.href = "delivery-dashboard.html";

}
else{

    window.location.href = "dashboard.html";

}
    } else {

        alert(data.message);

    }

}