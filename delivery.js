const user = JSON.parse(localStorage.getItem("user"));

if (!user) {
    window.location.href = "login.html";
}

async function loadOrders(){

    const response = await fetch("https://hyperlocal-backend-84rs.onrender.com/orders");

    const orders = await response.json();

    const container = document.getElementById("orders");

    container.innerHTML = "";

    orders.forEach(order=>{

        const user = JSON.parse(localStorage.getItem("user"));

if(
    order.status === "Out for Delivery" &&
    order.deliveryBoy &&
    order.deliveryBoy.email === user.email
){
            container.innerHTML += `
            <div class="card">

            <h3>${order.customerName}</h3>

            <p>${order.address}</p>

            <p>₹${order.total}</p>

            

            <button onclick="deliver('${order._id}')">
            ✅ Delivered
            </button>

            <button onclick="openCustomerChat('${order.email}')">
💬 Chat Customer
</button>

            </div>
            `;
        }

    });

}

loadOrders();

async function deliver(id){

    const response = await fetch(
        "https://hyperlocal-backend-84rs.onrender.com/orders/" + id,
        {
            method:"PUT"
        }
    );

    const data = await response.json();

    alert(data.message);

    loadOrders();

}
function openCustomerChat(order){

    localStorage.setItem("chatWith", order.email);

    window.location.href = "chat.html";

}


  


function sendLocation(){

    if(navigator.geolocation){

        navigator.geolocation.getCurrentPosition(async(position)=>{

            const user =
            JSON.parse(localStorage.getItem("user"));

            await fetch(
                "https://hyperlocal-backend-84rs.onrender.com/location",
                {
                    method:"POST",
                    headers:{
                        "Content-Type":"application/json"
                    },
                    body:JSON.stringify({
                        email:user.email,
                        lat:position.coords.latitude,
                        lng:position.coords.longitude
                    })
                }
            );

        });

    }

}

setInterval(sendLocation,5000);

sendLocation();

async function loadStats(){

const response =
await fetch("https://hyperlocal-backend-84rs.onrender.com/orders");

const orders =
await response.json();

const user =
JSON.parse(localStorage.getItem("user"));

let completed = 0;
let earnings = 0;

orders.forEach(order=>{

if(
order.deliveryBoy &&
order.deliveryBoy.email===user.email &&
order.status==="Delivered"
){

completed++;

earnings += 50; // ₹50 per delivery

}

});

document.getElementById("completed").innerHTML =
completed;

document.getElementById("earnings").innerHTML =
"₹" + earnings;

}

loadStats();