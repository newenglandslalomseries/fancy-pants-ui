// --- 1. Get Station Gate Map and Finish Status ---
export function getStationGateMap(stations) {
    const stationGateMap = {};
    const isFinishStation = {};
    let lastMaxGate = 0;

    stations.forEach(station => {
        let stationName = station.name;
        if (stationName === "A" || stationName === "B" || stationName === "C" || stationName === "D") {
            stationName = `Station ${station.name}`;
        }
        isFinishStation[stationName] = !!station.is_finish;

        if (station.max_gate) {
            const startGate = lastMaxGate + 1;
            const endGate = station.max_gate;
            stationGateMap[stationName] = [];
            for (let i = startGate; i <= endGate; i++) {
                stationGateMap[stationName].push(i);
            }
            lastMaxGate = station.max_gate;
        } else {
            stationGateMap[stationName] = [];
        }
    });

    return { stationGateMap, isFinishStation };
}

// --- 2. Format Time Input (RTL fill to M:SS.HH) ---
export function formatTime(digits) {
    let inputDigits = digits.replace(/\D/g, '');

    if (inputDigits.length > 6) {
        inputDigits = inputDigits.substring(0, 6);
    }

    if (inputDigits.length === 0) {
        return '';
    }

    const paddedDigits = inputDigits.padStart(6, '0');
    const mm = paddedDigits.substring(0, 2);
    const ss = paddedDigits.substring(2, 4);
    const hh = paddedDigits.substring(4, 6);

    return `${parseInt(mm, 10)}:${ss}.${hh}`;
}
