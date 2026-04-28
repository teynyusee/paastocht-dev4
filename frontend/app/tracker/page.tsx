"use client";

import { useRouter } from "next/navigation";
import "./StartPage.css";

export default function StartPage() {
  const router = useRouter();

  return (
    <div className="bg__eggs start-page">
      <button
        className="start-page__button"
        onClick={() => router.push("/tracker/intro")}
      >
        Start
      </button>
    </div>
  );
}