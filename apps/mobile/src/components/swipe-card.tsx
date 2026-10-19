import { forwardRef, useImperativeHandle, type ReactNode } from "react";
import { useWindowDimensions } from "react-native";
import { GestureDetector, useExclusiveGestures, usePanGesture, useTapGesture } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, type SharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import * as Haptics from "expo-haptics";
import { motion } from "@wtw/tokens";
import type { Vote } from "@wtw/core";

export interface SwipeHandle { fling(vote: Vote): void }
interface Props { onCommit(vote: Vote): void; onTap(): void; children(x: SharedValue<number>, y: SharedValue<number>): ReactNode }

const SPRING = { stiffness: motion.spring.stiffness, damping: motion.spring.damping, mass: motion.spring.mass };

function decide(dx: number, dy: number, vx: number, vy: number): Vote | null {
  "worklet";
  const d = motion.commitDistance, v = motion.commitVelocity;
  if (-dy > d && Math.abs(dy) > Math.abs(dx)) return "seen";
  if (dx > d || (vx > v && dx > 30)) return "like";
  if (dx < -d || (vx < -v && dx < -30)) return "nope";
  if (vy < -v && dy < -30) return "seen";
  return null;
}

/** Follows the finger, rotates with the drag, springs back, flies off on commit with a thunk. */
export const SwipeCard = forwardRef<SwipeHandle, Props>(function SwipeCard({ onCommit, onTap, children }, ref) {
  const { width } = useWindowDimensions();
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const gone = useSharedValue(false);

  const commit = (vote: Vote) => {
    void Haptics.impactAsync(vote === "like" ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    onCommit(vote);
  };
  const fly = (vote: Vote) => {
    "worklet";
    gone.value = true;
    const tx = vote === "like" ? width * 1.5 : vote === "nope" ? -width * 1.5 : x.value;
    const ty = vote === "seen" ? -width * 2 : y.value + 40;
    y.value = withTiming(ty, { duration: motion.flyOutMs });
    x.value = withTiming(tx, { duration: motion.flyOutMs }, () => scheduleOnRN(commit, vote));
  };

  useImperativeHandle(ref, () => ({ fling: (vote: Vote) => { if (!gone.value) fly(vote); } }));

  const pan = usePanGesture({
    onUpdate: (e) => { "worklet"; if (gone.value) return; x.value = e.translationX; y.value = e.translationY; },
    onDeactivate: (e) => {
      "worklet";
      if (gone.value) return;
      const vote = decide(e.translationX, e.translationY, e.velocityX, e.velocityY);
      if (vote) { fly(vote); return; }
      x.value = withSpring(0, SPRING);
      y.value = withSpring(0, SPRING);
    },
  });
  const tap = useTapGesture({ onDeactivate: () => { "worklet"; scheduleOnRN(onTap); } });
  const gesture = useExclusiveGestures(pan, tap);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { rotate: `${x.value * motion.rotatePerPx}deg` }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }, style]}>{children(x, y)}</Animated.View>
    </GestureDetector>
  );
});
