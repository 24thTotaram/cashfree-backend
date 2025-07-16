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
        returnUrl,
        notifyUrl
    } = req.body;

    const orderId = `order_${Date.now()}`;

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
            return_url: returnUrl || `https://revachi-ai.com/payment-success?order_id={order_id}`,
            notify_url: notifyUrl || null
        },
        order_expiry_time: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    };

    try {
        const response = await cashfree.PGCreateOrder(request);
        res.json({
            orderId: orderId,
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

// ✅ Verify Payment
app.post('/verify-payment', async (req, res) => {
    const { orderId } = req.body;

    try {
        const response = await cashfree.PGOrderFetchPayments(orderId);
        const successfulPayment = response.data.find(payment =>
            payment.payment_status === 'SUCCESS'
        );

        res.json({
            success: !!successfulPayment,
            paymentDetails: successfulPayment || null,
            allPayments: response.data
        });
    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({
            error: 'Payment verification failed',
            message: error.response?.data?.message || error.message
        });
    }
});

// ✅ Webhook (optional)
app.post('/payment-webhook', express.raw({ type: 'application/json' }), (req, res) => {
    try {
        const signature = req.get('x-webhook-signature');
        const timestamp = req.get('x-webhook-timestamp');
        const rawBody = req.body.toString('utf8');

        // TODO: Verify webhook signature (based on Cashfree docs)
        const webhookData = JSON.parse(rawBody);
        console.log('Webhook received:', webhookData);

        if (webhookData.type === 'PAYMENT_SUCCESS_WEBHOOK') {
            console.log('Payment successful for order:', webhookData.data.order.order_id);
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(400).send('Webhook processing failed');
    }
});

// ✅ Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
    console.log(`Environment: ${process.env.cashfree_env}`);
});
