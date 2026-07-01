import { describe, it, expect } from 'vitest';
import { parseCSV, parseToNumeric, formatBytes, processResultsData, checkStationAnomalies } from './results.js';


describe('results.js unit tests', () => {
    describe('parseCSV', () => {
        it('should parse CSV with headers on the first row', () => {
            const csv = 'Bib #,Name,Class,Raw Time\n1,John,K1,120.5\n2,Jane,C1,130.2';
            const { headers, rows } = parseCSV(csv);
            expect(headers).toEqual(['Bib #', 'Name', 'Class', 'Raw Time']);
            expect(rows).toEqual([
                { 'Bib #': '1', Name: 'John', Class: 'K1', 'Raw Time': '120.5' },
                { 'Bib #': '2', Name: 'Jane', Class: 'C1', 'Raw Time': '130.2' }
            ]);
        });

        it('should parse CSV with headers on the second row', () => {
            const csv = 'Title Row\nBib #,Name,Class,Raw Time\n1,John,K1,120.5';
            const { headers, rows } = parseCSV(csv);
            expect(headers).toEqual(['Bib #', 'Name', 'Class', 'Raw Time']);
            expect(rows).toEqual([
                { 'Bib #': '1', Name: 'John', Class: 'K1', 'Raw Time': '120.5' }
            ]);
        });

        it('should handle quoted values containing commas', () => {
            const csv = 'Bib #,Name,Class,Raw Time\n1,"Doe, John",K1,120.5';
            const { rows } = parseCSV(csv);
            expect(rows[0]['Name']).toBe('Doe, John');
        });

        it('should handle empty input', () => {
            const { headers, rows } = parseCSV('');
            expect(headers).toEqual([]);
            expect(rows).toEqual([]);
        });
    });

    describe('parseToNumeric', () => {
        it('should parse minutes and seconds (MM:SS)', () => {
            expect(parseToNumeric('2:30.55')).toBe(150.55);
        });

        it('should parse hours, minutes and seconds (HH:MM:SS)', () => {
            expect(parseToNumeric('1:02:30')).toBe(3750);
        });

        it('should parse hours, minutes, seconds and decimals (HH:MM:SS.xx)', () => {
            expect(parseToNumeric('1:02:30.45')).toBe(3750.45);
        });

        it('should parse simple float strings', () => {
            expect(parseToNumeric('123.45')).toBe(123.45);
        });

        it('should return number if input is already a number', () => {
            expect(parseToNumeric(120.5)).toBe(120.5);
        });

        it('should return null for invalid inputs', () => {
            expect(parseToNumeric(null)).toBeNull();
            expect(parseToNumeric('')).toBeNull();
            expect(parseToNumeric('abc')).toBeNull();
        });
    });

    describe('formatBytes', () => {
        it('should format bytes correctly', () => {
            expect(formatBytes(0)).toBe('0 B');
            expect(formatBytes(1024)).toBe('1 kB');
            expect(formatBytes(1536)).toBe('1.5 kB');
            expect(formatBytes(1048576)).toBe('1 MB');
        });
    });

    describe('processResultsData', () => {
        it('should separate valid and error rows', () => {
            const rows = [
                { 'Bib #': '1', 'Run #': '1', 'Raw Time': '120.5' },
                { 'Bib #': '2', 'Run #': '3', 'Raw Time': '130.2' }, // error: run # is 3
                { 'Bib #': '3', 'Run #': '2', 'Raw Time': '0' },     // error: time is 0
                { 'Bib #': '4', 'Run #': '2', 'Raw Time': '950' }    // excluded from allData: time > 900
            ];
            const { allData, errorData } = processResultsData(rows);
            expect(allData.map(r => r['Bib #'])).toEqual(['1', '2']);
            expect(errorData.map(r => r['Bib #'])).toEqual(['2', '3']);
        });

        it('should handle rows with empty or missing times', () => {
            const rows = [
                { 'Bib #': '1', 'Run #': '1', 'Raw Time': '' },
                { 'Bib #': '2', 'Run #': '1', 'Raw Time': '120.5' }
            ];
            const { allData, errorData } = processResultsData(rows);
            // Empty time should be treated as null, which is allowed in allData but not an error
            expect(allData.map(r => r['Bib #'])).toEqual(['1', '2']);
            expect(errorData).toEqual([]);
        });
    });

    describe('checkStationAnomalies', () => {
        it('should return no anomalies for a complete, well-formed single run', () => {
            const rows = [
                { 'Bib #': '1', 'Station': 'Station A', 'Timestamp': '2026-07-01 10:00:00' },
                { 'Bib #': '1', 'Station': 'Station B', 'Timestamp': '2026-07-01 10:01:00' },
                { 'Bib #': '1', 'Station': 'Station C', 'Timestamp': '2026-07-01 10:02:00' },
                { 'Bib #': '1', 'Station': 'Station D', 'Timestamp': '2026-07-01 10:03:00' },
                { 'Bib #': '1', 'Station': 'Finish', 'Timestamp': '2026-07-01 10:04:00' }
            ];
            expect(checkStationAnomalies(rows)).toEqual([]);
        });

        it('should handle multi-run grouping with at least 10 minutes gap', () => {
            const rows = [
                // Run 1: 10:00 to 10:04
                { 'Bib #': '1', 'Station': 'Station A', 'Timestamp': '2026-07-01 10:00:00' },
                { 'Bib #': '1', 'Station': 'Station B', 'Timestamp': '2026-07-01 10:01:00' },
                { 'Bib #': '1', 'Station': 'Station C', 'Timestamp': '2026-07-01 10:02:00' },
                { 'Bib #': '1', 'Station': 'Station D', 'Timestamp': '2026-07-01 10:03:00' },
                { 'Bib #': '1', 'Station': 'Finish', 'Timestamp': '2026-07-01 10:04:00' },
                // Run 2: starting at 10:15 (11 minutes gap)
                { 'Bib #': '1', 'Station': 'Station A', 'Timestamp': '2026-07-01 10:15:00' },
                { 'Bib #': '1', 'Station': 'Station B', 'Timestamp': '2026-07-01 10:16:00' },
                { 'Bib #': '1', 'Station': 'Station C', 'Timestamp': '2026-07-01 10:17:00' },
                { 'Bib #': '1', 'Station': 'Station D', 'Timestamp': '2026-07-01 10:18:00' },
                { 'Bib #': '1', 'Station': 'Finish', 'Timestamp': '2026-07-01 10:19:00' }
            ];
            expect(checkStationAnomalies(rows)).toEqual([]);
        });

        it('should report missing stations', () => {
            const rows = [
                { 'Bib #': '1', 'Station': 'Station A', 'Timestamp': '2026-07-01 10:00:00' },
                { 'Bib #': '1', 'Station': 'Station C', 'Timestamp': '2026-07-01 10:02:00' },
                { 'Bib #': '1', 'Station': 'Finish', 'Timestamp': '2026-07-01 10:04:00' }
            ];
            const anomalies = checkStationAnomalies(rows);
            expect(anomalies.length).toBe(1);
            expect(anomalies[0]).toEqual({
                bib: '1',
                run: '1',
                message: 'Bib 1 Run 1: missing: Station B, Station D'
            });
        });

        it('should report extra/duplicate stations', () => {
            const rows = [
                { 'Bib #': '1', 'Station': 'Station A', 'Timestamp': '2026-07-01 10:00:00' },
                { 'Bib #': '1', 'Station': 'Station A', 'Timestamp': '2026-07-01 10:00:30' }, // duplicate
                { 'Bib #': '1', 'Station': 'Station B', 'Timestamp': '2026-07-01 10:01:00' },
                { 'Bib #': '1', 'Station': 'Station C', 'Timestamp': '2026-07-01 10:02:00' },
                { 'Bib #': '1', 'Station': 'Station D', 'Timestamp': '2026-07-01 10:03:00' },
                { 'Bib #': '1', 'Station': 'Finish', 'Timestamp': '2026-07-01 10:04:00' }
            ];
            const anomalies = checkStationAnomalies(rows);
            expect(anomalies.length).toBe(1);
            expect(anomalies[0]).toEqual({
                bib: '1',
                run: '1',
                message: 'Bib 1 Run 1: extra: Station A'
            });
        });

        it('should report unexpected stations', () => {
            const rows = [
                { 'Bib #': '1', 'Station': 'Station A', 'Timestamp': '2026-07-01 10:00:00' },
                { 'Bib #': '1', 'Station': 'Station B', 'Timestamp': '2026-07-01 10:01:00' },
                { 'Bib #': '1', 'Station': 'Station C', 'Timestamp': '2026-07-01 10:02:00' },
                { 'Bib #': '1', 'Station': 'Station D', 'Timestamp': '2026-07-01 10:03:00' },
                { 'Bib #': '1', 'Station': 'Finish', 'Timestamp': '2026-07-01 10:04:00' },
                { 'Bib #': '1', 'Station': 'Station E', 'Timestamp': '2026-07-01 10:04:30' } // unexpected
            ];
            const anomalies = checkStationAnomalies(rows);
            expect(anomalies.length).toBe(1);
            expect(anomalies[0]).toEqual({
                bib: '1',
                run: '1',
                message: 'Bib 1 Run 1: extra: Station E'
            });
        });

        it('should normalize abbreviated station names (e.g. A, B, C, D)', () => {
            const rows = [
                { 'Bib #': '1', 'Station': 'A', 'Timestamp': '2026-07-01 10:00:00' },
                { 'Bib #': '1', 'Station': 'B', 'Timestamp': '2026-07-01 10:01:00' },
                { 'Bib #': '1', 'Station': 'C', 'Timestamp': '2026-07-01 10:02:00' },
                { 'Bib #': '1', 'Station': 'D', 'Timestamp': '2026-07-01 10:03:00' },
                { 'Bib #': '1', 'Station': 'Finish', 'Timestamp': '2026-07-01 10:04:00' }
            ];
            expect(checkStationAnomalies(rows)).toEqual([]);
        });

        it('should return empty anomalies list if columns do not match', () => {
            const rows = [
                { 'Name': 'Alice', 'Score': '123' }
            ];
            expect(checkStationAnomalies(rows)).toEqual([]);
        });

        it('should skip anomalies if the run time is 999.00', () => {
            const rows = [
                { 'Bib #': '1', 'Station': 'Station A', 'Timestamp': '2026-07-01 10:00:00', 'Converted Time': '' },
                { 'Bib #': '1', 'Station': 'Finish', 'Timestamp': '2026-07-01 10:04:00', 'Converted Time': '999.00' }
            ];
            expect(checkStationAnomalies(rows)).toEqual([]);
        });

        it('should group by Run # column if present, ignoring time gap', () => {
            const rows = [
                // Submitted 2 hours apart but explicitly labeled as Run 2
                { 'Bib #': '15', 'Station': 'Station A', 'Timestamp': '2026-07-01 10:00:00', 'Run #': '2' },
                { 'Bib #': '15', 'Station': 'Station B', 'Timestamp': '2026-07-01 10:01:00', 'Run #': '2' },
                { 'Bib #': '15', 'Station': 'Station C', 'Timestamp': '2026-07-01 12:00:00', 'Run #': '2' }, // 2 hours late
                { 'Bib #': '15', 'Station': 'Station D', 'Timestamp': '2026-07-01 10:03:00', 'Run #': '2' },
                { 'Bib #': '15', 'Station': 'Finish', 'Timestamp': '2026-07-01 10:04:00', 'Run #': '2' }
            ];
            expect(checkStationAnomalies(rows)).toEqual([]);
        });
    });
});
