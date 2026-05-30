import {
  Bodies,
  Body,
  Composite,
  Engine,
  Query,
  Runner,
  World,
} from "matter-js";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  GestureResponderEvent,
  Image,
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Polyline } from "react-native-svg";

type BubbleItem = {
  text: string;
  iconUrl?: string;
  sketch?: string | null;
};

type BubblePhysicsProps = {
  items: BubbleItem[];
  onBubbleClick?: (item: BubbleItem, index: number) => void;
  enabled?: boolean;
  initialPlacement?: "random" | "center";
  centerStartAt?: "top" | "middle";
  centerYRatio?: number;
  releaseAfterMs?: number;
  holdLastBubbleMs?: number;
  releaseLastOnSettle?: boolean;
  gravityY?: number;
  spawnYOffsetRange?: [number, number];
};

type BubbleBody = ReturnType<typeof Bodies.rectangle> & {
  bubbleIndex: number;
  bubbleText: string;
  bubbleIconUrl?: string;
  bubbleSketch?: string | null;
  bubbleWidth: number;
  bubbleHeight: number;
  bubbleIsHeldLast?: boolean;
};

type DragState = {
  body: BubbleBody;
  startedAt: number;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  movedDistance: number;
  isDragging: boolean;
};

const GRAVITY_Y = 0.6;
const CLICK_MAX_DURATION_MS = 650;
const CLICK_MAX_MOVE_PX = 18;
const BUBBLE_HEIGHT = 62;
const DEFAULT_SPAWN_Y_OFFSET_RANGE: [number, number] = [80, 220];

const estimateBubbleWidth = (item: BubbleItem) => {
  const textWidthApprox = Math.max(78, item.text.length * 16);
  const iconExtra = item.iconUrl || item.sketch ? 38 : 0;
  return Math.min(330, textWidthApprox + 28 + iconExtra);
};

const toDegrees = (radians: number) => `${(radians * 180) / Math.PI}deg`;

type SketchPoint = [number, number];

const parseSketchToStrokes = (sketch?: string | null): SketchPoint[][] | null => {
  if (!sketch) return null;
  try {
    const raw = JSON.parse(sketch);
    if (!Array.isArray(raw)) return null;

    const isFlatPointArray =
      raw.length > 0 &&
      Array.isArray(raw[0]) &&
      raw[0].length === 2 &&
      Number.isFinite(raw[0][0]) &&
      Number.isFinite(raw[0][1]);

    if (isFlatPointArray) {
      const points = raw
        .filter(
          (value) =>
            Array.isArray(value) &&
            value.length === 2 &&
            Number.isFinite(value[0]) &&
            Number.isFinite(value[1]),
        )
        .map((value) => [Number(value[0]), Number(value[1])] as SketchPoint);
      return points.length > 1 ? [points] : null;
    }

    const strokes = raw
      .filter((stroke) => Array.isArray(stroke))
      .map((stroke) =>
        stroke
          .filter(
            (value: any) =>
              Array.isArray(value) &&
              value.length === 2 &&
              Number.isFinite(value[0]) &&
              Number.isFinite(value[1]),
          )
          .map((value: any) => [Number(value[0]), Number(value[1])] as SketchPoint),
      )
      .filter((stroke) => stroke.length > 1);

    return strokes.length > 0 ? strokes : null;
  } catch {
    return null;
  }
};

export function BubblePhysics({
  items,
  onBubbleClick,
  enabled = true,
  initialPlacement = "random",
  centerStartAt = "top",
  centerYRatio = 0.56,
  releaseAfterMs,
  holdLastBubbleMs,
  releaseLastOnSettle = false,
  gravityY = GRAVITY_Y,
  spawnYOffsetRange = DEFAULT_SPAWN_Y_OFFSET_RANGE,
}: BubblePhysicsProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [renderBodies, setRenderBodies] = useState<BubbleBody[]>([]);
  const [heldLastReleased, setHeldLastReleased] = useState(true);
  const spawnMin = Math.max(0, Math.min(spawnYOffsetRange[0], spawnYOffsetRange[1]));
  const spawnMax = Math.max(spawnMin, Math.max(spawnYOffsetRange[0], spawnYOffsetRange[1]));

  const engineRef = useRef<Engine | null>(null);
  const runnerRef = useRef<Runner | null>(null);
  const rafRef = useRef<number | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const worldBodiesRef = useRef<BubbleBody[]>([]);
  // React Native has no DOM canvas; we custom-render with RN Views.
  const canvasRef = useRef<null>(null);

  const staticLayout = useMemo(() => {
    if (size.width === 0) return [];
    return items.map((item, index) => {
      const width = estimateBubbleWidth(item);
      const row = Math.floor(index / 2);
      const col = index % 2;
      const left =
        col === 0
          ? 10
          : Math.max(10, size.width - width - 10 - ((index % 3) * 6));
      const top = 10 + row * (BUBBLE_HEIGHT + 12);
      const rotate = (index % 2 === 0 ? -1 : 1) * (2 + (index % 4));
      return { item, index, width, left, top, rotate };
    });
  }, [items, size.width]);

  useEffect(() => {
    if (!enabled || size.width <= 0 || size.height <= 0 || items.length === 0) {
      setRenderBodies([]);
      return;
    }

    const engine = Engine.create();
    engine.world.gravity.y = gravityY;
    engineRef.current = engine;

    const runner = Runner.create();
    runnerRef.current = runner;

    const wallOptions = { isStatic: true };
    const floor = Bodies.rectangle(
      size.width / 2,
      size.height + 50,
      size.width + 100,
      100,
      wallOptions,
    );
    const leftWall = Bodies.rectangle(-50, size.height / 2, 100, size.height * 2, wallOptions);
    const rightWall = Bodies.rectangle(size.width + 50, size.height / 2, 100, size.height * 2, wallOptions);
    World.add(engine.world, [floor, leftWall, rightWall]);

    const bodies: BubbleBody[] = items.map((item, index) => {
      const isHeldLastBubble =
        Boolean(holdLastBubbleMs && holdLastBubbleMs > 0) &&
        items.length > 1 &&
        index === items.length - 1;
      const width = estimateBubbleWidth(item);
      const x =
        isHeldLastBubble || (initialPlacement === "center" && items.length === 1)
          ? size.width / 2
          : width / 2 + Math.random() * Math.max(1, size.width - width);
      const y =
        isHeldLastBubble || (initialPlacement === "center" && items.length === 1)
          ? centerStartAt === "middle"
            ? size.height * centerYRatio
            : -BUBBLE_HEIGHT
          : -spawnMin - Math.random() * Math.max(1, spawnMax - spawnMin);
      const initialAngle =
        isHeldLastBubble || (initialPlacement === "center" && items.length === 1)
          ? 0
          : (Math.random() - 0.5) * 0.28;
      const body = Bodies.rectangle(x, y, width, BUBBLE_HEIGHT, {
        chamfer: { radius: BUBBLE_HEIGHT / 2 },
        restitution: 0.55,
        friction: 0.03,
        frictionAir: 0.015,
      }) as BubbleBody;
      body.bubbleIndex = index;
      body.bubbleText = item.text;
      body.bubbleIconUrl = item.iconUrl;
      body.bubbleSketch = item.sketch || null;
      body.bubbleWidth = width;
      body.bubbleHeight = BUBBLE_HEIGHT;
      body.bubbleIsHeldLast =
        Boolean(holdLastBubbleMs && holdLastBubbleMs > 0) &&
        items.length > 1 &&
        index === items.length - 1;
      Body.setAngle(body, initialAngle);
      return body;
    });

    worldBodiesRef.current = bodies;
    World.add(engine.world, bodies);

    let releaseTimer: ReturnType<typeof setTimeout> | null = null;
    let heldBubbleRef: BubbleBody | null = null;
    let settledFrames = 0;
    const releaseHeldBubble = () => {
      if (!heldBubbleRef) return;
      setHeldLastReleased(true);
      Body.set(heldBubbleRef, "isSensor", false);
      Body.setVelocity(heldBubbleRef, { x: 0, y: 0 });
      Body.setStatic(heldBubbleRef, false);
      heldBubbleRef = null;
      settledFrames = 0;
    };
    if ((releaseAfterMs ?? 0) > 0) {
      bodies.forEach((body) => Body.setStatic(body, true));
      releaseTimer = setTimeout(() => {
        bodies.forEach((body) => {
          Body.setVelocity(body, { x: 0, y: 0 });
          Body.setStatic(body, false);
        });
      }, releaseAfterMs);
    } else if ((holdLastBubbleMs ?? 0) > 0 && items.length > 1) {
      const heldBubble = bodies[bodies.length - 1];
      if (heldBubble) {
        heldBubbleRef = heldBubble;
        setHeldLastReleased(false);
        Body.set(heldBubble, "isSensor", true);
        Body.setStatic(heldBubble, true);
        releaseTimer = setTimeout(() => {
          releaseHeldBubble();
        }, holdLastBubbleMs);
      }
    }

    const tick = () => {
      if (!engineRef.current || !runnerRef.current) return;
      Runner.tick(runnerRef.current, engineRef.current, 1000 / 60);
      if (releaseLastOnSettle && heldBubbleRef && bodies.length > 1) {
        const others = bodies.slice(0, -1);
        const allSettled = others.every((body) => {
          const lowVelocity = Math.abs(body.velocity.x) < 0.08 && Math.abs(body.velocity.y) < 0.08;
          const lowAngularVelocity = Math.abs(body.angularVelocity) < 0.02;
          const nearFloor = body.position.y > size.height * 0.5;
          return lowVelocity && lowAngularVelocity && nearFloor;
        });
        if (allSettled) {
          settledFrames += 1;
          if (settledFrames >= 18) {
            releaseHeldBubble();
          }
        } else {
          settledFrames = 0;
        }
      }
      setRenderBodies([...worldBodiesRef.current]);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
      }
      if (runnerRef.current) {
        Runner.stop(runnerRef.current);
      }
      if (releaseTimer) {
        clearTimeout(releaseTimer);
      }
      if (engineRef.current) {
        Composite.clear(engineRef.current.world, false);
        Engine.clear(engineRef.current);
      }
      dragRef.current = null;
      worldBodiesRef.current = [];
      canvasRef.current = null;
      runnerRef.current = null;
      engineRef.current = null;
    };
  }, [centerStartAt, centerYRatio, enabled, gravityY, holdLastBubbleMs, initialPlacement, items, releaseAfterMs, releaseLastOnSettle, size.height, size.width, spawnMax, spawnMin]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: () => enabled,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponderCapture: () => enabled,
        onPanResponderGrant: (event: GestureResponderEvent) => {
          if (!enabled) return;
          const { locationX, locationY } = event.nativeEvent;
          const hits = Query.point(worldBodiesRef.current, {
            x: locationX,
            y: locationY,
          }) as BubbleBody[];
          const hit = hits[0];
          if (!hit) return;
          dragRef.current = {
            body: hit,
            startedAt: Date.now(),
            startX: locationX,
            startY: locationY,
            offsetX: locationX - hit.position.x,
            offsetY: locationY - hit.position.y,
            movedDistance: 0,
            isDragging: false,
          };
        },
        onPanResponderMove: (event: GestureResponderEvent) => {
          const drag = dragRef.current;
          if (!drag) return;
          const { locationX, locationY } = event.nativeEvent;
          const nextX = locationX - drag.offsetX;
          const nextY = locationY - drag.offsetY;
          const dx = locationX - drag.startX;
          const dy = locationY - drag.startY;
          drag.movedDistance = Math.sqrt(dx * dx + dy * dy);
          if (!drag.isDragging && drag.movedDistance > 3) {
            drag.isDragging = true;
            Body.setStatic(drag.body, true);
          }
          Body.setPosition(drag.body, { x: nextX, y: nextY });
          Body.setVelocity(drag.body, { x: 0, y: 0 });
        },
        onPanResponderRelease: (event: GestureResponderEvent) => {
          const drag = dragRef.current;
          if (drag) {
            if (drag.isDragging) {
              Body.setStatic(drag.body, false);
            }
            const elapsed = Date.now() - drag.startedAt;
            if (
              elapsed <= CLICK_MAX_DURATION_MS &&
              drag.movedDistance <= CLICK_MAX_MOVE_PX
            ) {
              const index = drag.body.bubbleIndex;
              const item = items[index];
              if (item) {
                onBubbleClick?.(item, index);
              }
            }
            dragRef.current = null;
            return;
          }

          // Fallback: if start hit-test missed, try release-point hit-test.
          const { locationX, locationY } = event.nativeEvent;
          const releaseHits = Query.point(worldBodiesRef.current, {
            x: locationX,
            y: locationY,
          }) as BubbleBody[];
          const releaseHit = releaseHits[0];
          if (releaseHit) {
            const index = releaseHit.bubbleIndex;
            const item = items[index];
            if (item) {
              onBubbleClick?.(item, index);
            }
          }
        },
        onPanResponderEnd: () => {
          const drag = dragRef.current;
          if (!drag) return;
          if (drag.isDragging) {
            Body.setStatic(drag.body, false);
          }

          const elapsed = Date.now() - drag.startedAt;
          if (
            elapsed <= CLICK_MAX_DURATION_MS &&
            drag.movedDistance <= CLICK_MAX_MOVE_PX
          ) {
            const index = drag.body.bubbleIndex;
            const item = items[index];
            if (item) {
              onBubbleClick?.(item, index);
            }
          }
          dragRef.current = null;
        },
        onPanResponderTerminate: () => {
          const drag = dragRef.current;
          if (!drag) return;
          if (drag.isDragging) {
            Body.setStatic(drag.body, false);
          }
          const elapsed = Date.now() - drag.startedAt;
          if (
            elapsed <= CLICK_MAX_DURATION_MS &&
            drag.movedDistance <= CLICK_MAX_MOVE_PX
          ) {
            const index = drag.body.bubbleIndex;
            const item = items[index];
            if (item) {
              onBubbleClick?.(item, index);
            }
          }
          dragRef.current = null;
        },
      }),
    [enabled, items, onBubbleClick],
  );

  return (
    <View style={styles.container} onLayout={onLayout} {...panResponder.panHandlers}>
      {enabled
        ? renderBodies.map((body) => (
            <Pressable
              key={`${body.bubbleIndex}-${body.id}`}
              onPress={() => {
                const item = items[body.bubbleIndex];
                if (item) {
                  onBubbleClick?.(item, body.bubbleIndex);
                }
              }}
              style={[
                styles.bubble,
                {
                  width: body.bubbleWidth,
                  height: body.bubbleHeight,
                  left: body.position.x - body.bubbleWidth / 2,
                  top: body.position.y - body.bubbleHeight / 2,
                  zIndex: body.bubbleIsHeldLast && !heldLastReleased ? 0 : 2,
                  transform: [{ rotate: toDegrees(body.angle) }],
                },
              ]}
            >
              <Text style={styles.bubbleText}>{body.bubbleText}</Text>
              {body.bubbleIconUrl || body.bubbleSketch ? (
                <View style={styles.iconCircle}>
                  {(() => {
                    const parsed = parseSketchToStrokes(body.bubbleSketch);
                    if (parsed) {
                      return (
                        <Svg width={32} height={32} viewBox="0 0 24 24">
                          {parsed.map((stroke, strokeIndex) => {
                            const points = stroke
                              .map((point) => `${point[0] * 30 - 3},${point[1] * 30 - 3}`)
                              .join(" ");
                            return (
                              <Polyline
                                key={`stroke-${strokeIndex}`}
                                points={points}
                                fill="none"
                                stroke="#364c41"
                                strokeWidth={2.4}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            );
                          })}
                        </Svg>
                      );
                    }
                    if (body.bubbleIconUrl) {
                      return <Image source={{ uri: body.bubbleIconUrl }} style={styles.iconImage} />;
                    }
                    return null;
                  })()}
                </View>
              ) : null}
            </Pressable>
          ))
        : staticLayout.map(({ item, index, width, left, top, rotate }) => (
            <Pressable
              key={`static-${index}-${item.text}`}
              onPress={() => onBubbleClick?.(item, index)}
              style={[
                styles.bubble,
                {
                  width,
                  height: BUBBLE_HEIGHT,
                  left,
                  top,
                  transform: [{ rotate: `${rotate}deg` }],
                },
              ]}
            >
              <Text style={styles.bubbleText}>{item.text}</Text>
              {item.iconUrl || item.sketch ? (
                <View style={styles.iconCircle}>
                  {(() => {
                    const parsed = parseSketchToStrokes(item.sketch);
                    if (parsed) {
                      return (
                        <Svg width={32} height={32} viewBox="0 0 24 24">
                          {parsed.map((stroke, strokeIndex) => {
                            const points = stroke
                              .map((point) => `${point[0] * 30 - 3},${point[1] * 30 - 3}`)
                              .join(" ");
                            return (
                              <Polyline
                                key={`stroke-${strokeIndex}`}
                                points={points}
                                fill="none"
                                stroke="#364c41"
                                strokeWidth={2.4}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            );
                          })}
                        </Svg>
                      );
                    }
                    if (item.iconUrl) {
                      return <Image source={{ uri: item.iconUrl }} style={styles.iconImage} />;
                    }
                    return null;
                  })()}
                </View>
              ) : null}
            </Pressable>
          ))}
    </View>
  );
}

export const bubblePhysicsStyles = StyleSheet.create({
  container: {},
  bubble: {},
  bubbleText: {},
  iconCircle: {},
  iconImage: {},
});

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    position: "relative",
    overflow: "hidden",
  },
  bubble: {
    position: "absolute",
    backgroundColor: "#35554b",
    borderRadius: 999,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    justifyContent: "center",
  },
  bubbleText: {
    color: "#eef0be",
    fontSize: 24,
    fontWeight: "500",
    letterSpacing: -0.3,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#eef0be",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  iconImage: {
    width: "100%",
    height: "100%",
  },
});

