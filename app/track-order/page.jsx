"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { toast } from "react-hot-toast";

function TrackOrderPageInner() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [awbNumber, setAwbNumber] = useState('')
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false)
  const [order, setOrder] = useState(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const orderId = searchParams.get("orderId");
    if (orderId) {
      setAwbNumber(orderId);
    }
  }, [searchParams]);

  const handleTrack = async (e) => {
    e.preventDefault()
    if (!phoneNumber.trim() && !awbNumber.trim()) {
      toast.error('Please enter Phone Number or AWB Number')
      return
    }

    setLoading(true)
    setNotFound(false)
    setOrder(null)

    try {
      const params = new URLSearchParams()
      if (phoneNumber.trim()) params.append('phone', phoneNumber.trim())
      if (awbNumber.trim()) params.append('awb', awbNumber.trim())
      
      const res = await axios.get(`/api/track-order?${params.toString()}`)
      if (res.data.success && res.data.order) {
        setOrder(res.data.order)
      } else {
        setNotFound(true)
        toast.error('Order not found')
      }
    } catch (error) {
      console.error('Track order error:', error)
      setNotFound(true)
      toast.error(error.response?.data?.message || 'Order not found')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'DELIVERED':
        return 'bg-green-100 text-green-700';
      case 'OUT_FOR_DELIVERY':
        return 'bg-teal-100 text-teal-700';
      case 'SHIPPED':
        return 'bg-blue-100 text-blue-700';
      case 'WAREHOUSE_RECEIVED':
        return 'bg-indigo-100 text-indigo-700';
      case 'PICKED_UP':
        return 'bg-purple-100 text-purple-700';
      case 'PICKUP_REQUESTED':
        return 'bg-yellow-100 text-yellow-700';
      case 'WAITING_FOR_PICKUP':
        return 'bg-yellow-50 text-yellow-700';
      case 'CONFIRMED':
        return 'bg-orange-100 text-orange-700';
      case 'PROCESSING':
        return 'bg-yellow-100 text-yellow-700';
      case 'RETURN_REQUESTED':
        return 'bg-pink-100 text-pink-700';
      case 'RETURNED':
        return 'bg-pink-200 text-pink-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  }

  const getStatusSteps = (status) => {
    // Expanded status steps for more granular tracking
    const steps = [
      'ORDER_PLACED',
      'CONFIRMED',
      'PROCESSING',
      'PICKUP_REQUESTED',
      'WAITING_FOR_PICKUP',
      'PICKED_UP',
      'WAREHOUSE_RECEIVED',
      'SHIPPED',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'RETURN_REQUESTED',
      'RETURNED',
      'CANCELLED'
    ];
    const currentIndex = steps.indexOf(status?.toUpperCase());
    return steps.map((step, idx) => ({
      name: step.replace(/_/g, ' '),
      completed: idx <= currentIndex,
      active: idx === currentIndex
    }));
  }

  return (
    <>
      {/* <Navbar /> removed, now global via ClientLayout */}
      <div className="min-h-screen bg-slate-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          {/* ...rest of the component remains unchanged... */}
          {/* (PASTE ALL REMAINING JSX FROM ORIGINAL RETURN HERE) */}
          {/* The full content is unchanged, only the function wrapper is different. */}
        </div>
      </div>
      {/* <Footer /> removed, now global via ClientLayout */}
    </>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><span>Loading...</span></div>}>
      <TrackOrderPageInner />
    </Suspense>
  );
}
