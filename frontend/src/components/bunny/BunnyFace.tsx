"use client";

const originalConsoleError = console.error;

console.error = (...args) => {
  const message = args.map(String).join(" ");

  if (
    message.includes("Created TensorFlow Lite XNNPACK delegate") ||
    message.includes("XNNPACK delegate for CPU")
  ) {
    console.info(...args);
    return;
  }

  originalConsoleError(...args);
};

import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { useCallback, useEffect, useRef, useState } from "react";

import { resetGame, startGame } from "@/src/lib/api";
import { socket } from "@/src/lib/socket";

import BunnyEyes from "./BunnyEyes";
import BunnyMouth from "./BunnyMouth";

import "./BunnyFace.css";

export type Offset = {
  x: number;
  y: number;
};

type FaceAudioPayload = {
  src: string;
};

export default function BunnyFace() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);

  const [blink, setBlink] = useState(false);
  const [eyeOffset, setEyeOffset] = useState<Offset>({ x: 0, y: 0 });
  const [isTalking, setIsTalking] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const currentOffsetRef = useRef<Offset>({ x: 0, y: 0 });
  const targetOffsetRef = useRef<Offset>({ x: 0, y: 0 });
  const detectFrameRef = useRef<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const mouthFrameRef = useRef<number | null>(null);

  const audioUnlockedRef = useRef(false);
  const silenceFramesRef = useRef(0);

  const stopCurrentAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    if (mouthFrameRef.current) {
      cancelAnimationFrame(mouthFrameRef.current);
      mouthFrameRef.current = null;
    }

    try {
      sourceRef.current?.disconnect();
      analyserRef.current?.disconnect();
    } catch {
      // ignore
    }

    sourceRef.current = null;
    analyserRef.current = null;
    silenceFramesRef.current = 0;
    setIsTalking(false);
  }, []);

  const unlockAndStart = async () => {
    try {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }

      await audioContextRef.current.resume();

      const testAudio = new Audio("/audio/correct.mp3");
      testAudio.volume = 0.01;
      await testAudio.play();

      testAudio.pause();
      testAudio.currentTime = 0;

      audioUnlockedRef.current = true;
    } catch (error) {
      console.warn("Audio unlock failed:", error);
    }

    setGameStarted(true);
    await startGame();
  };

const handleResetGame = async () => {
  stopCurrentAudio();
  setGameStarted(false);

  try {
    await resetGame();
  } catch (error) {
    console.warn("Reset mislukt:", error);
  }
};

  const playFaceAudio = useCallback(
    async (payload: FaceAudioPayload) => {
      if (!audioUnlockedRef.current) return;

      stopCurrentAudio();

      const audio = new Audio(payload.src);
      audioRef.current = audio;

      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }

      const audioContext = audioContextRef.current;

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.7;

      const source = audioContext.createMediaElementSource(audio);

      source.connect(analyser);
      analyser.connect(audioContext.destination);

      sourceRef.current = source;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const animateMouth = () => {
        analyser.getByteTimeDomainData(dataArray);

        let sum = 0;

        for (let i = 0; i < dataArray.length; i++) {
          const value = (dataArray[i] - 128) / 128;
          sum += value * value;
        }

        const rms = Math.sqrt(sum / dataArray.length);
        const voiceActive = rms > 0.018;

        if (voiceActive) {
          silenceFramesRef.current = 0;
          setIsTalking(true);
        } else {
          silenceFramesRef.current += 1;

          if (silenceFramesRef.current > 10) {
            setIsTalking(false);
          }
        }

        mouthFrameRef.current = requestAnimationFrame(animateMouth);
      };

      audio.onended = () => {
        stopCurrentAudio();
      };

      audio
        .play()
        .then(() => {
          animateMouth();
        })
        .catch((error) => {
          console.warn("Face audio failed:", error);
          stopCurrentAudio();
        });
    },
    [stopCurrentAudio],
  );

  useEffect(() => {
    socket.on("face:audio", playFaceAudio);

    return () => {
      socket.off("face:audio", playFaceAudio);
      stopCurrentAudio();
    };
  }, [playFaceAudio, stopCurrentAudio]);

  useEffect(() => {
    resetGame().catch((error) => {
      console.warn("Reset bij face load mislukt:", error);
    });
  }, []);

  useEffect(() => {
    const handleIdle = () => {
      setGameStarted(false);
      stopCurrentAudio();
    };

    socket.on("face:idle", handleIdle);

    return () => {
      socket.off("face:idle", handleIdle);
    };
  }, [stopCurrentAudio]);

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
        try {
          const result = landmarker.detectForVideo(video, performance.now());
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
        } catch {
          // ignore temporary MediaPipe frame errors
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
      stopCurrentAudio();
    };
  }, [stopCurrentAudio]);

  useEffect(() => {
    let frame = 0;

    function animateEyes() {
      const current = currentOffsetRef.current;
      const target = targetOffsetRef.current;

      const next = {
        x: current.x + (target.x - current.x) * 0.16,
        y: current.y + (target.y - current.y) * 0.16,
      };

      currentOffsetRef.current = next;
      setEyeOffset(next);

      frame = requestAnimationFrame(animateEyes);
    }

    frame = requestAnimationFrame(animateEyes);

    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const blinkInterval = window.setInterval(() => {
      setBlink(true);
      window.setTimeout(() => setBlink(false), 130);
    }, 3200);

    return () => window.clearInterval(blinkInterval);
  }, []);

  return (
    <main className="face-page">
      <video ref={videoRef} muted playsInline autoPlay className="face-video" />

      <div className="face-buttons">
      {!gameStarted && (
        <button className="face-start-button" onClick={unlockAndStart}>
          Start spel + geluid
        </button>
      )}

      <button className="face-reset-button" onClick={handleResetGame}>
        Reset spel
      </button>
    </div>

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