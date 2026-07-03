import { GOOGLE_SHEET_FULLFILL_ID, GOOGLE_SHEET_DESIGN_ID, GOOGLE_SHEET_DESIGN_SHEET_NAME } from '../../config'

const SHEET_ID = GOOGLE_SHEET_FULLFILL_ID
const SHEET_NAME = 'Sheet1'
const DESIGN_SHEET_ID = GOOGLE_SHEET_DESIGN_ID
const DESIGN_SHEET_NAME = GOOGLE_SHEET_DESIGN_SHEET_NAME
const GSHEET_API = 'https://sheets.googleapis.com/v4/spreadsheets'

export const fetchDesignSheet = async (token: string) => {
    // If using a secure backend method, swap this URL with: 'http://localhost:5000/api/sheet-data'
  const url = `${GSHEET_API}/${DESIGN_SHEET_ID}/values/${DESIGN_SHEET_NAME}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch data from Google Sheets API');
  
  const result = await response.json();
  const rows = result.values || [];
  const resultMap = rows.slice(1).map((row: any) => {
    return {
      productName: row[0],
      frontDesignLink: row[1],
      frontDesingImage: row[1],
      frontMockupLink: row[3],
      frontMockupImage: row[3],
      backDesignLink: row[5] ?? '',
      backDesignImage: row[5] ?? '',
      backMockupLink: row[7] ?? '',
      backMockupImage: row[7] ?? '',
      sku: row[9] ?? ''
    };
  });
  return resultMap;

};

