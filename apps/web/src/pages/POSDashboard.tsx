import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
}

interface CartItem extends MenuItem {
  quantity: number;
}

export default function POSDashboard() {
  const navigate = useNavigate();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [flow, setFlow] = useState<'KITCHEN_ORDER' | 'DIRECT_SALE'>('KITCHEN_ORDER');

  const fetchMenu = () => {
    fetch('http://localhost:5000/api/menu/items')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setMenuItems(data.items);
        }
      })
      .catch(err => console.error('Failed to fetch menu:', err));
  };

  useEffect(() => {
    fetchMenu();

    const socket = io('http://localhost:5000');

    socket.on('menu_updated', () => {
      fetchMenu();
    });

    socket.on('connect', () => {
      fetchMenu();
    });

    const handleFocus = () => {
      fetchMenu();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      socket.disconnect();
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const addToCart = (item: MenuItem) => {
    if (!item.isAvailable) return;
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleSubmitOrder = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          orderType: flow,
          totalAmount: cartTotal,
          items: cart.map(item => ({
            menuItemId: item.id,
            quantity: item.quantity,
            price: item.price
          }))
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit order');
      }

      setCart([]);
      alert(`Successfully submitted ${flow.replace('_', ' ')}!`);
      
    } catch (error: any) {
      console.error('Checkout error:', error);
      alert(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Main Catalog Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Cashier POS</h1>
          <button 
            onClick={handleLogout} 
            className="px-4 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 font-medium transition-colors"
          >
            Log Out
          </button>
        </header>
        
        {/* Scrollable Catalog Grid Container */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...menuItems]
              .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
              .map(item => (
                <div 
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className={`p-4 rounded-xl shadow-sm border cursor-pointer transition-all ${
                    item.isAvailable 
                      ? 'bg-white border-gray-200 hover:border-blue-500 hover:shadow-md' 
                      : 'bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <h3 className="font-semibold text-gray-800">{item.name}</h3>
                  <p className="text-blue-600 font-bold mt-1">₦ {item.price.toLocaleString()}</p>
                  {!item.isAvailable && <span className="text-xs text-red-500 font-medium mt-2 block">Out of Stock</span>}
                </div>
              ))}
          </div>
        </div>
      </main>

      {/* Right Sidebar - Active Cart & Checkout */}
      <aside className="w-96 bg-white shadow-xl border-l border-gray-200 flex flex-col h-screen z-10">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-gray-800">Current Order</h2>
          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded">Draft</span>
        </div>
        
        {/* Dual-Flow Toggle */}
        <div className="p-4 border-b border-gray-100 flex gap-2 bg-white">
          <button 
            onClick={() => setFlow('KITCHEN_ORDER')}
            className={`flex-1 py-2 text-sm font-medium rounded-md shadow-sm transition-colors ${
              flow === 'KITCHEN_ORDER' ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Kitchen Order
          </button>
          <button 
            onClick={() => setFlow('DIRECT_SALE')}
            className={`flex-1 py-2 text-sm font-medium rounded-md shadow-sm transition-colors ${
              flow === 'DIRECT_SALE' ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Direct Sale
          </button>
        </div>

        {/* Cart Items Area */}
        <div className="flex-1 overflow-auto p-6 bg-gray-50/50">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <svg className="w-12 h-12 mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-sm font-medium">Cart is empty</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                  <div>
                    <h4 className="font-semibold text-gray-800 text-sm">{item.name}</h4>
                    <p className="text-gray-500 text-xs">₦ {item.price.toLocaleString()} x {item.quantity}</p>
                  </div>
                  <div className="font-bold text-gray-800">
                    ₦ {(item.price * item.quantity).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment Summary */}
        <div className="p-6 border-t border-gray-200 bg-white">
          <div className="flex justify-between text-lg font-bold text-gray-800 mb-6">
            <span>Total</span>
            <span>₦ {cartTotal.toLocaleString()}</span>
          </div>
          <button 
            disabled={cart.length === 0}
            onClick={handleSubmitOrder}
            className="w-full py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-sm transition-colors text-lg"
          >
            Submit Order
          </button>
        </div>
      </aside>
    </div>
  );
}