import React, { useEffect, useState } from 'react';

// "Money counting" waiting animation: a little stack of shekel banknotes being
// riffled through like a bill-counting machine. Optionally shows a ticking ₪ counter.
//   <MoneyLoader size={16} />              - inline icon-sized loader
//   <MoneyLoader size={22} counting />     - with a running ₪ total next to it
export default function MoneyLoader({ size = 16, counting = false, color, style }) {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!counting) return;
    const id = setInterval(() => {
      // Count up in bill-sized steps, wrap around like a counting machine batch
      setTotal(t => (t >= 9800 ? 0 : t + [20, 50, 100, 200][Math.floor(Math.random() * 4)]));
    }, 110);
    return () => clearInterval(id);
  }, [counting]);

  const width = Math.round(size * 1.55);
  const height = Math.round(size * 0.95);

  return (
    <span
      className="money-loader-wrap"
      role="status"
      aria-label="Loading"
      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', ...style }}
    >
      <span className="money-loader" style={{ width, height, fontSize: Math.max(7, Math.round(size * 0.55)) }}>
        <span className="bill bill-base">{size >= 16 ? '₪' : ''}</span>
        <span className="bill bill-riffle">{size >= 16 ? '₪' : ''}</span>
        <span className="bill bill-riffle">{size >= 16 ? '₪' : ''}</span>
        <span className="bill bill-riffle">{size >= 16 ? '₪' : ''}</span>
      </span>
      {counting && (
        <span style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace', color: color || '#34d399', fontWeight: 700, fontSize: Math.max(11, Math.round(size * 0.6)) }}>
          ₪{total.toLocaleString('en-US')}
        </span>
      )}
    </span>
  );
}
