const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const productModel = require("./models/productModel");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const port = 8080;

app.use(bodyParser.json({ limit: "1mb" }));
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));

mongoose
  .connect(process.env.MONGO_DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to mongoDB");
  })
  .catch((err) => {
    console.log("Error connecting to database", err);
  });

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

const orderModel = require("./models/orderModel");
const userModel = require("./models/userModel");
const cartModel = require("./models/cartModel");
const { data } = require("autoprefixer");

//endpoint to register user

const sendVerificationEmail = async (email, verificationToken) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.ADMIN_EMAIL,
      pass: process.env.ADMIN_EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: "drop-store.me",
    to: email,
    subject: "Verify your email address",
    html: `<div style={{display: "flex", alignItems: "center", justifyContent: "center", marginHorizontal: "auto", backgroundColor: "#333"}}><div><h1>Greetings from Dropstore.</h1></div> <div>Thank you for registering on Dropstore. To verify your email address please click the below link.</div><div><a href="https://api.drop-store.me/verify/${verificationToken}" >Verify Now.</a></div> </div>`,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.log("Error sending verification email", err);
    res.staus(500).json({ message: "Error sending verification email" });
  }
};

app.post("/register", async (req, res) => {
  try {
    const { name, email, password, profilePic } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Please provide your name." });
    }
    if (!email) {
      return res.status(400).json({ message: "Email is required!" });
    }
    if (!password) {
      return res.status(400).json({ message: "Please provide a password." });
    }

    const existingUser = await userModel.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists." });
    }

    const newUser = new userModel({ name, email, password, profilePic });

    newUser.verificationToken = crypto.randomBytes(20).toString("hex");

    await newUser.save();

    await sendVerificationEmail(newUser.email, newUser.verificationToken);

    res
      .status(200)
      .json({ message: "Registration successful! Please verify your email." });
  } catch (err) {
    console.log("Error registering user.", err);
    res.status(500).json({ message: "Registration Failed." });
  }
});

//endpoint to verify email

app.get("/verify/:token", async (req, res) => {
  try {
    const token = req.params.token;
    const user = await userModel.findOne({ verificationToken: token });

    if (!user) {
      return res.status(400).json({ message: "Invalid verification token." });
    }

    user.verificationToken = undefined;
    user.verified = true;
    await user.save();
    res.status(200).json({ message: "Email verified successfully!" });
  } catch (err) {
    console.log("Error verifying email", err);
    res.status(500).json({ message: "Error verifying email." });
  }
});

const secretKey = process.env.SECRET_KEY;

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await userModel.findOne({ email });
    if (!user) {
      return res
        .status(401)
        .json({ message: "User not found. Please check your email address." });
    }

    if (user.password !== password) {
      return res.status(401).json({ message: "Invalid password" });
    }

    if (!user.verified) {
      return res.status(401).json({
        message: "Email not verified! Please verify your email first.",
      });
    }

    const token = jwt.sign({ userId: user._id }, secretKey);
    res.status(200).json({ token });
  } catch (err) {
    console.log("Error logging in user", err);
    res.status(500).json({ message: "Error logging in user." });
  }
});

//endpoint to verify token

const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ message: "No token provided." });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "No token provided." });
  }

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      console.error("Error verifying token:", err);
      return res.status(401).json({ message: "Failed to authenticate token." });
    }
    req.userId = decoded.userId;
    next();
  });
};

//endpoint to get user details

app.get("/user-details", verifyToken, async (req, res) => {
  try {
    const user = await userModel.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    res.status(200).json(user);
  } catch (err) {
    console.log("Error fetching user details", err);
    res.status(500).json({ message: "Error fetching user details." });
  }
});

//endpoint to fetch all users

app.get("/all-users", async (req, res) => {
  try {
    const users = await userModel.find();
    res.status(200).json(users);
  } catch (err) {
    console.log("Error fetching all users", err);
    res.status(500).json({ message: "Error fetching all users." });
  }
});

//endpoint to upload products

app.post("/upload-product", async (req, res) => {
  try {
    const {
      productName,
      brandName,
      category,
      productImage,
      description,
      price,
    } = req.body;

    if (!productName) {
      return res.status(400).json({ message: "Please provide product name." });
    }
    if (!brandName) {
      return res.status(400).json({ message: "Please provide brand name." });
    }
    if (!category) {
      return res.status(400).json({ message: "Please provide category." });
    }
    if (!description) {
      return res.status(400).json({ message: "Please provide a description." });
    }
    if (!price) {
      return res.status(400).json({ message: "Please provide a price." });
    }
    if (!productImage) {
      return res
        .status(400)
        .json({ message: "Please upload at least one image." });
    }

    if (productImage.length < 3) {
      return res
        .status(400)
        .json({ message: "Please upload at least three images." });
    }

    const existingProduct = await productModel.findOne({ productName });

    if (existingProduct) {
      return res.status(400).json({ message: "Product already exists." });
    }

    const newProduct = new productModel({
      productName,
      brandName,
      category,
      productImage,
      description,
      price,
    });

    await newProduct.save();
    res.status(200).json({ message: "Product uploaded successfully!" });
  } catch (err) {
    console.log("Error uploading product", err);
    res.status(500).json({ message: "Error uploading product." });
  }
});

//endpoint to get all products

app.get("/all-products", async (req, res) => {
  try {
    const allProducts = await productModel.find().sort({ timeStamp: -1 });
    res.status(200).json(allProducts);
  } catch (err) {
    console.log("Error getting products", err);
    res.status(500).json({ message: "Error getting products." });
  }
});

//endpoint to edit product

app.post("/update-product", async (req, res) => {
  try {
    const {
      productName,
      brandName,
      category,
      description,
      price,
      productImage,
    } = req.body;

    const productId = req?.body?._id;

    if (!productName) {
      return res.status(400).json({ message: "Please provide product name." });
    }
    if (!brandName) {
      return res.status(400).json({ message: "Please provide brand name." });
    }
    if (!category) {
      return res.status(400).json({ message: "Please provide category." });
    }
    if (!description) {
      return res.status(400).json({ message: "Please provide a description." });
    }
    if (!price) {
      return res.status(400).json({ message: "Please provide a price." });
    }

    const updateProduct = await productModel.findByIdAndUpdate(productId, {
      productName,
      brandName,
      category,
      description,
      price,
      productImage,
    });

    if (!updateProduct) {
      return res.status(404).json({ message: "Product not found." });
    }

    res.status(200).json({
      message: "Product updated successfully!",
      data: updateProduct,
    });
  } catch (err) {
    console.log("Error updating product", err);
    res.status(500).json({ message: "Error updating product." });
  }
});

//endpoint to get category products

app.get("/category/:categoryName", async (req, res) => {
  try {
    const { categoryName } = req.params;
    const products = await productModel.find({ category: categoryName });
    res.status(200).json(products);
    console.log("PRODUCTS", products);
  } catch (err) {
    console.log("Error fetching products by category", err);
    res.status(500).json({ message: "Error fetching products by category." });
  }
});

//endpoint to get horizontal products for home screen

app.post("/horizontal-products", async (req, res) => {
  try {
    const { category } = req?.body || req?.query;
    const products = await productModel
      .find({ category })
      .sort({ timeStamp: -1 })
      .limit(15);

    res.status(200).json(products);
  } catch (err) {
    console.log("Error fetching horizontal products", err);
    res.status(500).json({ message: "Error fetching horizontal products." });
  }
});

//endpoint to get product details

app.post("/product-details", async (req, res) => {
  try {
    const { productId } = req.body;
    const product = await productModel.findById(productId);

    res.status(200).json(product);
  } catch (err) {
    console.log("Error fetching product details", err);
    res.status(500).json({ message: "Error fetching product details." });
  }
});

//endpoint to add product to cart

app.post("/add-to-cart", verifyToken, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.userId;

    if (!productId || !quantity) {
      return res
        .status(400)
        .json({ message: "Product ID and quantity are required." });
    }

    const existingProduct = await cartModel.findOne({ productId, userId });

    if (existingProduct) {
      return res.status(400).json({ message: "Product already in cart." });
    }

    const newProduct = new cartModel({ productId, quantity, userId });
    await newProduct.save();

    res.status(200).json({ message: "Product added successfully!" });
  } catch (err) {
    console.log("Error adding product to cart", err);
    res.status(500).json({ message: "Error adding product to cart." });
  }
});

//endpoint to count cart items

app.get("/cart-count", verifyToken, async (req, res) => {
  try {
    const userId = req?.userId;
    const cartCount = await cartModel.countDocuments({ userId });

    res.status(200).json({ cartCount });
  } catch (err) {
    console.log("Error counting cart items", err);
    res.status(500).json({ message: "Error counting cart items." });
  }
});

//endpoint to get user cart items

app.get("/user-cart", verifyToken, async (req, res) => {
  try {
    const userId = req?.userId;
    const cartItems = await cartModel.find({ userId }).populate("productId");

    res.status(200).json(cartItems);
  } catch (err) {
    console.log("Error fetching user cart items", err);
    res.status(500).json({ message: "Error fetching user cart items." });
  }
});

//endpoint to remove product from cart
app.post("/remove-from-cart", verifyToken, async (req, res) => {
  try {
    const { productId } = req?.body;
    const userId = req?.userId;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required." });
    }

    const deleteProduct = await cartModel.findOneAndDelete({
      productId,
      userId,
    });

    if (!deleteProduct) {
      return res.status(404).json({ message: "Product not found in cart." });
    }

    res.status(200).json({ message: "Product removed from cart." });
  } catch (err) {
    console.log("Error removing product from cart", err);
    res.status(500).json({ message: "Error removing product from cart." });
  }
});

//endpoint to clear cart

app.post("/clear-cart", verifyToken, async (req, res) => {
  try {
    const userId = req?.userId;
    await cartModel.deleteMany({ userId });

    res.status(200).json({ message: "Cart cleared successfully!" });
  } catch (err) {
    console.log("Error clearing cart", err);
    res.status(500).json({ message: "Error clearing cart." });
  }
});

//endpoint to update cart details

app.post("/update-cart-product", verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { productId, quantity } = req.body;

    console.log("PRODUCT ID", productId);

    const updateProduct = await cartModel.updateOne(
      { productId: productId, userId: userId },
      { quantity: quantity },
      { new: true }
    );

    if (!updateProduct) {
      return res.status(404).json({ message: "Cart item not found." });
    }

    res.status(200).json({
      message: "Cart updated successfully!",
      data: updateProduct,
    });
  } catch (err) {
    console.log("Error updating cart product", err);
    res.status(500).json({ message: "Error updating cart product." });
  }
});

//endpoint to search products

app.get("/search", async (req, res) => {
  try {
    const query = req?.query?.q;

    const regex = new RegExp(query, "i", "g");

    const products = await productModel.find({
      $or: [{ productName: regex }, { brandName: regex }, { category: regex }],
    });

    res.status(200).json(products);
  } catch (err) {
    console.log("Error searching products", err);
    res.status(500).json({ message: "Error searching products." });
  }
});

//endpoint to add address

app.post("/add-address", verifyToken, async (req, res) => {
  try {
    const userId = req?.userId;

    const { name, mobileNo, houseNo, street, landmark, postalCode } = req?.body;

    if (!name) {
      return res.status(400).json({ message: "Please provide a name." });
    }

    if (!mobileNo) {
      return res
        .status(400)
        .json({ message: "Please provide your mobile no." });
    }

    if (!street) {
      return res.status(400).json({ message: "Please provide street name." });
    }

    if (!landmark) {
      return res.status(400).json({ message: "Please provide your locality." });
    }

    if (!postalCode) {
      return res
        .status(400)
        .json({ message: "Please provide your postal code." });
    }

    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.addresses.push({
      name,
      mobileNo,
      houseNo,
      street,
      landmark,
      postalCode,
    });

    await user.save();

    res.status(200).json({ message: "Address added successfully!" });
  } catch (err) {
    console.log("Error adding address", err);
    res.status(500).json({ message: "Error adding address." });
  }
});

//endpoint to delete address

app.post("/delete-address", verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.body;

    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const addressIndex = user.addresses.findIndex(
      (address) => address._id.toString() === id
    );

    if (addressIndex === -1) {
      return res.status(404).json({ message: "Address not found." });
    }

    user.addresses.splice(addressIndex, 1);
    await user.save();

    res.status(200).json({
      message: "Address deleted successfully!",
      addresses: user.addresses,
    });
  } catch (err) {
    console.log("Error deleting address", err);
    res.status(500).json({ message: "Error deleting address." });
  }
});

//endpoint to fetch addresses

app.get("/get-addresses", verifyToken, async (req, res) => {
  try {
    const userId = req?.userId;

    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const addresses = user.addresses;

    res.status(200).json(addresses);
  } catch (err) {
    console.log("Error fetching addresses", err);
    res.status(500).json({ message: "Error fetching addresses." });
  }
});

//endpoint to store all orders

app.post("/order", verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { cartItem, grandTotal, address, paymentMethod } = req.body;

    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const products = cartItem.map((item) => ({
      name: item.productId.productName,
      quantity: item.quantity,
      price: item.productId.price,
      image: item.productId.productImage[0],
    }));

    const order = new orderModel({
      user: userId,
      products: products,
      totalPrice: grandTotal,
      shippingAddress: address,
      paymentMethod: paymentMethod,
    });

    await order.save();

    res.status(200).json({ message: "Order placed successfully!" });
  } catch (err) {
    console.log("Error placing order", err);
    res.status(500).json({ message: "Error placing order." });
  }
});

//endpoint to get all the orders
app.get("/all-orders", verifyToken, async (req, res) => {
  try {
    const userId = req?.userId;
    const orders = await orderModel.find({ user: userId }).populate("user");

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: "No orders found." });
    }

    res.status(200).json({ orders });
  } catch (err) {
    console.log("Error fetching orders", err);
    res.status(500).json({ message: "Error fetching orders." });
  }
});

//endpoint to change password through email

app.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req?.body;

    const user = await userModel.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const resetToken = crypto.randomBytes(20).toString("hex");

    user.resetToken = resetToken;

    await user.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "dropstoredotlive@gmail.com",
        pass: "xuzaslpypdvqosvc",
      },
    });

    const mailOptions = {
      from: "dropstore.live",
      to: email,
      subject: "Reset your password",
      html: `<div style={{display: "flex", alignItems: "center", justifyContent: "center", marginHorizontal: "auto", backgroundColor: "#333"}}> <div><img src="https://res.cloudinary.com/dzwuseok5/image/upload/v1716884320/dropstoreProducts/vad7bq0wpb59zoynngtz.png" style={{height: 100, width: 100, resizeMode: "cover"}}/></div> <div><p>Greetings from Dropstore.</p></div> <div>Click the below link to reset your password.</div><div><a href="https://drop-store.me/reset-password/${resetToken}" >Reset Password.</a></div> </div>`,
    };

    await transporter.sendMail(mailOptions);

    res
      .status(200)
      .json({ message: "Reset password link sent to your email." });
  } catch (err) {
    console.log("Error changing password", err);
    res.status(500).json({ message: "Error changing password." });
  }
});

//endpoint to reset password

app.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    const user = await userModel.findOne({ resetToken: token });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token." });
    }

    user.password = newPassword;
    user.resetToken = undefined;

    await user.save();

    res.status(200).json({ message: "Password reset successfully!" });
  } catch (err) {
    console.log("Error resetting password", err);
    res.status(500).json({ message: "Error resetting password." });
  }
});
