// require('dotenv').config();
// const express = require('express');
// const cors = require('cors');
// const { Cashfree } = require('cashfree-pg');
// const paypal = require('@paypal/checkout-server-sdk');
//
// const app = express();
// app.use(cors({
//     origin: ["https://revachi-ai.com", "http://localhost:5173", "https://330d3dfb3f1f.ngrok-free.app"],
//     methods: ["GET", "POST"],
//     allowedHeaders: ["Content-Type"]
// }));
// app.use(express.json());
//
// // Cashfree Configuration
// const cashfree = new Cashfree(Cashfree.SANDBOX, process.env.APP_ID, process.env.SECRET_KEY);
//
// // PayPal Configuration
// function environment() {
//     const clientId = process.env.PAYPAL_CLIENT_ID;
//     const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
//
//     // Use sandbox for development
//     return new paypal.core.SandboxEnvironment(clientId, clientSecret);
//     // For production, use: return new paypal.core.LiveEnvironment(clientId, clientSecret);
// }
//
// const client = () => {
//     return new paypal.core.PayPalHttpClient(environment());
// };
//
// // ✅ CASHFREE - Create Order
// app.post('/create-order', async (req, res) => {
//     const {
//         orderAmount,
//         customerEmail,
//         customerPhone,
//         customerName,
//         notifyUrl,
//         planId,
//         billingCycle
//     } = req.body;
//
//     const orderId = `order_${Date.now()}`;
//     const BASE = 'http://localhost:5173'; // 👈 change this to your frontend domain when deploying
//
//     const request = {
//         order_id: orderId,
//         order_amount: orderAmount,
//         order_currency: 'INR',
//
//
//         customer_details: {
//             customer_id: `customer_${Date.now()}`,
//             customer_email: customerEmail,
//             customer_phone: customerPhone,
//             customer_name: customerName || 'Customer'
//         },
//         order_meta: {
//             return_url:
//                 `${BASE}/payment-success?order_id={order_id}` +
//                 `&plan_id=${planId}` +
//                 `&billing_cycle=${billingCycle}`,
//             notify_url: notifyUrl || null
//         },
//         order_expiry_time: new Date(Date.now() + 30 * 60 * 1000).toISOString()
//     };
//
//     try {
//         const response = await cashfree.PGCreateOrder(request);
//         res.json({
//             orderId,
//             paymentSessionId: response.data.payment_session_id,
//             orderStatus: response.data.order_status
//         });
//     } catch (error) {
//         console.error('Cashfree error:', error.response?.data || error.message);
//         res.status(500).json({
//             error: 'Order creation failed',
//             message: error.response?.data?.message || error.message
//         });
//     }
// });
//
// // ✅ PAYPAL - Create Order
// app.post('/paypal/create-order', async (req, res) => {
//     const {
//         orderAmount,
//         customerEmail,
//         customerName,
//         planId,
//         billingCycle,
//         planName
//     } = req.body;
//
//     const request = new paypal.orders.OrdersCreateRequest();
//
//     const BASE = 'http://localhost:5173'; // 👈 change this to your frontend domain when deploying
//
//     request.prefer("return=representation");
//     request.requestBody({
//         intent: 'CAPTURE',
//         purchase_units: [{
//             reference_id: `${planId}_${Date.now()}`,
//             description: `${planName} Plan - ${billingCycle} subscription`,
//             amount: {
//                 currency_code: 'USD',
//                 value: orderAmount.toFixed(2)
//             }
//         }],
//         application_context: {
//             brand_name: 'Revachi AI',
//             landing_page: 'NO_PREFERENCE',
//             user_action: 'PAY_NOW',
//             return_url: `${BASE}/payment-success?plan_id=${planId}&billing_cycle=${billingCycle}&payment_method=paypal`,
//             cancel_url: `${BASE}/fullpricing?cancelled=true`
//         }
//     });
//
//     try {
//         const order = await client().execute(request);
//
//         // Find the approval URL
//         const approvalUrl = order.result.links.find(link => link.rel === 'approve').href;
//
//         res.json({
//             orderId: order.result.id,
//             approvalUrl: approvalUrl,
//             orderStatus: order.result.status
//         });
//     } catch (error) {
//         console.error('PayPal create order error:', error);
//         res.status(500).json({
//             error: 'PayPal order creation failed',
//             message: error.message
//         });
//     }
// });
//
// // ✅ PAYPAL - Capture Order (after user approval)
// app.post('/paypal/capture-order', async (req, res) => {
//     const { orderId } = req.body;
//
//     const request = new paypal.orders.OrdersCaptureRequest(orderId);
//     request.requestBody({});
//
//     try {
//         const capture = await client().execute(request);
//
//         res.json({
//             success: true,
//             orderId: capture.result.id,
//             paymentDetails: {
//                 id: capture.result.id,
//                 status: capture.result.status,
//                 payer: capture.result.payer,
//                 purchase_units: capture.result.purchase_units
//             }
//         });
//     } catch (error) {
//         console.error('PayPal capture error:', error);
//         res.status(500).json({
//             success: false,
//             error: 'PayPal capture failed',
//             message: error.message
//         });
//     }
// });
//
// // ✅ PAYPAL - Get Order Details
// app.get('/paypal/order/:orderId', async (req, res) => {
//     const { orderId } = req.params;
//
//     const request = new paypal.orders.OrdersGetRequest(orderId);
//
//     try {
//         const order = await client().execute(request);
//         res.json({
//             success: true,
//             orderDetails: order.result
//         });
//     } catch (error) {
//         console.error('PayPal get order error:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to get PayPal order details',
//             message: error.message
//         });
//     }
// });
//
// // ✅ CASHFREE - Verify Payment
// app.post('/verify-payment', async (req, res) => {
//     const { orderId } = req.body;
//
//     try {
//         const response = await cashfree.PGOrderFetchPayments(orderId);
//         const successfulPayment = response.data.find(payment =>
//             payment.payment_status === 'SUCCESS'
//         );
//
//         res.json({
//             success: !!successfulPayment,
//             paymentDetails: successfulPayment || null,
//             allPayments: response.data
//         });
//     } catch (error) {
//         console.error('Payment verification error:', error);
//         res.status(500).json({
//             error: 'Payment verification failed',
//             message: error.response?.data?.message || error.message
//         });
//     }
// });
//
// // ✅ Webhook (optional)
// app.post('/payment-webhook', express.json(), (req, res) => {
//     try {
//         const webhookData = req.body;
//         console.log('Webhook received:', webhookData);
//         res.status(200).send('OK');
//     } catch (err) {
//         console.error('Webhook error:', err);
//         res.status(400).send('Webhook error');
//     }
// });
//
// // ✅ Health check
// app.get('/health', (req, res) => {
//     res.json({
//         status: 'OK',
//         timestamp: new Date().toISOString(),
//         paypal: !!process.env.PAYPAL_CLIENT_ID,
//         cashfree: !!process.env.APP_ID
//     });
// });
//
// // ✅ Start server
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//     console.log(`Backend server running on port ${PORT}`);
//     console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
//     console.log(`PayPal configured: ${!!process.env.PAYPAL_CLIENT_ID}`);
//     console.log(`Cashfree configured: ${!!process.env.APP_ID}`);
// });


// require('dotenv').config();
// const express = require('express');
// const cors = require('cors');
// const { Cashfree } = require('cashfree-pg');
// const paypal = require('@paypal/checkout-server-sdk');
// const admin = require('firebase-admin');
//
// const app = express();
// app.use(cors({
//     origin: ["https://revachi-ai.com", "http://localhost:5173", "https://330d3dfb3f1f.ngrok-free.app"],
//     methods: ["GET", "POST"],
//     allowedHeaders: ["Content-Type"]
// }));
// app.use(express.json());
//
// // Firebase Admin initialization
// if (!admin.apps.length) {
//     admin.initializeApp({
//         credential: admin.credential.cert({
//             projectId: process.env.FIREBASE_PROJECT_ID,
//             clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
//             privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
//         })
//     });
// }
//
// const db = admin.firestore();
//
// // Plan configurations
// const plans = {
//     basic: {
//         name: 'Basic',
//         monthlyPrice: 1.99,
//         yearlyPrice: 99.99,
//         imagesPerMonth: 100,
//         monthlyPriceINR: 199,
//         yearlyPriceINR: 999
//     },
//     pro: {
//         name: 'Pro',
//         monthlyPrice: 2.99,
//         yearlyPrice: 299.99,
//         imagesPerMonth: 1000,
//         monthlyPriceINR: 299,
//         yearlyPriceINR: 2999
//     },
//     enterprise: {
//         name: 'Enterprise',
//         monthlyPrice: 9.99,
//         yearlyPrice: 999.99,
//         imagesPerMonth: 5000,
//         monthlyPriceINR: 999,
//         yearlyPriceINR: 9999
//     }
// };
//
// // Helper function to save subscription to Firebase
// async function saveSubscriptionToFirebase(subscriptionData) {
//     try {
//         const userRef = db.collection('subscriptions').doc(subscriptionData.userId);
//         await userRef.set(subscriptionData, { merge: true });
//         console.log('Subscription saved to Firebase:', subscriptionData.userId);
//         return true;
//     } catch (error) {
//         console.error('Error saving subscription to Firebase:', error);
//         return false;
//     }
// }
//
// // Helper function to calculate next billing date
// function calculateNextBillingDate(billingCycle) {
//     const now = new Date();
//     if (billingCycle === 'yearly') {
//         return new Date(now.setFullYear(now.getFullYear() + 1));
//     } else {
//         return new Date(now.setMonth(now.getMonth() + 1));
//     }
// }
//
// // Cashfree Configuration
// const cashfree = new Cashfree(Cashfree.SANDBOX, process.env.APP_ID, process.env.SECRET_KEY);
//
// // PayPal Configuration
// function environment() {
//     const clientId = process.env.PAYPAL_CLIENT_ID;
//     const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
//     return new paypal.core.SandboxEnvironment(clientId, clientSecret);
// }
//
// const client = () => {
//     return new paypal.core.PayPalHttpClient(environment());
// };
//
// // ✅ CASHFREE - Create Order
// app.post('/create-order', async (req, res) => {
//     const {
//         orderAmount,
//         customerEmail,
//         customerPhone,
//         customerName,
//         notifyUrl,
//         planId,
//         billingCycle,
//         userId
//     } = req.body;
//
//     const orderId = `order_${Date.now()}`;
//     const BASE = 'http://localhost:5173';
//
//     const request = {
//         order_id: orderId,
//         order_amount: orderAmount,
//         order_currency: 'INR',
//         customer_details: {
//             customer_id: `customer_${Date.now()}`,
//             customer_email: customerEmail,
//             customer_phone: customerPhone,
//             customer_name: customerName || 'Customer'
//         },
//         order_meta: {
//             return_url:
//                 `${BASE}/payment-success?order_id={order_id}` +
//                 `&plan_id=${planId}` +
//                 `&billing_cycle=${billingCycle}` +
//                 `&user_id=${userId}`,
//             notify_url: notifyUrl || null
//         },
//         order_expiry_time: new Date(Date.now() + 30 * 60 * 1000).toISOString()
//     };
//
//     try {
//         const response = await cashfree.PGCreateOrder(request);
//         res.json({
//             orderId,
//             paymentSessionId: response.data.payment_session_id,
//             orderStatus: response.data.order_status
//         });
//     } catch (error) {
//         console.error('Cashfree error:', error.response?.data || error.message);
//         res.status(500).json({
//             error: 'Order creation failed',
//             message: error.response?.data?.message || error.message
//         });
//     }
// });
//
// // ✅ PAYPAL - Create Order
// app.post('/paypal/create-order', async (req, res) => {
//     const {
//         orderAmount,
//         customerEmail,
//         customerName,
//         planId,
//         billingCycle,
//         planName,
//         userId
//     } = req.body;
//
//     const request = new paypal.orders.OrdersCreateRequest();
//     const BASE = 'http://localhost:5173';
//
//     request.prefer("return=representation");
//     request.requestBody({
//         intent: 'CAPTURE',
//         purchase_units: [{
//             reference_id: `${planId}_${Date.now()}`,
//             description: `${planName} Plan - ${billingCycle} subscription`,
//             amount: {
//                 currency_code: 'USD',
//                 value: orderAmount.toFixed(2)
//             }
//         }],
//         application_context: {
//             brand_name: 'Revachi AI',
//             landing_page: 'NO_PREFERENCE',
//             user_action: 'PAY_NOW',
//             return_url: `${BASE}/payment-success?plan_id=${planId}&billing_cycle=${billingCycle}&payment_method=paypal&user_id=${userId}`,
//             cancel_url: `${BASE}/fullpricing?cancelled=true`
//         }
//     });
//
//     try {
//         const order = await client().execute(request);
//         const approvalUrl = order.result.links.find(link => link.rel === 'approve').href;
//
//         res.json({
//             orderId: order.result.id,
//             approvalUrl: approvalUrl,
//             orderStatus: order.result.status
//         });
//     } catch (error) {
//         console.error('PayPal create order error:', error);
//         res.status(500).json({
//             error: 'PayPal order creation failed',
//             message: error.message
//         });
//     }
// });
//
// // ✅ PAYPAL - Capture Order (after user approval)
// app.post('/paypal/capture-order', async (req, res) => {
//     const { orderId, planId, billingCycle, userId } = req.body;
//
//     const request = new paypal.orders.OrdersCaptureRequest(orderId);
//     request.requestBody({});
//
//     try {
//         const capture = await client().execute(request);
//
//         // Get plan details
//         const plan = plans[planId];
//         if (!plan) {
//             throw new Error('Invalid plan ID');
//         }
//
//         // Calculate amount based on billing cycle
//         const amount = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
//
//         // Save subscription to Firebase
//         const subscriptionData = {
//             userId: userId,
//             planId: planId,
//             planName: plan.name,
//             billingCycle: billingCycle,
//             amount: amount,
//             currency: 'USD',
//             imagesPerMonth: plan.imagesPerMonth,
//             paymentMethod: 'paypal',
//             paypalOrderId: capture.result.id,
//             status: 'active',
//             createdAt: new Date().toISOString(),
//             nextBillingDate: calculateNextBillingDate(billingCycle).toISOString(),
//             paymentDetails: {
//                 id: capture.result.id,
//                 status: capture.result.status,
//                 payer: capture.result.payer
//             }
//         };
//
//         const saved = await saveSubscriptionToFirebase(subscriptionData);
//         if (!saved) {
//             console.error('Failed to save subscription to Firebase');
//         }
//
//         res.json({
//             success: true,
//             orderId: capture.result.id,
//             paymentDetails: {
//                 id: capture.result.id,
//                 status: capture.result.status,
//                 payer: capture.result.payer,
//                 purchase_units: capture.result.purchase_units
//             }
//         });
//     } catch (error) {
//         console.error('PayPal capture error:', error);
//         res.status(500).json({
//             success: false,
//             error: 'PayPal capture failed',
//             message: error.message
//         });
//     }
// });
//
// // ✅ CASHFREE - Verify Payment
// app.post('/verify-payment', async (req, res) => {
//     const { orderId, planId, billingCycle, userId } = req.body;
//
//     try {
//         // First, try to get the payment status
//         const response = await cashfree.PGOrderFetchPayments(orderId);
//         const successfulPayment = response.data.find(payment =>
//             payment.payment_status === 'SUCCESS'
//         );
//
//         if (successfulPayment) {
//             // If plan info not provided in request, try to get order details
//             let finalPlanId = planId;
//             let finalBillingCycle = billingCycle;
//             let finalUserId = userId;
//
//             if (!finalPlanId || !finalBillingCycle || !finalUserId) {
//                 try {
//                     // Try to get order details using the correct method
//                     const orderResponse = await cashfree.PGFetchOrder(orderId);
//                     console.log('Order details:', orderResponse.data);
//
//                     const returnUrl = orderResponse.data.order_meta?.return_url || '';
//                     if (returnUrl) {
//                         const urlParts = returnUrl.split('?');
//                         if (urlParts.length > 1) {
//                             const urlParams = new URLSearchParams(urlParts[1]);
//                             finalPlanId = finalPlanId || urlParams.get('plan_id');
//                             finalBillingCycle = finalBillingCycle || urlParams.get('billing_cycle');
//                             finalUserId = finalUserId || urlParams.get('user_id');
//                         }
//                     }
//                 } catch (orderError) {
//                     console.warn('Could not fetch order details:', orderError.message);
//                     // Continue without order details if this fails
//                 }
//             }
//
//             console.log('Final payment details:', { finalPlanId, finalBillingCycle, finalUserId });
//
//             if (finalPlanId && finalBillingCycle && finalUserId) {
//                 const plan = plans[finalPlanId];
//                 if (plan) {
//                     // Calculate amount based on billing cycle
//                     const amount = finalBillingCycle === 'yearly' ? plan.yearlyPriceINR : plan.monthlyPriceINR;
//
//                     // Save subscription to Firebase
//                     const subscriptionData = {
//                         userId: finalUserId,
//                         planId: finalPlanId,
//                         planName: plan.name,
//                         billingCycle: finalBillingCycle,
//                         amount: amount,
//                         currency: 'INR',
//                         imagesPerMonth: plan.imagesPerMonth,
//                         paymentMethod: 'cashfree',
//                         cashfreeOrderId: orderId,
//                         status: 'active',
//                         createdAt: new Date().toISOString(),
//                         nextBillingDate: calculateNextBillingDate(finalBillingCycle).toISOString(),
//                         paymentDetails: successfulPayment
//                     };
//
//                     console.log('Saving subscription data:', subscriptionData);
//                     const saved = await saveSubscriptionToFirebase(subscriptionData);
//                     if (!saved) {
//                         console.error('Failed to save subscription to Firebase');
//                     } else {
//                         console.log('Subscription saved successfully to Firebase');
//                     }
//                 } else {
//                     console.error('Invalid plan ID:', finalPlanId);
//                 }
//             } else {
//                 console.error('Missing required payment details:', { finalPlanId, finalBillingCycle, finalUserId });
//             }
//         }
//
//         res.json({
//             success: !!successfulPayment,
//             paymentDetails: successfulPayment || null,
//             allPayments: response.data
//         });
//     } catch (error) {
//         console.error('Payment verification error:', error);
//         res.status(500).json({
//             error: 'Payment verification failed',
//             message: error.response?.data?.message || error.message
//         });
//     }
// });
//
// // ✅ Get Order Details
// app.get('/paypal/order/:orderId', async (req, res) => {
//     const { orderId } = req.params;
//     const request = new paypal.orders.OrdersGetRequest(orderId);
//
//     try {
//         const order = await client().execute(request);
//         res.json({
//             success: true,
//             orderDetails: order.result
//         });
//     } catch (error) {
//         console.error('PayPal get order error:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to get PayPal order details',
//             message: error.message
//         });
//     }
// });
//
// // ✅ Webhook (optional)
// app.post('/payment-webhook', express.json(), (req, res) => {
//     try {
//         const webhookData = req.body;
//         console.log('Webhook received:', webhookData);
//         res.status(200).send('OK');
//     } catch (err) {
//         console.error('Webhook error:', err);
//         res.status(400).send('Webhook error');
//     }
// });
//
// // ✅ Health check
// app.get('/health', (req, res) => {
//     res.json({
//         status: 'OK',
//         timestamp: new Date().toISOString(),
//         paypal: !!process.env.PAYPAL_CLIENT_ID,
//         cashfree: !!process.env.APP_ID,
//         firebase: !!process.env.FIREBASE_PROJECT_ID
//     });
// });
//
// // ✅ Start server
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//     console.log(`Backend server running on port ${PORT}`);
//     console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
//     console.log(`PayPal configured: ${!!process.env.PAYPAL_CLIENT_ID}`);
//     console.log(`Cashfree configured: ${!!process.env.APP_ID}`);
//     console.log(`Firebase configured: ${!!process.env.FIREBASE_PROJECT_ID}`);
// });


require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Cashfree } = require('cashfree-pg');
const paypal = require('@paypal/checkout-server-sdk');
const admin = require('firebase-admin');

const app = express();
app.use(cors({
    origin: ["https://revachi-ai.com", "http://localhost:5173", "https://330d3dfb3f1f.ngrok-free.app"],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
}));
app.use(express.json());

// Firebase Admin initialization
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        })
    });
}

const db = admin.firestore();

// Plan configurations
const plans = {
    basic: {
        name: 'Basic',
        monthlyPrice: 1.99,
        yearlyPrice: 99.99,
        imagesPerMonth: 100,
        monthlyPriceINR: 1.99,
        yearlyPriceINR: 99.99
    },
    pro: {
        name: 'Pro',
        monthlyPrice: 2.99,
        yearlyPrice: 299.99,
        imagesPerMonth: 1000,
        monthlyPriceINR: 2.99,
        yearlyPriceINR: 299.99
    },
    enterprise: {
        name: 'Enterprise',
        monthlyPrice: 9.99,
        yearlyPrice: 999.99,
        imagesPerMonth: 5000,
        monthlyPriceINR: 9.99,
        yearlyPriceINR: 999.99
    }
};

// Store order metadata temporarily (in production, use Redis or database)
const orderMetadata = new Map();

// Helper function to save subscription to Firebase
async function saveSubscriptionToFirebase(subscriptionData) {
    try {
        const userRef = db.collection('subscriptions').doc(subscriptionData.userId);
        await userRef.set(subscriptionData, { merge: true });
        console.log('Subscription saved to Firebase:', subscriptionData.userId);
        return true;
    } catch (error) {
        console.error('Error saving subscription to Firebase:', error);
        return false;
    }
}

// Helper function to calculate next billing date
function calculateNextBillingDate(billingCycle) {
    const now = new Date();
    if (billingCycle === 'yearly') {
        return new Date(now.setFullYear(now.getFullYear() + 1));
    } else {
        return new Date(now.setMonth(now.getMonth() + 1));
    }
}

// Cashfree Configuration
const cashfree = new Cashfree(Cashfree.SANDBOX, process.env.APP_ID, process.env.SECRET_KEY);

// PayPal Configuration
function environment() {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    return new paypal.core.SandboxEnvironment(clientId, clientSecret);
}

const client = () => {
    return new paypal.core.PayPalHttpClient(environment());
};

// ✅ CASHFREE - Create Order
app.post('/create-order', async (req, res) => {
    const {
        orderAmount,
        customerEmail,
        customerPhone,
        customerName,
        notifyUrl,
        planId,
        billingCycle,
        userId
    } = req.body;

    const orderId = `order_${Date.now()}`;
    const BASE = 'http://localhost:5173';

    // Store order metadata for later retrieval
    orderMetadata.set(orderId, {
        planId,
        billingCycle,
        userId,
        orderAmount,
        createdAt: new Date().toISOString()
    });

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
                `&billing_cycle=${billingCycle}` +
                `&user_id=${userId}`,
            notify_url: notifyUrl || null
        },
        order_expiry_time: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    };

    try {
        const response = await cashfree.PGCreateOrder(request);
        console.log('Cashfree order created:', { orderId, status: response.data.order_status });

        res.json({
            orderId,
            paymentSessionId: response.data.payment_session_id,
            orderStatus: response.data.order_status
        });
    } catch (error) {
        console.error('Cashfree error:', error.response?.data || error.message);
        // Clean up metadata on error
        orderMetadata.delete(orderId);

        res.status(500).json({
            error: 'Order creation failed',
            message: error.response?.data?.message || error.message
        });
    }
});

// ✅ PAYPAL - Create Order
app.post('/paypal/create-order', async (req, res) => {
    const {
        orderAmount,
        customerEmail,
        customerName,
        planId,
        billingCycle,
        planName,
        userId
    } = req.body;

    const request = new paypal.orders.OrdersCreateRequest();
    const BASE = 'http://localhost:5173';

    request.prefer("return=representation");
    request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [{
            reference_id: `${planId}_${Date.now()}`,
            description: `${planName} Plan - ${billingCycle} subscription`,
            amount: {
                currency_code: 'USD',
                value: orderAmount.toFixed(2)
            }
        }],
        application_context: {
            brand_name: 'Revachi AI',
            landing_page: 'NO_PREFERENCE',
            user_action: 'PAY_NOW',
            return_url: `${BASE}/payment-success?plan_id=${planId}&billing_cycle=${billingCycle}&payment_method=paypal&user_id=${userId}`,
            cancel_url: `${BASE}/fullpricing?cancelled=true`
        }
    });

    try {
        const order = await client().execute(request);
        const approvalUrl = order.result.links.find(link => link.rel === 'approve').href;

        res.json({
            orderId: order.result.id,
            approvalUrl: approvalUrl,
            orderStatus: order.result.status
        });
    } catch (error) {
        console.error('PayPal create order error:', error);
        res.status(500).json({
            error: 'PayPal order creation failed',
            message: error.message
        });
    }
});

// ✅ PAYPAL - Capture Order (after user approval)
app.post('/paypal/capture-order', async (req, res) => {
    const { orderId, planId, billingCycle, userId } = req.body;

    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    request.requestBody({});

    try {
        const capture = await client().execute(request);

        // Get plan details
        const plan = plans[planId];
        if (!plan) {
            throw new Error('Invalid plan ID');
        }

        // Calculate amount based on billing cycle
        const amount = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;

        // Calculate dates
        const now = new Date();
        const nextResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const endDate = calculateNextBillingDate(billingCycle);

        // Save subscription to Firebase - UPDATED STRUCTURE
        const subscriptionData = {
            userId: userId,
            planId: planId,
            planName: plan.name,
            billingCycle: billingCycle,
            price: amount,  // Changed from 'amount' to 'price'
            currency: 'USD',
            imagesPerMonth: plan.imagesPerMonth,
            imagesUsedThisMonth: 0,  // Initialize to 0
            paymentMethod: 'paypal',
            paypalOrderId: capture.result.id,
            status: 'active',
            startDate: now.toISOString(),  // Added startDate
            endDate: endDate.toISOString(),  // Added endDate
            nextBillingDate: endDate.toISOString(),  // Keep for compatibility
            nextResetDate: nextResetDate.toISOString(),  // Added nextResetDate
            createdAt: now.toISOString(),
            updatedAt: now,  // Add as timestamp
            paymentStatus: capture.result.status,  // Added paymentStatus
            paypalEmail: capture.result.payer?.email_address || '',  // Added paypalEmail
            paypalPayerId: capture.result.payer?.payer_id || '',  // Added paypalPayerId
            paymentDetails: {
                id: capture.result.id,
                status: capture.result.status,
                payer: capture.result.payer
            }
        };

        const saved = await saveSubscriptionToFirebase(subscriptionData);
        if (!saved) {
            console.error('Failed to save subscription to Firebase');
        }

        res.json({
            success: true,
            orderId: capture.result.id,
            paymentDetails: {
                id: capture.result.id,
                status: capture.result.status,
                payer: capture.result.payer,
                purchase_units: capture.result.purchase_units
            }
        });
    } catch (error) {
        console.error('PayPal capture error:', error);
        res.status(500).json({
            success: false,
            error: 'PayPal capture failed',
            message: error.message
        });
    }
});
// ✅ CASHFREE - Verify Payment (FIXED)
app.post('/verify-payment', async (req, res) => {
    const { orderId } = req.body;

    try {
        console.log('Verifying Cashfree payment for order:', orderId);

        // Fetch payment details using the correct method
        const response = await cashfree.PGOrderFetchPayments(orderId);
        console.log('Cashfree payment response:', response.data);

        const successfulPayment = response.data.find(payment =>
            payment.payment_status === 'SUCCESS'
        );

        if (successfulPayment) {
            console.log('Successful payment found:', successfulPayment.cf_payment_id);

            // Get order metadata that we stored during order creation
            const metadata = orderMetadata.get(orderId);

            if (!metadata) {
                console.error('Order metadata not found for:', orderId);
                // Try to extract from URL parameters if available in the response
                // This is a fallback approach
                return res.json({
                    success: true,
                    paymentDetails: successfulPayment,
                    allPayments: response.data,
                    warning: 'Order metadata not found, subscription may not be automatically created'
                });
            }

            const { planId, billingCycle, userId } = metadata;
            const plan = plans[planId];

            if (plan && userId) {
                // Calculate amount based on billing cycle
                const amount = billingCycle === 'yearly' ? plan.yearlyPriceINR : plan.monthlyPriceINR;

                // Save subscription to Firebase
                const subscriptionData = {
                    userId: userId,
                    planId: planId,
                    planName: plan.name,
                    billingCycle: billingCycle,
                    amount: amount,
                    currency: 'INR',
                    imagesPerMonth: plan.imagesPerMonth,
                    paymentMethod: 'cashfree',
                    cashfreeOrderId: orderId,
                    status: 'active',
                    createdAt: new Date().toISOString(),
                    nextBillingDate: calculateNextBillingDate(billingCycle).toISOString(),
                    paymentDetails: successfulPayment
                };

                console.log('Saving subscription to Firebase:', subscriptionData);
                const saved = await saveSubscriptionToFirebase(subscriptionData);

                if (saved) {
                    console.log('Subscription successfully saved to Firebase');
                    // Clean up metadata after successful processing
                    orderMetadata.delete(orderId);
                } else {
                    console.error('Failed to save subscription to Firebase');
                }
            } else {
                console.error('Invalid plan or user data:', { planId, userId, planExists: !!plan });
            }
        } else {
            console.log('No successful payment found for order:', orderId);
        }

        res.json({
            success: !!successfulPayment,
            paymentDetails: successfulPayment || null,
            allPayments: response.data
        });

    } catch (error) {
        console.error('Payment verification error:', error);

        // More detailed error logging
        if (error.response) {
            console.error('Cashfree API Error Response:', error.response.data);
        }

        res.status(500).json({
            error: 'Payment verification failed',
            message: error.response?.data?.message || error.message,
            details: error.response?.data || null
        });
    }
});

// ✅ Get Order Details
app.get('/paypal/order/:orderId', async (req, res) => {
    const { orderId } = req.params;
    const request = new paypal.orders.OrdersGetRequest(orderId);

    try {
        const order = await client().execute(request);
        res.json({
            success: true,
            orderDetails: order.result
        });
    } catch (error) {
        console.error('PayPal get order error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get PayPal order details',
            message: error.message
        });
    }
});

// ✅ Get Cashfree Order Status (Alternative endpoint)
app.get('/cashfree/order/:orderId', async (req, res) => {
    const { orderId } = req.params;

    try {
        const response = await cashfree.PGOrderFetchPayments(orderId);
        res.json({
            success: true,
            orderDetails: response.data,
            metadata: orderMetadata.get(orderId) || null
        });
    } catch (error) {
        console.error('Cashfree get order error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get Cashfree order details',
            message: error.message
        });
    }
});

// ✅ Manual subscription creation endpoint (fallback)
app.post('/create-subscription', async (req, res) => {
    const { userId, planId, billingCycle, paymentMethod, orderId, amount } = req.body;

    try {
        const plan = plans[planId];
        if (!plan) {
            return res.status(400).json({ error: 'Invalid plan ID' });
        }

        const now = new Date();
        const nextResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const endDate = calculateNextBillingDate(billingCycle);

        const subscriptionData = {
            userId,
            planId,
            planName: plan.name,
            billingCycle,
            price: amount || (billingCycle === 'yearly' ?
                    (paymentMethod === 'cashfree' ? plan.yearlyPriceINR : plan.yearlyPrice) :
                    (paymentMethod === 'cashfree' ? plan.monthlyPriceINR : plan.monthlyPrice)
            ),
            currency: paymentMethod === 'cashfree' ? 'INR' : 'USD',
            imagesPerMonth: plan.imagesPerMonth,
            imagesUsedThisMonth: 0,
            paymentMethod,
            [paymentMethod === 'cashfree' ? 'cashfreeOrderId' : 'paypalOrderId']: orderId,
            status: 'active',
            startDate: now.toISOString(),
            endDate: endDate.toISOString(),
            nextBillingDate: endDate.toISOString(),
            nextResetDate: nextResetDate.toISOString(),
            createdAt: now.toISOString(),
            updatedAt: now,
            paymentStatus: 'COMPLETED'
        };

        const saved = await saveSubscriptionToFirebase(subscriptionData);

        res.json({
            success: saved,
            subscription: saved ? subscriptionData : null
        });
    } catch (error) {
        console.error('Manual subscription creation error:', error);
        res.status(500).json({
            error: 'Failed to create subscription',
            message: error.message
        });
    }
});
// ✅ Webhook (optional)
app.post('/payment-webhook', express.json(), (req, res) => {
    try {
        const webhookData = req.body;
        console.log('Webhook received:', webhookData);

        // Handle Cashfree webhook if needed
        if (webhookData.type === 'PAYMENT_SUCCESS_WEBHOOK') {
            const orderId = webhookData.data.order.order_id;
            console.log('Payment success webhook for order:', orderId);
            // You can trigger subscription creation here if needed
        }

        res.status(200).send('OK');
    } catch (err) {
        console.error('Webhook error:', err);
        res.status(400).send('Webhook error');
    }
});

// ✅ Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        paypal: !!process.env.PAYPAL_CLIENT_ID,
        cashfree: !!process.env.APP_ID,
        firebase: !!process.env.FIREBASE_PROJECT_ID,
        activeOrders: orderMetadata.size
    });
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`PayPal configured: ${!!process.env.PAYPAL_CLIENT_ID}`);
    console.log(`Cashfree configured: ${!!process.env.APP_ID}`);
    console.log(`Firebase configured: ${!!process.env.FIREBASE_PROJECT_ID}`);
});