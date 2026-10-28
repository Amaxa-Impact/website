"use client";

import type {
  ClearableTaskField,
  TaskNodeData,
} from "@/components/dashboard/sidebar/TaskNode";
import type {
  Connection,
  Edge,
  Node,
  NodeMouseHandler,
  Viewport,
} from "@xyflow/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams } from "next/navigation";
import { useDashboardContext } from "@/components/dashboard/context";
import { Cursor } from "@/components/dashboard/cursor";
import { getUserDisplayName } from "@/components/user-dropdown";
import usePresence from "@/hooks/use-presence";
import { omitUndefined } from "@/lib/omit-undefined";
import { useQueryWithStatus } from "@/lib/rich-query";
import { useAuth } from "@workos-inc/authkit-nextjs/components";
import {
  addEdge,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";

import type { Id } from "@amaxa/backend/_generated/dataModel";
import type { UserOption } from "@/components/user-dropdown";
import { api } from "@amaxa/backend/_generated/api";

import type { ContextMenuState, CursorPresenceData } from "./types";
import { TasksContextMenu } from "./tasks-context-menu";
import { TasksGraph } from "./tasks-graph";
import { TasksHeader } from "./tasks-header";
import { getStableUserId, getUserColor } from "./utils";

interface ProjectMember {
  userId: string;
}

interface FlowInstanceBridge {
  screenToFlowPosition: (position: { x: number; y: number }) => {
    x: number;
    y: number;
  };
  flowToScreenPosition: (position: { x: number; y: number }) => {
    x: number;
    y: number;
  };
}

interface TasksCanvasProps {
  defaultViewport?: Viewport;
  initialEdges: Edge[];
  initialNodes: Node[];
  onCreateEdge: (connection: Connection) => Promise<void>;
  onDataChange: (
    taskId: string,
    data: Partial<TaskNodeData>,
    clear?: ClearableTaskField[],
  ) => Promise<void>;
  onEdgeContextMenu: (event: MouseEvent | React.MouseEvent, edge: Edge) => void;
  onFlowInstanceReady: (instance: FlowInstanceBridge) => void;
  onEdgesDelete: (edgeIds: string[]) => Promise<void>;
  onNodeContextMenu: NodeMouseHandler;
  onNodeDragStop: NodeMouseHandler;
  onNodesDelete: (taskIds: string[]) => Promise<void>;
  onPaneContextMenu: (event: MouseEvent | React.MouseEvent) => void;
  onQuickAddTask: (
    taskId: string,
    position: { x: number; y: number },
  ) => Promise<void>;
  onStatusChange: (
    taskId: string,
    status: TaskNodeData["status"],
  ) => Promise<void>;
  onViewportChange?: (viewport: Viewport) => void;
  projectMembers?: { userId: string; name: string }[];
}

function TasksCanvas({
  defaultViewport,
  initialEdges,
  initialNodes,
  onCreateEdge,
  onDataChange,
  onEdgeContextMenu,
  onEdgesDelete,
  onFlowInstanceReady,
  onNodeContextMenu,
  onNodeDragStop,
  onNodesDelete,
  onPaneContextMenu,
  onQuickAddTask,
  onStatusChange,
  onViewportChange,
  projectMembers,
}: TasksCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  const nodesForRender = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...(node.data as unknown as TaskNodeData),
          onStatusChange: (status: TaskNodeData["status"]) =>
            void onStatusChange(node.id, status),
          onDataChange: (
            data: Partial<TaskNodeData>,
            clear?: ClearableTaskField[],
          ) => void onDataChange(node.id, data, clear),
          onQuickAddTask: () => void onQuickAddTask(node.id, node.position),
          projectMembers,
        },
      })),
    [nodes, onDataChange, onQuickAddTask, onStatusChange, projectMembers],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) {
        return;
      }

      setEdges((existingEdges) => addEdge(connection, existingEdges));
      void onCreateEdge(connection);
    },
    [onCreateEdge, setEdges],
  );

  return (
    <TasksGraph
      defaultViewport={defaultViewport}
      edges={edges}
      nodes={nodesForRender}
      onConnect={handleConnect}
      onEdgeContextMenu={onEdgeContextMenu}
      onEdgesChange={onEdgesChange}
      onEdgesDelete={(deletedEdges) =>
        void onEdgesDelete(deletedEdges.map((edge) => edge.id))
      }
      onFlowInstanceReady={(instance) => {
        onFlowInstanceReady({
          screenToFlowPosition: instance.screenToFlowPosition.bind(instance),
          flowToScreenPosition: instance.flowToScreenPosition.bind(instance),
        });
      }}
      onNodeContextMenu={onNodeContextMenu}
      onNodeDragStop={onNodeDragStop}
      onNodesChange={onNodesChange}
      onNodesDelete={(deletedNodes) =>
        void onNodesDelete(deletedNodes.map((node) => node.id))
      }
      onPaneContextMenu={onPaneContextMenu}
      onViewportChange={onViewportChange}
    />
  );
}

export function TasksFlowContent() {
  const { projectId } = useParams<{ projectId: Id<"projects"> }>();
  const { project, userRole } = useDashboardContext();
  const { isAuthenticated } = useConvexAuth();
  const { user } = useAuth();

  const [flowInstance, setFlowInstance] = useState<FlowInstanceBridge | null>(
    null,
  );
  const { data: convexNodes } = useQueryWithStatus(api.tasks.listForProject, {
    projectId,
  });
  const { data: convexEdges } = useQueryWithStatus(api.edges.listForProject, {
    projectId,
  });
  const { data: projectMembersData } = useQueryWithStatus(
    api.userToProjects.listUsersForProject,
    {
      projectId,
    },
  );
  const allUsers = useQuery(api.users.listAll, {}) as UserOption[] | undefined;
  const projectMembers = projectMembersData as ProjectMember[] | undefined;

  const createTask = useMutation(api.tasks.create);
  const updatePosition = useMutation(api.tasks.updatePosition);
  const updateTaskData = useMutation(api.tasks.updateData);
  const removeTask = useMutation(api.tasks.remove);
  const createEdge = useMutation(api.edges.create);
  const removeEdge = useMutation(api.edges.remove);

  const userIdRef = useRef<string | null>(null);
  userIdRef.current ??= getStableUserId();
  const userId = userIdRef.current;

  const roomId = `project:${projectId}:tasks`;
  const userColor = getUserColor(userId);

  const userName = user?.firstName ?? "";
  const initialPresenceData: CursorPresenceData = useMemo(
    () => ({
      x: 0,
      y: 0,
      name: userName,
      color: userColor,
      emoji: "👤",
    }),
    [userName, userColor],
  );

  const [_myPresenceData, othersPresence, updatePresence] = usePresence(
    roomId,
    userId,
    initialPresenceData,
  );

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // The canvas remounts whenever the graph shape changes (see graphStateKey),
  // so remember the viewport to restore it. Null until the user first moves,
  // which lets the initial mount fit the view instead.
  const viewportRef = useRef<Viewport | null>(null);
  const handleViewportChange = useCallback((viewport: Viewport) => {
    viewportRef.current = viewport;
  }, []);

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (reactFlowWrapper.current && isAuthenticated && flowInstance) {
        const flowPosition = flowInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        updatePresence({ x: flowPosition.x, y: flowPosition.y });
      }
    },
    [updatePresence, isAuthenticated, flowInstance],
  );

  const initialNodes = useMemo(() => (convexNodes ?? []) as Node[], [convexNodes]);
  const initialEdges = useMemo(() => (convexEdges ?? []) as Edge[], [convexEdges]);

  const graphStateKey = useMemo(
    () =>
      JSON.stringify({
        edges: initialEdges.map((edge) => [edge.id, edge.source, edge.target]),
        nodes: initialNodes.map((node) => [node.id, node.position.x, node.position.y]),
      }),
    [initialEdges, initialNodes],
  );

  const handleCreateEdge = useCallback(
    async (connection: Connection) => {
      if (connection.source && connection.target) {
        await createEdge(
          omitUndefined({
            projectId,
            source: connection.source as Id<"tasks">,
            target: connection.target as Id<"tasks">,
            type: "smoothstep",
            sourceHandle: connection.sourceHandle ?? undefined,
            targetHandle: connection.targetHandle ?? undefined,
          }),
        );
      }
    },
    [createEdge, projectId],
  );

  const onNodeDragStop = useCallback(
    async (_event: React.MouseEvent, node: Node) => {
      await updatePosition({
        taskId: node.id as Id<"tasks">,
        position: node.position,
      });
    },
    [updatePosition],
  );

  const handleStatusChange = useCallback(
    async (taskId: string, status: TaskNodeData["status"]) => {
      if (!status) {
        return;
      }
      await updateTaskData({
        taskId: taskId as Id<"tasks">,
        data: { status },
      });
    },
    [updateTaskData],
  );

  const handleDataChange = useCallback(
    async (
      taskId: string,
      data: Partial<TaskNodeData>,
      clear?: ClearableTaskField[],
    ) => {
      await updateTaskData({
        taskId: taskId as Id<"tasks">,
        data,
        ...(clear?.length ? { clear } : {}),
      });
    },
    [updateTaskData],
  );

  const addNewTask = useCallback(
    async (position?: { x: number; y: number }) => {
      try {
        let pos: { x: number; y: number };

        if (position) {
          if (reactFlowWrapper.current && flowInstance) {
            const rect = reactFlowWrapper.current.getBoundingClientRect();
            pos = flowInstance.screenToFlowPosition({
              x: rect.left + position.x,
              y: rect.top + position.y,
            });
          } else {
            pos = position;
          }
        } else {
          pos = {
            x: Math.random() * 400 + 100,
            y: Math.random() * 300 + 100,
          };
        }

        await createTask({
          projectId,
          type: "task",
          position: pos,
          data: {
            label: "New Task",
            status: "todo",
            priority: "medium",
          },
        });
      } catch (error) {
        console.error("Failed to create task:", error);
      }
    },
    [createTask, projectId, flowInstance],
  );

  const handleQuickAddTask = useCallback(
    async (sourceTaskId: string, sourcePosition: { x: number; y: number }) => {
      try {
        const newTaskId = await createTask({
          projectId,
          type: "task",
          position: { x: sourcePosition.x + 320, y: sourcePosition.y },
          data: {
            label: "New Task",
            status: "todo",
            priority: "medium",
          },
        });
        await createEdge({
          projectId,
          source: sourceTaskId as Id<"tasks">,
          target: newTaskId,
          type: "smoothstep",
        });
      } catch (error) {
        console.error("Failed to quick-add connected task:", error);
      }
    },
    [createEdge, createTask, projectId],
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      await removeTask({ taskId: taskId as Id<"tasks"> });
    },
    [removeTask],
  );

  const deleteEdge = useCallback(
    async (edgeId: string) => {
      await removeEdge({ edgeId: edgeId as Id<"edges"> });
    },
    [removeEdge],
  );

  const handleNodesDelete = useCallback(
    async (taskIds: string[]) => {
      await Promise.all(taskIds.map((taskId) => deleteTask(taskId)));
    },
    [deleteTask],
  );

  const handleEdgesDelete = useCallback(
    async (edgeIds: string[]) => {
      // Deleting a task cascades to its edges server-side, and React Flow
      // fires onEdgesDelete for those same edges when a connected node is
      // deleted in the same action — the edge may already be gone by the
      // time this runs, which is the desired end state either way.
      await Promise.all(
        edgeIds.map((edgeId) => deleteEdge(edgeId).catch(() => undefined)),
      );
    },
    [deleteEdge],
  );

  const handlePaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault();
      if (reactFlowWrapper.current) {
        const rect = reactFlowWrapper.current.getBoundingClientRect();
        setContextMenu({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
      }
    },
    [],
  );

  const handleNodeContextMenu: NodeMouseHandler = useCallback((event, node) => {
    event.preventDefault();
    if (reactFlowWrapper.current) {
      const rect = reactFlowWrapper.current.getBoundingClientRect();
      setContextMenu({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        nodeId: node.id,
      });
    }
  }, []);

  const handleEdgeContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      if (reactFlowWrapper.current) {
        const rect = reactFlowWrapper.current.getBoundingClientRect();
        setContextMenu({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          edgeId: edge.id,
        });
      }
    },
    [],
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const userNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const user of allUsers ?? []) {
      map.set(user.id, getUserDisplayName(user));
    }
    return map;
  }, [allUsers]);

  const projectMembersForNodes = useMemo(
    () =>
      projectMembers?.map((member) => ({
        userId: member.userId,
        name: userNameById.get(member.userId) ?? member.userId,
      })),
    [projectMembers, userNameById],
  );

  const layoutStyle = useMemo(
    () => ({
      width: "100%",
      height: "100vh",
      display: "flex",
      flexDirection: "column" as const,
    }),
    [],
  );

  const getCursorScreenPosition = (flowX: number, flowY: number) => {
    if (!(reactFlowWrapper.current && flowInstance)) {
      return { x: 0, y: 0 };
    }

    const rect = reactFlowWrapper.current.getBoundingClientRect();

    const screenPosition = flowInstance.flowToScreenPosition({
      x: flowX,
      y: flowY,
    });

    return {
      x: screenPosition.x - rect.left,
      y: screenPosition.y - rect.top,
    };
  };

  return (
    <div style={layoutStyle}>
      <TasksHeader
        onAddTask={() => void addNewTask()}
        othersPresence={othersPresence ?? []}
        projectName={project.name || "Project"}
        userRole={userRole}
      />

      <div
        aria-label="Task flow canvas"
        className="relative flex-1"
        onPointerMove={handleMouseMove}
        ref={reactFlowWrapper}
        role="application"
      >
        <TasksCanvas
          key={graphStateKey}
          defaultViewport={viewportRef.current ?? undefined}
          initialEdges={initialEdges}
          initialNodes={initialNodes}
          onCreateEdge={handleCreateEdge}
          onDataChange={handleDataChange}
          onEdgeContextMenu={handleEdgeContextMenu}
          onEdgesDelete={handleEdgesDelete}
          onFlowInstanceReady={setFlowInstance}
          onNodeContextMenu={handleNodeContextMenu}
          onNodeDragStop={onNodeDragStop}
          onNodesDelete={handleNodesDelete}
          onPaneContextMenu={handlePaneContextMenu}
          onQuickAddTask={handleQuickAddTask}
          onStatusChange={handleStatusChange}
          onViewportChange={handleViewportChange}
          projectMembers={projectMembersForNodes}
        />

        {othersPresence
          ?.filter((p) => {
            const data = p.data as unknown as CursorPresenceData;
            return data.x !== 0 || data.y !== 0;
          })
          .map((presence) => {
            const data = presence.data as unknown as CursorPresenceData;
            const pos = getCursorScreenPosition(data.x, data.y);

            return (
              <Cursor
                color={data.color}
                key={presence.user}
                name={data.name || `User ${presence.user.slice(0, 4)}`}
                x={pos.x}
                y={pos.y}
              />
            );
          })}

        {contextMenu && (
          <TasksContextMenu
            contextMenu={contextMenu}
            onAddTask={addNewTask}
            onClose={closeContextMenu}
            onDeleteEdge={deleteEdge}
            onDeleteTask={deleteTask}
          />
        )}
      </div>
    </div>
  );
}
