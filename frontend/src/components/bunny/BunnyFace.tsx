"use client";

const originalConsoleError = console.error;

console.error = (...args) => {
  const message = String(args[0]);

  if (message.includes("Created TensorFlow Lite XNNPACK delegate")) {
    console.log(...args);
    return;
  }

  originalConsoleError(...args);
};

import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { useCallback, useEffect, useRef, useState } from "react";

import { socket } from "@/src/lib/socket";

import BunnyEyes from "./BunnyEyes";
import BunnyMouth from "./BunnyMouth";
import { resetGame, startGame } from "@/src/lib/api";

import "./BunnyFace.css";

export type Offset = {
  x: number;
  y: number;
};

type FaceAudioPayload = {
  src: string;
  text?: string;
  mouthMs?: number;
};

export default function BunnyFace() {
    
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);

  const [blink, setBlink] = useState(false);
  const [eyeOffset, setEyeOffset] = useState<Offset>({ x: 0, y: 0 });

  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [speechText, setSpeechText] = useState("");

  const currentOffsetRef = useRef<Offset>({ x: 0, y: 0 });
  const targetOffsetRef = useRef<Offset>({ x: 0, y: 0 });
  const detectFrameRef = useRef<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mouthTimeoutRef = useRef<number | null>(null);

  const [gameStarted, setGameStarted] = useState(false);
  

const unlockAndStart = async () => {
  try {
    const audio = new Audio("/audio/correct.mp3");
    audio.volume = 0.01;

    await audio.play();

    audio.pause();
    audio.currentTime = 0;

    setAudioUnlocked(true);
  } catch (error) {
    console.warn("Audio unlock failed:", error);
  }

  setGameStarted(true);
  await startGame();
};

  const playFaceAudio = useCallback(
    (payload: FaceAudioPayload) => {
      if (!audioUnlocked) return;

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      if (mouthTimeoutRef.current) {
        window.clearTimeout(mouthTimeoutRef.current);
      }

      const audio = new Audio(payload.src);
      audioRef.current = audio;

      setSpeechText(payload.text ?? "");
      setIsTalking(true);

      audio.onended = () => {
        setIsTalking(false);
        setSpeechText("");
      };

      audio.play().catch((error) => {
        console.warn("Face audio failed:", error);
        setIsTalking(false);
      });

      mouthTimeoutRef.current = window.setTimeout(() => {
        setIsTalking(false);
      }, payload.mouthMs ?? 2500);
    },
    [audioUnlocked],
  );

  useEffect(() => {
    socket.on("face:audio", playFaceAudio);

    return () => {
      socket.off("face:audio", playFaceAudio);
    };
  }, [playFaceAudio]);

  useEffect(() => {
    let cancelled = false;

    async function startFaceTracking() {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
      );

      if (cancelled) return;

      landmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
          delegate: "CPU",
        },
        runningMode: "VIDEO",
        numFaces: 1,
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      if (!videoRef.current || cancelled) return;

      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      detect();
    }

    function detect() {
      const video = videoRef.current;
      const landmarker = landmarkerRef.current;

      if (video && landmarker && video.readyState >= 2) {
        const timestamp = performance.now();
        const result = landmarker.detectForVideo(video, timestamp);
        const face = result.faceLandmarks?.[0];

        if (face) {
          const nose = face[1];

          targetOffsetRef.current = {
            x: (nose.x - 0.5) * -260,
            y: (nose.y - 0.5) * 160,
          };
        } else {
          targetOffsetRef.current = { x: 0, y: 0 };
        }
      }

      detectFrameRef.current = requestAnimationFrame(detect);
    }

    startFaceTracking().catch(console.error);

    return () => {
      cancelled = true;

      if (detectFrameRef.current) {
        cancelAnimationFrame(detectFrameRef.current);
      }

      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((track) => track.stop());

      landmarkerRef.current?.close();
    };
  }, []);

  useEffect(() => {
    let frame = 0;

    function animateEyes() {
      const current = currentOffsetRef.current;
      const target = targetOffsetRef.current;

      const smoothing = 0.16;

      const next = {
        x: current.x + (target.x - current.x) * smoothing,
        y: current.y + (target.y - current.y) * smoothing,
      };

      currentOffsetRef.current = next;
      setEyeOffset(next);

      frame = requestAnimationFrame(animateEyes);
    }

    frame = requestAnimationFrame(animateEyes);

    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
  resetGame().catch((error) => {
    console.warn("Reset bij face load mislukt:", error);
  });
}, []);

  useEffect(() => {
    const blinkInterval = window.setInterval(() => {
      setBlink(true);
      window.setTimeout(() => setBlink(false), 130);
    }, 3200);

    return () => window.clearInterval(blinkInterval);
  }, []);

  useEffect(() => {
  const handleIdle = () => {
    setGameStarted(false);
    setSpeechText("");
    setIsTalking(false);
  };

  socket.on("face:idle", handleIdle);

  return () => {
    socket.off("face:idle", handleIdle);
  };
}, []);

  return (
    <main className="face-page">
      <video ref={videoRef} muted playsInline autoPlay className="face-video" />

    {!gameStarted && (
    <button className="face-start-button" onClick={unlockAndStart}>
        Start spel + geluid
    </button>
    )}

      <section className="face">
        <BunnyEyes offset={eyeOffset} blink={blink} />

        <div className="face-nose" />

        <BunnyMouth isTalking={isTalking} />

        <div className="face-cheek face-cheek--left" />
        <div className="face-cheek face-cheek--right" />
      </section>
    </main>
  );
}