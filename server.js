require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Cashfree } = require('cashfree-pg');

const app = express();
app.use(cors());
app.use(express.json());

const cashfree = new Cashfree(Cashfree.SANDBOX, process.env.APP_ID, process.env.SECRET_KEY);

app.post('/create-order', async (req, res) => {
    const { orderAmount, customerEmail, customerPhone } = req.body;
    const orderId = `order_${Date.now()}`;

    const request = {
        order_id: orderId,
        order_amount: orderAmount,
        order_currency: 'INR',
        customer_details: {
            customer_id: customerPhone,
            customer_email: customerEmail,
            customer_phone: customerPhone
        },
        order_meta: {
            return_url: `https://yourdomain.com/payment-success?order_id={order_id}`
        }
    };

    try {
        const response = await cashfree.PGCreateOrder(request);
        res.json({
            orderId: orderId,
            paymentSessionId: response.data.payment_session_id
        });
    } catch (error) {
        console.error('Cashfree error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Order creation failed' });
    }
});

app.listen(process.env.PORT || 3000, () => console.log('Backend server running'));
