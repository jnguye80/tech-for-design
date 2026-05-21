import React, { useState, useEffect, useRef } from 'react';

// Themes: quiet emergence, the bloom that bends but does not break
// Visualization: An ASCII tulip swaying gently, its petals breathing with the light

const AnimatedAsciiTulip = () => {
  const [frame, setFrame] = useState(0);
  const [asciiGrid, setAsciiGrid] = useState([]);
  const requestRef = useRef();
  const mountedRef = useRef(true);

  const width = 80;
  const height = 44;
  const density = '.·•○●';

  useEffect(() => {
    const grid = Array(height).fill().map(() => Array(width).fill(' '));
    setAsciiGrid(grid);

    const animate = () => {
      if (mountedRef.current) {
        setFrame(prevFrame => prevFrame + 1);
        requestRef.current = requestAnimationFrame(animate);
      }
    };
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      mountedRef.current = false;
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      requestRef.current = null;
      setAsciiGrid([]);
    };
  }, []);

  useEffect(() => {
    if (!mountedRef.current) return;

    const newGrid = Array(height).fill().map(() => Array(width).fill(' '));
    drawTulip(newGrid, frame);

    if (mountedRef.current) {
      setAsciiGrid(newGrid);
    }
  }, [frame]);

  // Half-width of the tulip cup at a given vertical position (t: 0 = top, 1 = bottom)
  const cupHalfWidth = (t) => {
    const peak = 7;
    if (t < 0.35) return 3 + (peak - 3) * (t / 0.35); // opens from 3 → 7
    return peak * (1 - (t - 0.35) / 0.65) + 0.5;       // tapers 7 → 0.5
  };

  const setCell = (grid, x, y, char) => {
    if (char === ' ') return;
    if (x >= 0 && x < width && y >= 0 && y < height) {
      grid[y][x] = char;
    }
  };

  const heartTemplate = [
    [0, 1, 0, 1, 0],
    [1, 1, 1, 1, 1],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 0, 0],
  ];

  const drawHeart = (grid, cx, cy, frame, phase) => {
    const beat = (Math.sin(frame * 0.06 + phase) + 1) / 2;
    const char = beat > 0.45 ? '♥' : '♡';
    for (let dy = 0; dy < heartTemplate.length; dy++) {
      for (let dx = 0; dx < heartTemplate[dy].length; dx++) {
        if (heartTemplate[dy][dx]) {
          setCell(grid, cx + dx - 2, cy + dy, char);
        }
      }
    }
  };

  const drawTulip = (grid, frame) => {
    // A slow sway and a slower breath — the flower listens to its own rhythm
    const sway = Math.sin(frame * 0.012) * 1.4;
    const breath = (Math.sin(frame * 0.025) + 1) / 2;

    const centerX = Math.floor(width / 2);
    const flowerTop = 5;
    const flowerBottom = 19;
    const stemBottom = height - 4;
    const cupHeight = flowerBottom - flowerTop;

    // ---- Flower cup ----
    for (let dy = 0; dy < cupHeight; dy++) {
      const t = dy / cupHeight;
      const halfW = Math.max(1, Math.round(cupHalfWidth(t)));
      const y = flowerTop + dy;
      const cx = centerX + sway;

      for (let dx = -halfW; dx <= halfW; dx++) {
        const norm = dx / halfW;
        // Three-petal silhouette: peaks at norm = 0, ±1; dips between
        const topContour = 0.8 - 0.8 * Math.cos(2 * norm * Math.PI);
        if (dy < topContour) continue;

        const x = Math.round(cx + dx);
        const edgeDist = Math.min(
          halfW - Math.abs(dx),
          cupHeight - 1 - dy,
          dy - topContour
        );
        const isEdge = edgeDist < 0.8;
        const phase = Math.sin(frame * 0.02 + Math.abs(dx) * 0.25 + dy * 0.3);
        const intensity = isEdge
          ? 0.75 + 0.2 * phase
          : 0.3 + 0.25 * phase * breath;
        setCell(grid, x, y, getCharForIntensity(intensity, isEdge));
      }
    }

    // Petal seams — the inner divisions you only see when you look closely
    for (let dy = 2; dy < cupHeight - 1; dy++) {
      const t = dy / cupHeight;
      const halfW = cupHalfWidth(t);
      const y = flowerTop + dy;
      const cx = centerX + sway;
      const seamOffset = halfW * 0.45;
      const seamIntensity = 0.4 + 0.25 * Math.sin(frame * 0.025 + dy * 0.2);
      const ch = getCharForIntensity(seamIntensity);
      setCell(grid, Math.round(cx - seamOffset), y, ch);
      setCell(grid, Math.round(cx + seamOffset), y, ch);
    }
    for (let dy = Math.floor(cupHeight * 0.55); dy < cupHeight - 1; dy++) {
      const y = flowerTop + dy;
      const cx = centerX + sway;
      const intensity = 0.35 + 0.2 * Math.sin(frame * 0.02 + dy * 0.3);
      setCell(grid, Math.round(cx), y, getCharForIntensity(intensity));
    }

    // ---- Stem ----
    for (let y = flowerBottom; y <= stemBottom; y++) {
      const stemT = (y - flowerBottom) / (stemBottom - flowerBottom);
      const bend = sway * (1 - stemT * 0.7);
      grid[y][Math.round(centerX + bend)] = '|';
    }

    // ---- Leaves ----
    const leafSpecs = [
      { baseY: stemBottom - 4, side: -1, length: 17 },
      { baseY: stemBottom - 10, side: 1, length: 13 },
    ];

    for (const leaf of leafSpecs) {
      const baseT = (leaf.baseY - flowerBottom) / (stemBottom - flowerBottom);
      const baseBend = sway * (1 - baseT * 0.7);
      const baseX = centerX + baseBend;

      for (let i = 1; i <= leaf.length; i++) {
        const s = i / leaf.length;
        // Long blade curving outward then arcing upward toward its pointed tip
        const armX = leaf.side * leaf.length * Math.sin(s * Math.PI * 0.55);
        const armY = -leaf.length * 0.85 * Math.pow(s, 1.4);
        const tipSway = Math.sin(frame * 0.018 + leaf.side * 1.2) * 0.6 * s;
        const x = Math.round(baseX + armX + tipSway);
        const y = Math.round(leaf.baseY + armY);

        const phase = (Math.sin(frame * 0.02 + i * 0.4) + 1) / 2;
        setCell(grid, x, y, getCharForIntensity(0.6 + 0.25 * phase, true));

        if (i > 1 && i < leaf.length - 1) {
          setCell(grid, x + leaf.side, y, getCharForIntensity(0.32 + 0.18 * phase));
        }
      }
    }

    // Four hearts at the corners, each beating with its own phase
    drawHeart(grid, 8,  3,  frame, 0);
    drawHeart(grid, 72, 3,  frame, Math.PI / 2);
    drawHeart(grid, 8,  39, frame, Math.PI);
    drawHeart(grid, 72, 39, frame, 3 * Math.PI / 2);
  };

  const getCharForIntensity = (intensity, boost = false) => {
    if (intensity < 0.1) return ' ';
    const index = Math.min(Math.floor(intensity * density.length), density.length - 1);
    return density[boost ? Math.max(index, 2) : index];
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      width: '550px',
      height: '550px',
      backgroundColor: '#F0EEE6',
      overflow: 'hidden',
      padding: '10px',
      borderRadius: '8px',
      boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05)'
    }}>
      <pre style={{
        fontFamily: 'monospace',
        fontSize: '12px',
        lineHeight: '1.2em',
        letterSpacing: '0.1em',
        textAlign: 'center',
        color: '#333',
        margin: 0
      }}>
        {asciiGrid.map((row, i) => (
          <div key={i}>
            {row.map((char, j) => {
              let opacity = 1.0;
              switch (char) {
                case '●': opacity = 0.9; break;
                case '○': opacity = 0.7; break;
                case '•': opacity = 0.6; break;
                case '·': opacity = 0.5; break;
                case '.': opacity = 0.4; break;
                case '|': opacity = 0.55; break;
                case '♥': opacity = 0.92; break;
                case '♡': opacity = 0.6; break;
                case ' ': opacity = 0; break;
              }
              const rgb = (char === '♥' || char === '♡') ? '190, 70, 90' : '50, 50, 50';

              return (
                <span
                  key={j}
                  style={{
                    color: `rgba(${rgb}, ${opacity})`,
                    display: 'inline-block',
                    width: '0.6em'
                  }}
                >
                  {char}
                </span>
              );
            })}
          </div>
        ))}
      </pre>
    </div>
  );
};

export default AnimatedAsciiTulip;
