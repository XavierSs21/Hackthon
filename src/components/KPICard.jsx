import { TrendingUp, TrendingDown, DollarSign } from "lucide-react"

const KPICard = ({ title, value, change, trend }) => {
  const formatCurrency = (val) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val)
  }

  const isPositive = trend === "up"
  const changeColor = isPositive ? "text-green-600" : "text-red-600"
  const bgColor = isPositive ? "bg-green-50" : "bg-red-50"
  const TrendIcon = isPositive ? TrendingUp : TrendingDown

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:scale-105 transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mb-3">{formatCurrency(value)}</p>
          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${bgColor}`}>
            <TrendIcon className={`w-4 h-4 ${changeColor}`} />
            <span className={`text-sm font-semibold ${changeColor}`}>{Math.abs(change)}%</span>
          </div>
        </div>
        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
          <DollarSign className="w-6 h-6 text-blue-600" />
        </div>
      </div>
    </div>
  )
}

export default KPICard
