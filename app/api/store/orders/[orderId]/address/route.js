import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@/lib/firebase-admin';

export async function PATCH(request, { params }) {
    try {
        await connectDB();

        // Firebase Auth
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
        }

        const idToken = authHeader.split(' ')[1];
        let decodedToken;
        try {
            decodedToken = await getAuth().verifyIdToken(idToken);
        } catch (err) {
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
        }

        const userId = decodedToken.uid;
        const storeId = await authSeller(userId);
        if (!storeId) {
            return NextResponse.json({ error: 'Unauthorized - not a seller' }, { status: 403 });
        }

        const { orderId } = params;
        const { shippingAddress } = await request.json();

        if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || !shippingAddress.country) {
            return NextResponse.json({ 
                error: 'Invalid address - street, city, and country are required' 
            }, { status: 400 });
        }

        // Find order and verify it belongs to this seller
        const order = await Order.findById(orderId);
        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Verify order belongs to this seller
        if (order.storeId !== storeId.toString()) {
            return NextResponse.json({ error: 'Unauthorized - order does not belong to your store' }, { status: 403 });
        }

        // Update the shipping address
        order.shippingAddress = {
            name: shippingAddress.name || '',
            email: shippingAddress.email || '',
            phone: shippingAddress.phone || '',
            street: shippingAddress.street,
            city: shippingAddress.city,
            state: shippingAddress.state || '',
            zip: shippingAddress.zip || '',
            country: shippingAddress.country,
            district: shippingAddress.district || ''
        };

        await order.save();

        return NextResponse.json({ 
            message: 'Shipping address added successfully',
            order: {
                _id: order._id,
                shippingAddress: order.shippingAddress
            }
        });
    } catch (error) {
        console.error('[PATCH /api/store/orders/:orderId/address] Error:', error);
        return NextResponse.json({ 
            error: 'Failed to update shipping address',
            message: error.message 
        }, { status: 500 });
    }
}
