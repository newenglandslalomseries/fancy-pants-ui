import { describe, it, expect } from 'vitest';
import {
    parseTSV,
    getRaceYear,
    getUniqueYears,
    getRacesForYear,
    getTsvExportUrl,
    parseRaceTSV,
    rankToPoints,
    buildSeriesData
} from './series.js';

describe('series.js unit tests', () => {
    describe('getRaceYear and getUniqueYears', () => {
        it('should extract unique years from races and sort descending (most recent first)', () => {
            const races = [
                { name: 'Farmington Slalom 2025', date: '2025-10-17' },
                { name: 'Kenduskeag Slalom 2026', date: '2026-05-10' },
                { name: 'Winni Slalom 2026', date: '2026-06-21' },
                { name: 'Old Race 2024' }
            ];
            expect(getUniqueYears(races)).toEqual(['2026', '2025', '2024']);
        });

        it('should handle empty or invalid inputs', () => {
            expect(getUniqueYears([])).toEqual([]);
            expect(getUniqueYears(null)).toEqual([]);
            expect(getRaceYear(null)).toBeNull();
        });
    });

    describe('getRacesForYear', () => {
        it('should filter races by year and sort chronologically ascending', () => {
            const races = [
                { name: 'Farmington Slalom 2026', date: '2026-10-18' },
                { name: 'Kenduskeag Slalom 2026', date: '2026-05-10' },
                { name: 'Farmington Slalom 2025', date: '2025-10-17' },
                { name: 'Covered Bridge Slalom 2026', date: '2026-05-17' }
            ];
            const races2026 = getRacesForYear(races, '2026');
            expect(races2026.map(r => r.name)).toEqual([
                'Kenduskeag Slalom 2026',
                'Covered Bridge Slalom 2026',
                'Farmington Slalom 2026'
            ]);
        });
    });

    describe('getTsvExportUrl', () => {
        it('should convert Google Sheets edit URL to TSV export URL', () => {
            const url = 'https://docs.google.com/spreadsheets/d/1Rl7Bb-81YtQ9kHiqxBJeNduuRbfq547ynXhdwU4VOW8/edit?gid=1657054501#gid=1657054501';
            const exportUrl = getTsvExportUrl(url);
            expect(exportUrl).toContain('https://docs.google.com/spreadsheets/d/1Rl7Bb-81YtQ9kHiqxBJeNduuRbfq547ynXhdwU4VOW8/export?format=tsv&gid=1657054501');
        });
    });

    describe('parseRaceTSV', () => {
        it('should only include rows where Indiv. Class Rank is "1"', () => {
            const tsv = [
                'Bib #\tName\tClass\tRun #\tTotal Score\tIndiv. Class Rank\tClass Rank',
                '10\tCorbett Leith\tK-1 MEN\t1\t105.2\t1\t3',
                '10\tCorbett Leith\tK-1 MEN\t2\t108.4\t2\t',
                '11\tAustin Huck\tK-1 MEN\t1\t112.0\t2\t',
                '11\tAustin Huck\tK-1 MEN\t2\t106.5\t1\t4',
                '12\tGordon Bassett\tK-1 MEN\t1\t102.1\t1\t2'
            ].join('\n');

            const rows = parseRaceTSV(tsv);
            expect(rows).toEqual([
                { Class: 'K-1 MEN', Name: 'Corbett Leith', 'Class Rank': '3' },
                { Class: 'K-1 MEN', Name: 'Austin Huck', 'Class Rank': '4' },
                { Class: 'K-1 MEN', Name: 'Gordon Bassett', 'Class Rank': '2' }
            ]);
        });
    });

    describe('rankToPoints (series scoring rules)', () => {
        it('should award 10, 8, 6, 5, 4, 3, 2 points for places 1 through 7', () => {
            expect(rankToPoints('1')).toBe(10);
            expect(rankToPoints(1)).toBe(10);
            expect(rankToPoints('2')).toBe(8);
            expect(rankToPoints('3')).toBe(6);
            expect(rankToPoints('4')).toBe(5);
            expect(rankToPoints('5')).toBe(4);
            expect(rankToPoints('6')).toBe(3);
            expect(rankToPoints('7')).toBe(2);
        });

        it('should award 1 point for 8th place and any place after that', () => {
            expect(rankToPoints('8')).toBe(1);
            expect(rankToPoints('9')).toBe(1);
            expect(rankToPoints('10')).toBe(1);
            expect(rankToPoints('25')).toBe(1);
            expect(rankToPoints(100)).toBe(1);
        });

        it('should return empty string for missing or invalid ranks', () => {
            expect(rankToPoints('')).toBe('');
            expect(rankToPoints('   ')).toBe('');
            expect(rankToPoints(null)).toBe('');
            expect(rankToPoints(undefined)).toBe('');
            expect(rankToPoints('DNF')).toBe('');
            expect(rankToPoints('0')).toBe('');
            expect(rankToPoints('-1')).toBe('');
        });
    });

    describe('buildSeriesData', () => {
        it('should build series table matching the multi-race example', () => {
            const raceResultsList = [
                {
                    name: 'Punkin Slalom',
                    abbrev: 'PB',
                    rows: []
                },
                {
                    name: 'Blackwater Slalom',
                    abbrev: 'BW',
                    rows: parseRaceTSV([
                        'Class\tName\tIndiv. Class Rank\tClass Rank',
                        'K-1 MEN\tCorbett Leith\t1\t3',
                        'K-1 MEN\tAustin Huck\t1\t4',
                        'K-1 MEN\tGordon Bassett\t1\t2'
                    ].join('\n'))
                },
                {
                    name: 'Kenduskeag Slalom',
                    abbrev: 'KD',
                    rows: parseRaceTSV([
                        'Class\tName\tIndiv. Class Rank\tClass Rank',
                        'K-1 MEN\tCorbett Leith\t1\t1',
                        'K-1 MEN\tAustin Huck\t1\t2',
                        'K-1 MEN\tGordon Bassett\t1\t3'
                    ].join('\n'))
                },
                {
                    name: 'Farmington Slalom',
                    abbrev: 'FH',
                    rows: []
                },
                {
                    name: 'Covered Bridge Slalom',
                    abbrev: 'CB',
                    rows: parseRaceTSV([
                        'Class\tName\tIndiv. Class Rank\tClass Rank',
                        'K-1 MEN\tCorbett Leith\t1\t1',
                        'K-1 MEN\tAustin Huck\t1\t3',
                        'K-1 MEN\tGordon Bassett\t1\t5'
                    ].join('\n'))
                }
            ];

            const series = buildSeriesData(raceResultsList);
            expect(series.raceNames).toEqual(['PB', 'BW', 'KD', 'FH', 'CB']);
            expect(series.totalRaces).toBe(5);
            expect(series.minRacesToQualify).toBe(3);
            expect(series.classes.length).toBe(1);
            expect(series.classes[0].className).toBe('K-1 MEN');

            // Sorted by Best of 4 Points descending: Corbett (26), Austin (19), Gordon (18)
            expect(series.classes[0].racers.map(r => r.name)).toEqual([
                'Corbett Leith',
                'Austin Huck',
                'Gordon Bassett'
            ]);

            const [corbett, austin, gordon] = series.classes[0].racers;

            expect(corbett.ranks).toEqual(['', '3', '1', '', '1']);
            expect(corbett.points).toEqual(['', 6, 10, '', 10]);
            expect(corbett.totalPoints).toBe(26);
            expect(corbett.bestOf4Points).toBe(26);
            expect(corbett.seriesRank).toBe(1);

            expect(austin.ranks).toEqual(['', '4', '2', '', '3']);
            expect(austin.points).toEqual(['', 5, 8, '', 6]);
            expect(austin.totalPoints).toBe(19);
            expect(austin.bestOf4Points).toBe(19);
            expect(austin.seriesRank).toBe(2);

            expect(gordon.ranks).toEqual(['', '2', '3', '', '5']);
            expect(gordon.points).toEqual(['', 8, 6, '', 4]);
            expect(gordon.totalPoints).toBe(18);
            expect(gordon.bestOf4Points).toBe(18);
            expect(gordon.seriesRank).toBe(3);
        });

        it('should sum only the highest 4 race points for bestOf4Points and sort racers by bestOf4Points rather than totalPoints', () => {
            // Alice races 4 times: 1st (10), 1st (10), 2nd (8), 3rd (6) -> Total = 34, Best of 4 = 34
            // Bob races 6 times: 2nd (8), 2nd (8), 2nd (8), 2nd (8), 3rd (6), 3rd (6) -> Total = 44, Best of 4 = 32
            const raceResultsList = [
                {
                    abbrev: 'R1',
                    rows: [
                        { Class: 'C-1', Name: 'Alice', 'Class Rank': '1' },
                        { Class: 'C-1', Name: 'Bob', 'Class Rank': '2' }
                    ]
                },
                {
                    abbrev: 'R2',
                    rows: [
                        { Class: 'C-1', Name: 'Alice', 'Class Rank': '1' },
                        { Class: 'C-1', Name: 'Bob', 'Class Rank': '2' }
                    ]
                },
                {
                    abbrev: 'R3',
                    rows: [
                        { Class: 'C-1', Name: 'Alice', 'Class Rank': '2' },
                        { Class: 'C-1', Name: 'Bob', 'Class Rank': '2' }
                    ]
                },
                {
                    abbrev: 'R4',
                    rows: [
                        { Class: 'C-1', Name: 'Alice', 'Class Rank': '3' },
                        { Class: 'C-1', Name: 'Bob', 'Class Rank': '2' }
                    ]
                },
                {
                    abbrev: 'R5',
                    rows: [
                        { Class: 'C-1', Name: 'Bob', 'Class Rank': '3' }
                    ]
                },
                {
                    abbrev: 'R6',
                    rows: [
                        { Class: 'C-1', Name: 'Bob', 'Class Rank': '3' }
                    ]
                }
            ];

            const series = buildSeriesData(raceResultsList);
            const racers = series.classes[0].racers;

            // Alice should be sorted first because her Best of 4 (34) > Bob's Best of 4 (32), even though Bob's Total (44) > Alice's Total (34)
            expect(racers.map(r => r.name)).toEqual(['Alice', 'Bob']);

            const [alice, bob] = racers;
            expect(alice.points).toEqual([10, 10, 8, 6, '', '']);
            expect(alice.totalPoints).toBe(34);
            expect(alice.bestOf4Points).toBe(34);
            expect(alice.seriesRank).toBe(1);

            expect(bob.points).toEqual([8, 8, 8, 8, 6, 6]);
            expect(bob.totalPoints).toBe(44);
            expect(bob.bestOf4Points).toBe(32);
            expect(bob.seriesRank).toBe(2);
        });

        it('should skip racers who did not race at least half plus one (rounded down) for odd number of races (5 races -> min 3)', () => {
            // 5 races total -> floor(5/2) + 1 = 3 races required to qualify
            const raceResultsList = [
                {
                    abbrev: 'R1',
                    rows: [
                        { Class: 'K-1', Name: 'TwoRaceWinner', 'Class Rank': '1' }, // 10 pts (only 2 races: 20 pts)
                        { Class: 'K-1', Name: 'QualifiedFirst', 'Class Rank': '2' }, // 8 pts (3 races: 18 pts)
                        { Class: 'K-1', Name: 'OneRaceSecond', 'Class Rank': '1' }, // 10 pts (only 1 race, plus 1 in R4 = 2 races: 16 pts)
                        { Class: 'K-1', Name: 'QualifiedSecond', 'Class Rank': '3' }, // 6 pts (3 races: 15 pts)
                        { Class: 'K-1', Name: 'QualifiedThird', 'Class Rank': '4' }, // 5 pts (3 races: 13 pts)
                        { Class: 'K-1', Name: 'QualifiedFourth', 'Class Rank': '5' } // 4 pts (3 races: 11 pts)
                    ]
                },
                {
                    abbrev: 'R2',
                    rows: [
                        { Class: 'K-1', Name: 'TwoRaceWinner', 'Class Rank': '1' }, // 10 pts
                        { Class: 'K-1', Name: 'QualifiedFirst', 'Class Rank': '4' }, // 5 pts
                        { Class: 'K-1', Name: 'QualifiedSecond', 'Class Rank': '5' }, // 4 pts
                        { Class: 'K-1', Name: 'QualifiedThird', 'Class Rank': '6' }, // 3 pts
                        { Class: 'K-1', Name: 'QualifiedFourth', 'Class Rank': '7' } // 2 pts
                    ]
                },
                {
                    abbrev: 'R3',
                    rows: [
                        { Class: 'K-1', Name: 'QualifiedFirst', 'Class Rank': '4' }, // 5 pts -> total 18
                        { Class: 'K-1', Name: 'QualifiedSecond', 'Class Rank': '4' }, // 5 pts -> total 15
                        { Class: 'K-1', Name: 'QualifiedThird', 'Class Rank': '4' }, // 5 pts -> total 13
                        { Class: 'K-1', Name: 'QualifiedFourth', 'Class Rank': '4' } // 5 pts -> total 11
                    ]
                },
                {
                    abbrev: 'R4',
                    rows: [
                        { Class: 'K-1', Name: 'OneRaceSecond', 'Class Rank': '3' } // 6 pts -> total 16 (2 races)
                    ]
                },
                { abbrev: 'R5', rows: [] }
            ];

            const series = buildSeriesData(raceResultsList);
            const racers = series.classes[0].racers;

            // Sorted by Best of 4 Points:
            // TwoRaceWinner (20, 2 races), QualifiedFirst (18, 3 races), OneRaceSecond (16, 2 races),
            // QualifiedSecond (15, 3 races), QualifiedThird (13, 3 races), QualifiedFourth (11, 3 races)
            expect(racers.map(r => r.name)).toEqual([
                'TwoRaceWinner',
                'QualifiedFirst',
                'OneRaceSecond',
                'QualifiedSecond',
                'QualifiedThird',
                'QualifiedFourth'
            ]);

            // TwoRaceWinner and OneRaceSecond only raced 2 of 5 races (< 3), so they are skipped for Series Rank;
            // Ranks 1, 2, 3 go to QualifiedFirst, QualifiedSecond, QualifiedThird; QualifiedFourth gets '' (only top 3 ranked)
            expect(racers.map(r => r.seriesRank)).toEqual(['', 1, '', 2, 3, '']);
        });

        it('should require floor(N/2) + 1 races for even number of races (4 races -> min 3, 6 races -> min 4)', () => {
            // 4 races total -> floor(4/2) + 1 = 3 races required to qualify
            const fourRaces = [
                {
                    abbrev: 'R1',
                    rows: [
                        { Class: 'C-1', Name: 'Raced2', 'Class Rank': '1' }, // 10
                        { Class: 'C-1', Name: 'Raced3', 'Class Rank': '3' }  // 6
                    ]
                },
                {
                    abbrev: 'R2',
                    rows: [
                        { Class: 'C-1', Name: 'Raced2', 'Class Rank': '1' }, // 10 -> 20 pts (2 races)
                        { Class: 'C-1', Name: 'Raced3', 'Class Rank': '3' }  // 6
                    ]
                },
                {
                    abbrev: 'R3',
                    rows: [
                        { Class: 'C-1', Name: 'Raced3', 'Class Rank': '3' }  // 6 -> 18 pts (3 races)
                    ]
                },
                { abbrev: 'R4', rows: [] }
            ];

            const series4 = buildSeriesData(fourRaces);
            const racers4 = series4.classes[0].racers;
            expect(racers4.map(r => r.name)).toEqual(['Raced2', 'Raced3']);
            // Raced2 has only 2 of 4 races (< 3), so Raced3 gets Series Rank 1
            expect(racers4.map(r => r.seriesRank)).toEqual(['', 1]);
        });

        it('should merge Master (40+) for Men/Women and merge all Grand Master variants into "K-1 Grand Masters"', () => {
            const raceResultsList = [
                {
                    abbrev: 'R1',
                    rows: parseRaceTSV([
                        'Class\tName\tIndiv. Class Rank\tClass Rank',
                        'K-1 Master Men (40+)\tJohn Doe\t1\t1',
                        'K-1 Master Women (40+)\tJane Doe\t1\t2',
                        'K-1 Grand Master Men (65+)\tBob Smith\t1\t1',
                        'K-1 Grand Master Women (65+)\tAnn Smith\t1\t2'
                    ].join('\n'))
                },
                {
                    abbrev: 'R2',
                    rows: parseRaceTSV([
                        'Class\tName\tIndiv. Class Rank\tClass Rank',
                        'K-1 Master Men\tJohn Doe\t1\t2',
                        'K-1 Master Women\tJane Doe\t1\t1',
                        'K-1 Grand Masters (65+)\tBob Smith\t1\t3',
                        'K-1 Grand Master Women\tAnn Smith\t1\t1'
                    ].join('\n'))
                }
            ];

            const series = buildSeriesData(raceResultsList);
            expect(series.classes.map(c => c.className)).toEqual([
                'K-1 Grand Masters',
                'K-1 Master Men',
                'K-1 Master Women'
            ]);

            const grandMastersRacers = series.classes[0].racers;
            expect(grandMastersRacers.map(r => r.name)).toEqual(['Ann Smith', 'Bob Smith']);
            expect(grandMastersRacers[0].ranks).toEqual(['2', '1']);
            expect(grandMastersRacers[0].totalPoints).toBe(18);
            expect(grandMastersRacers[1].ranks).toEqual(['1', '3']);
            expect(grandMastersRacers[1].totalPoints).toBe(16);

            const menRacer = series.classes[1].racers[0];
            expect(menRacer.name).toBe('John Doe');
            expect(menRacer.ranks).toEqual(['1', '2']);
            expect(menRacer.totalPoints).toBe(18);

            const womenRacer = series.classes[2].racers[0];
            expect(womenRacer.name).toBe('Jane Doe');
            expect(womenRacer.ranks).toEqual(['2', '1']);
            expect(womenRacer.totalPoints).toBe(18);
        });
    });
});


