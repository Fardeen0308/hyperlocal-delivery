require("dotenv").config();
const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const fs = require("fs");
const { error } = require("console");

const app = express();

app.use(cors());
app.use(express.json());
const productSchema = new mongoose.Schema({
    name: String,
    price: String,
    image: String,
    category: String,
    stock: {
    type: Number,
    default: 10
},
reviews: [
{
    user: String,
    rating: Number,
    comment: String,
    date: {
        type: Date,
        default: Date.now
    }
   
}
],
sold: {
    type: Number,
    default: 0
},
});




const Product = mongoose.model(
    "Product",
    productSchema
);
console.log("Supabase Connected ✅");

const orderSchema = new mongoose.Schema({
    customerName: String,
    email: String,
    phone: String,
    address: String,
    products: Array,
    total: Number,
    payment: String,
    status: {
        type: String,
        default: "Pending"
    },
    deliveryBoy: {
    name: String,
    email: String,
    phone: String,
    vehicle: String,
    rating: Number
}

});

const Order = mongoose.model("Order", orderSchema);

const chatSchema = new mongoose.Schema({
    sender: String,
    receiver: String,
    message: String,
    time: {
        type: Date,
        default: Date.now
    }
});

const Chat = mongoose.model("Chat", chatSchema);

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    role: {
        type: String,
        default: "customer"
    }
});

const User = mongoose.model("User", userSchema);

const upload = multer({
    dest: "uploads/"
});



// Home Route
app.get("/", (req, res) => {
    res.send("HyperLocal Delivery Backend Running");
});

// Cloudinary Test
app.get("/cloudinary-test", async (req, res) => {
  try {
    const result = await cloudinary.api.ping();
    res.json({
      message: "Cloudinary Working",
      result
    });
  } catch (error) {
    res.status(500).json({
      message: "Cloudinary NOT working",
      error: error.message
    });
  }
});
   
// Get Products

app.get("/products", async (req, res) => {

    const products =
    await  Product.find();

    res.json(products);

});

// Add Product
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

        if (error) throw error;

        res.json({
            message: "Product Added Successfully",
            product: data
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }
});


// Delete Product
app.delete("/products/:id", async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);

    res.json({ message: "Product Deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload Image
app.post(
    "/upload",
    upload.single("image"),
    async (req, res) => {

        try {

            const result =
            await cloudinary.uploader.upload(
                req.file.path
            );

            fs.unlinkSync(req.file.path);
console.log(result);
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

    }
);

app.post("/orders", async (req, res) => {

    try {

        const order = new Order({
            customerName: req.body.customerName,
            email: req.body.email,
            phone: req.body.phone,
            address: req.body.address,
            products: req.body.products,
            total: req.body.total,
            payment: req.body.payment,
        });

        await order.save();
        console.log(req.body.products);

       for (const item of req.body.products) {

   const product = await Product.findById(item._id);

if (product && product.stock >= (item.quantity || 1)) {

    product.stock -= (item.quantity || 1);

product.sold += (item.quantity || 1);

await product.save();

}

}

        res.json({
            message: "Order Placed Successfully",
            order
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

});
app.get("/orders", async (req, res) => {

    try {

        const orders = await Order.find();

        res.json(orders);

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

});

app.post("/signup", async (req, res) => {

    try {

        const user = new User({
            name: req.body.name,
            email: req.body.email,
            password: req.body.password,
role: req.body.role || "customer"
        });

        await user.save();

        res.json({
            message: "Signup Successful"
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

});
app.post("/login", async (req, res) => {

    const { email, password } = req.body;

    const user = await User.findOne({
        email: email.trim(),
        password: password.trim()
    });
 console.log(user);

    if (user) {
       
        res.json({
            message: "Login Successful",
            user: user
        });
    } else {
        res.status(401).json({
            message: "Invalid Credentials"
        });
    }

});


app.get("/users", async (req, res) => {
    const users = await User.find();
    res.json(users);
});

app.get("/myorders/:email", async (req, res) => {

    try {

        const orders = await Order.find({
            email: req.params.email
        });

        res.json(orders);

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

});

app.put("/orders/:id", async (req, res) => {

    try {

        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                message: "Order Not Found"
            });
        }
if (order.status === "Pending") {

    order.status = "Preparing";

} else if (order.status === "Preparing") {

    order.status = "Out for Delivery";

    order.deliveryBoy = {
        name: "Fardeen",
        email:"fardeenkandanoor81@gmail.com",
        phone: "8523042173",
        vehicle: "AP39AB1234",
        rating: 4.9
    };

} else if (order.status === "Out for Delivery") {

    order.status = "Delivered";

}

        await order.save();

        res.json({
            message: "Status Updated",
            order
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

});

app.delete("/orders/:id", async (req, res) => {

    try {

        await Order.findByIdAndDelete(req.params.id);

        res.json({
            message: "Order Deleted"
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

});

app.put("/products/:id", async (req, res) => {

    try {

        await Product.findByIdAndUpdate(
            req.params.id,
            {
                name: req.body.name,
                price: req.body.price,
                image: req.body.image,
                category: req.body.category,
                stock: req.body.stock
            }
        );

        res.json({
            message: "Product Updated Successfully"
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

});

app.post("/products/:id/review", async (req, res) => {

    try {

        const product = await Product.findById(req.params.id);

        product.reviews.push({
            user: req.body.user,
            rating: Number(req.body.rating),
            comment: req.body.comment
        });

        await product.save();

        res.json({
            message: "Review Added"
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

});

app.get("/bestsellers", async (req, res) => {

    const products = await Product.find()
        .sort({ sold: -1 })
        .limit(5);

    res.json(products);

});

app.get("/related/:category", async (req, res) => {

    const products = await Product.find({
        category: req.params.category
    }).limit(4);

    res.json(products);

});

let locations = {};
app.post("/location", (req,res)=>{

    locations[req.body.email]={
        lat:req.body.lat,
        lng:req.body.lng
    };

    res.json({
        message:"Location Updated"
    });

});

app.get("/location/:email",(req,res)=>{

    res.json(
        locations[req.params.email] || {}
    );

});

app.post("/chat", async (req, res) => {

    try {

        const chat = new Chat({
            sender: req.body.sender,
            receiver: req.body.receiver,
            message: req.body.message
        });

        await chat.save();

        res.json({
            message: "Message Sent"
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

});
app.get("/chat/:sender/:receiver", async (req, res) => {

    try {

        const chats = await Chat.find({

            $or: [

                {
                    sender: req.params.sender,
                    receiver: req.params.receiver
                },

                {
                    sender: req.params.receiver,
                    receiver: req.params.sender
                }

            ]

        }).sort({ time: 1 });

        res.json(chats);

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

});
app.listen(5000, () => {
    console.log(
        "Server running on port 5000"
    );
});

app.get("/test-db", async (req, res) => {
    try {
        const count = await Product.countDocuments();
        res.json({
            message: "Database Working",
            products: count
        });
    } catch (error) {
        res.json({
            error: error.message
        });
    }
});

app.get("/users", async (req,res)=>{

    const users = await User.find();

    res.json(users);

});