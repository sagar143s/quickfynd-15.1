"use client";

// Update order status
const updateOrderStatus = async (orderId, newStatus, getToken, fetchOrders) => {
    try {
        const token = await getToken(true); // Force refresh token
        if (!token) {
            toast.error('Authentication failed. Please sign in again.');
            return;
        }
        await axios.post('/api/store/orders/update-status', {
            orderId,
            status: newStatus
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Order status updated!');
        fetchOrders();
    } catch (error) {
        console.error('Update status error:', error);
        toast.error(error?.response?.data?.error || 'Failed to update status');
    }
};
import { useAuth } from '@/lib/useAuth';
export const dynamic = 'force-dynamic'
import { useEffect, useState } from "react"
import Loading from "@/components/Loading"

import axios from "axios"
import toast from "react-hot-toast"
import { Package, Truck, X, Download, Printer } from "lucide-react"
import { downloadInvoice, printInvoice } from "@/lib/generateInvoice"
import { downloadAwbBill } from "@/lib/generateAwbBill"

// Add updateTrackingDetails function
// (must be inside the component, not top-level)




export default function StoreOrders() {
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₹';
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [trackingData, setTrackingData] = useState({
        trackingId: '',
        trackingUrl: '',
        courier: ''
    });
    const [addressFormData, setAddressFormData] = useState({
        name: '',
        email: '',
        phone: '',
        street: '',
        city: '',
        state: '',
        zip: '',
        country: '',
        district: ''
    });
    const [filterStatus, setFilterStatus] = useState('ALL');

    const { user, getToken, loading: authLoading } = useAuth();

    // Status options available
    const STATUS_OPTIONS = [
        { value: 'ORDER_PLACED', label: 'Order Placed', color: 'bg-blue-100 text-blue-700' },
        { value: 'PROCESSING', label: 'Processing', color: 'bg-yellow-100 text-yellow-700' },
        { value: 'SHIPPED', label: 'Shipped', color: 'bg-purple-100 text-purple-700' },
        { value: 'DELIVERED', label: 'Delivered', color: 'bg-green-100 text-green-700' },
        { value: 'CANCELLED', label: 'Cancelled', color: 'bg-red-100 text-red-700' },
        { value: 'PAYMENT_FAILED', label: 'Payment Failed', color: 'bg-orange-100 text-orange-700' },
        { value: 'RETURNED', label: 'Returned', color: 'bg-indigo-100 text-indigo-700' },
        { value: 'RETURN_INITIATED', label: 'Return Initiated', color: 'bg-pink-100 text-pink-700' },
        { value: 'RETURN_APPROVED', label: 'Return Approved', color: 'bg-pink-100 text-pink-700' },
    ];

    // Get status color
    const getStatusColor = (status) => {
        const statusOption = STATUS_OPTIONS.find(s => s.value === status);
        return statusOption?.color || 'bg-gray-100 text-gray-700';
    };

    // Calculate order statistics
    const getOrderStats = () => {
        const stats = {
            TOTAL: orders.length,
            ORDER_PLACED: orders.filter(o => o.status === 'ORDER_PLACED').length,
            PROCESSING: orders.filter(o => o.status === 'PROCESSING').length,
            SHIPPED: orders.filter(o => o.status === 'SHIPPED').length,
            DELIVERED: orders.filter(o => o.status === 'DELIVERED').length,
            CANCELLED: orders.filter(o => o.status === 'CANCELLED').length,
            PAYMENT_FAILED: orders.filter(o => o.status === 'PAYMENT_FAILED').length,
            RETURNED: orders.filter(o => o.status === 'RETURNED').length,
            PENDING_PAYMENT: orders.filter(o => !o.isPaid).length,
            PENDING_SHIPMENT: orders.filter(o => !o.trackingId && ['ORDER_PLACED', 'PROCESSING'].includes(o.status)).length,
        };
        return stats;
    };

    // Filter orders based on selected status
    const getFilteredOrders = () => {
        if (filterStatus === 'ALL') return orders;
        if (filterStatus === 'PENDING_PAYMENT') return orders.filter(o => !o.isPaid);
        if (filterStatus === 'PENDING_SHIPMENT') return orders.filter(o => !o.trackingId && ['ORDER_PLACED', 'PROCESSING'].includes(o.status));
        return orders.filter(o => o.status === filterStatus);
    };

    const stats = getOrderStats();
    const filteredOrders = getFilteredOrders();

    // Function to update tracking details and notify customer
    const updateTrackingDetails = async () => {
        if (!selectedOrder) return;
        try {
            const token = await getToken();
            await axios.post('/api/store/orders/update-tracking', {
                orderId: selectedOrder._id,
                ...trackingData
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Tracking details updated & customer notified!');
            // Optionally refresh orders or close modal
            fetchOrders();
            setIsModalOpen(false);
        } catch (error) {
            toast.error('Failed to update tracking details');
        }
    };
    // Move openModal and closeModal to top level
    const openModal = (order) => {
        console.log('[MODAL DEBUG] Opening order:', order);
        console.log('[MODAL DEBUG] Order shippingAddress:', order.shippingAddress);
        console.log('[MODAL DEBUG] Order userId type:', typeof order.userId);
        console.log('[MODAL DEBUG] Order userId value:', order.userId);
        console.log('[MODAL DEBUG] Order userId is object?:', typeof order.userId === 'object');
        if (typeof order.userId === 'object' && order.userId !== null) {
            console.log('[MODAL DEBUG] User name:', order.userId.name);
            console.log('[MODAL DEBUG] User email:', order.userId.email);
        }
        console.log('[MODAL DEBUG] Order addressId:', order.addressId);
        console.log('[MODAL DEBUG] Order isGuest:', order.isGuest);
        setSelectedOrder(order);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedOrder(null);
    };

    const fetchOrders = async () => {
        try {
            const token = await getToken();
            if (!token) {
                toast.error("Invalid session. Please sign in again.");
                setLoading(false);
                return;
            }
            const { data } = await axios.get('/api/store/orders', {headers: { Authorization: `Bearer ${token}` }});
            console.log('[ORDERS DEBUG] Raw orders data:', data.orders);
            if (data.orders && data.orders.length > 0) {
                console.log('[ORDERS DEBUG] First order sample:', JSON.stringify(data.orders[0], null, 2));
                console.log('[ORDERS DEBUG] First order shippingAddress:', data.orders[0].shippingAddress);
                console.log('[ORDERS DEBUG] First order userId:', data.orders[0].userId);
            }
            setOrders(data.orders);
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (authLoading) return; // Wait for auth to load
        if (!user) {
            toast.error("You must be signed in as a seller to view orders.");
            setLoading(false);
            return;
        }
        fetchOrders();
        // eslint-disable-next-line
    }, [authLoading, user]);

    if (authLoading || loading) return <Loading />;

    return (
        <>
            <h1 className="text-2xl text-slate-500 mb-6">Store <span className="text-slate-800 font-medium">Orders</span></h1>
            
            {/* Order Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <div 
                    onClick={() => setFilterStatus('ALL')}
                    className={`p-4 rounded-lg cursor-pointer transition-all ${filterStatus === 'ALL' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white border border-gray-200 text-slate-700'}`}
                >
                    <p className="text-xs opacity-75">Total Orders</p>
                    <p className="text-2xl font-bold">{stats.TOTAL}</p>
                </div>
                <div 
                    onClick={() => setFilterStatus('PENDING_PAYMENT')}
                    className={`p-4 rounded-lg cursor-pointer transition-all ${filterStatus === 'PENDING_PAYMENT' ? 'bg-orange-600 text-white shadow-lg' : 'bg-white border border-gray-200 text-slate-700'}`}
                >
                    <p className="text-xs opacity-75">Pending Payment</p>
                    <p className="text-2xl font-bold">{stats.PENDING_PAYMENT}</p>
                </div>
                <div 
                    onClick={() => setFilterStatus('PROCESSING')}
                    className={`p-4 rounded-lg cursor-pointer transition-all ${filterStatus === 'PROCESSING' ? 'bg-yellow-600 text-white shadow-lg' : 'bg-white border border-gray-200 text-slate-700'}`}
                >
                    <p className="text-xs opacity-75">Processing</p>
                    <p className="text-2xl font-bold">{stats.PROCESSING}</p>
                </div>
                <div 
                    onClick={() => setFilterStatus('SHIPPED')}
                    className={`p-4 rounded-lg cursor-pointer transition-all ${filterStatus === 'SHIPPED' ? 'bg-purple-600 text-white shadow-lg' : 'bg-white border border-gray-200 text-slate-700'}`}
                >
                    <p className="text-xs opacity-75">Shipped</p>
                    <p className="text-2xl font-bold">{stats.SHIPPED}</p>
                </div>
                <div 
                    onClick={() => setFilterStatus('DELIVERED')}
                    className={`p-4 rounded-lg cursor-pointer transition-all ${filterStatus === 'DELIVERED' ? 'bg-green-600 text-white shadow-lg' : 'bg-white border border-gray-200 text-slate-700'}`}
                >
                    <p className="text-xs opacity-75">Delivered</p>
                    <p className="text-2xl font-bold">{stats.DELIVERED}</p>
                </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="mb-6 flex flex-wrap gap-2">
                {['ALL', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'PAYMENT_FAILED', 'RETURNED'].map(status => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                            filterStatus === status
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-gray-100 text-slate-700 hover:bg-gray-200'
                        }`}
                    >
                        {status === 'ALL' ? 'All Orders' : status === 'PAYMENT_FAILED' ? 'Payment Failed' : status.replace(/_/g, ' ')}
                    </button>
                ))}
            </div>

            {filteredOrders.length === 0 ? (
                <p className="text-center py-8 text-slate-500">No orders found for this status</p>
            ) : (
                <div className="overflow-x-auto w-full rounded-md shadow border border-gray-200">
                    <table className="w-full text-sm text-left text-gray-600">
                        <thead className="bg-gray-50 text-gray-700 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3">Sr. No.</th>
                                <th className="px-4 py-3">Order No.</th>
                                <th className="px-4 py-3">Customer</th>
                                <th className="px-4 py-3">Total</th>
                                <th className="px-4 py-3">Payment</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Tracking</th>
                                <th className="px-4 py-3">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredOrders.map((order, index) => (
                                <tr
                                    key={order._id}
                                    className="hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                                    onClick={() => openModal(order)}
                                >
                                    <td className="pl-6 text-green-600 font-medium">{index + 1}</td>
                                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{order.shortOrderNumber || order._id.slice(0, 8)}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-medium text-slate-800">
                                                {order.isGuest 
                                                    ? (order.guestName || 'Guest User')
                                                    : (order.userId?.name || order.userId?.email || 'Unknown')}
                                            </span>
                                            {order.isGuest && (
                                                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full w-fit font-semibold">
                                                    Guest
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 font-medium text-slate-800">{currency}{order.total}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${order.isPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {order.isPaid ? '✓ Paid' : 'Pending'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3" onClick={e => { e.stopPropagation(); }}>
                                        <select
                                            value={order.status}
                                            onChange={e => updateOrderStatus(order._id, e.target.value, getToken, fetchOrders)}
                                            className={`border-gray-300 rounded-md text-sm font-medium px-2 py-1 focus:ring focus:ring-blue-200 ${getStatusColor(order.status)}`}
                                        >
                                            {STATUS_OPTIONS.map(status => (
                                                <option key={status.value} value={status.value}>{status.label}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-4 py-3">
                                        {order.trackingId ? (
                                            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">
                                                {order.trackingId.substring(0, 8)}...
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 text-xs">Not shipped</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(order.createdAt).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {isModalOpen && selectedOrder && (
                <div onClick={closeModal} className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm text-slate-700 text-sm z-50 p-4" >
                    <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-bold mb-1">Order Details</h2>
                                    <p className="text-blue-100 text-xs">Order ID: {String(selectedOrder._id).slice(0, 8).toUpperCase()} &nbsp;|&nbsp; Order No: <span className='font-mono text-white'>{selectedOrder.shortOrderNumber || selectedOrder._id.slice(0, 8)}</span></p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => downloadInvoice(selectedOrder)}
                                        className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm"
                                        title="Download Invoice"
                                    >
                                        <Download size={18} />
                                        <span className="text-sm">Download</span>
                                    </button>
                                    <button
                                        onClick={() => printInvoice(selectedOrder)}
                                        className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm"
                                        title="Print Invoice"
                                    >
                                        <Printer size={18} />
                                        <span className="text-sm">Print</span>
                                    </button>
                                    <button
                                        onClick={() => downloadAwbBill({
                                            awbNumber: selectedOrder.trackingId,
                                            orderId: selectedOrder._id,
                                            courier: selectedOrder.courier,
                                            date: selectedOrder.createdAt,
                                            senderName: process.env.NEXT_PUBLIC_INVOICE_COMPANY_NAME || 'Qui',
                                            senderAddress: `${process.env.NEXT_PUBLIC_INVOICE_ADDRESS_LINE1 || ''}, ${process.env.NEXT_PUBLIC_INVOICE_ADDRESS_LINE2 || ''}`,
                                            senderPhone: process.env.NEXT_PUBLIC_INVOICE_CONTACT || '',
                                            receiverName: selectedOrder.shippingAddress?.name,
                                            receiverAddress: `${selectedOrder.shippingAddress?.street}, ${selectedOrder.shippingAddress?.city}, ${selectedOrder.shippingAddress?.state}, ${selectedOrder.shippingAddress?.zip}, ${selectedOrder.shippingAddress?.country}`,
                                            receiverPhone: selectedOrder.shippingAddress?.phone,
                                            weight: selectedOrder.weight || '',
                                            dimensions: selectedOrder.dimensions || '',
                                            contents: selectedOrder.orderItems?.map(i => i.product?.name).join(', '),
                                            pdfSize: 'a5' // Pass A5 size for AWB
                                        })}
                                        className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors shadow backdrop-blur-sm"
                                        title="Download AWB Bill"
                                    >
                                        <Download size={18} />
                                        <span className="text-sm">AWB Bill</span>
                                    </button>
                                    <button onClick={closeModal} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Tracking Details Section */}
                            <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                                        <Truck size={20} className="text-white" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-orange-900">Tracking Information</h3>
                                </div>
                                
                                {selectedOrder.trackingId ? (
                                    <div className="bg-white rounded-lg p-4 mb-4">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">Tracking ID</p>
                                                <p className="font-semibold text-slate-900">{selectedOrder.trackingId}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">Courier</p>
                                                <p className="font-semibold text-slate-900">{selectedOrder.courier}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">Track Order</p>
                                                {selectedOrder.trackingUrl ? (
                                                    <a href={selectedOrder.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
                                                        View Tracking
                                                    </a>
                                                ) : (
                                                    <p className="text-slate-400">No URL</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : null}

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-slate-700 block mb-1">Tracking ID *</label>
                                        <input
                                            type="text"
                                            value={trackingData.trackingId}
                                            onChange={e => setTrackingData({...trackingData, trackingId: e.target.value})}
                                            placeholder="Enter tracking ID"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-700 block mb-1">Courier Name *</label>
                                        <input
                                            type="text"
                                            value={trackingData.courier}
                                            onChange={e => setTrackingData({...trackingData, courier: e.target.value})}
                                            placeholder="e.g., FedEx, DHL, UPS"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-700 block mb-1">Tracking URL</label>
                                        <input
                                            type="url"
                                            value={trackingData.trackingUrl}
                                            onChange={e => setTrackingData({...trackingData, trackingUrl: e.target.value})}
                                            placeholder="https://..."
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={updateTrackingDetails}
                                    className="mt-3 w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 rounded-lg transition-colors"
                                >
                                    Update Tracking & Notify Customer
                                </button>
                            </div>

                            {/* Customer Details */}
                            <div className="bg-slate-50 rounded-xl p-5">
                                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                    <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
                                    Customer Details
                                    {selectedOrder.isGuest && (
                                        <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">
                                            GUEST ORDER
                                        </span>
                                    )}
                                </h3>
                                
                                {!selectedOrder.shippingAddress && !selectedOrder.isGuest && (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                                        <p className="text-yellow-800 text-sm">
                                            ⚠️ Shipping address not available for this order. This order was placed before address tracking was implemented.
                                        </p>
                                        {selectedOrder.userId && (
                                            <p className="text-yellow-700 text-xs mt-2">
                                                Customer: {selectedOrder.userId.name || selectedOrder.userId.email || 'Unknown'}
                                            </p>
                                        )}
                                        <button 
                                            onClick={() => {
                                                // Open a modal to add address
                                                setShowAddressModal(true);
                                            }}
                                            className="mt-2 text-xs px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded transition"
                                        >
                                            Add Address
                                        </button>
                                    </div>
                                )}
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <p className="text-slate-500">Name</p>
                                        <p className="font-medium text-slate-900">
                                            {selectedOrder.isGuest 
                                                ? (selectedOrder.guestName || '—') 
                                                : (selectedOrder.shippingAddress?.name || selectedOrder.userId?.name || '—')}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Email</p>
                                        <p className="font-medium text-slate-900">
                                            {selectedOrder.isGuest 
                                                ? (selectedOrder.guestEmail || '—') 
                                                : (selectedOrder.shippingAddress?.email || selectedOrder.userId?.email || '—')}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Phone</p>
                                        <p className="font-medium text-slate-900">
                                            {selectedOrder.isGuest 
                                                ? (selectedOrder.guestPhone || '—') 
                                                : (selectedOrder.shippingAddress?.phone || '—')}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Street</p>
                                        <p className="font-medium text-slate-900">{selectedOrder.shippingAddress?.street || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">City</p>
                                        <p className="font-medium text-slate-900">{selectedOrder.shippingAddress?.city || '—'}</p>
                                    </div>
                                    {selectedOrder.shippingAddress?.district && selectedOrder.shippingAddress.district.trim() !== '' && (
                                        <div>
                                            <p className="text-slate-500">District</p>
                                            <p className="font-medium text-slate-900">{selectedOrder.shippingAddress.district}</p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-slate-500">State</p>
                                        <p className="font-medium text-slate-900">{selectedOrder.shippingAddress?.state || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Pincode</p>
                                        <p className="font-medium text-slate-900">{selectedOrder.shippingAddress?.zip || selectedOrder.shippingAddress?.pincode || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Country</p>
                                        <p className="font-medium text-slate-900">{selectedOrder.shippingAddress?.country || '—'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Products */}
                            <div>
                                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                    <div className="w-1 h-5 bg-green-600 rounded-full"></div>
                                    Order Items
                                </h3>
                                <div className="space-y-3">
                                    {selectedOrder.orderItems.map((item, i) => (
                                        <div key={i} className="flex items-center gap-4 border border-slate-200 rounded-xl p-3 bg-white hover:shadow-md transition-shadow">
                                            <img
                                                src={item.productId?.images?.[0] || item.product?.images?.[0] || '/placeholder.png'}
                                                alt={item.productId?.name || item.product?.name || 'Product'}
                                                className="w-20 h-20 object-cover rounded-lg border border-slate-100"
                                            />
                                            <div className="flex-1">
                                                <p className="font-medium text-slate-900">{item.productId?.name || item.product?.name || 'Unknown Product'}</p>
                                                <p className="text-sm text-slate-600">Quantity: {item.quantity}</p>
                                                <p className="text-sm font-semibold text-slate-900">{currency}{item.price} each</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-slate-900">{currency}{item.price * item.quantity}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Payment & Status */}
                            <div className="bg-slate-50 rounded-xl p-5">
                                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                    <div className="w-1 h-5 bg-purple-600 rounded-full"></div>
                                    Payment & Status
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                    <div>
                                        <p className="text-slate-500">Total Amount</p>
                                        <p className="text-xl font-bold text-slate-900">{currency}{selectedOrder.total}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Payment Method</p>
                                        <p className="font-medium text-slate-900">{selectedOrder.paymentMethod}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Payment Status</p>
                                        <p className="font-medium text-slate-900">{selectedOrder.isPaid ? "✓ Paid" : "Pending"}</p>
                                    </div>
                                    {selectedOrder.isCouponUsed && (
                                        <div>
                                            <p className="text-slate-500">Coupon Used</p>
                                            <p className="font-medium text-green-600">{selectedOrder.coupon.code} ({selectedOrder.coupon.discount}% off)</p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-slate-500">Order Status</p>
                                        <p className="font-medium text-slate-900">{selectedOrder.status}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Order Date</p>
                                        <p className="font-medium text-slate-900">{new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={async () => {
                                        if (!window.confirm('Are you sure you want to delete this order? This action cannot be undone.')) return;
                                        try {
                                            const token = await getToken();
                                            await axios.delete(`/api/store/orders/${selectedOrder._id}`, {
                                                headers: { Authorization: `Bearer ${token}` }
                                            });
                                            toast.success('Order deleted successfully');
                                            setIsModalOpen(false);
                                            fetchOrders();
                                        } catch (error) {
                                            toast.error(error?.response?.data?.error || 'Failed to delete order');
                                        }
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors shadow backdrop-blur-sm"
                                    title="Delete Order"
                                >
                                    <X size={18} />
                                    <span className="text-sm">Delete</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Address Modal */}
            {showAddressModal && selectedOrder && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold mb-4">Add Shipping Address</h3>
                        <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
                            <input 
                                type="text" 
                                placeholder="Name" 
                                value={addressFormData.name}
                                onChange={(e) => setAddressFormData({...addressFormData, name: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                            <input 
                                type="email" 
                                placeholder="Email" 
                                value={addressFormData.email}
                                onChange={(e) => setAddressFormData({...addressFormData, email: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                            <input 
                                type="text" 
                                placeholder="Phone" 
                                value={addressFormData.phone}
                                onChange={(e) => setAddressFormData({...addressFormData, phone: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                            <input 
                                type="text" 
                                placeholder="Street" 
                                value={addressFormData.street}
                                onChange={(e) => setAddressFormData({...addressFormData, street: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                            <input 
                                type="text" 
                                placeholder="City" 
                                value={addressFormData.city}
                                onChange={(e) => setAddressFormData({...addressFormData, city: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                            <input 
                                type="text" 
                                placeholder="State" 
                                value={addressFormData.state}
                                onChange={(e) => setAddressFormData({...addressFormData, state: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                            <input 
                                type="text" 
                                placeholder="ZIP Code" 
                                value={addressFormData.zip}
                                onChange={(e) => setAddressFormData({...addressFormData, zip: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                            <input 
                                type="text" 
                                placeholder="Country" 
                                value={addressFormData.country}
                                onChange={(e) => setAddressFormData({...addressFormData, country: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                            <input 
                                type="text" 
                                placeholder="District (Optional)" 
                                value={addressFormData.district}
                                onChange={(e) => setAddressFormData({...addressFormData, district: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => {
                                    setShowAddressModal(false);
                                    setAddressFormData({
                                        name: '', email: '', phone: '', street: '', 
                                        city: '', state: '', zip: '', country: '', district: ''
                                    });
                                }}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={async () => {
                                    if (!addressFormData.street || !addressFormData.city || !addressFormData.country) {
                                        toast.error('Please fill in required fields: Street, City, Country');
                                        return;
                                    }
                                    try {
                                        const token = await getToken();
                                        await axios.patch(`/api/store/orders/${selectedOrder._id}/address`, 
                                            { shippingAddress: addressFormData },
                                            { headers: { Authorization: `Bearer ${token}` } }
                                        );
                                        toast.success('Address added successfully');
                                        setShowAddressModal(false);
                                        setAddressFormData({
                                            name: '', email: '', phone: '', street: '', 
                                            city: '', state: '', zip: '', country: '', district: ''
                                        });
                                        fetchOrders();
                                    } catch (error) {
                                        toast.error(error?.response?.data?.error || 'Failed to add address');
                                    }
                                }}
                                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                            >
                                Save Address
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
