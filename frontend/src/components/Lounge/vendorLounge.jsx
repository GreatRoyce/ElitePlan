import React from 'react'
import { Link } from 'react-router-dom'
import { 
  Zap, 
  Calendar, 
  DollarSign, 
  MessageSquare, 
  CheckCircle, 
  Clock,
  Star,
  TrendingUp,
  Users,
  FileText,
  ShoppingCart,
  Award,
  BarChart3
} from 'lucide-react'

function VendorLounge() {
  // Mock data for vendor dashboard
  const vendorData = {
    activeBookings: 8,
    pendingInquiries: 12,
    completedEvents: 45,
    totalEarnings: '₦2.8M',
    responseRate: '92%',
    customerRating: 4.8,
    upcomingDeliverables: 3,
    newMessages: 5
  }

  const activeBookings = [
    { id: 1, client: 'Adebola Wedding', service: 'Full Decor Package', date: '2024-12-15', status: 'confirmed', amount: '₦450,000' },
    { id: 2, client: 'Corporate Gala', service: 'Venue Setup', date: '2024-12-18', status: 'confirmed', amount: '₦280,000' },
    { id: 3, client: 'Birthday Party', service: 'Basic Decor', date: '2024-12-20', status: 'deposit-pending', amount: '₦150,000' }
  ]

  const recentInquiries = [
    { id: 1, client: 'Chidinma O.', event: 'Traditional Wedding', date: '2024-12-22', budget: '₦300,000', urgency: 'high' },
    { id: 2, client: 'Tech Solutions Ltd', event: 'Product Launch', date: '2024-12-28', budget: '₦500,000', urgency: 'medium' },
    { id: 3, client: 'Mr. & Mrs. Adeyemi', event: 'Anniversary Party', date: '2024-12-25', budget: '₦200,000', urgency: 'low' }
  ]

  const performanceStats = [
    { label: 'Bookings This Month', value: '8', change: '+2', trend: 'up' },
    { label: 'Avg. Response Time', value: '2.4h', change: '-0.3h', trend: 'up' },
    { label: 'Client Satisfaction', value: '96%', change: '+4%', trend: 'up' },
    { label: 'Repeat Clients', value: '35%', change: '+8%', trend: 'up' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/20 p-6">
      {/* Header with Welcome */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Vendor Lounge</h1>
            <p className="text-gray-600">Manage your bookings, inquiries, and grow your business</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white rounded-xl p-3 shadow-sm border">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700">Online</span>
              </div>
            </div>
            <button className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-sm">
              <Zap className="w-4 h-4 inline mr-2" />
              Quick Response
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Performance Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {performanceStats.map((stat, index) => (
              <div key={index} className="bg-white rounded-xl p-4 shadow-sm border hover:shadow-md transition-shadow">
                <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                <div className="flex items-end justify-between">
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <span className={`text-sm font-medium ${
                    stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.change}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Core Business Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Active Bookings */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <ShoppingCart className="w-8 h-8 opacity-90" />
                <span className="text-2xl font-bold">{vendorData.activeBookings}</span>
              </div>
              <h3 className="font-semibold mb-1">Active Bookings</h3>
              <p className="text-sm opacity-90">Confirmed engagements</p>
            </div>

            {/* Pending Inquiries */}
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <MessageSquare className="w-8 h-8 opacity-90" />
                <span className="text-2xl font-bold">{vendorData.pendingInquiries}</span>
              </div>
              <h3 className="font-semibold mb-1">Pending Inquiries</h3>
              <p className="text-sm opacity-90">New client requests</p>
            </div>

            {/* Earnings */}
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <DollarSign className="w-8 h-8 opacity-90" />
                <span className="text-2xl font-bold">{vendorData.totalEarnings}</span>
              </div>
              <h3 className="font-semibold mb-1">Total Earnings</h3>
              <p className="text-sm opacity-90">This quarter</p>
            </div>
          </div>

          {/* Active Bookings Table */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                Active Bookings
              </h3>
              <span className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                {activeBookings.length} ongoing
              </span>
            </div>
            <div className="space-y-4">
              {activeBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-blue-300 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900">{booking.client}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        booking.status === 'confirmed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {booking.status === 'confirmed' ? 'Confirmed' : 'Deposit Pending'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{booking.service}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(booking.date).toLocaleDateString()} • {booking.amount}
                    </p>
                  </div>
                  <button className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
                    View Details
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
              Business Health
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Response Rate</span>
                <span className="font-semibold text-green-600">{vendorData.responseRate}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Customer Rating</span>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-amber-400 fill-current" />
                  <span className="font-semibold text-gray-900">{vendorData.customerRating}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Completed Events</span>
                <span className="font-semibold text-gray-900">{vendorData.completedEvents}</span>
              </div>
            </div>
          </div>

          {/* Recent Inquiries */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-amber-600" />
                Recent Inquiries
              </h3>
              <span className="bg-amber-100 text-amber-800 text-xs rounded-full px-2 py-1">
                {recentInquiries.length} new
              </span>
            </div>
            <div className="space-y-3">
              {recentInquiries.map((inquiry) => (
                <div key={inquiry.id} className="p-3 border border-gray-200 rounded-lg hover:border-amber-300 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 text-sm">{inquiry.client}</h4>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      inquiry.urgency === 'high' 
                        ? 'bg-red-100 text-red-800' 
                        : inquiry.urgency === 'medium'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {inquiry.urgency}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-1">{inquiry.event}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{new Date(inquiry.date).toLocaleDateString()}</span>
                    <span className="font-medium">{inquiry.budget}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Cards */}
          <div className="space-y-3">
            <Link to="/presence">
              <button className="w-full bg-indigo-600 text-white p-4 rounded-xl text-left hover:bg-indigo-700 transition-colors shadow-sm group">
                <div className="flex items-center justify-between">
                  <div>
                    <FileText className="w-5 h-5 mb-2 opacity-90" />
                    <p className="font-semibold">Create Portfolio</p>
                    <p className="text-sm opacity-90 mt-1">
                      Showcase your best work
                    </p>
                  </div>
                  <Award className="w-6 h-6 opacity-80 group-hover:scale-110 transition-transform" />
                </div>
              </button>
            </Link>

            <button className="w-full bg-white border border-gray-300 p-4 rounded-xl text-left hover:border-indigo-400 transition-colors shadow-sm group">
              <div className="flex items-center justify-between">
                <div>
                  <BarChart3 className="w-5 h-5 mb-2 text-gray-600" />
                  <p className="font-semibold text-gray-900">View Analytics</p>
                  <p className="text-sm text-gray-600 mt-1">Track your performance</p>
                </div>
                <TrendingUp className="w-6 h-6 text-gray-400 group-hover:scale-110 transition-transform" />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Action Bar */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-2xl shadow-lg border p-4">
        <div className="flex items-center gap-4">
          <button className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center">
            <MessageSquare className="w-4 h-4 mr-2" />
            Respond to Inquiries
          </button>
          <button className="bg-white text-gray-700 px-4 py-2 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center border">
            <Calendar className="w-4 h-4 mr-2" />
            Update Availability
          </button>
          <button className="bg-white text-gray-700 px-4 py-2 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center border">
            <DollarSign className="w-4 h-4 mr-2" />
            Set Pricing
          </button>
        </div>
      </div>
    </div>
  )
}

export default VendorLounge