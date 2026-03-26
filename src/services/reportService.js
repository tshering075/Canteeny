export function getDailyReport(date, sales = []) {
  const filtered = sales.filter((s) => s.date === date);
  const total = filtered.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  return { sales: filtered, total };
}

export function getMonthlyReport(yearMonth, sales = []) {
  const filtered = sales.filter((s) => s.date && s.date.startsWith(yearMonth));
  const total = filtered.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  return { sales: filtered, total };
}

export function getReportByDateRange(startDate, endDate, sales = []) {
  const filtered = sales.filter((s) => {
    if (startDate && s.date < startDate) return false;
    if (endDate && s.date > endDate) return false;
    return true;
  });
  const total = filtered.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  return { sales: filtered, total };
}

export function getMonthlyReportByCustomer(yearMonth, sales, customers) {
  return getMonthlyReportByCustomerDateRange(
    `${yearMonth}-01`,
    `${yearMonth}-31`,
    sales,
    customers
  );
}

export function getMonthlyReportByCustomerDateRange(
  startDate,
  endDate,
  sales = [],
  customers = []
) {
  const filteredSales = sales.filter((s) => {
    if (startDate && s.date < startDate) return false;
    if (endDate && s.date > endDate) return false;
    return true;
  });
  const customerMap = Object.fromEntries(customers.map((c) => [c.id, c]));

  const totalsByCustomer = {};
  const salesByCustomer = {};

  filteredSales.forEach((sale) => {
    const key = sale.customerId || 'walkin';
    if (!totalsByCustomer[key]) {
      if (sale.customerId) {
        const c = customerMap[sale.customerId];
        totalsByCustomer[key] = {
          customerId: sale.customerId,
          name:
            c?.name ||
            sale.customerName?.replace(/\s*\([^)]*\)\s*$/, '').trim() ||
            'Unknown',
          department: c?.department || 'Other',
          employeeType: c?.employeeType || 'Others',
          totalAmount: 0,
          itemsSummary: {},
          saleDates: [],
        };
      } else {
        totalsByCustomer[key] = {
          customerId: null,
          name: 'Walk-in',
          department: 'Walk-in',
          employeeType: 'Guest',
          totalAmount: 0,
          itemsSummary: {},
          saleDates: [],
        };
      }
    }

    if (sale.date && !totalsByCustomer[key].saleDates.includes(sale.date)) {
      totalsByCustomer[key].saleDates.push(sale.date);
    }

    // accumulate total amount
    totalsByCustomer[key].totalAmount += sale.totalAmount || 0;

    // accumulate items for this customer
    (sale.items || []).forEach((item) => {
      const mealName = item.mealName || 'Unknown';
      const quantity = Number(item.quantity) || 1;
      const unitPrice = Number(item.unitPrice) || 0;
      const subtotal =
        item.subtotal !== undefined ? item.subtotal : quantity * unitPrice;

      if (!totalsByCustomer[key].itemsSummary[mealName]) {
        totalsByCustomer[key].itemsSummary[mealName] = {
          mealName,
          quantity: 0,
          subtotal: 0,
        };
      }

      totalsByCustomer[key].itemsSummary[mealName].quantity += quantity;
      totalsByCustomer[key].itemsSummary[mealName].subtotal += subtotal;
    });

    // store transaction for item-wise view
    if (!salesByCustomer[key]) salesByCustomer[key] = [];
    salesByCustomer[key].push({
      date: sale.date,
      items: (sale.items || []).map((i) => ({
        mealName: i.mealName || 'Unknown',
        quantity: Number(i.quantity) || 1,
        unitPrice: Number(i.unitPrice) || 0,
        subtotal: i.subtotal ?? (Number(i.quantity) || 1) * (Number(i.unitPrice) || 0),
      })),
      totalAmount: sale.totalAmount || 0,
    });
  });

  const byDepartment = {};
  Object.values(totalsByCustomer).forEach((entry) => {
    const dept = entry.department || 'Other';
    if (!byDepartment[dept]) byDepartment[dept] = [];

    const items =
      entry.itemsSummary != null
        ? Object.values(entry.itemsSummary)
        : [];

    const key = entry.customerId || 'walkin';
    const transactions = (salesByCustomer[key] || []).sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    byDepartment[dept].push({
      customerId: entry.customerId,
      name: entry.name,
      department: entry.department,
      employeeType: entry.employeeType || 'Others',
      totalAmount: entry.totalAmount,
      items,
      saleDates: (entry.saleDates || []).sort(),
      transactions,
    });
  });

  Object.keys(byDepartment).forEach((dept) => {
    byDepartment[dept].sort((a, b) => a.name.localeCompare(b.name));
  });
  const sortedDepts = Object.keys(byDepartment).sort();

  return {
    byDepartment: sortedDepts.map((dept) => ({
      department: dept,
      customers: byDepartment[dept],
    })),
    grandTotal: Object.values(totalsByCustomer).reduce(
      (s, e) => s + e.totalAmount,
      0
    ),
  };
}

export function getTopMeals(sales = [], limit = 5, startDate, endDate) {
  const filtered = startDate
    ? sales.filter((s) => s.date >= startDate && (!endDate || s.date <= endDate))
    : sales;
  const counts = {};
  filtered.forEach((sale) => {
    (sale.items || []).forEach((item) => {
      const key = item.mealId || item.mealName;
      if (!counts[key]) counts[key] = { name: item.mealName, count: 0, revenue: 0 };
      counts[key].count += item.quantity || 1;
      counts[key].revenue += item.subtotal || 0;
    });
  });
  return Object.entries(counts)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
