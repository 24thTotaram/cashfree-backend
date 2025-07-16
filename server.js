require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Cashfree } = require('cashfree-pg');

const app = express();
app.use(cors({
    origin: ["https://revachi-ai.com", "http://localhost:5173"], // add your production + dev frontend URLs here
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

// Initialize Cashfree with your credentials
Cashfree.XClientId = process.env.APP_ID;
Cashfree.XClientSecret = process.env.SECRET_KEY;
Cashfree.XEnvironment = Cashfree.Environment.SANDBOX; // Change to PRODUCTION when going live

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
            customer_id: `customer_${Date.now()}`, // Generate unique customer ID
            customer_email: customerEmail,
            customer_phone: customerPhone,
            customer_name: customerName || 'Customer' // Add customer name
        },
        order_meta: {
            // Use the dynamic return URL from frontend, or fallback to default
            return_url: returnUrl || `https://revachi-ai.com/payment-success?order_id={order_id}`,
            // Optional: Add notify URL for server-to-server callbacks
            notify_url: notifyUrl || null
        },
        // Add order expiry time (optional - 30 minutes from now)
        order_expiry_time: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    };

    try {
        const response = await Cashfree.PGCreateOrder("2023-08-01", request);

        // Send back both orderId and paymentSessionId
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

// Optional: Add an endpoint to verify payment status
app.post('/verify-payment', async (req, res) => {
    const { orderId } = req.body;

    try {
        const response = await Cashfree.PGOrderFetchPayments("2023-08-01", orderId);

        // Check if any payment is successful
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

// Optional: Webhook endpoint to receive payment notifications
app.post('/payment-webhook', express.raw({ type: 'application/json' }), (req, res) => {
    try {
        const signature = req.get('x-webhook-signature');
        const timestamp = req.get('x-webhook-timestamp');
        const rawBody = req.body.toString('utf8');

        // Verify webhook signature (implement based on Cashfree docs)
        // const isValid = verifyWebhookSignature(signature, timestamp, rawBody);

        const webhookData = JSON.parse(rawBody);
        console.log('Webhook received:', webhookData);

        // Process webhook based on event type
        if (webhookData.type === 'PAYMENT_SUCCESS_WEBHOOK') {
            // Handle successful payment
            console.log('Payment successful for order:', webhookData.data.order.order_id);
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(400).send('Webhook processing failed');
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});