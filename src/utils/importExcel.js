import * as XLSX from 'xlsx';

/**
 * Parse an Excel file and return rows as array of objects.
 * First row is treated as headers. Column names are normalized (trim, lowercase).
 */
export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Normalize column name for flexible matching (trim, lowercase, remove extra spaces)
 */
function normCol(key) {
  return String(key || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Get cell value from row - supports various column name variations
 */
function getCell(row, ...possibleNames) {
  const keys = Object.keys(row || {});
  const normKeys = {};
  keys.forEach((k) => {
    normKeys[normCol(k)] = row[k];
  });
  for (const name of possibleNames) {
    const val = normKeys[normCol(name)];
    if (val !== undefined && val !== null && val !== '') return val;
  }
  return '';
}

/**
 * Parse customer rows from Excel. Expected columns: Name, Department, Phone, Employee Type
 */
export function parseCustomerRows(rows) {
  return (rows || []).map((row, idx) => {
    const name = String(getCell(row, 'Name', 'name', 'Customer Name')).trim();
    const department = String(getCell(row, 'Department', 'department', 'Dept')).trim();
    const phone = String(getCell(row, 'Phone', 'phone', 'Mobile', 'Contact')).trim();
    const empType = String(
      getCell(row, 'Employee Type', 'employee type', 'EmployeeType', 'Type')
    ).trim() || 'regular';
    const validTypes = ['regular', 'casual', 'guest', 'others'];
    const employeeType = validTypes.includes(empType.toLowerCase()) ? empType.toLowerCase() : 'regular';
    return { name, department, phone, employeeType, _row: idx + 2 };
  }).filter((r) => r.name);
}

/**
 * Parse meal rows from Excel. Expected columns: Name, Category, Price
 */
export function parseMealRows(rows) {
  return (rows || []).map((row, idx) => {
    const name = String(getCell(row, 'Name', 'name', 'Meal Name', 'Item')).trim();
    const category = String(getCell(row, 'Category', 'category')).trim() || 'General';
    const price = Number(getCell(row, 'Price', 'price', 'Rate')) || 0;
    return { name, category, price, _row: idx + 2 };
  }).filter((r) => r.name);
}

/**
 * Create and download Excel template for customers
 */
export function downloadCustomerTemplate() {
  const data = [
    { Name: 'John Smith', Department: 'IT', Phone: '+975 17 12 34 56', 'Employee Type': 'regular' },
    { Name: 'Jane Doe', Department: 'HR', Phone: '+975 77 98 76 54', 'Employee Type': 'casual' },
  ];
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Customers');
  ws['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 14 }, { wch: 14 }];
  XLSX.writeFile(wb, 'customers-template.xlsx');
}

/**
 * Create and download Excel template for meals
 */
export function downloadMealTemplate() {
  const data = [
    { Name: 'Chicken Rice', Category: 'Main', Price: 8.5 },
    { Name: 'Coca-Cola', Category: 'Beverage', Price: 1.5 },
  ];
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Meals');
  ws['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 10 }];
  XLSX.writeFile(wb, 'meals-template.xlsx');
}
