/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { useCallback, useEffect, useRef, useState } from "react";

import { resetGame, startGame } from "@/src/lib/api";
import { socket } from "@/src/lib/socket";

import BunnyBrows from "./BunnyBrows";
import BunnyEyes from "./BunnyEyes";
import BunnyMouth from "./BunnyMouth";

import "./BunnyFace.css";

const globalWithConsolePatch = globalThis as typeof globalThis & {
  __bunnyConsoleErrorPatched?: boolean;
  __bunnyOriginalConsoleError?: typeof console.error;
};

if (!globalWithConsolePatch.__bunnyConsoleErrorPatched) {
  globalWithConsolePatch.__bunnyConsoleErrorPatched = true;
  globalWithConsolePatch.__bunnyOriginalConsoleError = console.error;

  console.error = (...args) => {
    const message = args.map(String).join(" ");

    const ignoredMediaPipeMessages = [
      "Created TensorFlow Lite XNNPACK delegate for CPU",
      "XNNPACK delegate for CPU",
      "INFO: Created TensorFlow Lite",
      "Feedback manager requires a model with a single signature inference",
      "Disabling support for feedback tensors",
    ];

    const shouldIgnore = ignoredMediaPipeMessages.some((ignoredMessage) =>
      message.includes(ignoredMessage),
    );

    if (shouldIgnore) {
      console.info(...args);
      return;
    }

    globalWithConsolePatch.__bunnyOriginalConsoleError?.(...args);
  };
}

export type Offset = {
  x: number;
  y: number;
};

type FaceAudioPayload = {
  src: string;
  text?: string;
  mouthMs?: number;
};

type SleepState = "sleeping" | "waking" | "awake";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export default function BunnyFace() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);

  const [blink, setBlink] = useState(false);
  const [eyeOffset, setEyeOffset] = useState<Offset>({ x: 0, y: 0 });
  const [isTalking, setIsTalking] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [sleepState, setSleepState] = useState<SleepState>("sleeping");

  const sleepStateRef = useRef<SleepState>("sleeping");
  const hasWokenUpRef = useRef(false);

  const currentOffsetRef = useRef<Offset>({ x: 0, y: 0 });
  const targetOffsetRef = useRef<Offset>({ x: 0, y: 0 });

  const detectFrameRef = useRef<number | null>(null);
  const noFaceFramesRef = useRef(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const mouthFrameRef = useRef<number | null>(null);
  const silenceFramesRef = useRef(0);
  const audioUnlockedRef = useRef(false);

  const micStreamRef = useRef<MediaStream | null>(null);
  const micAudioContextRef = useRef<AudioContext | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const micFrameRef = useRef<number | null>(null);
  const loudFramesRef = useRef(0);

  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const sfxAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    sleepStateRef.current = sleepState;
  }, [sleepState]);

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

  const goToSleep = useCallback(() => {
    hasWokenUpRef.current = false;
    loudFramesRef.current = 0;

    targetOffsetRef.current = { x: 0, y: 0 };
    currentOffsetRef.current = { x: 0, y: 0 };

    setEyeOffset({ x: 0, y: 0 });
    setIsTalking(false);
    setGameStarted(false);
    setSleepState("sleeping");
  }, []);

  const wakeUp = useCallback(async () => {
    if (hasWokenUpRef.current) return;

    hasWokenUpRef.current = true;
    loudFramesRef.current = 0;
    setSleepState("waking");

    try {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }

      await audioContextRef.current.resume();
      audioUnlockedRef.current = true;
    } catch (error) {
      console.warn("Audio unlock failed:", error);
    }

    window.setTimeout(async () => {
      setSleepState("awake");
      setGameStarted(true);

      try {
        await startGame();
      } catch (error) {
        console.warn("Start game mislukt:", error);
      }
    }, 1200);
  }, []);

  const unlockAndStart = useCallback(async () => {
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

    if (sleepStateRef.current !== "awake") {
      await wakeUp();
      return;
    }

    setGameStarted(true);

    try {
      await startGame();
    } catch (error) {
      console.warn("Start game mislukt:", error);
    }
  }, [wakeUp]);

  const handleResetGame = useCallback(async () => {
    stopCurrentAudio();
    goToSleep();

    try {
      await resetGame();
    } catch (error) {
      console.warn("Reset mislukt:", error);
    }
  }, [goToSleep, stopCurrentAudio]);



type FaceAudioPayload = {
  src: string;
  text?: string;
  mouthMs?: number;
};

type FaceSfxPayload = {
  src: string;
};

const stopCurrentVoiceAudio = useCallback(() => {
  if (voiceAudioRef.current) {
    voiceAudioRef.current.pause();
    voiceAudioRef.current.currentTime = 0;
    voiceAudioRef.current = null;
  }

  setIsTalking(false);
}, []);

const playFaceAudio = useCallback(
  (payload: FaceAudioPayload) => {
    stopCurrentVoiceAudio();

    const audio = new Audio(payload.src);
    voiceAudioRef.current = audio;

    const shouldMoveMouth = Boolean(payload.mouthMs && payload.mouthMs > 0);

    if (shouldMoveMouth) {
      setIsTalking(true);
    } else {
      setIsTalking(false);
    }

    audio.onended = () => {
      if (voiceAudioRef.current === audio) {
        setIsTalking(false);
        voiceAudioRef.current = null;
      }
    };

    audio.play().catch((error) => {
      console.warn("Face voice audio kon niet afspelen:", error);
      setIsTalking(false);
    });

    if (shouldMoveMouth && payload.mouthMs) {
      window.setTimeout(() => {
        if (voiceAudioRef.current === audio) {
          setIsTalking(false);
        }
      }, payload.mouthMs);
    }
  },
  [stopCurrentVoiceAudio],
);

const playFaceSfx = useCallback((payload: FaceSfxPayload) => {
  if (sfxAudioRef.current) {
    sfxAudioRef.current.pause();
    sfxAudioRef.current.currentTime = 0;
    sfxAudioRef.current = null;
  }

  const audio = new Audio(payload.src);
  sfxAudioRef.current = audio;

  audio.onended = () => {
    if (sfxAudioRef.current === audio) {
      sfxAudioRef.current = null;
    }
  };

  audio.play().catch((error) => {
    console.warn("Face sfx audio kon niet afspelen:", error);
  });
}, []);

useEffect(() => {
  socket.on("face:audio", playFaceAudio);
  socket.on("face:sfx", playFaceSfx);

  return () => {
    socket.off("face:audio", playFaceAudio);
    socket.off("face:sfx", playFaceSfx);

    stopCurrentVoiceAudio();

    if (sfxAudioRef.current) {
      sfxAudioRef.current.pause();
      sfxAudioRef.current.currentTime = 0;
      sfxAudioRef.current = null;
    }
  };
}, [playFaceAudio, playFaceSfx, stopCurrentVoiceAudio]);

  useEffect(() => {
    resetGame().catch((error) => {
      console.warn("Reset bij load mislukt:", error);
    });
  }, []);

  useEffect(() => {
    const handleIdle = () => {
      stopCurrentAudio();
      goToSleep();
    };

    socket.on("face:idle", handleIdle);

    return () => {
      socket.off("face:idle", handleIdle);
    };
  }, [goToSleep, stopCurrentAudio]);

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;

    async function startFaceTracking() {
      try {
        const vision = await FilesetResolver.forVisionTasks("/mediapipe/wasm");

        if (cancelled) return;

        landmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "/mediapipe/face_landmarker.task",
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          numFaces: 1,
        });

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 30, max: 30 },
          },
          audio: false,
        });

        if (!videoRef.current || cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const video = videoRef.current;
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;

        await video.play();
        detect();
      } catch (error) {
        console.error("Face tracking start failed:", error);
      }
    }

    function detect() {
      const video = videoRef.current;
      const landmarker = landmarkerRef.current;

      if (!video || !landmarker || cancelled) {
        detectFrameRef.current = requestAnimationFrame(detect);
        return;
      }

      const now = performance.now();

      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        try {
          const result = landmarker.detectForVideo(video, now);
          const face = result.faceLandmarks?.[0];

          if (face) {
            noFaceFramesRef.current = 0;

            let minX = 1;
            let maxX = 0;
            let minY = 1;
            let maxY = 0;

            for (const point of face) {
              minX = Math.min(minX, point.x);
              maxX = Math.max(maxX, point.x);
              minY = Math.min(minY, point.y);
              maxY = Math.max(maxY, point.y);
            }

            const faceCenterX = (minX + maxX) / 2;
            const faceCenterY = (minY + maxY) / 2;

            const rawX = (faceCenterX - 0.5) * -92;
            const rawY = (faceCenterY - 0.5) * 56;

            targetOffsetRef.current = {
              x: clamp(rawX, -22, 22),
              y: clamp(rawY, -13, 13),
            };
          } else {
            noFaceFramesRef.current += 1;

            if (noFaceFramesRef.current > 8) {
              targetOffsetRef.current = { x: 0, y: 0 };
            }
          }
        } catch {
          // ignore temporary frame errors
        }
      }

      detectFrameRef.current = requestAnimationFrame(detect);
    }

    startFaceTracking();

    return () => {
      cancelled = true;

      if (detectFrameRef.current) {
        cancelAnimationFrame(detectFrameRef.current);
      }

      const currentStream =
        stream || (videoRef.current?.srcObject as MediaStream | null);

      currentStream?.getTracks().forEach((track) => track.stop());

      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function startWakeSoundDetector() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: false,
          },
          video: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        micStreamRef.current = stream;

        const AudioContextClass =
          window.AudioContext || (window as any).webkitAudioContext;

        const audioContext = new AudioContextClass();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);

        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.84;

        source.connect(analyser);

        micAudioContextRef.current = audioContext;
        micAnalyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.fftSize);

        const listen = () => {
          if (cancelled) return;

          analyser.getByteTimeDomainData(dataArray);

          let sum = 0;

          for (let i = 0; i < dataArray.length; i++) {
            const value = (dataArray[i] - 128) / 128;
            sum += value * value;
          }

          const rms = Math.sqrt(sum / dataArray.length);

          if (sleepStateRef.current === "sleeping" && !hasWokenUpRef.current) {
            const isLoudEnough = rms > 0.045;

            if (isLoudEnough) {
              loudFramesRef.current += 1;
            } else {
              loudFramesRef.current = Math.max(0, loudFramesRef.current - 1);
            }

            if (loudFramesRef.current >= 7) {
              wakeUp();
            }
          } else {
            loudFramesRef.current = 0;
          }

          micFrameRef.current = requestAnimationFrame(listen);
        };

        listen();
      } catch (error) {
        console.warn("Microfoon kon niet starten:", error);
      }
    }

    startWakeSoundDetector();

    return () => {
      cancelled = true;

      if (micFrameRef.current) {
        cancelAnimationFrame(micFrameRef.current);
      }

      micStreamRef.current?.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;

      micAudioContextRef.current?.close().catch(() => {});
      micAudioContextRef.current = null;
      micAnalyserRef.current = null;
    };
  }, [wakeUp]);

  useEffect(() => {
    let frame = 0;

    const animateEyes = () => {
      const current = currentOffsetRef.current;
      const target =
        sleepStateRef.current === "awake"
          ? targetOffsetRef.current
          : { x: 0, y: 0 };

      const next = {
        x: current.x + (target.x - current.x) * 0.1,
        y: current.y + (target.y - current.y) * 0.1,
      };

      currentOffsetRef.current = next;
      setEyeOffset(next);

      frame = requestAnimationFrame(animateEyes);
    };

    frame = requestAnimationFrame(animateEyes);

    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    let blinkTimer: number;
    let openTimer: number;

    const scheduleBlink = () => {
      blinkTimer = window.setTimeout(
        () => {
          if (sleepStateRef.current === "awake") {
            setBlink(true);

            openTimer = window.setTimeout(() => {
              setBlink(false);
              scheduleBlink();
            }, 130);
          } else {
            setBlink(false);
            scheduleBlink();
          }
        },
        2600 + Math.random() * 1800,
      );
    };

    scheduleBlink();

    return () => {
      window.clearTimeout(blinkTimer);
      window.clearTimeout(openTimer);
    };
  }, []);


  return (
    <main className={`face-page is-${sleepState}`}>
      <video ref={videoRef} muted playsInline autoPlay className="face-video" />

      <div className="face-buttons">
        {!gameStarted && (
          <button className="face-start-button" onClick={unlockAndStart}>
            Start spel
          </button>
        )}

        <button className="face-reset-button" onClick={handleResetGame}>
          Reset spel
        </button>
      </div>

      <section className="face">
        <BunnyBrows offset={eyeOffset} />
        <BunnyEyes offset={eyeOffset} blink={blink} />
        <div className="face-nose" />
        <BunnyMouth isTalking={isTalking} mode={sleepState} />
        <div className="face-cheek face-cheek--left" />
        <div className="face-cheek face-cheek--right" />
      </section>
    </main>
  );
}