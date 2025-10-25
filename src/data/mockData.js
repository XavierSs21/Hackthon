// KPIs iniciales
export const initialKPIs = {
  revenue: 2450000,
  netProfit: 520000,
  cashFlow: 340000,
  budgetVariance: -45000,
}

// Datos de flujo de caja (12 meses)
export const initialCashFlowData = [
  { mes: "Ene", historico: 280000, proyectado: null },
  { mes: "Feb", historico: 295000, proyectado: null },
  { mes: "Mar", historico: 310000, proyectado: null },
  { mes: "Abr", historico: 305000, proyectado: null },
  { mes: "May", historico: 325000, proyectado: null },
  { mes: "Jun", historico: 340000, proyectado: null },
  { mes: "Jul", historico: 355000, proyectado: null },
  { mes: "Ago", historico: 345000, proyectado: null },
  { mes: "Sep", historico: 360000, proyectado: null },
  { mes: "Oct", historico: null, proyectado: 375000 },
  { mes: "Nov", historico: null, proyectado: 390000 },
  { mes: "Dic", historico: null, proyectado: 410000 },
]

// Datos de variación presupuestaria por departamento
export const initialBudgetData = [
  { departamento: "Ventas", presupuestado: 450000, real: 465000 },
  { departamento: "Marketing", presupuestado: 280000, real: 295000 },
  { departamento: "Operaciones", presupuestado: 380000, real: 370000 },
  { departamento: "TI", presupuestado: 320000, real: 335000 },
  { departamento: "Administración", presupuestado: 250000, real: 245000 },
]

// Datos de desglose de gastos
export const initialExpenseData = [
  { categoria: "Nómina", valor: 900000, porcentaje: 45 },
  { categoria: "Marketing", valor: 300000, porcentaje: 15 },
  { categoria: "Operaciones", valor: 400000, porcentaje: 20 },
  { categoria: "Tecnología", valor: 200000, porcentaje: 10 },
  { categoria: "Servicios", valor: 140000, porcentaje: 7 },
  { categoria: "Otros", valor: 60000, porcentaje: 3 },
]

// Mensajes iniciales del chat
export const initialMessages = [
  {
    id: 1,
    text: "¿Cuál fue nuestro beneficio neto del Q3?",
    sender: "user",
    timestamp: "10:30",
  },
  {
    id: 2,
    text: "El beneficio neto del Q3 fue de $520,000 MXN, con un crecimiento del 12.3% respecto al trimestre anterior. La mejora se debe principalmente a la reducción de costos operativos.",
    sender: "ai",
    timestamp: "10:31",
  },
  {
    id: 3,
    text: "Simula un aumento del 5% en ventas",
    sender: "user",
    timestamp: "10:32",
  },
  {
    id: 4,
    text: "He aplicado la simulación. Con un aumento del 5% en ventas, tu flujo de caja proyectado para Q4 aumentaría a $385,000 MXN. Puedes ver la proyección actualizada en el gráfico de arriba.",
    sender: "ai",
    timestamp: "10:33",
  },
]
