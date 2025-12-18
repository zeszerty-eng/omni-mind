import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Image, Music, Video, File, Sparkles, ZoomIn, ZoomOut, Maximize2, Link2 } from 'lucide-react';

interface CanvasNode {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  tags?: string[];
}

interface CanvasRelation {
  sourceId: string;
  targetId: string;
  type: string;
  strength: number;
}

interface SpatialCanvasProps {
  nodes: CanvasNode[];
  relations?: CanvasRelation[];
  onNodeClick?: (nodeId: string) => void;
  onNodeMove?: (nodeId: string, x: number, y: number) => void;
}

const getNodeIcon = (type: string) => {
  if (type.startsWith('image/')) return Image;
  if (type.startsWith('audio/')) return Music;
  if (type.startsWith('video/')) return Video;
  if (type.includes('pdf')) return FileText;
  return File;
};

const getNodeColor = (type: string): string => {
  if (type.startsWith('image/')) return 'from-pink-500 to-orange-500';
  if (type.startsWith('audio/')) return 'from-green-500 to-emerald-500';
  if (type.startsWith('video/')) return 'from-purple-500 to-blue-500';
  if (type.includes('pdf')) return 'from-red-500 to-rose-500';
  return 'from-primary to-accent';
};

export const SpatialCanvas = ({ nodes, relations = [], onNodeClick, onNodeMove }: SpatialCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});

  // Initialize node positions
  useEffect(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    const centerX = 400;
    const centerY = 300;
    const radius = 200;

    nodes.forEach((node, index) => {
      if (!nodePositions[node.id]) {
        const angle = (index / nodes.length) * 2 * Math.PI;
        positions[node.id] = {
          x: node.x || centerX + Math.cos(angle) * radius,
          y: node.y || centerY + Math.sin(angle) * radius,
        };
      } else {
        positions[node.id] = nodePositions[node.id];
      }
    });

    setNodePositions(positions);
  }, [nodes.length]);

  const handleZoomIn = () => setScale(s => Math.min(s + 0.2, 2));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.2, 0.5));
  const handleReset = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).classList.contains('canvas-bg')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
    if (draggingNode) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left - offset.x) / scale;
        const y = (e.clientY - rect.top - offset.y) / scale;
        setNodePositions(prev => ({
          ...prev,
          [draggingNode]: { x, y }
        }));
      }
    }
  };

  const handleCanvasMouseUp = () => {
    if (draggingNode && onNodeMove) {
      const pos = nodePositions[draggingNode];
      if (pos) {
        onNodeMove(draggingNode, pos.x, pos.y);
      }
    }
    setIsDragging(false);
    setDraggingNode(null);
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setDraggingNode(nodeId);
    setSelectedNode(nodeId);
  };

  // Find related nodes for the selected node
  const selectedNodeRelations = relations.filter(
    r => r.sourceId === selectedNode || r.targetId === selectedNode
  );

  return (
    <div className="relative w-full h-[600px] glass rounded-2xl overflow-hidden">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleZoomIn}
          className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
        >
          <ZoomIn className="w-5 h-5 text-foreground" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleZoomOut}
          className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
        >
          <ZoomOut className="w-5 h-5 text-foreground" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleReset}
          className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
        >
          <Maximize2 className="w-5 h-5 text-foreground" />
        </motion.button>
      </div>

      {/* Scale indicator */}
      <div className="absolute bottom-4 left-4 z-20 px-3 py-1 rounded-lg bg-secondary/80 text-sm text-muted-foreground">
        {Math.round(scale * 100)}%
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing canvas-bg"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
      >
        {/* Grid Background */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-border" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Transformed Content */}
        <div
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: '0 0',
          }}
          className="absolute inset-0"
        >
          {/* Relations (Lines) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {relations.map((relation, index) => {
              const source = nodePositions[relation.sourceId];
              const target = nodePositions[relation.targetId];
              if (!source || !target) return null;

              const isHighlighted = selectedNode === relation.sourceId || selectedNode === relation.targetId;

              return (
                <g key={`${relation.sourceId}-${relation.targetId}-${index}`}>
                  <line
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke={isHighlighted ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
                    strokeWidth={isHighlighted ? 2 : 1}
                    strokeOpacity={relation.strength}
                    strokeDasharray={relation.type === 'similar_to' ? '5,5' : undefined}
                  />
                  {/* Connection indicator */}
                  <circle
                    cx={(source.x + target.x) / 2}
                    cy={(source.y + target.y) / 2}
                    r={4}
                    fill={isHighlighted ? 'hsl(var(--primary))' : 'hsl(var(--muted))'}
                  />
                </g>
              );
            })}
          </svg>

          {/* Nodes */}
          {nodes.map((node) => {
            const Icon = getNodeIcon(node.type);
            const gradient = getNodeColor(node.type);
            const position = nodePositions[node.id] || { x: 400, y: 300 };
            const isSelected = selectedNode === node.id;
            const isRelated = selectedNodeRelations.some(
              r => r.sourceId === node.id || r.targetId === node.id
            );

            return (
              <motion.div
                key={node.id}
                className="absolute cursor-pointer"
                style={{
                  left: position.x - 40,
                  top: position.y - 40,
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                  scale: 1, 
                  opacity: 1,
                  boxShadow: isSelected 
                    ? '0 0 30px hsl(var(--primary) / 0.5)' 
                    : isRelated 
                      ? '0 0 20px hsl(var(--primary) / 0.3)' 
                      : 'none'
                }}
                whileHover={{ scale: 1.1 }}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                onClick={() => onNodeClick?.(node.id)}
              >
                <div className={`
                  relative w-20 h-20 rounded-2xl flex flex-col items-center justify-center
                  bg-gradient-to-br ${gradient}
                  ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
                  transition-all duration-200
                `}>
                  {/* Glow effect */}
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${gradient} blur-xl opacity-50`} />
                  
                  <Icon className="w-8 h-8 text-white relative z-10" />
                  
                  {/* AI indicator */}
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-background flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-primary" />
                  </div>
                </div>

                {/* Label */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 rounded-md bg-background/90 backdrop-blur-sm border border-border max-w-[120px]">
                  <p className="text-xs text-foreground font-medium truncate text-center">
                    {node.name}
                  </p>
                  {node.tags && node.tags.length > 0 && (
                    <p className="text-xs text-muted-foreground truncate text-center">
                      {node.tags[0]}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Link2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-foreground mb-2">Canvas Spatial</h4>
            <p className="text-muted-foreground max-w-sm">
              Ajoutez des fichiers pour voir leurs relations apparaître ici
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
