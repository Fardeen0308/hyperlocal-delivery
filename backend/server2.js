require("dotenv").config();
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

    const { data, error } = await supabase
        .from("users")
        .insert([
            {
                name,
                email,
                password,
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

    const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .eq("password", password)
        .single();

    if (error || !data) {
        return res.status(401).json({
            message: "Invalid Email or Password"
        });
    }

    res.json({
        message: "Login Successful",
        user: data
    });

});

app.post("/orders", async (req, res) => {

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
            status: req.body.status
        }])
        .select();

    if (error) {
        return res.status(500).json({
            message: error.message
        });
    }

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
app.listen(5000, () => {
    console.log("Server running on port 5000");
});