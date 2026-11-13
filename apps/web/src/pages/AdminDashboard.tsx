import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";

interface Category {
  id: string;
  name: string;
}

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  isAvailable: boolean;
  categoryId: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"settings" | "menu" | "analytics" | "history">("menu");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Analytics State
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Settings State
  const [targetUsername, setTargetUsername] = useState("cashier");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Menu Catalog State
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [menuLoading, setMenuLoading] = useState(false);

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    if (activeTab === "menu") {
      fetchMenuData();
    } else if (activeTab === "analytics" || activeTab === "history") {
      fetchAnalyticsData();
    }
  }, [activeTab]);

  const fetchMenuData = async () => {
    try {
      const catRes = await fetch("http://localhost:5000/api/menu/categories");
      const catData = await catRes.json();
      if (catData.status === "success") {
        setCategories(catData.categories);
        if (catData.categories.length > 0 && !selectedCategoryId) {
          setSelectedCategoryId(catData.categories[0].id);
        }
      }

      const itemRes = await fetch("http://localhost:5000/api/menu/items");
      const itemData = await itemRes.json();
      if (itemData.status === "success") {
        setMenuItems(itemData.items);
      }
    } catch (err) {
      console.error("Error fetching menu data:", err);
    }
  };

  const fetchAnalyticsData = async () => {
    setAnalyticsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/api/analytics", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.status === "success") {
        setAnalyticsData(data);
      } else {
        toast.error(data.message || "Failed to load analytics");
      }
    } catch (err) {
      console.error("Error fetching analytics:", err);
      toast.error("Network error loading analytics");
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/api/users/reset-password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUsername, newPassword }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to reset password");

      toast.success(data.message);
      setNewPassword("");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategoryId) {
      toast.error("Please select a category.");
      return;
    }

    setMenuLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/api/menu/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: itemName,
          description: itemDesc,
          price: parseFloat(itemPrice),
          categoryId: selectedCategoryId,
        }),
      });

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Failed to create menu item");

      toast.success(`Added "${itemName}" to menu catalog!`);
      setItemName("");
      setItemDesc("");
      setItemPrice("");
      fetchMenuData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setMenuLoading(false);
    }
  };

  const handleToggleAvailability = async (
    id: string,
    currentStatus: boolean,
  ) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/menu/items/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ isAvailable: !currentStatus }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      setMenuItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, isAvailable: !currentStatus } : item,
        ),
      );
      toast.success(currentStatus ? "Marked out of stock" : "Marked in stock");
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
      console.error("Failed to toggle availability:", error);
    }
  };

  const promptDelete = (id: string, name: string) => {
    setItemToDelete({ id, name });
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/menu/items/${itemToDelete.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setMenuItems((prev) =>
          prev.filter((item) => item.id !== itemToDelete.id),
        );
        toast.success(`Deleted "${itemToDelete.name}" successfully`);
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to delete item");
      }
    } catch (error) {
      toast.error("Failed to delete item");
      console.error("Failed to delete item:", error);
    } finally {
      setDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  const renderPaymentBadge = (method?: string | null) => {
    if (!method) {
      return <span className="text-xs text-gray-400 italic">Unpaid / N/A</span>;
    }

    const styles: Record<string, string> = {
      CASH: "bg-emerald-50 text-emerald-700 border-emerald-200",
      CARD: "bg-blue-50 text-blue-700 border-blue-200",
      TRANSFER: "bg-purple-50 text-purple-700 border-purple-200",
    };

    const labels: Record<string, string> = {
      CASH: "Cash",
      CARD: "POS / Card",
      TRANSFER: "Transfer",
    };

    return (
      <span
        className={`px-2.5 py-1 rounded-md text-xs font-bold border whitespace-nowrap ${
          styles[method] || "bg-gray-100 text-gray-700 border-gray-200"
        }`}
      >
        {labels[method] || method}
      </span>
    );
  };

  const filteredMenuItems = menuItems
    .filter((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">
      <Toaster position="top-center" />
      
      {/* Custom Delete Confirmation Modal */}
      {deleteModalOpen && itemToDelete && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 transition-opacity">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 transform transition-all">
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Confirm Deletion
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to completely delete{" "}
              <span className="font-bold text-gray-900">
                "{itemToDelete.name}"
              </span>{" "}
              from the catalog? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setItemToDelete(null);
                }}
                className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md shadow-sm transition-colors"
              >
                Delete Item
              </button>
            </div>
          </div>
        </div>
      )}

      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}
      
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transform transition-transform duration-300 ease-in-out ${isDrawerOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="p-6 text-2xl font-bold border-b border-slate-800 text-blue-400 flex justify-between items-center">
          <span>RMS Admin</span>
          <button
            onClick={() => setIsDrawerOpen(false)}
            className="text-slate-400 hover:text-white text-xl font-bold px-2 py-1 bg-slate-800 rounded-md transition-colors"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => {
              setActiveTab("menu");
              setIsDrawerOpen(false);
            }}
            className={`w-full text-left px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === "menu"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            Menu Catalog
          </button>
          
          <button
            onClick={() => {
              setActiveTab("analytics");
              setIsDrawerOpen(false);
            }}
            className={`w-full text-left px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === "analytics"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            Sales Analytics
          </button>
          <button
            onClick={() => {
              setActiveTab("history");
              setIsDrawerOpen(false);
            }}
            className={`w-full text-left px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === "history"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            Transaction History
          </button>
          <button
            onClick={() => {
              setActiveTab("settings");
              setIsDrawerOpen(false);
            }}
            className={`w-full text-left px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === "settings"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            Settings
          </button>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="p-2 rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none"
              aria-label="Open Sidebar"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-gray-800">
              Admin Control Panel
            </h1>
          </div>

          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-md font-semibold text-sm transition-colors shadow-sm"
          >
            Log Out
          </button>
        </header>

        <main className="flex-1 overflow-auto p-6 md:p-10">
          {activeTab === "settings" && (
            <div className="max-w-3xl">
              <h2 className="text-3xl font-bold text-gray-900 mb-8">
                System Settings
              </h2>
              <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-xl font-semibold text-gray-800 mb-6">
                  Reset Account Passwords
                </h3>

                <form onSubmit={handlePasswordReset} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Select Account
                      </label>
                      <select
                        value={targetUsername}
                        onChange={(e) => setTargetUsername(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white outline-none focus:border-blue-500"
                      >
                        <option value="cashier">Cashier Account</option>
                        <option value="manager">Manager Account</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-md outline-none focus:border-blue-500"
                          placeholder="Enter new secure password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                        >
                          {showPassword ? (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isUpdating}
                      className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm transition-colors disabled:opacity-50"
                    >
                      {isUpdating ? "Updating Password..." : "Update Password"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === "menu" && (
            <div className="max-w-5xl space-y-8">
              <h2 className="text-3xl font-bold text-gray-900">
                Menu Catalog Management
              </h2>

              <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-xl font-semibold text-gray-800 mb-6">
                  Add New Dish / Drink
                </h3>

                <form onSubmit={handleAddMenuItem} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Item Name
                      </label>
                      <input
                        type="text"
                        required
                        value={itemName}
                        onChange={(e) => setItemName(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md outline-none"
                        placeholder="e.g. Suya Platter"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Price (₦)
                      </label>
                      <input
                        type="number"
                        step="100"
                        required
                        value={itemPrice}
                        onChange={(e) => setItemPrice(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md outline-none"
                        placeholder="5000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category
                      </label>
                      <select
                        value={selectedCategoryId}
                        onChange={(e) => setSelectedCategoryId(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white outline-none"
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      value={itemDesc}
                      onChange={(e) => setItemDesc(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md outline-none"
                      placeholder="Spicy grilled beef skewers"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={menuLoading}
                    className="py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm transition-colors disabled:opacity-50"
                  >
                    {menuLoading ? "Adding Item..." : "Save to Menu Catalog"}
                  </button>
                </form>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h3 className="text-xl font-semibold text-gray-800">
                    Current Catalog Items ({filteredMenuItems.length})
                  </h3>

                  <div className="relative w-full sm:w-72">
                    <input
                      type="text"
                      placeholder="Search dishes or drinks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md outline-none focus:border-blue-500"
                    />
                    <div className="absolute left-3 top-2.5 text-gray-400">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <th className="p-4">Name</th>
                        <th className="p-4">Price</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {filteredMenuItems.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="p-8 text-center text-gray-500"
                          >
                            No items found matching your search.
                          </td>
                        </tr>
                      ) : (
                        filteredMenuItems.map((item) => (
                          <tr
                            key={item.id}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="p-4 font-semibold text-gray-800">
                              {item.name}
                            </td>
                            <td className="p-4 font-bold text-blue-600">
                              ₦ {item.price.toLocaleString()}
                            </td>
                            <td className="p-4">
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-bold ${item.isAvailable ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                              >
                                {item.isAvailable ? "In Stock" : "Out of Stock"}
                              </span>
                            </td>
                            <td className="p-4 flex justify-end gap-2">
                              <button
                                onClick={() =>
                                  handleToggleAvailability(
                                    item.id,
                                    item.isAvailable,
                                  )
                                }
                                className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                                  item.isAvailable
                                    ? "bg-red-50 text-red-600 hover:bg-red-100"
                                    : "bg-green-50 text-green-600 hover:bg-green-100"
                                }`}
                              >
                                {item.isAvailable
                                  ? "Mark Out of Stock"
                                  : "Mark In Stock"}
                              </button>

                              <button
                                onClick={() => promptDelete(item.id, item.name)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold transition-colors bg-gray-100 text-gray-600 hover:bg-red-600 hover:text-white"
                                title="Delete Item"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="max-w-6xl space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-gray-900">
                  Sales Analytics
                </h2>
                <button
                  onClick={fetchAnalyticsData}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Data
                </button>
              </div>

              {analyticsLoading ? (
                <div className="flex items-center justify-center p-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                </div>
              ) : analyticsData ? (
                <>
                  {/* Top Level Metric Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Total Revenue */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-5">
                      <div className="bg-green-50 rounded-xl text-green-600 flex items-center justify-center font-black text-2xl w-14 h-14 shrink-0">
                        ₦
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Total Revenue</p>
                        <p className="text-2xl font-bold text-gray-900">
                          ₦ {analyticsData.metrics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>

                    {/* Total Orders */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-5">
                      <div className="p-4 bg-blue-50 rounded-xl text-blue-600">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Total Orders</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {analyticsData.metrics.totalOrders.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Average Order Value */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-5">
                      <div className="p-4 bg-purple-50 rounded-xl text-purple-600">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Average Order Value</p>
                        <p className="text-2xl font-bold text-gray-900">
                          ₦ {analyticsData.metrics.averageOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Recent Transactions Table */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                      <h3 className="text-xl font-semibold text-gray-800">
                        Recent Transactions
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                            <th className="p-4">Order ID</th>
                            <th className="p-4">Items</th>
                            <th className="p-4">Date & Time</th>
                            <th className="p-4">Payment</th>
                            <th className="p-4">Amount</th>
                            <th className="p-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                          {analyticsData.recentOrders.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-8 text-center text-gray-500">
                                No recent orders found.
                              </td>
                            </tr>
                          ) : (
                            analyticsData.recentOrders.map((order: any) => (
                              <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-4 font-mono text-gray-600">
                                  #{order.id.slice(-6).toUpperCase()}
                                </td>
                                <td
                                  className="p-4 text-gray-600 text-xs max-w-[200px] truncate"
                                  title={order.items?.map((i: any) => `${i.quantity}x ${i.menuItem?.name}`).join(", ")}
                                >
                                  {order.items?.length > 0
                                    ? order.items.map((i: any) => `${i.quantity}x ${i.menuItem?.name}`).join(", ")
                                    : "No items"}
                                </td>
                                <td className="p-4 text-gray-800">
                                  {new Date(order.createdAt).toLocaleString()}
                                </td>
                                <td className="p-4">
                                  {renderPaymentBadge(order.paymentMethod)}
                                </td>
                                <td className="p-4 font-bold text-gray-900">
                                  ₦ {Number(order.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-4">
                                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                    {order.status || "COMPLETED"}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-gray-100">
                  Failed to load analytics data.
                </div>
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div className="max-w-5xl space-y-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-8">
                Transaction Ledger
              </h2>

              {analyticsLoading ? (
                <div className="flex items-center justify-center p-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                </div>
              ) : analyticsData && analyticsData.history ? (
                <div className="space-y-8">
                  {Object.entries(
                    analyticsData.history.reduce((acc: any, order: any) => {
                      const date = new Date(order.createdAt);
                      const monthYear = date.toLocaleString("default", { month: "long", year: "numeric" });
                      
                      if (!acc[monthYear]) acc[monthYear] = [];
                      acc[monthYear].push(order);
                      return acc;
                    }, {})
                  ).map(([monthYear, orders]: [string, any]) => (
                    <div key={monthYear} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                      {/* Month/Year Header */}
                      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-800">{monthYear}</h3>
                        <span className="text-sm font-medium text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                          {orders.length} order{orders.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      
                      {/* Transactions Table for this Month */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-white border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                              <th className="p-4">Order ID</th>
                              <th className="p-4">Date & Time</th>
                              <th className="p-4">Items</th>
                              <th className="p-4">Payment</th>
                              <th className="p-4">Amount</th>
                              <th className="p-4">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-sm">
                            {orders.map((order: any) => (
                              <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-4 font-mono text-gray-600">
                                  #{order.id.slice(-6).toUpperCase()}
                                </td>
                                <td className="p-4 text-gray-800">
                                  {new Date(order.createdAt).toLocaleString()}
                                </td>
                                <td
                                  className="p-4 text-gray-600 text-xs max-w-[200px] truncate"
                                  title={order.items?.map((i: any) => `${i.quantity}x ${i.menuItem?.name}`).join(", ")}
                                >
                                  {order.items?.length > 0
                                    ? order.items.map((i: any) => `${i.quantity}x ${i.menuItem?.name}`).join(", ")
                                    : "No items"}
                                </td>
                                <td className="p-4">
                                  {renderPaymentBadge(order.paymentMethod)}
                                </td>
                                <td className="p-4 font-bold text-gray-900">
                                  ₦ {Number(order.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-4">
                                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                    {order.status || "COMPLETED"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-gray-100">
                  No transaction history found.
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}