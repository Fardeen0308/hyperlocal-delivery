require("dotenv").config();
const sendNotification = require("./notificationService");
const bcrypt = require("bcrypt");
const razorpay = require("./razorpay");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const fs = require("fs");

const express = require("express");
const jwt = require("jsonwebtoken");
const { authenticateToken, requireRole } = require("./authMiddleware");
const JWT_SECRET = process.env.JWT_SECRET;
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


app.get("/", (req, res) => {
    res.send("HyperLocal Backend Running with Supabase 🚀");
});

app.post(
    "/products",
    authenticateToken,
    requireRole("admin"),
    async (req, res) => {
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

console.log("Hash created:", hashedPassword);

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
        message: "Signup Successful"
        
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
    const { password, ...safeUser } = user;

    const token = jwt.sign(
        {
            id: user.id,
            role: user.role,
            email: user.email
        },
        JWT_SECRET,
        { expiresIn: "7d" }
    );

    return res.json({
        message: "Login Successful",
        token,
        user: safeUser
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
    const { password, ...safePartner } = partner;

    return res.json({
        message: "Login Successful",
        user: {
            ...safePartner,
            role: "delivery"
        }
    });
}
    }
console.log("Login Email:", email);
    // Check admins table
const { data: admin } = await supabase
    .from("admins")
    .select("*")
    .eq("email", email)
    .single();

if (admin) {

    // Temporary plain-text password check
    if (password === admin.password) {

        const { password, ...safeAdmin } = admin;

return res.json({
    message: "Login Successful",
    user: {
        ...safeAdmin,
        role: "admin"
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

    for (const product of req.body.products) {

    const { data: dbProduct } = await supabase
        .from("products")
        .select("stock, sold")
        .eq("id", product.id)
        .single();

    if (dbProduct) {

        await supabase
            .from("products")
            .update({
                stock: Number(dbProduct.stock) - Number(product.quantity || 1),
                sold: Number(dbProduct.sold || 0) + Number(product.quantity || 1)
            })
            .eq("id", product.id);

    }

}
   

const { data: user } = await supabase
    .from("users")
    .select("fcmToken")
    .eq("email", req.body.email)
    .single();

if (user && user.fcmToken) {
    await sendNotification(
        user.fcmToken,
        "📦 Order Confirmed",
        "Your order has been placed successfully."
    );
}


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

    // Get the order details
    const { data: deliveredOrder } = await supabase
        .from("orders")
        .select("earning")
        .eq("id", req.params.id)
        .single();

    // Get current delivery partner stats
    const { data: partner } = await supabase
        .from("deliveryPartners")
        .select("totalDeliveries,totalEarnings")
        .eq("email", order.deliveryPartnerEmail)
        .single();

    await supabase
        .from("deliveryPartners")
        .update({
            status: "Available",
            totalDeliveries: (partner.totalDeliveries || 0) + 1,
            totalEarnings:
                (partner.totalEarnings || 0) +
                (deliveredOrder.earning || 0)
        })
        .eq("email", order.deliveryPartnerEmail);

}
    res.json({
        message: "Order Updated Successfully"
    });

});
app.post("/delivery-partners", async (req, res) => {

    try {

        const {
            name,
            email,
            phone,
            password
        } = req.body;

        if (!name || !email || !phone || !password) {
            return res.status(400).json({
                message: "Please fill all required fields"
            });
        }

        // Hash delivery partner password
        const hashedPassword =
            await bcrypt.hash(password, 10);

        const { data, error } = await supabase
            .from("deliveryPartners")
            .insert([{
                name: name,
                email: email,
                phone: phone,
                password: hashedPassword,
                rating: 5,
                status: "Available",
                totalDeliveries: 0,
                totalEarnings: 0
            }])
            .select();

        if (error) {

            return res.status(500).json({
                message: error.message
            });

        }

        res.json({
            message: "Delivery Partner Added Successfully",
            partner: data[0]
        });

    } catch (error) {

        console.error("Add delivery partner error:", error);

        res.status(500).json({
            message: error.message
        });

    }

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

app.delete("/delivery-partners/:id", async (req, res) => {

    const { id } = req.params;

    const { error } = await supabase
        .from("deliveryPartners")
        .delete()
        .eq("id", id);

    if (error) {
        return res.status(500).json({
            message: error.message
        });
    }

    res.json({
        message: "Delivery Partner Deleted Successfully"
    });

});

app.put("/assign-delivery/:id", async (req, res) => {

    try {

        // 1. Get delivery partner
        const { data: partner, error: partnerError } = await supabase
            .from("deliveryPartners")
            .select("*")
            .eq("email", req.body.email)
            .single();

        if (partnerError || !partner) {
            return res.status(404).json({
                message: "Delivery Partner not found"
            });
        }

        // 2. Update order
        const { error: orderError } = await supabase
            .from("orders")
            .update({
                deliveryPartnerId: partner.id,
                deliveryPartnerName: partner.name,
                deliveryPartnerEmail: partner.email,
                status: "Out for Delivery"
            })
            .eq("id", req.params.id);

        if (orderError) {
            return res.status(500).json({
                message: orderError.message
            });
        }

        // 3. Make partner Busy
        const { error: busyError } = await supabase
            .from("deliveryPartners")
            .update({
                status: "Busy"
            })
            .eq("id", partner.id);

        if (busyError) {
            console.log("Partner status error:", busyError.message);
        }

        // 4. Send notification if FCM token exists
        if (partner.fcmToken) {

            await sendNotification(
                partner.fcmToken,
                "🛵 New Delivery",
                "A new order has been assigned to you."
            );

        }

        res.json({
            message: "Delivery Partner Assigned Successfully"
        });

    } catch (error) {

        console.error("Assign delivery error:", error);

        res.status(500).json({
            message: error.message
        });

    }

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

    try {

        // 1. Get order
        const { data: order, error: fetchError } = await supabase
            .from("orders")
            .select("*")
            .eq("id", req.params.id)
            .single();

        if (fetchError || !order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        // 2. Check OTP
        if (order.deliveryOtp !== req.body.otp) {
            return res.json({
                success: false,
                message: "❌ Invalid OTP"
            });
        }

        // 3. Prevent completing the same order twice
        if (order.status === "Delivered") {
            return res.json({
                success: false,
                message: "This order is already delivered."
            });
        }

        // 4. Make sure partner is assigned
        if (!order.deliveryPartnerEmail) {
            return res.json({
                success: false,
                message: "No delivery partner assigned."
            });
        }

        // 5. Get delivery partner
        const { data: partner, error: partnerError } =
            await supabase
                .from("deliveryPartners")
                .select("*")
                .eq("email", order.deliveryPartnerEmail)
                .single();

        if (partnerError || !partner) {
            return res.status(404).json({
                success: false,
                message: "Delivery partner not found."
            });
        }

        // 6. Mark order as Delivered
        const { error: orderError } = await supabase
            .from("orders")
            .update({
                status: "Delivered"
            })
            .eq("id", req.params.id);

        if (orderError) {
            return res.status(500).json({
                success: false,
                message: orderError.message
            });
        }

        // 7. Get existing earning from order
        const earning = Number(order.earning || 0);

        // 8. Update delivery partner statistics
        const totalDeliveries =
            Number(partner.totalDeliveries || 0) + 1;

        const totalEarnings =
            Number(partner.totalEarnings || 0) + earning;

        const { error: partnerUpdateError } =
            await supabase
                .from("deliveryPartners")
                .update({
                    status: "Available",
                    totalDeliveries: totalDeliveries,
                    totalEarnings: totalEarnings
                })
                .eq("email", order.deliveryPartnerEmail);

        if (partnerUpdateError) {
            console.log(
                "Partner update error:",
                partnerUpdateError.message
            );
        }

        // 9. Notify customer
        console.log(
            "Order delivered:",
            order.id
        );

        // 10. Success
        res.json({
            success: true,
            message: "✅ Delivery Completed Successfully"
        });

    } catch (error) {

        console.error(
            "Verify OTP error:",
            error
        );

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

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

app.get(
    "/admin-analytics",
    authenticateToken,
    requireRole("admin"),
    async (req, res) => {

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

app.post("/save-fcm-token", async (req, res) => {

    const { email, role, token } = req.body;

    let table = role === "delivery"
        ? "deliveryPartners"
        : "users";

    const { error } = await supabase
        .from(table)
        .update({
            fcmToken: token
        })
        .eq("email", email);

    if (error) {
        return res.status(500).json({
            message: error.message
        });
    }

    res.json({
        message: "FCM Token Saved"
    });

});

app.post("/coupons", async (req, res) => {

    const { code, discount, type, minOrder, expiry } = req.body;

    const { data, error } = await supabase
        .from("coupons")
        .insert([{
            code,
            discount,
            type,
            minOrder,
            expiry,
            active: true
        }])
        .select();

    if (error) {
        return res.status(500).json({
            message: error.message
        });
    }

    res.json({
        message: "Coupon Added Successfully",
        coupon: data
    });

});

app.get("/coupons", async (req, res) => {

    const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("id", { ascending: false });

    if (error) {
        return res.status(500).json({
            message: error.message
        });
    }

    res.json(data);

});

app.delete("/coupons/:id", async (req, res) => {

    const { error } = await supabase
        .from("coupons")
        .delete()
        .eq("id", req.params.id);

    if (error) {
        return res.status(500).json({
            message: error.message
        });
    }

    res.json({
        message: "Coupon Deleted Successfully"
    });

});

app.post("/validate-coupon", async (req, res) => {

    const { code, amount } = req.body;

    const { data: coupon, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", code)
        .eq("active", true)
        .single();

    if (error || !coupon) {
        return res.json({
            success: false,
            message: "Invalid Coupon"
        });
    }

    if (new Date(coupon.expiry) < new Date()) {
        return res.json({
            success: false,
            message: "Coupon Expired"
        });
    }

    if (Number(amount) < Number(coupon.minOrder)) {
        return res.json({
            success: false,
            message: `Minimum order ₹${coupon.minOrder}`
        });
    }

    let discountAmount = 0;

    if (coupon.type === "flat") {
        discountAmount = Number(coupon.discount);
    } else {
        discountAmount =
            Number(amount) * Number(coupon.discount) / 100;
    }

    res.json({
        success: true,
        discount: discountAmount
    });

});

app.get("/admin-analytics", async (req, res) => {

    const { data: orders } = await supabase
        .from("orders")
        .select("*");

    const { data: partners } = await supabase
        .from("deliveryPartners")
        .select("*");

    const { data: users } = await supabase
        .from("users")
        .select("*");

    let totalRevenue = 0;

    let pending = 0;
    let preparing = 0;
    let outForDelivery = 0;
    let delivered = 0;

    let productCount = {};

    orders.forEach(order => {

        totalRevenue += Number(order.grandTotal || 0);

        if(order.status === "Pending") pending++;

        if(order.status === "Preparing") preparing++;

        if(order.status === "Out for Delivery") outForDelivery++;

        if(order.status === "Delivered") delivered++;

        if(order.items){

            order.items.forEach(item=>{

                productCount[item.name] =
                (productCount[item.name] || 0)+1;

            });

        }

    });

    const bestSellingProducts =
    Object.entries(productCount)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,5);

    res.json({

        totalOrders: orders.length,

        totalRevenue,

        totalCustomers:
        users.filter(u=>u.role==="customer").length,

        totalDeliveryPartners:
        partners.length,

        pending,

        preparing,

        outForDelivery,

        delivered,

        bestSellingProducts

    });

});

app.get("/users", async (req, res) => {

    const { data, error } = await supabase
        .from("users")
        .select("*");

    if (error) {
        return res.status(500).json({
            message: error.message
        });
    }

    res.json(data);

});

app.delete("/users/:id", async (req,res)=>{

    const {id}=req.params;

    const {error}=await supabase
    .from("users")
    .delete()
    .eq("id",id);

    if(error){
        return res.status(500).json({
            message:error.message
        });
    }

    res.json({
        message:"User Deleted Successfully"
    });

});

app.put("/users/:id/block", async (req, res) => {

    const { id } = req.params;
    const { blocked } = req.body;

    const { error } = await supabase
        .from("users")
        .update({ blocked })
        .eq("id", id);

    if (error) {
        return res.status(500).json({
            message: error.message
        });
    }

    res.json({
        message: blocked ? "User Blocked" : "User Unblocked"
    });

});

app.get("/users/:id", async (req, res) => {

    const { id } = req.params;

    const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
        return res.status(500).json({
            message: error.message
        });
    }

    res.json(data);

});

app.get("/settings", async (req, res) => {

    const { data, error } = await supabase
        .from("settings")
        .select("*")
        .limit(1)
        .single();

    if (error) {
        return res.status(500).json({
            message: error.message
        });
    }

    res.json(data);

});

app.put("/settings", async (req, res) => {

    const {
        websiteName,
        supportEmail,
        supportPhone,
        announcement
    } = req.body;

    const { error } = await supabase
        .from("settings")
        .update({
            websiteName,
            supportEmail,
            supportPhone,
            announcement
        })
        .eq("id", 1);

    if (error) {
        return res.status(500).json({
            message: error.message
        });
    }

    res.json({
        message: "Website Settings Updated Successfully"
    });

});

app.put("/users/:id", async (req, res) => {

    try {

        const { id } = req.params;

        const {
            name,
            phone,
            address
        } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                message: "Name is required"
            });
        }

        const { data, error } = await supabase
            .from("users")
            .update({
                name: name.trim(),
                phone: phone ? phone.trim() : null,
                address: address ? address.trim() : null
            })
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error("Profile update error:", error);

            return res.status(500).json({
                message: error.message
            });
        }

        res.json({
            success: true,
            message: "Profile updated successfully",
            user: data
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Server error"
        });

    }

});
app.listen(5000, () => {
    console.log("Server running on port 5000");
});