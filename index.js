const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const moment = require("moment");

const app = express();
app.use(express.json());
app.use(cors());
app.use(bodyParser.json());
dotenv.config();

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_DB_URL)
  .then(() => {
    console.log("Connected to MONGODB");
  })
  .catch((err) => {
    console.log("Error connecting database", err);
  });

app.listen(PORT, () => {
  console.log(`Server is running on PORT ${PORT}`);
});

app.get("/", (req, res) => {
  res.send("Hello from Dropstore API");
});

const userModel = require("./models/UserModel");
const productModel = require("./models/ProductModel");
const cartModel = require("./models/CartModel");
const addressModel = require("./models/AddressModel");
const orderModel = require("./models/OrderModel");
const reviewModel = require("./models/ReviewsModel");
const trendingModel = require("./models/TrendingModel");
const generateCustomID = require("./helpers/customUserId");
const generateOrderID = require("./helpers/customOrderId");
const homeCategoriesModel = require("./models/HomeCategoriesModel");
const { sendWhatsAppMessage } = require("./helpers/whatsappService");

//endpoint to login user
app.post("/login", async (req, res) => {
  try {
    const { mobileNo } = req.body;

    let user = await userModel.findOne({ mobileNo });

    if (!user) {
      const otp = Math.floor(1000 + Math.random() * 9000);
      const customId = await generateCustomID();

      const newUser = new userModel({
        mobileNo,
        otp,
        _id: customId,
      });

      await newUser.save();

      const message = `*${otp}* is your verification code.\nFor your security, don't share this code with anyone.`;
      sendWhatsAppMessage(mobileNo, message);

      return res.json({ message: "success" });
    }

    const otp = Math.floor(1000 + Math.random() * 9000);
    user.otp = otp;
    await user.save();

    const message = `*${otp}* is your verification code.\nFor your security, don't share this code with anyone.`;
    sendWhatsAppMessage(mobileNo, message);

    res.json({ message: "success" });
  } catch (err) {
    console.log("Error logging in user", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//endpoint to verify otp
app.post("/verify-otp", async (req, res) => {
  try {
    const { mobileNo, enteredOtp } = req.body;

    const user = await userModel.findOne({ mobileNo });

    if (!user) {
      res.json({ message: "User does not exist" });
      console.log("User does not exist");
    }

    const otp = user.otp;

    if (otp == enteredOtp) {
      // user.pushToken = pushToken;
      user.otp = undefined;
      await user.save();
      if (user.verified === false) {
        res.json({ message: "registration-pending" });
        console.log("Registration pending");
      } else if (user.verified === true) {
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
        res.json({ message: "success", token });
        console.log("User logged in successfully");
      }
    } else {
      res.json({ message: "invalid-otp" });
    }
  } catch (err) {
    console.log("Error verifying OTP", err);
    res.json({ error: "Internal Server Error " });
  }
});

//endpoint to resend otp
app.post("/resend-otp", async (req, res) => {
  try {
    const { mobileNo } = req.body;
    const user = await userModel.findOne({ mobileNo });

    if (!user) {
      return res.json({ message: "User does not exist" });
    }

    const otp = Math.floor(1000 + Math.random() * 9000);

    user.otp = otp;
    await user.save();

    const message = `*${otp}* is your verification code.
For your security, don't share this code with anyone.`;

    sendWhatsAppMessage(mobileNo, message);
    res.json({ message: "success" });
  } catch (err) {
    console.log("Error resending OTP", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//endpoint to register user
app.post("/register", async (req, res) => {
  try {
    const { name, mobileNo } = req.body;

    const user = await userModel.findOne({ mobileNo });

    user.name = name;
    user.verified = true;

    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({ message: "success", token });
  } catch (err) {
    console.log("Error registering user", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//endpoint to get user details
app.get("/user", async (req, res) => {
  try {
    const authToken = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
    const user = await userModel.findById(decoded.id);
    res.json(user);
  } catch (err) {
    console.log("Error getting user details", err);
    res.json({ error: "Internal Server Error" });
  }
});

//endpoint to fetch category products
app.get("/category/:category", async (req, res) => {
  try {
    const category = req.params.category;
    const products = await productModel.find({ category }).limit(10);
    res.json(products);
  } catch (err) {
    console.log("Error fetching category products", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//endpoint to fetch all category products
app.get("/category-all/:category", async (req, res) => {
  try {
    const category = req.params.category;
    const products = await productModel.find({ category });
    res.json(products);
  } catch (err) {
    console.log("Error fetching category products", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//endpoint to fetch product details
app.get("/product/:productId", async (req, res) => {
  try {
    const productId = req.params.productId;
    const product = await productModel.findById(productId);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
  } catch (err) {
    console.log("Error fetching product details", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//endpoint to add product to cart
app.post("/add-to-cart", async (req, res) => {
  try {
    const { productId, quantity, userId } = req.body;

    const product = await productModel.findById(productId);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const cart = new cartModel({
      productId: productId,
      quantity: quantity,
      userId: userId,
    });

    await cart.save();

    res.json({ message: "Product added to cart" });
  } catch (err) {
    console.log("Error adding product to cart", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//endpoint to fetch cart items
app.get("/cart", async (req, res) => {
  try {
    const userId = req.query.userId;

    const cart = await cartModel.find({ userId });

    const cartItems = await Promise.all(
      cart.map(async (item) => {
        const product = await productModel.findById(item.productId);
        return {
          ...product._doc,
          quantity: item.quantity,
        };
      })
    );

    res.json(cartItems);
  } catch (err) {
    console.log("Error fetching cart items", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//endpoint to check if product is in cart
app.get("/check-cart", async (req, res) => {
  try {
    const productId = req.query.productId;
    const userId = req.query.userId;
    const product = await productModel.findById(productId);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const cart = await cartModel.findOne({ productId, userId });

    if (!cart) {
      return res.json({ message: "Product not in cart" });
    }

    res.json({ message: "Product is in cart" });
  } catch (err) {
    console.log("Error checking if product is in cart", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//endpoint to increase product quantity in cart
app.post("/increase-quantity", async (req, res) => {
  try {
    const { productId, userId } = req.body;

    const cart = await cartModel.findOne({ productId, userId });

    if (!cart) {
      return res.status(404).json({ error: "Product not found in cart" });
    }

    cart.quantity += 1;
    await cart.save();

    res.json({ message: "Quantity increased successfully" });
  } catch (err) {
    console.log("Error increasing quantity", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//endpoint to decrease product quantity in cart
app.post("/decrease-quantity", async (req, res) => {
  try {
    const { productId, userId } = req.body;

    const cart = await cartModel.findOne({
      productId,
      userId,
    });

    if (!cart) {
      return res.status(404).json({ error: "Product not found in cart" });
    }

    if (cart.quantity === 1) {
      await cartModel.findByIdAndDelete(cart._id);
      return res.json({ message: "Product removed from cart" });
    }

    cart.quantity -= 1;
    await cart.save();
    res.json({ message: "Quantity decreased successfully" });
  } catch (err) {
    console.log("Error decreasing quantity", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//endpoint to add address
app.post("/add-address", async (req, res) => {
  try {
    const { userId, name, mobileNo, postalCode, landmark, houseNo, street } =
      req.body;

    if (!userId || !name || !mobileNo || !postalCode || !landmark || !street) {
      return res.json({ error: "All fields are required" });
    }

    const address = new addressModel({
      userId,
      name,
      mobileNo,
      postalCode,
      landmark,
      houseNo,
      street,
    });

    await address.save();

    res.json({ message: "success" });
  } catch (err) {
    console.log("Error adding address", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//endpoint to edit address
app.post("/edit-address", async (req, res) => {
  try {
    const { addressId, name, mobileNo, postalCode, landmark, houseNo, street } =
      req.body;

    await addressModel.findByIdAndUpdate(addressId, {
      name,
      mobileNo,
      postalCode,
      landmark,
      houseNo,
      street,
    });

    res.json({ message: "success" });
  } catch (err) {
    console.log("Error editing address", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//endpoint to fetch user addresses
app.get("/addresses", async (req, res) => {
  try {
    const userId = req.query.userId;
    const addresses = await addressModel
      .find({ userId })
      .sort({ timeStamp: -1 });

    res.json(addresses);
  } catch (err) {
    console.log("Error fetching addresses", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//endpoint to delete address
app.post("/delete-address", async (req, res) => {
  try {
    const { addressId } = req.body;

    await addressModel.findByIdAndDelete(addressId);
    res.json({ message: "Address deleted successfully" });
  } catch (err) {
    console.log("Error deleting address", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//endpoint to place order
app.post("/place-order", async (req, res) => {
  try {
    const {
      userId,
      address,
      cart,
      paymentMethod,
      finalAmount,
      deliveryCharge,
    } = req.body;

    const customOrderId = await generateOrderID();

    const order = new orderModel({
      userId,
      address,
      cart,
      finalAmount,
      paymentMethod,
      deliveryCharge,
      _id: customOrderId,
    });

    await order.save();

    await Promise.all(
      cart.map(async (item) => {
        await cartModel.findOneAndDelete({
          productId: item?._id,
          userId: userId,
        });
      })
    );

    res.json({ message: "success" });

    const message = `Dear *${address?.name}*, \n\nYour order *_#${order?._id}_* has been successfully placed.\n\nThank you for your purchase!\n\nRegards, Dropstore`;

    const adminMessage = `*Order received from ${address?.name} at ${moment(
      address?.timeStamp
    ).format("MMM DD, YYYY, HH:mm A")}.*\n\n*Order ID: _#${
      order?._id
    }_.*\n\n*Please deliver it before ${moment(address?.timeStamp).format(
      "MMM, DD, YYYY, HH:mm A"
    )}* \n\n*Regards, Dropstore*`;

    const adminMobileNumber = ["8439199567", "9837689005", "9456584813"];

    const mobileNumber = address?.mobileNo.startsWith("+91")
      ? address?.mobileNo.slice(3)
      : address?.mobileNo.startsWith("91")
      ? address?.mobileNo.slice(2)
      : address?.mobileNo;
    await sendWhatsAppMessage(mobileNumber, message);
    adminMobileNumber.map(async (mobile) => {
      await sendWhatsAppMessage(mobile, adminMessage);
    });
    // await sendWhatsAppMessage("9456584813", adminMessage);
  } catch (err) {
    console.log("Error placing order", err);
    res.json({ error: "Internal Server Error" });
  }
});

//endpoint to fetch user orders
app.get("/orders", async (req, res) => {
  try {
    const userId = req.query.userId;
    const orders = await orderModel.find({ userId }).sort({ timeStamp: -1 });

    res.json(orders);
  } catch (err) {
    console.log("Error fetching orders", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//endpoint to search products
app.get("/search", async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ message: "Query parameter is required" });
    }

    const searchCriteria = {
      $or: [
        { productName: { $regex: query, $options: "i" } },
        { brandName: { $regex: query, $options: "i" } },
        { category: { $regex: query, $options: "i" } },
      ],
    };

    const products = await productModel.find(searchCriteria);

    res.json({ products });
  } catch (error) {
    console.error("Error searching for products:", error);
    res.status(500).json({ message: "Server error" });
  }
});

//endpoint to submit feedback
app.post("/submit-feedback", async (req, res) => {
  try {
    const { userId, productId, ratings, comment, pictures } = req.body;

    const user = await userModel.findById(userId);
    const product = await productModel.findById(productId);

    const review = new reviewModel({
      userId,
      product: product.productName,
      name: user.name,
      productId,
      rating: ratings,
      comment,
      pictures,
    });

    await review.save();

    res.json({ message: "success" });
  } catch (err) {
    console.log("Error submitting feedback", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//endpoint to fetch product reviews
app.get("/reviews", async (req, res) => {
  try {
    const { productId } = req.query;
    const reviews = await reviewModel.find({ productId });
    res.json({ message: "success", reviews });
  } catch (err) {
    console.log("Error fetching reviews", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//endpoint to delete review
app.post("/delete-review", async (req, res) => {
  try {
    const { reviewId } = req.body;
    const review = await reviewModel.findById(reviewId);

    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    await reviewModel.findByIdAndDelete(reviewId);

    res.json({ message: "success" });
  } catch (err) {
    console.log("Error deleting review", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//endpoint to get the trending category data
app.get("/get-trending-category", async (req, res) => {
  try {
    const categories = await trendingModel.find();
    res.json({ message: "success", categories });
  } catch (err) {
    console.log("Error getting trending category", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//endpoint to get delivery status
app.get("/delivery-status", async (req, res) => {
  try {
    const { orderId } = req.query;
    const order = await orderModel.findById(orderId);

    res.json({ message: "success", status: order?.deliveryStatus });
  } catch (err) {
    console.log("Error getting delivery status", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//endpoint to cancel order
app.post("/cancel-order", async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await orderModel.findById(orderId);

    order.deliveryStatus = "cancelled";

    await order.save();

    res.json({ message: "success" });

    const message = `Dear *${order?.address?.name}*,\n\nYour request to cancel order *_#${orderId}_* has been successfully processed.\n\nIf you have any questions or need further assistance, please don’t hesitate to reach out.\n\nThank you for your understanding.\n\nBest regards,\nDropstore`;
    await sendWhatsAppMessage(order?.address?.mobileNo, message);
  } catch (err) {
    console.log("Error cancelling order", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//endpoint to set product out of stock
app.post("/set-out-of-stock", async (req, res) => {
  try {
    const { productId } = req.body;

    await productModel.findByIdAndUpdate(productId, { isAvailable: false });

    res.json({ message: "success" });
  } catch (err) {
    console.log("Error setting product out of stock", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//endpoint to set product in stock
app.post("/set-in-stock", async (req, res) => {
  try {
    const { productId } = req.body;
    await productModel.findByIdAndUpdate(productId, { isAvailable: true });
    res.json({ message: "success" });
  } catch (err) {
    console.log("Error setting product in stock", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//endpoint to get home category products
app.get("/get-home-categories", async (req, res) => {
  try {
    const categories = await homeCategoriesModel.find();
    res.json(categories);
  } catch (err) {
    console.log("Error fetching home category products", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
