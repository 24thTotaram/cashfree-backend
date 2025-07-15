require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const CASHFREE_APP_ID = process.env.APP_ID;
const CASHFREE_SECRET_KEY = process.env.SECRET_KEY;

app.post("/create-order", async (req, res) => {
  const { orderAmount, customerEmail, customerPhone } = req.body;
  const orderId = `order_${Date.now()}`;

  try {
    const response = await axios.post(
      "https://sandbox.cashfree.com/pg/orders",
      {
        order_id: orderId,
        order_amount: orderAmount,
        order_currency: "INR",
        customer_details: {
          customer_id: customerPhone,
          customer_email: customerEmail,
          customer_phone: customerPhone
        },
        order_meta: {
          return_url: "https://revachi-ai.com/payment-success?order_id={order_id}"
        }
      },
      {
        headers: {
          "x-client-id": CASHFREE_APP_ID,
          "x-client-secret": CASHFREE_SECRET_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({
      orderId: orderId,
      paymentSessionId: response.data.payment_session_id
    });
  } catch (err) {
    console.error("Cashfree error:", err.response?.data || err.message);
    res.status(500).send("Failed to create order");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
