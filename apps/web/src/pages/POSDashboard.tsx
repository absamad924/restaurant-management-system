import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

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

  const [searchQuery, setSearchQuery] = useState("");

// Thermal Receipt State
  const [receiptData, setReceiptData] = useState<{
    orderNumber: string;
    date: string;
    items: CartItem[];
    totalAmount: number;
    paymentMethod: 'CASH' | 'CARD' | 'TRANSFER';
    amountTendered: number;
    changeDue: number;
  } | null>(null);

  // Payment Settlement Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'TRANSFER'>('CASH');
  const [amountTendered, setAmountTendered] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item =>
          item.id === id ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter(item => item.quantity > 0)
    );
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

 const handleCheckoutClick = () => {
    if (cart.length === 0) return;

    if (flow === 'DIRECT_SALE') {
      // Pre-fill exact amount tendered and open settlement modal
      setAmountTendered(cartTotal.toString());
      setPaymentMethod('CASH');
      setIsPaymentModalOpen(true);
    } else {
      // Kitchen orders go straight to the KDS as unpaid/open tabs
      submitOrderToBackend();
    }
  };

  const submitOrderToBackend = async (settlementDetails?: {
    paymentMethod: 'CASH' | 'CARD' | 'TRANSFER';
    paymentStatus: 'PAID';
  }) => {
    setIsSubmitting(true);
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
          ...(settlementDetails && {
            paymentMethod: settlementDetails.paymentMethod,
            paymentStatus: settlementDetails.paymentStatus
          }),
          items: cart.map(item => ({
            menuItemId: item.id,
            quantity: item.quantity,
            price: item.price
          }))
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit order');
      }

      // If this was a settled Direct Sale, populate the thermal receipt and print
      if (settlementDetails) {
        const tendered =
          settlementDetails.paymentMethod === 'CASH'
            ? Number(amountTendered || cartTotal)
            : cartTotal;

        setReceiptData({
          orderNumber: data.order?.orderNumber || `ORD-${Date.now().toString().slice(-6)}`,
          date: new Date().toLocaleString(),
          items: [...cart],
          totalAmount: cartTotal,
          paymentMethod: settlementDetails.paymentMethod,
          amountTendered: tendered,
          changeDue: Math.max(0, tendered - cartTotal),
        });

        setTimeout(() => {
          window.print();
        }, 150);
      }

      setCart([]);
      setIsPaymentModalOpen(false);
      toast.success(
        flow === 'DIRECT_SALE'
          ? 'Payment settled & printing receipt...'
          : 'Order sent to Kitchen Display!'
      );
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || 'Failed to process order');
    } finally {
      setIsSubmitting(false);
    }
  };
  // Filter and sort items based on search
  const filteredMenuItems = menuItems
    .filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Main Catalog Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
       <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center z-20">
          <h1 className="text-2xl font-bold text-gray-800">Cashier POS</h1>
          
          {/* Search Bar */}
          <div className="flex-1 max-w-md mx-8 relative">
            <input
              type="text"
              placeholder="Search dishes or drinks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-gray-100 border-transparent rounded-lg outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-sm font-medium text-gray-800"
            />
            <div className="absolute left-3 top-3 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <button 
            onClick={handleLogout} 
            className="px-4 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 font-medium transition-colors whitespace-nowrap"
          >
            Log Out
          </button>
        </header>
        
        {/* Scrollable Catalog Grid Container */}
        <div className="flex-1 overflow-auto p-6">
          {filteredMenuItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <p className="text-lg font-semibold mb-1">No items found</p>
              <p className="text-sm">Try searching for something else, like "Coke" or "Burger".</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredMenuItems.map(item => (
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
          )}
        </div>
      </main>

      {/* Right Sidebar - Active Cart & Checkout */}
      <aside className="w-96 bg-white shadow-xl border-l border-gray-200 flex flex-col h-screen z-10">
       <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-800">Current Order</h2>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded">
              Draft
            </span>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
        {/* Dual-Flow Toggle */}
        <div className="p-4 border-b border-gray-100 flex gap-2 bg-white">
          <button 
            onClick={() => setFlow('KITCHEN_ORDER')}
            className={`flex-1 py-2 text-sm font-medium rounded-md shadow-sm transition-colors ${
              flow === 'KITCHEN_ORDER' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Kitchen Order
          </button>
          <button 
            onClick={() => setFlow('DIRECT_SALE')}
            className={`flex-1 py-2 text-sm font-medium rounded-md shadow-sm transition-colors ${
              flow === 'DIRECT_SALE' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
            <div className="space-y-3">
              {cart.map(item => (
                <div
                  key={item.id}
                  className="bg-white p-3.5 rounded-lg shadow-sm border border-gray-100 space-y-3"
                >
                  {/* Top Row: Name & Line Subtotal */}
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="font-semibold text-gray-800 text-sm leading-tight">
                        {item.name}
                      </h4>
                      <p className="text-gray-500 text-xs mt-0.5">
                        ₦ {item.price.toLocaleString()} each
                      </p>
                    </div>
                    <div className="font-bold text-gray-900 text-sm whitespace-nowrap">
                      ₦ {(item.price * item.quantity).toLocaleString()}
                    </div>
                  </div>

                  {/* Bottom Row: Quantity Stepper & Remove Button */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        aria-label="Decrease quantity"
                        className="w-7 h-7 flex items-center justify-center rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
                        </svg>
                      </button>

                      <span className="w-7 text-center text-sm font-bold text-gray-800">
                        {item.quantity}
                      </span>

                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        aria-label="Increase quantity"
                        className="w-7 h-7 flex items-center justify-center rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.id)}
                      aria-label="Remove item"
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Remove item"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
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
            disabled={cart.length === 0 || isSubmitting}
            onClick={handleCheckoutClick}
            className="w-full py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-sm transition-colors text-lg"
          >
            {flow === 'DIRECT_SALE' ? 'Proceed to Payment' : 'Send to Kitchen'}
          </button>
        </div>
      </aside>
      {/* Direct Sale Payment Settlement Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-lg font-bold">Settle Direct Sale</h3>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Total Due Banner */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
                  Total Amount Due
                </p>
                <p className="text-3xl font-black text-gray-900">
                  ₦ {cartTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              {/* Payment Method Selector */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {(['CASH', 'CARD', 'TRANSFER'] as const).map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(method);
                        if (method !== 'CASH') {
                          setAmountTendered(cartTotal.toString());
                        }
                      }}
                      className={`py-2.5 px-3 rounded-lg text-xs font-bold border transition-all ${
                        paymentMethod === method
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {method === 'CARD' ? 'POS / CARD' : method}
                    </button>
                  ))}
                </div>
              </div>
              {/* Cash Tendered & Change Calculator */}
              {paymentMethod === 'CASH' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Cash Received (₦)
                    </label>
                    <input
                      type="number"
                      min={cartTotal}
                      value={amountTendered}
                      onChange={e => setAmountTendered(e.target.value)}
                      className="w-full px-4 py-3 text-lg font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="Enter amount received"
                    />
                  </div>

                  {/* Quick Cash Denominations */}
                  <div className="flex flex-wrap gap-2">
                    {[cartTotal, 1000, 2000, 5000, 10000].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setAmountTendered(preset.toString())}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-md transition-colors"
                      >
                        {idx === 0 ? 'Exact' : `₦${preset.toLocaleString()}`}
                      </button>
                    ))}
                  </div>

                  {/* Change Due Display */}
                  <div className="flex justify-between items-center p-3.5 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="text-sm font-semibold text-gray-600">Change Due:</span>
                    <span
                      className={`text-lg font-bold ${
                        Number(amountTendered) >= cartTotal ? 'text-green-600' : 'text-red-500'
                      }`}
                    >
                      ₦{' '}
                      {Math.max(0, Number(amountTendered || 0) - cartTotal).toLocaleString(
                        undefined,
                        { minimumFractionDigits: 2 }
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={
                    isSubmitting ||
                    (paymentMethod === 'CASH' && Number(amountTendered || 0) < cartTotal)
                  }
                  onClick={() =>
                    submitOrderToBackend({
                      paymentMethod,
                      paymentStatus: 'PAID'
                    })
                  }
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-sm transition-colors"
                >
                  {isSubmitting ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Hidden 80mm Thermal Receipt Layout (Visible only during print) */}
      {receiptData && (
        <div id="thermal-receipt" className="hidden print:block text-black text-xs leading-snug">
          {/* Restaurant Header */}
          <div className="text-center border-b border-dashed border-black pb-3 mb-3">
            <h2 className="text-base font-bold uppercase tracking-wider">RMS</h2>
            <p className="text-[11px]">Official Sales Receipt</p>
            <p className="text-[11px] mt-1">{receiptData.date}</p>
            <p className="font-bold text-xs mt-1">Order: {receiptData.orderNumber}</p>
          </div>

          {/* Itemized List */}
          <div className="border-b border-dashed border-black pb-3 mb-3 space-y-1.5">
            <div className="flex justify-between font-bold border-b border-black pb-1 text-[11px]">
              <span>ITEM</span>
              <span>TOTAL</span>
            </div>
            {receiptData.items.map((item) => (
              <div key={item.id} className="flex justify-between items-start gap-2">
                <div className="flex-1">
                  <span className="font-semibold">{item.quantity}x </span>
                  <span>{item.name}</span>
                  <div className="text-[10px] text-gray-700">
                    @ ₦{item.price.toLocaleString()}
                  </div>
                </div>
                <span className="font-semibold whitespace-nowrap">
                  ₦{(item.price * item.quantity).toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          {/* Totals & Payment Breakdown */}
          <div className="space-y-1 border-b border-dashed border-black pb-3 mb-3">
            <div className="flex justify-between text-sm font-bold">
              <span>TOTAL DUE:</span>
              <span>₦{receiptData.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span>Payment Method:</span>
              <span className="font-bold">{receiptData.paymentMethod}</span>
            </div>
            {receiptData.paymentMethod === 'CASH' && (
              <>
                <div className="flex justify-between text-[11px]">
                  <span>Cash Tendered:</span>
                  <span>₦{receiptData.amountTendered.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold">
                  <span>Change Due:</span>
                  <span>₦{receiptData.changeDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="text-center text-[11px] space-y-1 pt-1">
            <p className="font-bold">Thank you for your patronage!</p>
            <p>Please keep receipt for your records.</p>
          </div>
        </div>
      )}
    </div>
  );
}