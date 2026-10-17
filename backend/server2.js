require("dotenv").config();
const crypto = require("crypto");
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
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const upload = multer({
    dest: "uploads/",
    limits: {
        fileSize: 5 * 1024 * 1024 // Maximum 5 MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only JPG, PNG, and WebP images are allowed"));
        }
    }
});

app.get("/", (req, res) => {
    res.send("HyperLocal Backend Running with Supabase 🚀");
});

app.post(
    "/products",
    authenticateToken,
    requireRole("admin", "store_owner"),
    async (req, res) => {
        try {
            const name = String(req.body.name || "").trim();
            const image = String(req.body.image || "").trim();
            const category = String(req.body.category || "").trim();
            const price = Number(req.body.price);
            const stock =
                req.body.stock === undefined || req.body.stock === ""
                    ? 10
                    : Number(req.body.stock);

            if (!name || name.length > 150) {
                return res.status(400).json({
                    message: "Product name is required (maximum 150 characters)"
                });
            }

            if (!image || !image.startsWith("https://")) {
                return res.status(400).json({
                    message: "A valid HTTPS product image URL is required"
                });
            }

            if (!category || category.length > 100) {
                return res.status(400).json({
                    message: "Product category is required (maximum 100 characters)"
                });
            }

            if (!Number.isFinite(price) || price <= 0) {
                return res.status(400).json({
                    message: "Price must be greater than zero"
                });
            }

            if (!Number.isInteger(stock) || stock < 0) {
                return res.status(400).json({
                    message: "Stock must be a non-negative whole number"
                });
            }

            // Find the store belonging to the authenticated user
            const { data: store, error: storeError } = await supabase
                .from("stores")
                .select("id")
                .eq("owner_id", req.user.id)
                .maybeSingle();

            if (storeError) {
                console.error("Store lookup failed:", storeError.message);
                return res.status(500).json({
                    message: "Unable to find your store"
                });
            }

            if (!store) {
                return res.status(404).json({
                    message: "No store is assigned to this account"
                });
            }

            const { data, error } = await supabase
                .from("products")
                .insert([{
                    name,
                    price,
                    image,
                    category,
                    stock,
                    sold: 0,
                    store_id: store.id
                }])
                .select();

            if (error) {
                console.error("Product insert failed:", error.message);
                return res.status(500).json({
                    message: "Unable to add product"
                });
            }

            return res.status(201).json({
                message: "Product Added Successfully",
                product: data
            });

        } catch (error) {
            console.error("Add product error:", error.message);
            return res.status(500).json({
                message: "Server error while adding product"
            });
        }
    }
);

app.get("/products", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("products")
            .select(`
                id,
                name,
                price,
                image,
                category,
                stock,
                sold,
                reviews,
                store_id,
                stores (
                    store_name
                )
            `);

        if (error) {
            console.error("Products fetch failed:", error.message);

            return res.status(500).json({
                message: "Unable to load products"
            });
        }

        const products = (data || []).map(product => ({
            ...product,
            store_name: product.stores?.store_name || "Local Store"
        }));

        return res.json(products);

    } catch (error) {
        console.error("Products route error:", error.message);

        return res.status(500).json({
            message: "Server error while loading products"
        });
    }
});

app.delete(
    "/products/:id",
    authenticateToken,
    requireRole("admin", "store_owner"),
    async (req, res) => {
        try {
            // Find the store belonging to the logged-in account
            const { data: store, error: storeError } = await supabase
                .from("stores")
                .select("id")
                .eq("owner_id", req.user.id)
                .maybeSingle();

            if (storeError) {
                console.error("Store lookup failed:", storeError.message);
                return res.status(500).json({
                    message: "Unable to verify store ownership"
                });
            }

            if (!store) {
                return res.status(404).json({
                    message: "No store is assigned to this account"
                });
            }

            // Delete only a product belonging to this store
            const { data, error } = await supabase
                .from("products")
                .delete()
                .eq("id", req.params.id)
                .eq("store_id", store.id)
                .select("id");

            if (error) {
                console.error("Product deletion failed:", error.message);
                return res.status(500).json({
                    message: "Unable to delete product"
                });
            }

            if (!data || data.length === 0) {
                return res.status(404).json({
                    message: "Product not found in your store"
                });
            }

            return res.json({
                message: "Product Deleted Successfully"
            });

        } catch (error) {
            console.error("Product deletion error:", error.message);
            return res.status(500).json({
                message: "Server error while deleting product"
            });
        }
    }
);

app.put(
    "/products/:id",
    authenticateToken,
    requireRole("admin", "store_owner"),
    async (req, res) => {
        try {
            const name = String(req.body.name || "").trim();
            const category = String(req.body.category || "").trim();
            const price = Number(req.body.price);
            const stock = Number(req.body.stock);

            if (!name || name.length > 150) {
                return res.status(400).json({
                    message: "Product name is required (maximum 150 characters)"
                });
            }

            if (!category || category.length > 100) {
                return res.status(400).json({
                    message: "Product category is required (maximum 100 characters)"
                });
            }

            if (!Number.isFinite(price) || price <= 0) {
                return res.status(400).json({
                    message: "Price must be greater than zero"
                });
            }

            if (!Number.isInteger(stock) || stock < 0) {
                return res.status(400).json({
                    message: "Stock must be a non-negative whole number"
                });
            }

            // Find the store belonging to the logged-in account
            const { data: store, error: storeError } = await supabase
                .from("stores")
                .select("id")
                .eq("owner_id", req.user.id)
                .maybeSingle();

            if (storeError) {
                console.error("Store lookup failed:", storeError.message);
                return res.status(500).json({
                    message: "Unable to verify store ownership"
                });
            }

            if (!store) {
                return res.status(404).json({
                    message: "No store is assigned to this account"
                });
            }

            // Update only a product belonging to this store
            const { data, error } = await supabase
                .from("products")
                .update({
                    name,
                    price,
                    category,
                    stock
                })
                .eq("id", req.params.id)
                .eq("store_id", store.id)
                .select("id");

            if (error) {
                console.error("Product update failed:", error.message);
                return res.status(500).json({
                    message: "Unable to update product"
                });
            }

            if (!data || data.length === 0) {
                return res.status(404).json({
                    message: "Product not found in your store"
                });
            }

            return res.json({
                message: "Product Updated Successfully"
            });

        } catch (error) {
            console.error("Product update error:", error.message);
            return res.status(500).json({
                message: "Server error while updating product"
            });
        }
    }
);

app.post(
    "/upload",
    authenticateToken,
    requireRole("admin", "store_owner"),
    upload.single("image"),
    async (req, res) => {
        let uploadedFilePath = req.file?.path;

        try {
            if (!req.file) {
                return res.status(400).json({
                    message: "Please select an image to upload"
                });
            }

            // Allow only image files
            if (!req.file.mimetype.startsWith("image/")) {
                return res.status(400).json({
                    message: "Only image files are allowed"
                });
            }

            const result = await cloudinary.uploader.upload(
                req.file.path,
                {
                    resource_type: "image"
                }
            );

            return res.json({
                message: "Image Uploaded",
                imageUrl: result.secure_url
            });

        } catch (error) {
            console.error("Image upload error:", error);

            return res.status(500).json({
                message: "Upload Failed"
            });

        } finally {
            if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
                try {
                    fs.unlinkSync(uploadedFilePath);
                } catch (cleanupError) {
                    console.error(
                        "Temporary file cleanup failed:",
                        cleanupError.message
                    );
                }
            }
        }
    }
);

app.post(
    "/create-order",
    authenticateToken,
    requireRole("customer"),
    async (req, res) => {

   try {

    const products = req.body.products;

    if (!Array.isArray(products) || products.length === 0) {
        return res.status(400).json({
            message: "No products provided"
        });
    }

    const productIds = products.map(product => product.id);

    const { data: dbProducts, error: productError } =
        await supabase
            .from("products")
            .select("id, name, price, stock")
            .in("id", productIds);

    if (productError) {
        return res.status(500).json({
            message: productError.message
        });
    }

    if (!dbProducts || dbProducts.length !== productIds.length) {
        return res.status(400).json({
            message: "One or more products were not found"
        });
    }

    let subtotal = 0;

    for (const product of products) {

        const dbProduct = dbProducts.find(
            p => String(p.id) === String(product.id)
        );

        if (!dbProduct) {
            return res.status(400).json({
                message: "Product not found"
            });
        }

        const quantity = Number(product.quantity || 1);

        if (quantity <= 0) {
            return res.status(400).json({
                message: `Invalid quantity for ${dbProduct.name}`
            });
        }

        if (Number(dbProduct.stock) < quantity) {
            return res.status(400).json({
                message: `${dbProduct.name} is out of stock`
            });
        }

        subtotal += Number(dbProduct.price) * quantity;
    }

    const delivery = 40;
    const gst = subtotal * 0.05;
    const discount = 0;

    const grandTotal =
        subtotal +
        delivery +
        gst -
        discount;

    const options = {
        amount: Math.round(grandTotal * 100),
        currency: "INR",
        receipt: "receipt_" + Date.now()
    };

    const order = await razorpay.orders.create(options);

    console.log("RAZORPAY ORDER CREATED:", {
        razorpayOrderId: order.id,
        amount: order.amount,
        subtotal,
        delivery,
        gst,
        grandTotal
    });

    res.json(order);

} catch (error) {

    console.error(
        "RAZORPAY CREATE ORDER ERROR:",
        error
    );

    res.status(500).json({
        message:
            error.message ||
            "Razorpay order creation failed"
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

app.post(
    "/verify-payment",
    authenticateToken,
    requireRole("customer"),
    async (req, res) => {
        try {
            const {
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature
            } = req.body;

            if (
                !razorpay_order_id ||
                !razorpay_payment_id ||
                !razorpay_signature
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Payment verification details are missing"
                });
            }

            const generatedSignature = crypto
                .createHmac(
                    "sha256",
                    process.env.RAZORPAY_KEY_SECRET
                )
                .update(
                    razorpay_order_id + "|" + razorpay_payment_id
                )
                .digest("hex");

            if (generatedSignature !== razorpay_signature) {
                return res.status(400).json({
                    success: false,
                    message: "Payment verification failed"
                });
            }

            console.log(
                "RAZORPAY PAYMENT VERIFIED:",
                razorpay_payment_id
            );

            res.json({
                success: true,
                message: "Payment verified successfully",
                razorpay_order_id,
                razorpay_payment_id
            });

        } catch (error) {
            console.error("PAYMENT VERIFICATION ERROR:", error);

            res.status(500).json({
                success: false,
                message: "Payment verification failed"
            });
        }
    }
);

app.post(
    "/products/:id/review",
    authenticateToken,
    requireRole("customer"),
    async (req, res) => {
        try {
            const rating = Number(req.body.rating);
            const comment = String(req.body.comment || "").trim();

            if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
                return res.status(400).json({
                    message: "Rating must be a whole number from 1 to 5"
                });
            }

            if (!comment || comment.length > 500) {
                return res.status(400).json({
                    message: "Comment is required and must be 500 characters or fewer"
                });
            }

            const { data: product, error } = await supabase
                .from("products")
                .select("id, reviews")
                .eq("id", req.params.id)
                .maybeSingle();

            if (error) {
                console.error("Review product lookup failed:", error.message);
                return res.status(500).json({
                    message: "Unable to find product"
                });
            }

            if (!product) {
                return res.status(404).json({
                    message: "Product not found"
                });
            }

            const reviews = Array.isArray(product.reviews)
                ? product.reviews
                : [];

            reviews.push({
                user: req.user.name || req.user.email,
                rating,
                comment,
                date: new Date().toISOString()
            });

            const { error: updateError } = await supabase
                .from("products")
                .update({ reviews })
                .eq("id", req.params.id);

            if (updateError) {
                console.error("Review save failed:", updateError.message);
                return res.status(500).json({
                    message: "Unable to save review"
                });
            }

            return res.json({
                message: "Review Added Successfully"
            });

        } catch (error) {
            console.error("Review route error:", error.message);
            return res.status(500).json({
                message: "Server error while adding review"
            });
        }
    }
);

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

app.post(
    "/admin/store-owners",
    authenticateToken,
    requireRole("admin"),
    async (req, res) => {

        try {

            const {
                name,
                email,
                phone,
                password,
                storeName,
                category,
                address
            } = req.body;

            if (
                !name ||
                !email ||
                !password ||
                !storeName ||
                !category ||
                !address
            ) {
                return res.status(400).json({
                    message: "Please fill all required fields"
                });
            }

            // Check whether email already exists
            const { data: existingUser } = await supabase
                .from("users")
                .select("id")
                .eq("email", email)
                .maybeSingle();

            if (existingUser) {
                return res.status(400).json({
                    message: "User with this email already exists"
                });
            }

            // Hash password
            const hashedPassword =
                await bcrypt.hash(password, 10);

            // Create Store Owner
            const { data: newUser, error: userError } =
                await supabase
                    .from("users")
                    .insert([{
                        name: name,
                        email: email,
                        phone: phone,
                        password: hashedPassword,
                        role: "store_owner"
                    }])
                    .select()
                    .single();

            if (userError) {

                return res.status(500).json({
                    message: userError.message
                });

            }

            // Create Store
            const { data: newStore, error: storeError } =
                await supabase
                    .from("stores")
                    .insert([{
                        owner_id: newUser.id,
                        store_name: storeName,
                        category: category,
                        address: address
                    }])
                    .select()
                    .single();

            if (storeError) {

                // Remove user if store creation fails
                await supabase
                    .from("users")
                    .delete()
                    .eq("id", newUser.id);

                return res.status(500).json({
                    message: storeError.message
                });

            }

            res.json({
                message: "Store Owner Created Successfully",
                storeOwner: {
                    id: newUser.id,
                    name: newUser.name,
                    email: newUser.email,
                    role: newUser.role
                },
                store: newStore
            });

        } catch (error) {

            console.error(
                "Create Store Owner error:",
                error
            );

            res.status(500).json({
                message: error.message
            });

        }

    }
);

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

    const token = jwt.sign(
        {
            id: partner.id,
            role: "delivery",
            email: partner.email
        },
        JWT_SECRET,
        { expiresIn: "7d" }
    );

    return res.json({
        message: "Login Successful",
        token,
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

const token = jwt.sign(
    {
        id: admin.id,
        role: "admin",
        email: admin.email
    },
    JWT_SECRET,
    { expiresIn: "7d" }
);

return res.json({
    message: "Login Successful",
    token,
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
app.post(
    "/orders",
    authenticateToken,
    requireRole("customer"),
    async (req, res) => {

    try {

        const deliveryOtp =
            Math.floor(1000 + Math.random() * 9000).toString();

            if (
    req.body.payment !== "Cash on Delivery" &&
    req.body.status === "Payment Verified"
) {
    if (
        !req.body.razorpay_order_id ||
        !req.body.razorpay_payment_id
    ) {
        return res.status(400).json({
            message: "Verified payment details are required"
        });
    }
}

        // Get product IDs from the cart
        const productIds = req.body.products.map(product =>
            product.id
        );

        // Get store_id from the real products table
        const { data: dbProducts, error: productError } =
            await supabase
                .from("products")
                .select("id, store_id, name, price, stock, sold")
                .in("id", productIds);

        if (productError) {
            return res.status(500).json({
                message: productError.message
            });
        }
for (const product of req.body.products) {

    const dbProduct = dbProducts.find(
        p => String(p.id) === String(product.id)
    );

    if (!dbProduct) {
        return res.status(400).json({
            message: `Product not found: ${product.id}`
        });
    }

    const quantity = Number(product.quantity || 1);

    if (quantity <= 0) {
        return res.status(400).json({
            message: `Invalid quantity for ${dbProduct.name}`
        });
    }

    if (Number(dbProduct.stock) < quantity) {
        return res.status(400).json({
            message: `${dbProduct.name} is out of stock or has insufficient stock`
        });
    }
}
let serverSubtotal = 0;

for (const product of req.body.products) {

    const dbProduct = dbProducts.find(
        p => String(p.id) === String(product.id)
    );

    const quantity = Number(product.quantity || 1);

    serverSubtotal +=
        Number(dbProduct.price) * quantity;
}
const serverDelivery = 40;
const serverGst = serverSubtotal * 0.05;
const serverDiscount = 0;
const serverGrandTotal =
    serverSubtotal +
    serverDelivery +
    serverGst -
    serverDiscount;

    // Verify Razorpay payment directly with Razorpay
if (
    req.body.payment !== "Cash on Delivery" &&
    req.body.status === "Payment Verified"
) {
    if (
        !req.body.razorpay_order_id ||
        !req.body.razorpay_payment_id
    ) {
        return res.status(400).json({
            message: "Razorpay payment details are required"
        });
    }

    const razorpayOrder =
        await razorpay.orders.fetch(
            req.body.razorpay_order_id
        );

    const razorpayPayment =
        await razorpay.payments.fetch(
            req.body.razorpay_payment_id
        );

    const expectedAmount =
        Math.round(serverGrandTotal * 100);

    if (
        razorpayOrder.id !==
            req.body.razorpay_order_id
    ) {
        return res.status(400).json({
            message: "Invalid Razorpay order"
        });
    }

    if (
        razorpayPayment.order_id !==
            req.body.razorpay_order_id
    ) {
        return res.status(400).json({
            message: "Payment does not belong to this order"
        });
    }

    if (
        Number(razorpayOrder.amount) !==
            expectedAmount
    ) {
        return res.status(400).json({
            message: "Payment amount does not match order total"
        });
    }

    if (razorpayPayment.status !== "captured") {
        return res.status(400).json({
            message: "Payment has not been captured"
        });
    }
}

        // Add store_id to every product saved inside the order
        const orderProducts = req.body.products.map(product => {

            const dbProduct = dbProducts.find(
                p => String(p.id) === String(product.id)
            );

            return {
                ...product,
                store_id: dbProduct ? dbProduct.store_id : null
            };

        });

        // Create order
        const { data, error } = await supabase
            .from("orders")
            .insert([{
                customerName: req.body.customerName,
                email: req.user.email,
                phone: req.body.phone,
                address: req.body.address,

                // IMPORTANT:
                // Save products with store_id
                products: orderProducts,

                subtotal: serverSubtotal,
delivery: serverDelivery,
gst: serverGst,
discount: serverDiscount,
grandTotal: serverGrandTotal,
                payment: req.body.payment,
status: req.body.status,

razorpay_order_id:
    req.body.razorpay_order_id || null,

razorpay_payment_id:
    req.body.razorpay_payment_id || null,

deliveryOtp: deliveryOtp
            }])
            .select();

        if (error) {
            return res.status(500).json({
                message: error.message
            });
        }

        // Update stock and sold count
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
                        stock:
                            Number(dbProduct.stock) -
                            Number(product.quantity || 1),

                        sold:
                            Number(dbProduct.sold || 0) +
                            Number(product.quantity || 1)
                    })
                    .eq("id", product.id)
.gte("stock", Number(product.quantity || 1));
            }

        }

        // Send notification to customer
        const { data: user } = await supabase
            .from("users")
            .select("fcmToken")
            .eq("email", req.user.email)
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

    } catch (error) {

        console.error("Create order error:", error);

        res.status(500).json({
            message: error.message
        });

    }

});
app.get(
    "/myorders/:email",
    authenticateToken,
    requireRole("customer"),
    async (req, res) => {
        try {
            // Customers may access only their own orders
            if (
                !req.user.email ||
                req.params.email.toLowerCase() !==
                    req.user.email.toLowerCase()
            ) {
                return res.status(403).json({
                    message: "Access denied"
                });
            }

            const { data, error } = await supabase
                .from("orders")
                .select("*")
                .eq("email", req.user.email)
                .order("id", { ascending: false });

            if (error) {
                console.error("Customer orders lookup failed:", error.message);

                return res.status(500).json({
                    message: "Unable to load your orders"
                });
            }

            return res.json(data || []);

        } catch (error) {
            console.error("My orders route error:", error.message);

            return res.status(500).json({
                message: "Server error while loading your orders"
            });
        }
    }
);

app.delete(
    "/orders/:id",
    authenticateToken,
    requireRole("admin"),
    async (req, res) => {
        try {
            const { data: order, error: fetchError } = await supabase
                .from("orders")
                .select("id, status")
                .eq("id", req.params.id)
                .maybeSingle();

            if (fetchError) {
                console.error("Order lookup failed:", fetchError.message);
                return res.status(500).json({
                    message: "Unable to retrieve order"
                });
            }

            if (!order) {
                return res.status(404).json({
                    message: "Order not found"
                });
            }

            if (["Delivered", "Cancelled"].includes(order.status)) {
                return res.status(400).json({
                    message: `Cannot cancel an order with status: ${order.status}`
                });
            }

            const { data, error } = await supabase
                .from("orders")
                .update({ status: "Cancelled" })
                .eq("id", req.params.id)
                .select("id");

            if (error) {
                console.error("Order cancellation failed:", error.message);
                return res.status(500).json({
                    message: "Unable to cancel order"
                });
            }

            if (!data || data.length === 0) {
                return res.status(409).json({
                    message: "Order status changed. Please refresh."
                });
            }

            return res.json({
                message: "Order Cancelled Successfully"
            });

        } catch (error) {
            console.error("Order cancellation error:", error.message);
            return res.status(500).json({
                message: "Server error while cancelling order"
            });
        }
    }
);

app.post(
    "/orders/:id/cancel",
    authenticateToken,
    requireRole("customer"),
    async (req, res) => {
        try {
            const userEmail = req.user.email;

            if (!userEmail) {
                return res.status(403).json({
                    message: "Customer identity could not be verified"
                });
            }

            const { data: order, error: fetchError } = await supabase
                .from("orders")
                .select("id, email, status")
                .eq("id", req.params.id)
                .eq("email", userEmail)
                .maybeSingle();

            if (fetchError) {
                console.error("Order lookup failed:", fetchError.message);
                return res.status(500).json({
                    message: "Unable to retrieve order"
                });
            }

            if (!order) {
                return res.status(404).json({
                    message: "Order not found"
                });
            }

            const cancellableStatuses = ["Pending", "Confirmed"];

            if (!cancellableStatuses.includes(order.status)) {
                return res.status(400).json({
                    message: "This order can no longer be cancelled"
                });
            }

            const { data: updatedOrder, error: updateError } = await supabase
                .from("orders")
                .update({ status: "Cancelled" })
                .eq("id", order.id)
                .eq("email", userEmail)
                .in("status", cancellableStatuses)
                .select("id");

            if (updateError) {
                console.error("Order cancellation failed:", updateError.message);
                return res.status(500).json({
                    message: "Unable to cancel order"
                });
            }

            if (!updatedOrder || updatedOrder.length === 0) {
                return res.status(409).json({
                    message: "Order status changed. Please refresh and try again."
                });
            }

            return res.json({
                message: "Order Cancelled Successfully"
            });

        } catch (error) {
            console.error("Customer cancellation error:", error.message);

            return res.status(500).json({
                message: "Server error while cancelling order"
            });
        }
    }
);

app.get(
    "/orders",
    authenticateToken,
    requireRole("admin"),
    async (req, res) => {

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

app.put(
    "/orders/:id",
    authenticateToken,
    requireRole("admin"),
    async (req, res) => {
        try {
            const allowedStatuses = [
                "Pending",
                "Confirmed",
                "Preparing",
                "Ready",
                "Out for Delivery",
                "Delivered",
                "Cancelled"
            ];

            const newStatus = req.body.status;

            if (!allowedStatuses.includes(newStatus)) {
                return res.status(400).json({
                    message: "Invalid order status"
                });
            }

            // Fetch the current order before updating
            const { data: order, error: fetchError } = await supabase
                .from("orders")
                .select("id, status, deliveryPartnerEmail, earning")
                .eq("id", req.params.id)
                .maybeSingle();

            if (fetchError) {
                console.error("Order lookup failed:", fetchError.message);
                return res.status(500).json({
                    message: "Unable to retrieve order"
                });
            }

            if (!order) {
                return res.status(404).json({
                    message: "Order not found"
                });
            }

            // Avoid repeating delivery-stat updates for an already delivered order
            if (order.status === "Delivered" && newStatus === "Delivered") {
                return res.json({
                    message: "Order is already delivered"
                });
            }

            const { error: updateError } = await supabase
                .from("orders")
                .update({ status: newStatus })
                .eq("id", req.params.id);

            if (updateError) {
                console.error("Order update failed:", updateError.message);
                return res.status(500).json({
                    message: "Unable to update order"
                });
            }

            // Restore delivery partner availability and update statistics
            if (
                newStatus === "Delivered" &&
                order.status !== "Delivered" &&
                order.deliveryPartnerEmail
            ) {
                const { data: partner, error: partnerError } = await supabase
                    .from("deliveryPartners")
                    .select("totalDeliveries, totalEarnings")
                    .eq("email", order.deliveryPartnerEmail)
                    .maybeSingle();

                if (partnerError) {
                    console.error(
                        "Delivery partner lookup failed:",
                        partnerError.message
                    );

                    return res.status(500).json({
                        message: "Order delivered, but partner statistics need attention"
                    });
                }

                if (partner) {
                    const { error: partnerUpdateError } = await supabase
                        .from("deliveryPartners")
                        .update({
                            status: "Available",
                            totalDeliveries:
                                Number(partner.totalDeliveries || 0) + 1,
                            totalEarnings:
                                Number(partner.totalEarnings || 0) +
                                Number(order.earning || 0)
                        })
                        .eq("email", order.deliveryPartnerEmail);

                    if (partnerUpdateError) {
                        console.error(
                            "Partner statistics update failed:",
                            partnerUpdateError.message
                        );

                        return res.status(500).json({
                            message: "Order updated, but partner statistics need attention"
                        });
                    }
                }
            }

            return res.json({
                message: "Order Updated Successfully"
            });

        } catch (error) {
            console.error("Order update error:", error.message);

            return res.status(500).json({
                message: "Server error while updating order"
            });
        }
    }
);
app.post(
    "/delivery-partners",
    authenticateToken,
    requireRole("admin"),
    async (req, res) => {
        try {
            const name =
                typeof req.body.name === "string"
                    ? req.body.name.trim()
                    : "";

            const email =
                typeof req.body.email === "string"
                    ? req.body.email.trim().toLowerCase()
                    : "";

            const phone =
                typeof req.body.phone === "string"
                    ? req.body.phone.trim()
                    : "";

            const password = req.body.password;

            if (!name || !email || !phone || !password) {
                return res.status(400).json({
                    message: "Please fill all required fields"
                });
            }

            if (
                name.length > 100 ||
                email.length > 254 ||
                phone.length > 20
            ) {
                return res.status(400).json({
                    message: "One or more fields exceed the allowed length"
                });
            }

            if (
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
            ) {
                return res.status(400).json({
                    message: "Please enter a valid email address"
                });
            }

            if (
                typeof password !== "string" ||
                password.length < 8 ||
                password.length > 72
            ) {
                return res.status(400).json({
                    message: "Password must be between 8 and 72 characters"
                });
            }

            // Hash the password before storing it
            const hashedPassword = await bcrypt.hash(password, 10);

            const { data, error } = await supabase
                .from("deliveryPartners")
                .insert([{
                    name,
                    email,
                    phone,
                    password: hashedPassword,
                    rating: 5,
                    status: "Available",
                    totalDeliveries: 0,
                    totalEarnings: 0
                }])
                .select(
                    "id, name, email, phone, rating, status, totalDeliveries, totalEarnings"
                );

            if (error) {
                if (error.code === "23505") {
                    return res.status(409).json({
                        message: "A delivery partner with this email already exists"
                    });
                }

                console.error(
                    "Add delivery partner database error:",
                    error.message
                );

                return res.status(500).json({
                    message: "Unable to create delivery partner"
                });
            }

            if (!data || data.length === 0) {
                return res.status(500).json({
                    message: "Delivery partner creation could not be confirmed"
                });
            }

            return res.status(201).json({
                message: "Delivery Partner Added Successfully",
                partner: data[0]
            });

        } catch (error) {
            console.error(
                "Add delivery partner error:",
                error.message
            );

            return res.status(500).json({
                message: "Server error while creating delivery partner"
            });
        }
    }
);
app.get(
    "/delivery-partners",
    authenticateToken,
    requireRole("admin"),
    async (req, res) => {
        try {
            const { data, error } = await supabase
                .from("deliveryPartners")
                .select(`
                    id,
                    name,
                    email,
                    phone,
                    rating,
                    status,
                    totalDeliveries,
                    totalEarnings
                `);

            if (error) {
                console.error(
                    "Delivery partner lookup failed:",
                    error.message
                );

                return res.status(500).json({
                    message: "Unable to load delivery partners"
                });
            }

            return res.json(data || []);

        } catch (error) {
            console.error(
                "Delivery partner route error:",
                error.message
            );

            return res.status(500).json({
                message: "Server error while loading delivery partners"
            });
        }
    }
);

app.delete(
    "/delivery-partners/:id",
    authenticateToken,
    requireRole("admin"),
    async (req, res) => {

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

app.put(
    "/assign-delivery/:id",
    authenticateToken,
    requireRole("admin"),
    async (req, res) => {
        try {
            const partnerEmail = String(req.body.email || "")
                .trim()
                .toLowerCase();

            if (!partnerEmail) {
                return res.status(400).json({
                    message: "Delivery partner email is required"
                });
            }

            // Find the order
            const { data: order, error: orderFetchError } = await supabase
                .from("orders")
                .select("id, status, deliveryPartnerId")
                .eq("id", req.params.id)
                .maybeSingle();

            if (orderFetchError) {
                console.error("Order lookup failed:", orderFetchError.message);
                return res.status(500).json({
                    message: "Unable to retrieve order"
                });
            }

            if (!order) {
                return res.status(404).json({
                    message: "Order not found"
                });
            }

            if (["Delivered", "Cancelled"].includes(order.status)) {
                return res.status(400).json({
                    message: "This order cannot be assigned"
                });
            }

            // Find an available delivery partner
            const { data: partner, error: partnerError } = await supabase
                .from("deliveryPartners")
                .select("id, name, email, status, fcmToken")
                .ilike("email", partnerEmail)
                .maybeSingle();

            if (partnerError) {
                console.error("Partner lookup failed:", partnerError.message);
                return res.status(500).json({
                    message: "Unable to retrieve delivery partner"
                });
            }

            if (!partner) {
                return res.status(404).json({
                    message: "Delivery partner not found"
                });
            }

            if (partner.status !== "Available") {
                return res.status(409).json({
                    message: "Delivery partner is not available"
                });
            }

            // Assign the order
            const { data: updatedOrder, error: orderError } = await supabase
                .from("orders")
                .update({
                    deliveryPartnerId: partner.id,
                    deliveryPartnerName: partner.name,
                    deliveryPartnerEmail: partner.email,
                    status: "Out for Delivery"
                })
                .eq("id", req.params.id)
                .select("id");

            if (orderError) {
                console.error("Order assignment failed:", orderError.message);
                return res.status(500).json({
                    message: "Unable to assign delivery partner"
                });
            }

            if (!updatedOrder || updatedOrder.length === 0) {
                return res.status(409).json({
                    message: "Order assignment could not be confirmed"
                });
            }

            const { error: busyError } = await supabase
                .from("deliveryPartners")
                .update({ status: "Busy" })
                .eq("id", partner.id);

            if (busyError) {
                console.error("Partner status update failed:", busyError.message);

                return res.status(500).json({
                    message: "Order assigned, but partner status needs attention"
                });
            }

            if (partner.fcmToken) {
                try {
                    await sendNotification(
                        partner.fcmToken,
                        "🛵 New Delivery",
                        "A new order has been assigned to you."
                    );
                } catch (notificationError) {
                    console.error(
                        "Delivery notification failed:",
                        notificationError.message
                    );
                }
            }

            return res.json({
                message: "Delivery Partner Assigned Successfully"
            });

        } catch (error) {
            console.error("Assign delivery error:", error.message);

            return res.status(500).json({
                message: "Server error while assigning delivery"
            });
        }
    }
);

app.put(
    "/delivery-partners/status",
    authenticateToken,
    requireRole("delivery"),
    async (req, res) => {
        try {
            const { status } = req.body;

            const allowedStatuses = ["Available", "Busy"];

            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({
                    message: "Invalid delivery status"
                });
            }

            // Find the logged-in delivery partner
            const { data: partner, error: partnerError } = await supabase
                .from("deliveryPartners")
                .select("id, email, status")
                .ilike("email", String(req.user.email || ""))
                .maybeSingle();

            if (partnerError) {
                console.error(
                    "Delivery partner lookup failed:",
                    partnerError.message
                );

                return res.status(500).json({
                    message: "Unable to retrieve delivery partner"
                });
            }

            if (!partner) {
                return res.status(404).json({
                    message: "Delivery partner not found"
                });
            }

            // Check whether this partner has an active delivery
            const { data: activeOrders, error: ordersError } = await supabase
                .from("orders")
                .select("id")
                .eq("deliveryPartnerId", partner.id)
                .in("status", [
                    "Out for Delivery",
                    "Preparing",
                    "Ready"
                ])
                .limit(1);

            if (ordersError) {
                console.error(
                    "Active order lookup failed:",
                    ordersError.message
                );

                return res.status(500).json({
                    message: "Unable to verify active deliveries"
                });
            }

            // A partner with an active order cannot mark themselves Available
            if (status === "Available" && activeOrders.length > 0) {
                return res.status(409).json({
                    message: "You cannot become available while you have an active delivery"
                });
            }

            const { data: updatedPartner, error: updateError } = await supabase
                .from("deliveryPartners")
                .update({ status })
                .eq("id", partner.id)
                .select("id");

            if (updateError) {
                console.error(
                    "Delivery status update failed:",
                    updateError.message
                );

                return res.status(500).json({
                    message: "Unable to update delivery status"
                });
            }

            if (!updatedPartner || updatedPartner.length === 0) {
                return res.status(409).json({
                    message: "Delivery status could not be updated"
                });
            }

            return res.json({
                message: "Delivery status updated successfully",
                status
            });

        } catch (error) {
            console.error(
                "Delivery status route error:",
                error.message
            );

            return res.status(500).json({
                message: "Server error while updating delivery status"
            });
        }
    }
);

app.post(
    "/location",
    authenticateToken,
    requireRole("delivery"),
    async (req, res) => {

    const { lat, lng } = req.body;

const latitude = Number(lat);
const longitude = Number(lng);

if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
) {
    return res.status(400).json({
        message: "Invalid location coordinates"
    });
}

const { error } = await supabase
    .from("locations")
    .upsert(
        {
            email: req.user.email,
            lat: latitude,
            lng: longitude
        },
        { onConflict: "email" }
    );

if (error) {
    return res.status(500).json({
        message: error.message
    });
}

res.json({
    message: "Location updated successfully"
});

});

app.get(
    "/location/:email",
    authenticateToken,
    async (req, res) => {
        try {
            const requestedEmail = req.params.email;
            const userEmail = req.user.email;
            const userRole = req.user.role;

            // Admin can view delivery locations
            if (userRole === "admin") {
                // Continue to the location lookup below
            } else if (userRole === "delivery") {
                // Delivery partners can view only their own location
                if (requestedEmail !== userEmail) {
                    return res.status(403).json({
                        message: "Access denied"
                    });
                }
            } else if (userRole === "customer") {
                // Customers can view a partner's location only
                // if that partner is assigned to their order.
                const { data: orders, error: ordersError } =
                    await supabase
                        .from("orders")
                        .select("id")
                        .eq("email", userEmail)
                        .eq("deliveryPartnerEmail", requestedEmail)
                        .eq("status", "Out for Delivery")
                        .limit(1);

                if (ordersError) {
                    return res.status(500).json({
                        message: ordersError.message
                    });
                }

                if (!orders || orders.length === 0) {
                    return res.status(403).json({
                        message: "You cannot view this location"
                    });
                }
            } else {
                return res.status(403).json({
                    message: "Access denied"
                });
            }

            const { data, error } = await supabase
                .from("locations")
                .select("email, lat, lng")
                .eq("email", requestedEmail)
                .maybeSingle();

            if (error) {
                return res.status(500).json({
                    message: error.message
                });
            }

            if (!data) {
                return res.status(404).json({
                    message: "Location not found"
                });
            }

            res.json(data);
        } catch (error) {
            console.error("Location lookup error:", error);

            res.status(500).json({
                message: "Server error"
            });
        }
    }
);
app.post(
    "/verify-otp/:id",
    authenticateToken,
    requireRole("delivery"),
    async (req, res) => {

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

        if (order.deliveryPartnerEmail !== req.user.email) {
    return res.status(403).json({
        success: false,
        message: "This order is not assigned to you."
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
app.get(
    "/notifications/:email",
    authenticateToken,
    async (req, res) => {
        if (req.params.email !== req.user.email) {
    return res.status(403).json({
        message: "Access denied"
    });
}

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

app.put(
    "/notifications/read/:email",
    authenticateToken,
    async (req, res) => {
        if (req.params.email !== req.user.email) {
    return res.status(403).json({
        message: "Access denied"
    });
}
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

app.post(
    "/rate-delivery/:id",
    authenticateToken,
    requireRole("customer"),
    async (req, res) => {

    const { data: order, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", req.params.id)
        .single();

    if (order.email !== req.user.email) {
    return res.status(403).json({
        message: "Access denied"
    });
}
if (order.status !== "Delivered") {
    return res.status(400).json({
        message: "You can rate only after delivery"
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
app.get(
    "/delivery-earnings/:email",
    authenticateToken,
    requireRole("delivery"),
    async (req, res) => {
        if (req.params.email !== req.user.email) {
    return res.status(403).json({
        message: "Access denied"
    });
}

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

app.post(
    "/save-fcm-token",
    authenticateToken,
    async (req, res) => {

    const { email, role, token } = req.body;

    if (email !== req.user.email) {
    return res.status(403).json({
        message: "Access denied"
    });
}

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

app.post(
    "/coupons",
    authenticateToken,
    requireRole("admin"),
    async (req, res) => {

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

app.delete(
    "/coupons/:id",
    authenticateToken,
    requireRole("admin"),
    async (req, res) => {

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


app.get(
    "/users",
    authenticateToken,
    requireRole("admin"),
    async (req, res) => {

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

app.delete(
    "/users/:id",
    authenticateToken,
    requireRole("admin"),
    async (req, res) => {

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

app.put(
    "/users/:id/block",
    authenticateToken,
    requireRole("admin"),
    async (req, res) => {

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

app.get(
    "/users/:id",
    authenticateToken,
    async (req, res) => {
    const { id } = req.params;
    if (req.user.role !== "admin" && id !== req.user.id) {
    return res.status(403).json({
        message: "Access denied"
    });
}

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

app.get(
    "/settings",
    authenticateToken,
    requireRole("admin"),
    async (req, res) => {

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

app.put(
    "/settings",
    authenticateToken,
    requireRole("admin"),
    async (req, res) => {
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

app.put(
    "/users/:id",
    authenticateToken,
    requireRole("customer"),
    async (req, res) => {

    try {

        const { id } = req.params;

        if (String(id) !== String(req.user.id)) {
    return res.status(403).json({
        message: "Access denied"
    });
}

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

app.get(
    "/my-store",
    authenticateToken,
    requireRole(["admin", "store_owner"]),
    async (req, res) => {

        console.log("MY STORE USER:", req.user);
        console.log("OWNER ID SEARCH:", req.user.id);

        const { data, error } = await supabase
            .from("stores")
            .select("*")
            .eq("owner_id", req.user.id);

        console.log("MY STORE DATA:", data);
        console.log("MY STORE ERROR:", error);

        if (error) {
            return res.status(500).json({
                message: error.message,
                details: error.details,
                hint: error.hint
            });
        }

        if (!data || data.length === 0) {
            return res.status(404).json({
                message: "Store not found",
                searchedOwnerId: req.user.id
            });
        }

        res.json(data[0]);
    }
);

app.get(
    "/my-store/products",
    authenticateToken,
    requireRole(["admin", "store_owner"]),
    async (req, res) => {

        try {

            const { data: store, error: storeError } = await supabase
                .from("stores")
                .select("id")
                .eq("owner_id", req.user.id)
                .single();

            if (storeError || !store) {
                return res.status(404).json({
                    message: "Store not found"
                });
            }

            const { data: products, error: productsError } =
                await supabase
                    .from("products")
                    .select("*")
                    .eq("store_id", store.id)
                    .order("id", { ascending: false });

            if (productsError) {
                return res.status(500).json({
                    message: productsError.message
                });
            }

            res.json(products);

        } catch (error) {

            console.error("My store products error:", error);

            res.status(500).json({
                message: error.message
            });

        }
    }
);

app.put(
    "/my-store/orders/:id",
    authenticateToken,
    requireRole("admin"),
    async (req, res) => {

        try {

            // Find the store belonging to this admin
            const { data: store, error: storeError } =
                await supabase
                    .from("stores")
                    .select("id")
                    .eq("owner_id", req.user.id)
                    .single();

            if (storeError || !store) {
                return res.status(404).json({
                    message: "Store not found"
                });
            }

            // Get the order
            const { data: order, error: orderError } =
                await supabase
                    .from("orders")
                    .select("*")
                    .eq("id", req.params.id)
                    .single();

            if (orderError || !order) {
                return res.status(404).json({
                    message: "Order not found"
                });
            }

            // Make sure this order contains a product
            // belonging to this store
            const belongsToStore =
                Array.isArray(order.products) &&
                order.products.some(product =>
                    Number(product.store_id) === Number(store.id)
                );

            if (!belongsToStore) {
                return res.status(403).json({
                    message: "You cannot manage this order"
                });
            }

            // Allowed statuses
            const allowedStatuses = [
                "Pending",
                "Preparing",
                "Out for Delivery",
                "Delivered"
            ];

            if (!allowedStatuses.includes(req.body.status)) {
                return res.status(400).json({
                    message: "Invalid order status"
                });
            }

            // Update status
            const { error: updateError } =
                await supabase
                    .from("orders")
                    .update({
                        status: req.body.status
                    })
                    .eq("id", req.params.id);

            if (updateError) {
                return res.status(500).json({
                    message: updateError.message
                });
            }

            res.json({
                message: "Order Status Updated Successfully"
            });

        } catch (error) {

            console.error(
                "Store order status error:",
                error
            );

            res.status(500).json({
                message: error.message
            });

        }

    }
);


app.get(
    "/my-store/orders",
    authenticateToken,
    requireRole(["admin", "store_owner"]),
    async (req, res) => {

        try {

            // 1. Find the store owned by the logged-in admin
            const { data: store, error: storeError } = await supabase
                .from("stores")
                .select("id")
                .eq("owner_id", req.user.id)
                .single();

            if (storeError || !store) {
                return res.status(404).json({
                    message: "Store not found"
                });
            }

            // 2. Get all orders
            const { data: orders, error: ordersError } =
                await supabase
                    .from("orders")
                    .select("*")
                    .order("id", { ascending: false });

            if (ordersError) {
                return res.status(500).json({
                    message: ordersError.message
                });
            }

            // 3. Keep only orders containing products from this store
            const storeOrders = orders.filter(order => {

                if (!Array.isArray(order.products)) {
                    return false;
                }

                return order.products.some(product =>
                    Number(product.store_id) === Number(store.id)
                );

            });

            res.json(storeOrders);

        } catch (error) {

            console.error("My store orders error:", error);

            res.status(500).json({
                message: error.message
            });

        }

    }
);
app.listen(5000, () => {
    console.log("Server running on port 5000");
});