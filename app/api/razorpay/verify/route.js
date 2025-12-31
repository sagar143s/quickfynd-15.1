import { NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import Product from "@/models/Product";
import { verifyAuth } from "@/lib/verifyAuth";

export async function POST(request) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, paymentPayload } = body;

    // Create signature
    const text = razorpay_order_id + "|" + razorpay_payment_id;
    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest("hex");

    // Verify signature
    if (generated_signature === razorpay_signature) {
      // Payment verified - now create order via the main orders API
      console.log('Razorpay payment verified. Creating order...');
      
      // Prepare the order creation payload
      const orderPayload = {
        items: paymentPayload.items,
        paymentMethod: 'CARD',
        shippingFee: paymentPayload.shippingFee || 0,
        razorpayPaymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
      };

      // Add user/guest info
      if (paymentPayload.token) {
        // Logged-in user
        const auth = await verifyAuth(paymentPayload.token);
        if (auth?.userId && paymentPayload.addressId) {
          orderPayload.addressId = paymentPayload.addressId;
        }
      } else if (paymentPayload.isGuest && paymentPayload.guestInfo) {
        // Guest user
        orderPayload.isGuest = true;
        orderPayload.guestInfo = paymentPayload.guestInfo;
      }

      // Call the main orders API internally
      const orderRequest = new Request(request.url.replace('/razorpay/verify', '/orders'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(paymentPayload.token ? { 'Authorization': `Bearer ${paymentPayload.token}` } : {})
        },
        body: JSON.stringify(orderPayload)
      });

      // Import and call the orders POST handler
      const { POST: createOrder } = await import('@/app/api/orders/route');
      const orderResponse = await createOrder(orderRequest);
      const orderData = await orderResponse.json();

      if (orderResponse.ok && orderData.orderId) {
        return NextResponse.json({ 
          success: true,
          _id: orderData.orderId,
          orderId: orderData.orderId,
          message: "Payment verified and order created successfully" 
        });
      } else {
        console.error('Order creation failed:', orderData);
        return NextResponse.json({ 
          success: false, 
          message: orderData.error || "Order creation failed after payment" 
        }, { status: 400 });
      }
    } else {
      return NextResponse.json({ 
        success: false, 
        message: "Payment verification failed" 
      }, { status: 400 });
    }
  } catch (error) {
    console.error("Razorpay verification error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
