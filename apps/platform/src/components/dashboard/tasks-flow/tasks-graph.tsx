"use client";

import type {
  Connection,
  Edge,
  Node,
  NodeMouseHandler,
  NodeTypes,
  OnEdgesChange,
  OnNodesChange,
  Viewport,
} from "@xyflow/react";
import type { ReactNode } from "react";
import { memo, useEffect, useMemo } from "react";
import { TaskNode } from "@/components/dashboard/sidebar/TaskNode";
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useOnViewportChange,
  useReactFlow,
} from "@xyflow/react";

import { BufferNode } from "./buffer-node";

const nodeTypes: NodeTypes = {
  task: TaskNode,
  default: TaskNode,
  buffer: BufferNode,
};

const defaultEdgeOptions = {
  type: "smoothstep",
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 20,
    height: 20,
  },
};

export interface TasksGraphProps {
  nodes: Node[];
  edges: Edge[];
  onConnect: (connection: Connection) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onNodeDragStop: NodeMouseHandler;
  onPaneContextMenu: (event: MouseEvent | React.MouseEvent) => void;
  onNodeContextMenu: NodeMouseHandler;
  onEdgeContextMenu: (event: MouseEvent | React.MouseEvent, edge: Edge) => void;
  onFlowInstanceReady?: (instance: ReturnType<typeof useReactFlow>) => void;
  onViewportChange?: (viewport: Viewport) => void;
  defaultViewport?: Viewport;
  onNodesDelete?: (nodes: Node[]) => void;
  onEdgesDelete?: (edges: Edge[]) => void;
  /** Overlays drawn inside the canvas, such as a React Flow <Panel>. */
  children?: ReactNode;
}

const TasksGraphInner = memo(function TasksGraphInner({
  nodes,
  edges,
  onConnect,
  onNodesChange,
  onEdgesChange,
  onNodeDragStop,
  onPaneContextMenu,
  onNodeContextMenu,
  onEdgeContextMenu,
  onFlowInstanceReady,
  onViewportChange,
  defaultViewport,
  onNodesDelete,
  onEdgesDelete,
  children,
}: TasksGraphProps) {
  const reactFlowInstance = useReactFlow();
  useOnViewportChange(
    onViewportChange
      ? {
          onChange: onViewportChange,
        }
      : {},
  );

  useEffect(() => {
    if (onFlowInstanceReady) {
      onFlowInstanceReady(reactFlowInstance);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reactFlowInstance]);

  const layoutStyle = useMemo(
    () => ({
      flex: 1,
      width: "100%",
      height: "100%",
      backgroundColor: "#ffffff",
    }),
    [],
  );
  const fitViewOptions = useMemo(() => ({ padding: 0.2 }), []);
  const proOptions = useMemo(() => ({ hideAttribution: true }), []);
  const snapGrid = useMemo(() => [15, 15] as [number, number], []);

  return (
    <div style={layoutStyle}>
      <ReactFlow
        colorMode="dark"
        defaultEdgeOptions={defaultEdgeOptions}
        defaultViewport={defaultViewport}
        edges={edges}
        fitView={!defaultViewport}
        fitViewOptions={fitViewOptions}
        nodes={nodes}
        nodeTypes={nodeTypes}
        onConnect={onConnect}
        onEdgeContextMenu={onEdgeContextMenu}
        onEdgesChange={onEdgesChange}
        onEdgesDelete={onEdgesDelete}
        onlyRenderVisibleElements
        onNodeContextMenu={onNodeContextMenu}
        onNodeDragStop={onNodeDragStop}
        onNodesChange={onNodesChange}
        onNodesDelete={onNodesDelete}
        onPaneContextMenu={onPaneContextMenu}
        proOptions={proOptions}
        snapGrid={snapGrid}
        snapToGrid
        zoomOnScroll={true}
      >
        <Background />
        <Controls />
        <MiniMap />
        {children}
      </ReactFlow>
    </div>
  );
});

export const TasksGraph = memo(function TasksGraph(props: TasksGraphProps) {
  return (
    <ReactFlowProvider>
      <TasksGraphInner {...props} />
    </ReactFlowProvider>
  );
});
