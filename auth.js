function signup() {

    let user = {
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        password: document.getElementById("password").value
    };

    localStorage.setItem(
        user.email,
        JSON.stringify(user)
    );

    alert("Signup Successful");

    window.location.href = "login.html";
}

function login() {

    let email =
    document.getElementById("email").value;

    let password =
    document.getElementById("password").value;

    let user =
    JSON.parse(localStorage.getItem(email));

    if(user && user.password === password){

        alert("Login Successful");

        window.location.href = "f.html";

    } else {

        alert("Invalid Credentials");
    }
}