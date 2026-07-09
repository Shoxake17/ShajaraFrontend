// features/tree/components/TreeEdge.tsx
// Shajara chizig'i — smoothstep, lekin burilish nuqtasi DOIM pastdagi (bola)
// kartadan 30px tepada. Bir qavatga kiruvchi barcha chiziqlar bitta gorizontal
// tekislikda buriladi — hech qaysi chiziq baland-past bo'lmaydi.
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';

/** Chiziq bola kartasidan necha px tepada buriladi (layout ROW_V_GAP/2 bilan mos) */
const BEND_ABOVE_TARGET = 30;

export function TreeEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style } = props;
  const [path] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
    centerY: targetY - BEND_ABOVE_TARGET,
  });
  return <BaseEdge id={id} path={path} style={style} />;
}
