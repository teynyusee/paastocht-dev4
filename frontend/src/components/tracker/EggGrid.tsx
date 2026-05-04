"use client";

import Image from "next/image";
import "./EggGrid.css";

type Props = {
  count: number;
  max?: number;
};

export default function EggGrid({ count, max = 12 }: Props) {
  return (
    <div className="egg-grid">
      {Array.from({ length: max }).map((_, index) => {
        const eggNumber = index + 1;
        const isVisible = index < count;

        return (
          <div key={eggNumber} className="bg__grass egg-grid__cell">
            {isVisible && (
              <Image
                src={`/images/egg-${eggNumber}.png`}
                alt={`egg ${eggNumber}`}
                width={120}
                height={120}
                className="egg-grid__img egg-grid__img--pop"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}