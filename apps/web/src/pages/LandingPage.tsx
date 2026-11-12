import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar */}
      <nav className="flex items-center justify-between p-6 bg-white shadow-sm">
        <div className="text-2xl font-extrabold text-blue-600 tracking-tight">
          Restaurant Management System
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-grow flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 mt-12 mb-20">
        <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight mb-6 max-w-4xl">
          Modernize Your{" "}
          <span className="text-blue-600">Restaurant Operations</span>
        </h1>
        <p className="max-w-2xl text-xl text-gray-600 mb-10">
          A unified platform featuring a cashier POS, real-time kitchen display
          and seamless customer mobile ordering.
        </p>
        <Link
          to="/login"
          className="px-8 py-3 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 shadow-md transition-all hover:scale-105"
        >
          Access Dashboard
        </Link>

        {/* Feature Grid */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full text-left">
          <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="p-4 rounded-xl mb-6">
              <svg
                className="w-8 h-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Dual-Flow POS
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Instantly switch between long-running kitchen queue orders and
              rapid direct counter checkout.
            </p>
          </div>

          <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="p-4 rounded-xl mb-6">
              <svg
                className="w-8 h-8 text-blue-600"
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
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Real-Time KDS
            </h3>
            <p className="text-gray-600 leading-relaxed">
              An instant Kitchen Display System. Watch prep tickets arrive with
              status tracking.
            </p>
          </div>

          <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="p-4 rounded-xl mb-6">
              <svg
                className="w-8 h-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 10.5l2 2 4-4"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Mobile Ordering
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Customers can check live prices and place orders directly from
              their device
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
