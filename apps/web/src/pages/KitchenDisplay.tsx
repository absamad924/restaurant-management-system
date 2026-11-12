import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

interface MenuItem {
  id: string;
  name: string;
}

interface OrderItem {
  menuItemId: string;
  quantity: number;
}

interface Order {
  id: string;
  orderType: string;
  status: string;
  items: OrderItem[];
  createdAt: string;
}

export default function KitchenDisplay() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Fetch menu catalog so we can translate IDs to item names
    fetch('http://localhost:5000/api/menu/items')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setMenuItems(data.items);
        }
      })
      .catch(err => console.error('Failed to fetch menu:', err));

    // Connect to the Express WebSocket server
    const socket = io('http://localhost:5000');

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    // Listen for incoming orders
    socket.on('new_order', (newOrder: Order) => {
      setOrders(prevOrders => [...prevOrders, newOrder]);
      
      try {
        const audio = new Audio('/beep.mp3');
        audio.play().catch(() => {});
      } catch (e) {}
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const markAsCompleted = (orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
  };

  // Helper function to find the item name
  const getItemName = (id: string) => {
    const item = menuItems.find(m => m.id === id);
    return item ? item.name : `Item ID: ${id.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* KDS Header */}
      <header className="bg-slate-800 shadow-md px-6 py-4 flex justify-between items-center border-b border-slate-700">
        <div>
          <h1 className="text-2xl font-bold text-blue-400 tracking-tight">RMS Kitchen Display</h1>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-slate-400">{isConnected ? 'System Online & Listening' : 'Disconnected'}</span>
          </div>
        </div>
        <div className="bg-slate-700 px-4 py-2 rounded-lg text-xl font-mono font-bold">
          {orders.length} Active {orders.length === 1 ? 'Ticket' : 'Tickets'}
        </div>
      </header>
      
      {/* Active Tickets Grid */}
      <main className="flex-1 overflow-auto p-6">
        {orders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 mt-20">
             <svg
                className="w-8 h-8 text-orange-600"
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
              <div key={order.id || index} className="bg-white text-gray-900 rounded-xl shadow-lg overflow-hidden border-t-8 border-blue-500 animate-fade-in-up">
                
                {/* Ticket Header */}
                <div className="bg-slate-100 p-4 border-b border-gray-200 flex justify-between items-start">
                  <div>
                    <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded mb-2">
                      {order.orderType?.replace('_', ' ') || 'KITCHEN ORDER'}
                    </span>
                    <h3 className="font-bold text-lg">Order #{order.id?.slice(-4) || 'NEW'}</h3>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-500">
                      {new Date(order.createdAt || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                </div>

                {/* Ticket Items */}
                <div className="p-4 bg-yellow-50 min-h-[150px]">
                  <ul className="space-y-3">
                    {order.items?.map((item, idx) => (
                      <li key={idx} className="flex justify-between items-start text-lg border-b border-yellow-200/50 pb-2 last:border-0">
                        <span className="font-bold">{item.quantity}x</span>
                        <span className="flex-1 ml-3 font-medium text-gray-800">
                          {getItemName(item.menuItemId)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Ticket Actions */}
                <div className="p-4 bg-white border-t border-gray-100">
                  <button 
                    onClick={() => markAsCompleted(order.id)}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-sm transition-colors"
                  >
                    Bump (Complete)
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