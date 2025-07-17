require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Cashfree } = require('cashfree-pg');

const app = express();
app.use(cors({
    origin: ["https://revachi-ai.com", "http://localhost:5173", "https://330d3dfb3f1f.ngrok-free.app"],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
}));
app.use(express.json());

const cashfree = new Cashfree(Cashfree.SANDBOX, process.env.APP_ID, process.env.SECRET_KEY);



// ✅ Create Order
app.post('/create-order', async (req, res) => {
    const {
        orderAmount,
        customerEmail,
        customerPhone,
        customerName,
        notifyUrl,
        planId,
        billingCycle
    } = req.body;

    const orderId = `order_${Date.now()}`;
    const BASE = 'http://localhost:5173'; // 👈 change this to your frontend domain when deploying

    const request = {
        order_id: orderId,
        order_amount: orderAmount,
        order_currency: 'INR',
        customer_details: {
            customer_id: `customer_${Date.now()}`,
            customer_email: customerEmail,
            customer_phone: customerPhone,
            customer_name: customerName || 'Customer'
        },
        order_meta: {
            return_url:
                `${BASE}/payment-success?order_id={order_id}` +
                `&plan_id=${planId}` +
                `&billing_cycle=${billingCycle}`,
            notify_url: notifyUrl || null
        },
        order_expiry_time: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    };

    try {
        const response = await cashfree.PGCreateOrder(request);
        res.json({
            orderId,
            paymentSessionId: response.data.payment_session_id,
            orderStatus: response.data.order_status
        });
    } catch (error) {
        console.error('Cashfree error:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Order creation failed',
            message: error.response?.data?.message || error.message
        });
    }
});
