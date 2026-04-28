"use client";

import { useEffect, useState } from "react";
import "./EggGrid.css";

export default function EggGrid({ 
  count,
  max = 12,
}: {
  count: number;
  max?: number;
}) {
  const [visible, setVisible] = useState(Array(max).fill(false));

  useEffect(() => {
    if (count === 0) return;

    setVisible((prev) => {
      const copy = [...prev];
      copy[count - 1] = true;
      return copy;
    });
  }, [count]);

  return (
    <div className="egg-grid">
      {visible.map((isVisible, i) => (
        <div key={i} className="egg-grid__cell">
          {isVisible && (
            <img
              src={`/images/egg-${i + 1}.png`}
              alt={`egg ${i + 1}`}
              className="egg-grid__img egg-grid__img--pop"
            />
          )}
        </div>
      ))}
    </div>
  );
}