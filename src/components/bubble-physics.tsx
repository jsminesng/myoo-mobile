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
  StyleSheet,
  Text,
  View,
} from "react-native";

type BubbleItem = {
  text: string;
  iconUrl?: string;
};

type BubblePhysicsProps = {
  items: BubbleItem[];
  onBubbleClick?: (item: BubbleItem, index: number) => void;
  enabled?: boolean;
};

type BubbleBody = ReturnType<typeof Bodies.rectangle> & {
  bubbleIndex: number;
  bubbleText: string;
  bubbleIconUrl?: string;
  bubbleWidth: number;
  bubbleHeight: number;
};

type DragState = {
  body: BubbleBody;
  startedAt: number;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  movedDistance: number;
};

const GRAVITY_Y = 0.6;
const CLICK_MAX_DURATION_MS = 280;
const CLICK_MAX_MOVE_PX = 10;
const BUBBLE_HEIGHT = 54;

const estimateBubbleWidth = (item: BubbleItem) => {
  const textWidthApprox = Math.max(80, item.text.length * 12);
  const iconExtra = item.iconUrl ? 34 : 0;
  return Math.min(340, textWidthApprox + 36 + iconExtra);
};

const toDegrees = (radians: number) => `${(radians * 180) / Math.PI}deg`;

export function BubblePhysics({
  items,
  onBubbleClick,
  enabled = true,
}: BubblePhysicsProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [renderBodies, setRenderBodies] = useState<BubbleBody[]>([]);

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
    engine.world.gravity.y = GRAVITY_Y;
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
      const width = estimateBubbleWidth(item);
      const x = width / 2 + Math.random() * Math.max(1, size.width - width);
      const y = -80 - Math.random() * 220;
      const initialAngle = (Math.random() - 0.5) * 0.28;
      const body = Bodies.rectangle(x, y, width, BUBBLE_HEIGHT, {
        chamfer: { radius: BUBBLE_HEIGHT / 2 },
        restitution: 0.55,
        friction: 0.03,
        frictionAir: 0.015,
      }) as BubbleBody;
      body.bubbleIndex = index;
      body.bubbleText = item.text;
      body.bubbleIconUrl = item.iconUrl;
      body.bubbleWidth = width;
      body.bubbleHeight = BUBBLE_HEIGHT;
      Body.setAngle(body, initialAngle);
      return body;
    });

    worldBodiesRef.current = bodies;
    World.add(engine.world, bodies);

    const tick = () => {
      if (!engineRef.current || !runnerRef.current) return;
      Runner.tick(runnerRef.current, engineRef.current, 1000 / 60);
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
  }, [enabled, items, size.width, size.height]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => enabled,
        onMoveShouldSetPanResponder: () => enabled,
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
          };
          Body.setStatic(hit, true);
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
          Body.setPosition(drag.body, { x: nextX, y: nextY });
          Body.setVelocity(drag.body, { x: 0, y: 0 });
        },
        onPanResponderRelease: () => {
          const drag = dragRef.current;
          if (!drag) return;
          Body.setStatic(drag.body, false);

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
          Body.setStatic(drag.body, false);
          dragRef.current = null;
        },
      }),
    [enabled, items, onBubbleClick],
  );

  return (
    <View style={styles.container} onLayout={onLayout} {...panResponder.panHandlers}>
      {enabled
        ? renderBodies.map((body) => (
            <View
              key={`${body.bubbleIndex}-${body.id}`}
              style={[
                styles.bubble,
                {
                  width: body.bubbleWidth,
                  height: body.bubbleHeight,
                  left: body.position.x - body.bubbleWidth / 2,
                  top: body.position.y - body.bubbleHeight / 2,
                  transform: [{ rotate: toDegrees(body.angle) }],
                },
              ]}
            >
              <Text style={styles.bubbleText}>{body.bubbleText}</Text>
              {body.bubbleIconUrl ? (
                <View style={styles.iconCircle}>
                  <Image source={{ uri: body.bubbleIconUrl }} style={styles.iconImage} />
                </View>
              ) : null}
            </View>
          ))
        : staticLayout.map(({ item, index, width, left, top, rotate }) => (
            <View
              key={`static-${index}-${item.text}`}
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
              {item.iconUrl ? (
                <View style={styles.iconCircle}>
                  <Image source={{ uri: item.iconUrl }} style={styles.iconImage} />
                </View>
              ) : null}
            </View>
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
    backgroundColor: "#364c41",
    borderRadius: 999,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
  },
  bubbleText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
  iconImage: {
    width: "100%",
    height: "100%",
  },
});

