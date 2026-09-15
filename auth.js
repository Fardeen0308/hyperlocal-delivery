const user = JSON.parse(localStorage.getItem("user"));

if (!user) {
    window.location.href = "login.html";
}

function requireRole(role) {

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    // Support one role or multiple roles
    const allowedRoles =
        Array.isArray(role) ? role : [role];

    if (!allowedRoles.includes(user.role)) {

        alert("Access Denied");

        if (user.role === "customer") {

            window.location.href = "index.html";

        }

        else if (user.role === "admin") {

            window.location.href = "admin-dashboard.html";

        }

        else if (user.role === "delivery") {

            window.location.href = "delivery-dashboard.html";

        }

        else if (user.role === "store_owner") {

            window.location.href = "dashboard.html";

        }

    }

}