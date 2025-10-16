import { useCallback, useEffect, useRef, useState } from "react";

const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 640;
const PIPE_WIDTH = 72;
const GAP_HEIGHT = 180;
const PIPE_SPACING = 220;
const GRAVITY = 0.45;
const FLAP_STRENGTH = -7.5;
const MAX_DROP_SPEED = 10;
const GROUND_HEIGHT = 100;

export default function Home() {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const gameRef = useRef({
    state: "ready",
    birdY: CANVAS_HEIGHT / 2,
    birdVelocity: 0,
    pipes: [],
    frame: 0,
    pipeTimer: 0,
    score: 0
  });

  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameState, setGameState] = useState("ready");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("flappy_best_score");
      if (stored) {
        setBestScore(Number(stored) || 0);
      }
    } catch (err) {
      console.warn("Unable to read high score from storage", err);
    }
  }, []);

  const saveBestScore = useCallback((value) => {
    setBestScore(value);
    try {
      localStorage.setItem("flappy_best_score", String(value));
    } catch (err) {
      console.warn("Unable to store high score", err);
    }
  }, []);

  const resetGame = useCallback(() => {
    gameRef.current = {
      state: "running",
      birdY: CANVAS_HEIGHT / 2,
      birdVelocity: 0,
      pipes: [],
      frame: 0,
      pipeTimer: 0,
      score: 0
    };
    setScore(0);
    setGameState("running");
  }, []);

  const triggerFlap = useCallback(() => {
    if (gameRef.current.state === "running") {
      gameRef.current.birdVelocity = FLAP_STRENGTH;
    } else if (gameRef.current.state === "ready") {
      resetGame();
      gameRef.current.birdVelocity = FLAP_STRENGTH;
    } else if (gameRef.current.state === "over") {
      resetGame();
    }
  }, [resetGame]);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.code === "Space") {
        event.preventDefault();
        triggerFlap();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [triggerFlap]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    const skyGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    skyGradient.addColorStop(0, "#4facfe");
    skyGradient.addColorStop(1, "#00f2fe");

    const spawnPipe = () => {
      const centerY =
        Math.random() * (CANVAS_HEIGHT - GROUND_HEIGHT - GAP_HEIGHT - 160) + 80;
      gameRef.current.pipes.push({
        x: CANVAS_WIDTH + PIPE_WIDTH,
        gapY: centerY
      });
    };

    const drawBird = (state) => {
      const birdX = CANVAS_WIDTH * 0.25;
      const birdRadius = 18;
      ctx.save();
      ctx.translate(birdX, state.birdY);
      const tilt = Math.max(
        Math.min(state.birdVelocity / MAX_DROP_SPEED, 1),
        -1
      );
      ctx.rotate((tilt * Math.PI) / 6);
      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.arc(0, 0, birdRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#073b4c";
      ctx.beginPath();
      ctx.arc(birdRadius * 0.4, -birdRadius * 0.2, birdRadius * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ef476f";
      ctx.beginPath();
      ctx.ellipse(
        birdRadius,
        birdRadius * 0.1,
        birdRadius * 0.8,
        birdRadius * 0.35,
        0,
        Math.PI * 2,
        false
      );
      ctx.fill();
      ctx.restore();
    };

    const drawPipes = (pipes) => {
      ctx.fillStyle = "#06d6a0";
      pipes.forEach((pipe) => {
        const topHeight = pipe.gapY - GAP_HEIGHT / 2;
        const bottomY = pipe.gapY + GAP_HEIGHT / 2;
        const bottomHeight = CANVAS_HEIGHT - GROUND_HEIGHT - bottomY;

        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, topHeight);
        ctx.fillRect(pipe.x - 6, topHeight - 24, PIPE_WIDTH + 12, 24);

        ctx.fillRect(pipe.x, bottomY, PIPE_WIDTH, bottomHeight);
        ctx.fillRect(pipe.x - 6, bottomY, PIPE_WIDTH + 12, 24);
      });
    };

    const drawGround = (offset) => {
      ctx.fillStyle = "#ffd166";
      ctx.fillRect(0, CANVAS_HEIGHT - GROUND_HEIGHT, CANVAS_WIDTH, GROUND_HEIGHT);
      ctx.fillStyle = "#f9c74f";
      for (let i = -1; i < CANVAS_WIDTH / 40 + 2; i += 1) {
        ctx.fillRect(
          ((i * 40 + offset) % CANVAS_WIDTH),
          CANVAS_HEIGHT - GROUND_HEIGHT,
          20,
          10
        );
      }
    };

    const drawHUD = (state) => {
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 32px 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.fillText(state.score.toString(), CANVAS_WIDTH / 2, 80);

      ctx.font = "16px 'Inter', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`Best: ${Math.max(bestScore, state.score)}`, 24, 36);

      if (state.state === "ready") {
        ctx.textAlign = "center";
        ctx.font = "24px 'Inter', sans-serif";
        ctx.fillText("Tap or press Space to fly", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      } else if (state.state === "over") {
        ctx.textAlign = "center";
        ctx.font = "bold 32px 'Inter', sans-serif";
        ctx.fillText("Game Over", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
        ctx.font = "20px 'Inter', sans-serif";
        ctx.fillText(
          "Tap or press Space to try again",
          CANVAS_WIDTH / 2,
          CANVAS_HEIGHT / 2 + 18
        );
      }
    };

    const checkCollision = (state) => {
      const birdX = CANVAS_WIDTH * 0.25;
      const birdRadius = 16;
      if (state.birdY + birdRadius >= CANVAS_HEIGHT - GROUND_HEIGHT) {
        return true;
      }
      if (state.birdY - birdRadius <= 0) {
        return true;
      }
      return state.pipes.some((pipe) => {
        const pipeRight = pipe.x + PIPE_WIDTH;
        const pipeLeft = pipe.x;
        const topHeight = pipe.gapY - GAP_HEIGHT / 2;
        const bottomY = pipe.gapY + GAP_HEIGHT / 2;
        const birdTop = state.birdY - birdRadius;
        const birdBottom = state.birdY + birdRadius;
        const intersectsHorizontally =
          birdX + birdRadius > pipeLeft && birdX - birdRadius < pipeRight;
        const hitsTop = intersectsHorizontally && birdTop < topHeight;
        const hitsBottom =
          intersectsHorizontally && birdBottom > bottomY;
        if (!pipe.counted && pipeRight < birdX) {
          pipe.counted = true;
          state.score += 1;
          setScore(state.score);
        }
        return hitsTop || hitsBottom;
      });
    };

    const updateState = (state) => {
      if (state.state !== "running") {
        return state;
      }

      state.frame += 1;
      state.pipeTimer += 1;
      state.birdVelocity = Math.min(
        state.birdVelocity + GRAVITY,
        MAX_DROP_SPEED
      );
      state.birdY += state.birdVelocity;

      if (state.pipeTimer > PIPE_SPACING) {
        spawnPipe();
        state.pipeTimer = 0;
      }

      state.pipes = state.pipes
        .map((pipe) => ({ ...pipe, x: pipe.x - 2.6 }))
        .filter((pipe) => pipe.x + PIPE_WIDTH > -40);

      if (checkCollision(state)) {
        state.state = "over";
        setGameState("over");
        if (state.score > bestScore) {
          saveBestScore(state.score);
        }
      }

      return state;
    };

    const render = () => {
      const state = gameRef.current;
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      if (state.state === "ready") {
        const swing = Math.sin(Date.now() / 300) * 6;
        state.birdY = CANVAS_HEIGHT / 2 + swing;
      }

      drawPipes(state.pipes);
      const groundOffset = (state.frame * 2) % CANVAS_WIDTH;
      drawGround(groundOffset);
      drawBird(state);
      drawHUD(state);
    };

    const loop = () => {
      gameRef.current = updateState({ ...gameRef.current });
      render();
      animationRef.current = requestAnimationFrame(loop);
    };
    loop();

    const handlePointer = (event) => {
      event.preventDefault();
      triggerFlap();
    };
    canvas.addEventListener("pointerdown", handlePointer);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      canvas.removeEventListener("pointerdown", handlePointer);
    };
  }, [bestScore, saveBestScore, triggerFlap]);

  return (
    <div className="page">
      <main className="game">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          role="img"
          aria-label="Flappy Bird Clone"
        />
        <section className="sidebar">
          <h1>Flappy Bird</h1>
          <p>Survive as long as you can. Every pipe pair you pass earns a point.</p>
          <ul>
            <li>Press Space or tap the canvas to flap.</li>
            <li>Avoid the top and bottom of each pipe pair.</li>
            <li>The ground is just as deadly as the pipes.</li>
          </ul>
          <div className="scores">
            <div>
              <span className="label">Score</span>
              <span className="value">{score}</span>
            </div>
            <div>
              <span className="label">Best</span>
              <span className="value">{bestScore}</span>
            </div>
          </div>
          <button
            type="button"
            className="primary"
            onClick={triggerFlap}
            aria-live="polite"
          >
            {gameState === "running" ? "Flap!" : gameState === "over" ? "Restart" : "Start"}
          </button>
        </section>
      </main>
      <footer>
        Built with Next.js. Deploy-ready for Vercel.
      </footer>
    </div>
  );
}
