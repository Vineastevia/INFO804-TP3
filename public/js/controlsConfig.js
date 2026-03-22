export const MODES = {
    1: [
        { label: 'Animation',    key: 'speed',      min: 0.05, max: 1.5, step: 0.05, decimals: 2 },
        { label: 'Distorsion',  key: 'mouseForce', min: 0,    max: 8,   step: 0.1,  decimals: 1 },
        { label: 'Frequency',    key: 'waveScale',  min: 1,    max: 12,  step: 0.5,  decimals: 1 },
        { label: 'Turbulence',   key: 'marbleAmp',  min: 0,    max: 1,   step: 0.01, decimals: 2 }
    ],
    3: [
        { label: 'Animation',   key: 'speed',      min: 0.05, max: 1.5, step: 0.05, decimals: 2 },
        { label: 'Brightness',  key: 'brightness', min: 0.1,  max: 3,   step: 0.05, decimals: 2 },
        { label: 'Segments',    key: 'segments',   min: 2,    max: 16,  step: 1,    decimals: 0 },
        { label: 'Zoom',        key: 'zoom',       min: 0.3,  max: 3,   step: 0.05, decimals: 2 }
    ]
};