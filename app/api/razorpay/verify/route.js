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
      // Only after payment is verified, create the order
      let userId = null;
      if (paymentPayload.token) {
        const auth = await verifyAuth(paymentPayload.token);
        userId = auth?.userId;
      }

      const orderPayload = {
        items: paymentPayload.items,
        paymentMethod: paymentPayload.paymentMethod,
        paymentStatus: 'paid',
        shippingFee: paymentPayload.shippingFee,
        razorpayPaymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
      };

      if (userId) {
        orderPayload.userId = userId;
        if (paymentPayload.addressId) {
          orderPayload.addressId = paymentPayload.addressId;
        }
      } else if (paymentPayload.guestInfo) {
        orderPayload.guestInfo = paymentPayload.guestInfo;
      }

      const newOrder = new Order(orderPayload);
      const savedOrder = await newOrder.save();

      // Update product stock
      for (const item of paymentPayload.items) {
        await Product.findByIdAndUpdate(item.id, {
          $inc: { stock: -item.quantity }
        });
      }

      return NextResponse.json({ 
        success: true,
        _id: savedOrder._id,
        orderId: savedOrder._id,
        message: "Payment verified and order created successfully" 
      });
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
