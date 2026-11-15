import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import toast, { Toaster } from 'react-hot-toast';

interface MenuItem {
  id: string;
  name: string;
}

interface OrderItem {
  menuItemId: string;
  quantity: number;
  menuItem?: {
    name: string;
  };
}

interface Order {
  id: string;
  orderNumber?: string;
  flow?: string;
  orderType?: string;
  status: string;
  items: OrderItem[];
  createdAt: string;
}

export default function KitchenDisplay() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const fetchActiveOrders = () => {
    const token = localStorage.getItem('token');
    fetch('http://localhost:5000/api/orders/active', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setOrders(data.orders);
        }
      })
      .catch(err => console.error('Failed to fetch active orders:', err));
  };

  useEffect(() => {
    fetchActiveOrders();

    // Fetch menu catalog as a fallback for item names
    fetch('http://localhost:5000/api/menu/items')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setMenuItems(data.items);
        }
      })
      .catch(err => console.error('Failed to fetch menu:', err));

    const socket = io('http://localhost:5000');

    socket.on('connect', () => {
      setIsConnected(true);
      fetchActiveOrders();
    });
    socket.on('disconnect', () => setIsConnected(false));

    // Listen for incoming kitchen orders only
    socket.on('new_order', (newOrder: Order) => {
      if (newOrder.status !== 'PENDING_KITCHEN') return;

      setOrders(prevOrders => {
        if (prevOrders.some(o => o.id === newOrder.id)) return prevOrders;
        return [...prevOrders, newOrder];
      });

      try {
        const audio = new Audio('/beep.mp3');
        audio.play().catch(() => {});
      } catch (e) {}
    });

    // Remove ticket if updated/bumped from another KDS screen
    socket.on('order_status_updated', (updatedOrder: Order) => {
      if (updatedOrder.status !== 'PENDING_KITCHEN') {
        setOrders(prev => prev.filter(o => o.id !== updatedOrder.id));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const markAsReady = async (orderId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'READY' }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update order status');
      }

      setOrders(prev => prev.filter(o => o.id !== orderId));
      toast.success('Order marked READY & cashier notified!');
    } catch (error: any) {
      console.error('Error bumping order:', error);
      toast.error(error.message || 'Failed to bump order');
    }
  };

  const getItemName = (item: OrderItem) => {
    if (item.menuItem?.name) return item.menuItem.name;
    const found = menuItems.find(m => m.id === item.menuItemId);
    return found ? found.name : `Item ID: ${item.menuItemId.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <Toaster position="top-center" />

      {/* KDS Header */}
      <header className="bg-slate-800 shadow-md px-6 py-4 flex justify-between items-center border-b border-slate-700">
        <div>
          <h1 className="text-2xl font-bold text-blue-400 tracking-tight">RMS Kitchen Display</h1>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-slate-400">
              {isConnected ? 'System Online & Listening' : 'Disconnected'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-slate-700 px-4 py-2 rounded-lg text-lg font-mono font-bold">
            {orders.length} Active {orders.length === 1 ? 'Ticket' : 'Tickets'}
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-lg font-semibold text-sm transition-colors"
          >
            Log Out
          </button>
        </div>
      </header>

      {/* Active Tickets Grid */}
      <main className="flex-1 overflow-auto p-6">
        {orders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 mt-20">
            <svg
              className="w-8 h-8 text-orange-600 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"
              />
            </svg>
            <p className="text-xl font-medium">Kitchen is clear. Waiting for orders...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 items-start">
            {orders.map((order, index) => (
              <div
                key={order.id || index}
                className="bg-white text-gray-900 rounded-xl shadow-lg overflow-hidden border-t-8 border-blue-500 animate-fade-in-up"
              >
                {/* Ticket Header */}
                <div className="bg-slate-100 p-4 border-b border-gray-200 flex justify-between items-start">
                  <div>
                    <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded mb-2">
                      {(order.flow || order.orderType)?.replace('_', ' ') || 'KITCHEN ORDER'}
                    </span>
                    <h3 className="font-bold text-lg">
                      {order.orderNumber || `Order #${order.id?.slice(-4) || 'NEW'}`}
                    </h3>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-500">
                      {new Date(order.createdAt || Date.now()).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>

                {/* Ticket Items */}
                <div className="p-4 bg-yellow-50 min-h-[150px]">
                  <ul className="space-y-3">
                    {order.items?.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex justify-between items-start text-lg border-b border-yellow-200/50 pb-2 last:border-0"
                      >
                        <span className="font-bold">{item.quantity}x</span>
                        <span className="flex-1 ml-3 font-medium text-gray-800">
                          {getItemName(item)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Ticket Actions */}
                <div className="p-4 bg-white border-t border-gray-100">
                  <button
                    onClick={() => markAsReady(order.id)}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-sm transition-colors"
                  >
                    Complete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}