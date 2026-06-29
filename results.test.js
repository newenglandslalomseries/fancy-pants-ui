import { describe, it, expect } from 'vitest';
import { parseCSV, parseToNumeric, formatBytes, processResultsData } from './results.js';

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
    });

    describe('parseToNumeric', () => {
        it('should parse minutes and seconds (MM:SS)', () => {
            expect(parseToNumeric('2:30.55')).toBe(150.55);
        });

        it('should parse hours, minutes and seconds (HH:MM:SS)', () => {
            expect(parseToNumeric('1:02:30')).toBe(3750);
        });

        it('should parse simple float strings', () => {
            expect(parseToNumeric('123.45')).toBe(123.45);
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
    });
});
