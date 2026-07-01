// --- Constants ---
export const COL_BIB = 'Bib #';
export const COL_NAME = 'Name';
export const COL_CLASS = 'Class';
export const COL_TIME = 'Raw Time';
export const COL_SCORE = 'Total Score';

export const MIN_TIME_SAMPLE = 10;
export const MAX_TIME_SAMPLE = 900;

// --- 1. CSV Parser ---
export function parseCSV(text) {
    if (!text || !text.trim()) return { headers: [], rows: [] };
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 1) return { headers: [], rows: [] };

    const splitRow = (row) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < row.length; i++) {
            const char = row[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result.map(v => v.replace(/^"|"$/g, ''));
    };

    let headerIdx = 1; // Default to row 2
    if (lines[0]) {
        const firstRowCols = splitRow(lines[0]);
        if (firstRowCols.includes(COL_BIB)) {
            headerIdx = 0;
        }
    }

    const headers = splitRow(lines[headerIdx]);
    const results = [];

    for (let i = headerIdx + 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = splitRow(lines[i]);
        const obj = {};
        headers.forEach((header, index) => {
            if (header) {
                obj[header] = values[index] || '';
            }
        });
        results.push(obj);
    }
    return { headers, rows: results };
}

// --- 2. Parse to Numeric Seconds ---
export function parseToNumeric(val) {
    if (!val) return null;
    if (typeof val === 'number') return val;
    if (typeof val === 'string' && val.includes(':')) {
        const parts = val.split(':').map(Number);
        if (parts.length === 2) return (parts[0] * 60) + parts[1];
        if (parts.length === 3) return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
    }
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
}

// --- 3. Format Bytes ---
export function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// --- 4. Process Results Data (Filters) ---
export function processResultsData(rows) {
    const errorData = rows.filter(row => {
        const runNum = (row['Run #'] || row['Run'] || '1').toString().trim();
        const time = parseToNumeric(row[COL_TIME]);
        return (runNum !== '1' && runNum !== '2') || time === 0;
    });

    const allData = rows.filter(row => {
        const time = parseToNumeric(row[COL_TIME]);
        return time === null || (time >= MIN_TIME_SAMPLE && time <= MAX_TIME_SAMPLE);
    });

    return { allData, errorData };
}
