require("dotenv").config();
const bcrypt = require("bcrypt");
const razorpay = require("./razorpay");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const fs = require("fs");

const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(cors());
app.use(express.json());

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const upload = multer({
    dest: "uploads/"
});

async function sendNotification(email, title, message) {

    const { data, error } = await supabase
        .from("notifications")
        .insert([{
            email,
            title,
            message,
            isRead: false
        }]);

    console.log("Notification Data:", data);
    console.log("Notification Error:", error);

}



app.get("/", (req, res) => {
    res.send("HyperLocal Backend Running with Supabase 🚀");
});

app.post("/products", async (req, res) => {
    try {

        const { data, error } = await supabase
            .from("products")
            .insert([
                {
                    name: req.body.name,
                    price: req.body.price,
                    image: req.body.image,
                    category: req.body.category,
                    stock: req.body.stock || 10,
                    sold: 0
                }
            ])
            .select();

            console.log("Supabase Data:", data);
console.log("Supabase Error:", error);

        if (error) throw error;

       res.json({
    message: "Product Added Successfully",
    product: data
});

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error.message
        });

    }
});

app.get("/products", async (req, res) => {

    const { data, error } = await supabase
        .from("products")
        .select("*");

    if (error) {

        return res.status(500).json(error);

    }

    res.json(data);

});

app.delete("/products/:id", async (req, res) => {

    const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", req.params.id);

    if (error) {
        return res.status(500).json({
            message: error.message
        });
    }

    res.json({
        message: "Product Deleted Successfully"
    });

});

app.put("/products/:id", async (req, res) => {

    const { error } = await supabase
        .from("products")
        .update({
            name: req.body.name,
            price: req.body.price,
            category: req.body.category,
            stock: req.body.stock
        })
        .eq("id", req.params.id);

    if (error) {
        return res.status(500).json({
            message: error.message
        });
    }

    res.json({
        message: "Product Updated Successfully"
    });

});

app.post("/upload", upload.single("image"), async (req, res) => {

    try {

        const result = await cloudinary.uploader.upload(req.file.path);

        fs.unlinkSync(req.file.path);

        res.json({
            message: "Image Uploaded",
            imageUrl: result.secure_url
        });

    } catch (error) {

        res.status(500).json({
            message: "Upload Failed",
            error: error.message
        });

    }

});

app.post("/create-order", async (req, res) => {

    try {

        const options = {
            amount: req.body.amount * 100, // Amount in paise
            currency: "INR",
            receipt: "receipt_" + Date.now()
        };

        const order = await razorpay.orders.create(options);

        res.json(order);

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

});

app.get("/bestsellers", async (req, res) => {
    const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("sold", { ascending: false })
        .limit(5);

    if (error) {
        return res.status(500).json(error);
    }

    res.json(data);
});

app.post("/products/:id/review", async (req, res) => {

    const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", req.params.id)
        .single();

    if (error || !data) {
        return res.status(404).json({
            message: "Product not found"
        });
    }

    let reviews = data.reviews || [];

    reviews.push({
        user: req.body.user,
        rating: Number(req.body.rating),
        comment: req.body.comment,
        date: new Date()
    });

    const { error: updateError } = await supabase
        .from("products")
        .update({ reviews })
        .eq("id", req.params.id);

    if (updateError) {
        return res.status(500).json(updateError);
    }

    res.json({
        message: "Review Added Successfully"
    });

});

app.get("/related/:category", async (req, res) => {

    const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("category", req.params.category);

    if (error) {
        return res.status(500).json(error);
    }

    res.json(data);

});

app.post("/signup", async (req, res) => {

    const { name, email, password } = req.body;

        const hashedPassword = await 
        bcrypt.hash(password, 10);

         const { data, error } = await supabase
        .from("users")

.insert([
{
    name,
    email,
    password: hashedPassword,
    role: "customer"
}
])
        .select();

    if (error) {
        return res.status(500).json({
            message: error.message
        });
    }

    res.json({
        message: "Signup Successful",
        user: data[0]
    });

});

app.post("/login", async (req, res) => {

    const { email, password } = req.body;

    // Check users table
    const { data: user } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

    if (user) {

        const match = await bcrypt.compare(password, user.password);

        if (match) {
            return res.json({
                message: "Login Successful",
                user
            });
        }
    }

    // Check deliveryPartners table
    const { data: partner } = await supabase
        .from("deliveryPartners")
        .select("*")
        .eq("email", email)
        .single();

    if (partner) {

        const match = await bcrypt.compare(password, partner.password);

        if (match) {
            return res.json({
                message: "Login Successful",
                user: {
                    ...partner,
                    role: "delivery"
                }
            });
        }
    }

    return res.status(401).json({
        message: "Invalid Email or Password"
    });

});
app.post("/orders", async (req, res) => {

    const deliveryOtp =
Math.floor(1000 + Math.random() * 9000).toString();

    const { data, error } = await supabase
        .from("orders")
        .insert([{
            customerName: req.body.customerName,
            email: req.body.email,
            phone: req.body.phone,
            address: req.body.address,
            products: req.body.products,
            subtotal: req.body.subtotal,
delivery: req.body.delivery,
gst: req.body.gst,
discount: req.body.discount,
grandTotal: req.body.grandTotal,
            payment: req.body.payment,
            status: req.body.status,
            deliveryOtp: deliveryOtp
        }])
        .select();

    if (error) {
        return res.status(500).json({
            message: error.message
        });
    }
   console.log("Before sendNotification");

await sendNotification(
    req.body.email,
    "📦 Order Confirmed",
    "Your order has been placed successfully."
);

console.log("After sendNotification");

    res.json({
        message: "Order Placed Successfully",
        order: data
    });

});

app.get("/myorders/:email", async (req, res) => {

    const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("email", req.params.email);

    if (error) {
        return res.status(500).json({
            message: error.message
        });
    }

    res.json(data);

});

app.delete("/orders/:id", async (req, res) => {

    const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", req.params.id);

    if (error) {
        return res.status(500).json({
            message: error.message
        });
    }

    res.json({
        message: "Order Cancelled Successfully"
    });

});

app.get("/orders", async (req, res) => {

    const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("id", { ascending: false });

    if (error) {
        return res.status(500).json({
            message: error.message
        });
    }

    res.json(data);

});

app.put("/orders/:id", async (req, res) => {

    // First, get the order
    const { data: order, error: fetchError } = await supabase
        .from("orders")
        .select("deliveryPartnerEmail")
        .eq("id", req.params.id)
        .single();

    if (fetchError) {
        return res.status(500).json({
            message: fetchError.message
        });
    }

    // Update the order status
    const { error } = await supabase
        .from("orders")
        .update({
            status: req.body.status
        })
        .eq("id", req.params.id);

    if (error) {
        return res.status(500).json({
            message: error.message
        });
    }

    // If delivered, make the partner available again
    if (req.body.status === "Delivered" && order.deliveryPartnerEmail) {

        await supabase
            .from("deliveryPartners")
            .update({
                status: "Available"
            })
            .eq("email", order.deliveryPartnerEmail);

    }

    res.json({
        message: "Order Updated Successfully"
    });

});
app.post("/delivery-partners", async (req, res) => {

    const { data, error } = await supabase
        .from("deliveryPartners")
        .insert([{
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone,
            vehicle: req.body.vehicle,
            rating: 5,
            status: "Available"
        }])
        .select();

    if (error) {
        return res.status(500).json({
            message: error.message
        });
    }

    res.json({
        message: "Delivery Partner Added Successfully",
        partner: data
    });

});

app.get("/delivery-partners", async (req, res) => {

    const { data, error } = await supabase
        .from("deliveryPartners")
        .select("*");

    if (error) {
        return res.status(500).json({
            message: error.message
        });
    }

    res.json(data);

});

app.put("/assign-delivery/:id", async (req, res) => {

    const { error } = await supabase
        .from("orders")
        .update({
            deliveryPartnerId: req.body.id,
            deliveryPartnerName: req.body.name,
            deliveryPartnerEmail: req.body.email,
            status: "Out for Delivery"
        })
        .eq("id", req.params.id);
        await supabase
    .from("deliveryPartners")
    .update({
        status:"Busy"
    })
    .eq("email", req.body.email);

    if (error) {
        return res.status(500).json({
            message: error.message
        });
    }
await sendNotification(
    req.body.email,
    "🛵 New Delivery",
    "A new order has been assigned to you."
);
    res.json({
        message: "Delivery Partner Assigned Successfully"
    });

});

app.put("/delivery-partners/status", async (req,res)=>{

    const { email, status } = req.body;

    const { error } = await supabase
        .from("deliveryPartners")
        .update({ status })
        .eq("email", email);

    if(error){
        return res.status(500).json({
            message:error.message
        });
    }

    res.json({
        message:"Status Updated"
    });

});

app.post("/location", async (req, res) => {

    const { email, lat, lng } = req.body;

    const { error } = await supabase
        .from("locations")
        .upsert({
            email,
            lat,
            lng
        }, {
            onConflict: "email"
        });

    if (error) {
        return res.status(500).json({
            message: error.message
        });
    }

    res.json({
        message: "Location Updated"
    });

});

app.get("/location/:email", async (req, res) => {

    const { data, error } = await supabase
        .from("locations")
        .select("*")
        .eq("email", req.params.email)
        .single();

    if (error) {
        return res.status(404).json({
            message: "Location not found"
        });
    }

    res.json(data);

});

app.post("/verify-otp/:id", async (req, res) => {

    // Get the order
    const { data: order, error: fetchError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", req.params.id)
        .single();

    if (fetchError) {
        return res.status(500).json({
            success: false,
            message: fetchError.message
        });
    }

    // Check OTP
    if (order.deliveryOtp !== req.body.otp) {
        return res.json({
            success: false,
            message: "❌ Invalid OTP"
        });
    }

    // Mark order as delivered
    const { error } = await supabase
        .from("orders")
        .update({
            status: "Delivered"
        })
        .eq("id", req.params.id);

    if (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }

    // Make delivery partner available again
    if (order.deliveryPartnerEmail) {

        await supabase
            .from("deliveryPartners")
            .update({
                status: "Available"
            })
            .eq("email", order.deliveryPartnerEmail);

    }
    await sendNotification(
    order.email,
    "✅ Order Delivered",
    "Your order has been delivered successfully."
);

    res.json({
        success: true,
        message: "✅ Delivery Completed Successfully"
    });

});

app.get("/notifications/:email", async (req, res) => {

    const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("email", req.params.email)
        .order("created_at", { ascending: false });

    if (error) {
        return res.status(500).json({
            message: error.message
        });
    }

    res.json(data);

});

app.put("/notifications/read/:email", async (req, res) => {

    const { error } = await supabase
        .from("notifications")
        .update({
            isRead: true
        })
        .eq("email", req.params.email);

    if (error) {
        return res.status(500).json({
            message: error.message
        });
    }

    res.json({
        message: "Notifications marked as read"
    });

});

app.post("/rate-delivery/:id", async (req, res) => {

    const { data: order, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", req.params.id)
        .single();

    if (error) {
        return res.status(500).json({
            message: error.message
        });
    }

    if (order.isRated) {
        return res.json({
            message: "You have already rated this delivery."
        });
    }

    const { data: partner } = await supabase
        .from("deliveryPartners")
        .select("rating")
        .eq("email", order.deliveryPartnerEmail)
        .single();

    const newRating =
        (Number(partner.rating) + Number(req.body.rating)) / 2;

    await supabase
        .from("deliveryPartners")
        .update({
            rating: newRating
        })
        .eq("email", order.deliveryPartnerEmail);

    await supabase
        .from("orders")
        .update({
            isRated: true
        })
        .eq("id", req.params.id);

    res.json({
        message: "⭐ Thank you for your rating!"
    });

});

app.get("/admin-analytics", async (req, res) => {

    const { data: orders } = await supabase
        .from("orders")
        .select("*");

    const { data: customers } = await supabase
        .from("users")
        .select("id");

    const { data: partners } = await supabase
        .from("deliveryPartners")
        .select("id");

    let revenue = 0;
    const productSales = {};

    orders.forEach(order => {

        revenue += Number(order.grandTotal || 0);

        if(order.products){

            order.products.forEach(product => {

                if(productSales[product.name]){
                    productSales[product.name]++;
                }else{
                    productSales[product.name]=1;
                }

            });

        }

    });

    const bestSellingProducts =
        Object.entries(productSales)
        .sort((a,b)=>b[1]-a[1]);

        let pending = 0;
let preparing = 0;
let outForDelivery = 0;
let delivered = 0;

orders.forEach(order => {

    if(order.status=="Pending") pending++;

    if(order.status=="Preparing") preparing++;

    if(order.status=="Out for Delivery") outForDelivery++;

    if(order.status=="Delivered") delivered++;

});

    res.json({
        totalOrders: orders.length,
        totalRevenue: revenue,
        totalCustomers: customers.length,
        totalDeliveryPartners: partners.length,
        bestSellingProducts,
        pending,
        preparing,
        outForDelivery,
        delivered
    });

});
app.get("/delivery-earnings/:email", async (req, res) => {

    const { data: orders, error } = await supabase
        .from("orders")
        .select("*")
        .eq("deliveryPartnerEmail", req.params.email)
        .eq("status", "Delivered");

    if (error) {
        return res.status(500).json({
            message: error.message
        });
    }

    let totalEarnings = 0;
    let totalDeliveries = 0;
    let todayEarnings = 0;
    let monthEarnings = 0;

    const today = new Date();
    const todayDate = today.toISOString().split("T")[0];
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    orders.forEach(order => {

        const earning = Number(order.earning || 0);

        totalEarnings += earning;
        totalDeliveries++;

        if (order.created_at) {

            const orderDate = new Date(order.created_at);

            if (order.created_at.startsWith(todayDate)) {
                todayEarnings += earning;
            }

            if (
                orderDate.getMonth() === currentMonth &&
                orderDate.getFullYear() === currentYear
            ) {
                monthEarnings += earning;
            }
        }

    });

    res.json({
        totalEarnings,
        totalDeliveries,
        todayEarnings,
        monthEarnings
    });

});

app.listen(5000, () => {
    console.log("Server running on port 5000");
});