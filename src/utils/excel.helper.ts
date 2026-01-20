import ExcelJS from 'exceljs';
import { Readable } from 'stream';

/**
 * Generate sample Excel file with headers only
 */
export async function generateSampleExcel(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Students');

  // Define headers
  const headers = [
    'First Name',
    'Last Name',
    'Roll Number',
    'Gender',
    'DOB',
    'Class',
    'Division',
    'Parent Name',
    'Parent Mobile',
    'Parent Email',
  ];

  // Add header row with styling
  const headerRow = worksheet.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  // Set column widths
  worksheet.columns = [
    { width: 15 }, // First Name
    { width: 15 }, // Last Name
    { width: 15 }, // Roll Number
    { width: 10 }, // Gender
    { width: 12 }, // DOB
    { width: 15 }, // Class
    { width: 12 }, // Division
    { width: 20 }, // Parent Name
    { width: 15 }, // Parent Mobile
    { width: 25 }, // Parent Email
  ];

  // Add sample data rows
  const sampleData = [
    ['John', 'Doe', '101', 'MALE', '2010-05-15', '10', 'A', 'Jane Doe', '9876543210', 'jane.doe@example.com'],
    ['Mary', 'Smith', '102', 'FEMALE', '2011-08-20', '9', 'B', 'John Smith', '9876543211', 'john.smith@example.com'],
    ['David', 'Johnson', '103', 'MALE', '2012-03-10', '8', 'A', 'Sarah Johnson', '9876543212', 'sarah.johnson@example.com'],
  ];

  sampleData.forEach((row) => {
    worksheet.addRow(row);
  });

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Parse Excel file and extract student data
 */
export interface ExcelStudentRow {
  rowNumber: number;
  firstName: string;
  lastName: string;
  rollNumber: string;
  gender: string;
  dateOfBirth: string;
  className: string; // Class name from Excel (e.g., "10", "1st", "10th")
  division: string; // Division from Excel (e.g., "A", "B")
  parentName: string;
  parentMobile: string;
  parentEmail: string;
}

export async function parseExcelFile(
  fileBuffer: Buffer
): Promise<ExcelStudentRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer);

  const worksheet = workbook.getWorksheet(1); // Get first worksheet
  if (!worksheet) {
    throw new Error('Excel file is empty');
  }

  const rows: ExcelStudentRow[] = [];
  let rowNumber = 2; // Start from row 2 (skip header)

  worksheet.eachRow((row, rowIndex) => {
    // Skip header row
    if (rowIndex === 1) return;

    const cells = row.values as any[];
    
    // Skip empty rows
    if (!cells[1] && !cells[2] && !cells[3]) return;

    // Helper to safely convert cell value to string
    const getCellValue = (cell: any): string => {
      if (cell === null || cell === undefined) return '';
      if (typeof cell === 'object' && cell.text !== undefined) return String(cell.text).trim();
      if (typeof cell === 'object' && cell.value !== undefined) return String(cell.value).trim();
      if (cell instanceof Date) return cell.toISOString().split('T')[0];
      return String(cell).trim();
    };

    // Format date properly
    let dateOfBirthStr = '';
    const dobCell = cells[5];
    if (dobCell) {
      if (dobCell instanceof Date) {
        dateOfBirthStr = dobCell.toISOString().split('T')[0];
      } else if (typeof dobCell === 'number') {
        // Excel date number
        const excelEpoch = new Date(1899, 11, 30);
        const date = new Date(excelEpoch.getTime() + dobCell * 86400000);
        dateOfBirthStr = date.toISOString().split('T')[0];
      } else {
        dateOfBirthStr = formatExcelDate(dobCell);
      }
    }

    rows.push({
      rowNumber,
      firstName: getCellValue(cells[1]),
      lastName: getCellValue(cells[2]),
      rollNumber: getCellValue(cells[3]),
      gender: getCellValue(cells[4]).toUpperCase(),
      dateOfBirth: dateOfBirthStr || getCellValue(cells[5]),
      className: getCellValue(cells[6]),
      division: getCellValue(cells[7]).toUpperCase(),
      parentName: getCellValue(cells[8]),
      parentMobile: getCellValue(cells[9]),
      parentEmail: getCellValue(cells[10]),
    });

    rowNumber++;
  });

  return rows;
}

/**
 * Convert Excel date to YYYY-MM-DD format
 */
export function formatExcelDate(excelDate: any): string {
  if (!excelDate) return '';

  // If it's already a string in YYYY-MM-DD format
  if (typeof excelDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(excelDate)) {
    return excelDate;
  }

  // If it's an Excel date number
  if (typeof excelDate === 'number') {
    // Excel date starts from 1900-01-01
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + excelDate * 86400000);
    return date.toISOString().split('T')[0];
  }

  // If it's a Date object
  if (excelDate instanceof Date) {
    return excelDate.toISOString().split('T')[0];
  }

  return String(excelDate);
}
