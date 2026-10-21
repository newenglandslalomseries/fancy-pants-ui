import { describe, it, expect } from 'vitest';
import { getStationGateMap, formatTime, convertTimeToSeconds } from './scoring.js';
import fs from 'fs';
import path from 'path';

describe('scoring.js unit tests', () => {
    describe('getStationGateMap', () => {
        it('should correctly map gates to stations and identify the finish station', () => {
            const stations = [
                { name: "Start", max_gate: 3 },
                { name: "A", max_gate: 8 },
                { name: "Finish", is_finish: true }
            ];
            const { stationGateMap, isFinishStation } = getStationGateMap(stations);
            
            expect(stationGateMap).toEqual({
                "Start": [1, 2, 3],
                "Station A": [4, 5, 6, 7, 8],
                "Finish": []
            });
            expect(isFinishStation).toEqual({
                "Start": false,
                "Station A": false,
                "Finish": true
            });
        });
    });

    describe('formatTime', () => {
        it('should format digit strings to M:SS.HH or MM:SS.HH format', () => {
            expect(formatTime('1')).toBe('0:00.01');
            expect(formatTime('12')).toBe('0:00.12');
            expect(formatTime('123')).toBe('0:01.23');
            expect(formatTime('1234')).toBe('0:12.34');
            expect(formatTime('12345')).toBe('1:23.45');
            expect(formatTime('123456')).toBe('12:34.56');
        });

        it('should ignore non-digit characters', () => {
            expect(formatTime('1a2b3c4d5e')).toBe('1:23.45');
        });

        it('should handle empty input', () => {
            expect(formatTime('')).toBe('');
        });
    });

    describe('convertTimeToSeconds', () => {
        it('should convert MM:SS.HH or M:SS.HH to total decimal seconds', () => {
            expect(convertTimeToSeconds('1:45.23')).toBe('105.23');
            expect(convertTimeToSeconds('0:12.34')).toBe('12.34');
            expect(convertTimeToSeconds('2:00.00')).toBe('120.00');
            expect(convertTimeToSeconds('12:34.56')).toBe('754.56');
        });

        it('should handle already formatted decimal seconds or DNF', () => {
            expect(convertTimeToSeconds('999.0')).toBe('999.0');
            expect(convertTimeToSeconds('DNF')).toBe('999.0');
            expect(convertTimeToSeconds('105.23')).toBe('105.23');
        });

        it('should handle empty or invalid input', () => {
            expect(convertTimeToSeconds('')).toBe('');
            expect(convertTimeToSeconds(null)).toBe('');
            expect(convertTimeToSeconds(undefined)).toBe('');
        });
    });

    describe('scoring.html entry IDs verification', () => {
        it('should use numeric entry IDs for all gates in the form', () => {
            const htmlPath = path.resolve(__dirname, 'scoring.html');
            const html = fs.readFileSync(htmlPath, 'utf8');

            for (let i = 1; i <= 25; i++) {
                const gateRegex = new RegExp(`id="gate-${i}"[\\s\\S]*?name="(entry\\.[0-9]+)"`);
                const match = html.match(gateRegex);
                expect(match, `Gate ${i} should have a numeric entry ID`).not.toBeNull();
                expect(match[1]).toMatch(/^entry\.\d+$/);
            }
        });
    });

    describe('scoring.html confirmation modal keyboard handling', () => {
        it('should focus confirmSubmitBtn and handle Enter keydown to confirm submission', () => {
            const htmlPath = path.resolve(__dirname, 'scoring.html');
            const html = fs.readFileSync(htmlPath, 'utf8');

            expect(html).toContain('confirmSubmitBtn.focus()');
            expect(html).toContain("e.key === 'Enter'");
            expect(html).toContain('confirmSubmitBtn.click()');
        });
    });
});
