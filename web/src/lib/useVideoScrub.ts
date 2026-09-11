import { useEffect, useRef, useState } from 'react';

let _mp4boxInstance: any = null;
async function getMP4Box() {
  if (_mp4boxInstance) return _mp4boxInstance;
  const mod = await import('mp4box');
  _mp4boxInstance = (mod as any).default || mod;
  return _mp4boxInstance;
}

interface FrameBankItem {
  ts: number; // in microseconds
  bmp: ImageBitmap;
}

export const LERP_TAU = 8;
export const SNAP = 0.002;
export const LRU_MAX = 24;
export const LEAD = 24;
export const WATCHDOG = 60000;


export function useVideoScrub(videoSrc: string) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [scrollProgress, setScrollProgress] = useState(0);
  const [isCanvasLive, setIsCanvasLive] = useState(false);

  // References for scrub animation loop
  const bankRef = useRef<FrameBankItem[]>([]);
  const readyRef = useRef(false);
  const revertedRef = useRef(false);
  const paintedRef = useRef(false);
  const durRef = useRef(0);
  const currentRef = useRef(0);
  const targetRef = useRef(0);
  const scrollSpanRef = useRef(1);
  const pendingSeekTimeRef = useRef<number | null>(null);
  const activeFrameIdxRef = useRef(0);
  const lastPRef = useRef(-1);

  // Binary search to find nearest frame index by microsecond timestamp
  const findNearestIndex = (targetTs: number): number => {
    const bank = bankRef.current;
    if (bank.length === 0) return -1;
    let low = 0;
    let high = bank.length - 1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      if (bank[mid].ts < targetTs) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    if (low >= bank.length) return bank.length - 1;
    if (low <= 0) return 0;
    const d1 = Math.abs(bank[low].ts - targetTs);
    const d2 = Math.abs(bank[low - 1].ts - targetTs);
    return d1 < d2 ? low : low - 1;
  };

  // Binary insertion to keep bankRef.current sorted at all times
  const insertSorted = (item: FrameBankItem) => {
    const bank = bankRef.current;
    let low = 0;
    let high = bank.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (bank[mid].ts < item.ts) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    bank.splice(low, 0, item);
  };

  // Draw nearest frame onto canvas
  const drawNearestFrame = (centerIdx: number) => {
    const canvas = canvasRef.current;
    if (!canvas || centerIdx < 0 || bankRef.current.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    activeFrameIdxRef.current = centerIdx;
    const item = bankRef.current[centerIdx];
    if (item && item.bmp) {
      ctx.drawImage(item.bmp, 0, 0, canvas.width, canvas.height);
      if (!paintedRef.current) {
        paintedRef.current = true;
        setIsCanvasLive(true);
      }
    }
  };

  // Recompute span on resize and orientationchange
  useEffect(() => {
    const updateSpan = () => {
      const container = containerRef.current;
      const totalScroll = container
        ? container.offsetHeight - window.innerHeight
        : (document.documentElement.scrollHeight - window.innerHeight);
      scrollSpanRef.current = totalScroll > 0 ? totalScroll : 1;
    };

    updateSpan();
    window.addEventListener('resize', updateSpan);
    window.addEventListener('orientationchange', updateSpan);

    return () => {
      window.removeEventListener('resize', updateSpan);
      window.removeEventListener('orientationchange', updateSpan);
    };
  }, []);

  // Event listener for video seeked event
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onSeeked = () => {
      if (pendingSeekTimeRef.current !== null) {
        const nextTime = pendingSeekTimeRef.current;
        pendingSeekTimeRef.current = null;
        if (Math.abs(video.currentTime - nextTime) > 0.01) {
          video.currentTime = nextTime;
        }
      }
    };

    video.addEventListener('seeked', onSeeked);
    return () => {
      video.removeEventListener('seeked', onSeeked);
    };
  }, []);

  // rAF and scroll scrubbing loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const getProgress = () => {
      const container = containerRef.current;
      const totalScroll = container
        ? container.offsetHeight - window.innerHeight
        : (document.documentElement.scrollHeight - window.innerHeight);
      if (totalScroll <= 0) return 0;
      return Math.min(1, Math.max(0, window.scrollY / totalScroll));
    };

    const updateFrame = () => {
      const dur = durRef.current;
      if (dur > 0) {
        if (readyRef.current && !revertedRef.current) {
          const nearestIdx = findNearestIndex(currentRef.current * 1_000_000);
          if (nearestIdx !== -1) {
            drawNearestFrame(nearestIdx);
          }
        } else {
          // Fallback video currentTime seeking
          const video = videoRef.current;
          if (video) {
            if (!video.seeking) {
              if (Math.abs(video.currentTime - currentRef.current) > 0.01) {
                video.currentTime = currentRef.current;
              }
            } else {
              pendingSeekTimeRef.current = currentRef.current;
            }
          }
        }
      }
    };

    const tick = (now: number) => {
      const deltaSeconds = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(0.1, deltaSeconds);

      const p = getProgress();
      if (Math.abs(p - lastPRef.current) > 0.001) {
        lastPRef.current = p;
        setScrollProgress(p);
      }

      const dur = durRef.current;
      if (dur > 0) {
        targetRef.current = p * dur;

        if (prefersReducedMotion) {
          currentRef.current = targetRef.current;
        } else {
          currentRef.current += (targetRef.current - currentRef.current) * (1 - Math.exp(-dt * LERP_TAU));
          if (Math.abs(targetRef.current - currentRef.current) < SNAP) {
            currentRef.current = targetRef.current;
          }
        }

        updateFrame();
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    const onScroll = () => {
      const p = getProgress();
      if (Math.abs(p - lastPRef.current) > 0.001) {
        lastPRef.current = p;
        setScrollProgress(p);
      }
      const dur = durRef.current;
      if (dur > 0) {
        targetRef.current = p * dur;
        if (prefersReducedMotion) {
          currentRef.current = targetRef.current;
          updateFrame();
        }
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    animationFrameId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Update duration from video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateDur = () => {
      if (video.duration && !isNaN(video.duration)) {
        durRef.current = video.duration;
      }
    };

    video.addEventListener('loadedmetadata', updateDur);
    video.addEventListener('durationchange', updateDur);
    video.addEventListener('loadeddata', updateDur);
    video.addEventListener('canplay', updateDur);

    if (video.duration && !isNaN(video.duration)) {
      durRef.current = video.duration;
    }

    return () => {
      video.removeEventListener('loadedmetadata', updateDur);
      video.removeEventListener('durationchange', updateDur);
      video.removeEventListener('loadeddata', updateDur);
      video.removeEventListener('canplay', updateDur);
    };
  }, []);

  // Frame bank extraction using WebCodecs & MP4Box
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || typeof window.VideoDecoder === 'undefined') {
      console.info('Skipping WebCodecs frame-bank (reduced-motion or no VideoDecoder support).');
      return;
    }

    let isDestroyed = false;
    let decoder: VideoDecoder | null = null;
    let retryAttempted = false;

    // Watchdog timer (60s)
    const watchdogTimer = window.setTimeout(() => {
      if (!paintedRef.current) {
        console.warn('WebCodecs frame-bank watchdog timeout (60s). Reverting to video fallback.');
        revertedRef.current = true;
        setIsCanvasLive(false);
      }
    }, WATCHDOG);

    const startDecodingPipeline = async (hwPreference: HardwareAcceleration) => {
      if (isDestroyed) return;

      try {
        const response = await fetch(videoSrc);
        if (!response.ok) {
          throw new Error(`Fetch failed with status ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        if (isDestroyed) return;

        const MP4Box = await getMP4Box();
        const mp4file = MP4Box.createFile();

        let trackInfo: any = null;
        let description: Uint8Array | undefined;

        mp4file.onError = (e: any) => {
          console.error('MP4Box error:', e);
          if (!retryAttempted && hwPreference === 'prefer-hardware') {
            retryAttempted = true;
            startDecodingPipeline('prefer-software');
          } else {
            revertedRef.current = true;
          }
        };

        const samplesQueue: any[] = [];

        mp4file.onReady = (info: any) => {
          if (isDestroyed) return;
          const track = info.videoTracks[0];
          if (!track) return;
          trackInfo = track;
          durRef.current = track.duration / track.timescale;

          const trak = mp4file.getTrackById(track.id);
          for (const entry of trak.mdia.minf.stbl.stsd.entries) {
            const box = entry.avcC || entry.hvcC || entry.vpcC || entry.av1C;
            if (box) {
              const stream = new MP4Box.DataStream(undefined, 0, MP4Box.DataStream.BIG_ENDIAN);
              box.write(stream);
              description = new Uint8Array(stream.buffer, 8, box.size - 8);
              break;
            }
          }

          mp4file.setExtractionOptions(track.id, null, { nbSamples: 1000 });
          mp4file.start();
        };

        mp4file.onSamples = (_id: number, _user: any, samples: any[]) => {
          if (isDestroyed) return;
          for (const s of samples) {
            samplesQueue.push(s);
          }
        };

        // Feed buffer into MP4Box
        const mp4Buffer = arrayBuffer as any;
        mp4Buffer.fileStart = 0;
        mp4file.appendBuffer(mp4Buffer);
        mp4file.flush();

        if (!trackInfo) {
          throw new Error('No video track found in MP4');
        }

        // Setup offscreen canvas for frame capture
        const width = trackInfo.video?.width || trackInfo.track_width || 1920;
        const height = trackInfo.video?.height || trackInfo.track_height || 1080;

        let inFlightFrames = 0;

        decoder = new VideoDecoder({
          output: (frame: VideoFrame) => {
            if (isDestroyed) {
              frame.close();
              return;
            }
            inFlightFrames++;
            const ts = frame.timestamp;

            createImageBitmap(frame)
              .then((bmp) => {
                if (!isDestroyed) {
                  insertSorted({ ts, bmp });
                  if (!readyRef.current) {
                    readyRef.current = true;
                  }
                  // Paint initial frame on canvas immediately
                  if (!paintedRef.current) {
                    const canvas = canvasRef.current;
                    if (canvas) {
                      const ctx = canvas.getContext('2d');
                      if (ctx) {
                        ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
                        paintedRef.current = true;
                        setIsCanvasLive(true);
                      }
                    }
                  }
                } else {
                  bmp.close();
                }
              })
              .catch((err) => {
                console.warn('createImageBitmap failed for frame:', err);
              })
              .finally(() => {
                frame.close();
                inFlightFrames--;
              });
          },
          error: (e) => {
            console.error('VideoDecoder error:', e);
            if (!retryAttempted && hwPreference === 'prefer-hardware') {
              retryAttempted = true;
              startDecodingPipeline('prefer-software');
            } else {
              revertedRef.current = true;
            }
          },
        });

        decoder.configure({
          codec: trackInfo.codec,
          codedWidth: width,
          codedHeight: height,
          description: description,
          hardwareAcceleration: hwPreference,
        });

        // Throttle decoding with LEAD
        for (let idx = 0; idx < samplesQueue.length; idx++) {
          const sample = samplesQueue[idx];
          if (isDestroyed) break;

          while (inFlightFrames >= LEAD && !isDestroyed) {
            await new Promise((resolve) => setTimeout(resolve, 5));
          }

          if (decoder.state !== 'configured') break;

          const chunk = new EncodedVideoChunk({
            type: sample.is_sync ? 'key' : 'delta',
            timestamp: Math.round((sample.cts * 1_000_000) / sample.timescale),
            duration: Math.round((sample.duration * 1_000_000) / sample.timescale),
            data: sample.data,
          });

          decoder.decode(chunk);
        }

        if (decoder && decoder.state === 'configured') {
          await decoder.flush();
        }

        // Wait for all inFlightFrames to finish
        while (inFlightFrames > 0 && !isDestroyed) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }

        if (!isDestroyed && bankRef.current.length > 0) {
          readyRef.current = true;
          console.info(`Frame bank successfully built with ${bankRef.current.length} frames.`);
        }
      } catch (err) {
        console.warn('Frame extraction failed, using fallback video seeking:', err);
        if (!retryAttempted && hwPreference === 'prefer-hardware') {
          retryAttempted = true;
          startDecodingPipeline('prefer-software');
        } else {
          revertedRef.current = true;
        }
      }
    };

    // Build after window load
    const triggerStart = () => {
      if (!isDestroyed) {
        startDecodingPipeline('prefer-hardware');
      }
    };

    if (document.readyState === 'complete') {
      triggerStart();
    } else {
      window.addEventListener('load', triggerStart, { once: true });
    }
    const safetyTimeout = setTimeout(triggerStart, 150);

    return () => {
      isDestroyed = true;
      clearTimeout(safetyTimeout);
      clearTimeout(watchdogTimer);
      window.removeEventListener('load', triggerStart);
      if (decoder && decoder.state !== 'closed') {
        try {
          decoder.close();
        } catch {
          // ignore
        }
      }
      for (const item of bankRef.current) {
        if (item.bmp) {
          try {
            item.bmp.close();
          } catch {
            // ignore
          }
        }
      }
      bankRef.current = [];
    };
  }, [videoSrc]);

  // Expose debug state
  if (typeof window !== 'undefined') {
    (window as any).__scrubState = () => ({
      bankLength: bankRef.current.length,
      ready: readyRef.current,
      reverted: revertedRef.current,
      painted: paintedRef.current,
      dur: durRef.current,
      current: currentRef.current,
      target: targetRef.current,
      isCanvasLive,
      videoDuration: videoRef.current?.duration,
      videoCurrentTime: videoRef.current?.currentTime,
      videoSeeking: videoRef.current?.seeking,
    });
  }

  return {
    containerRef,
    videoRef,
    canvasRef,
    scrollProgress,
    isCanvasLive,
  };
}
