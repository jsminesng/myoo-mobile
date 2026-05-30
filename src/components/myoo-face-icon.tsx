import Svg, { Circle, Ellipse, Rect } from "react-native-svg";

type MyooFaceIconProps = {
  size?: number;
};

export function MyooFaceIcon({ size = 34 }: MyooFaceIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx={50} cy={50} r={50} fill="#e8bcde" />
      <Ellipse cx={36} cy={42} rx={18} ry={12} fill="#f7f6eb" />
      <Ellipse cx={64} cy={42} rx={18} ry={12} fill="#f7f6eb" />
      <Circle cx={36} cy={42} r={5} fill="#35554b" />
      <Circle cx={64} cy={42} r={5} fill="#35554b" />
      <Rect x={24} y={66} width={52} height={6} rx={3} fill="#35554b" />
    </Svg>
  );
}

