import { describe, it, expect } from 'vitest';
import { getStationGateMap, formatTime } from './scoring.js';

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
});
