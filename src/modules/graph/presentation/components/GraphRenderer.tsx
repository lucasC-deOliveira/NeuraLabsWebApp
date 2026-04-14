import { getNodeColors } from "@/modules/graph/presentation/services/graph-style.service";

export function GraphRenderer({
    nodes,
    edges,
    zoom,
    pan,
    isDark,
    onNodeClick,
    onNodeDragStart,
    onPanStart,
    onWheel,
    onNodeHover,
}: any) {
    return (
        <svg className="w-full h-full" onWheel={onWheel} onMouseDown={(e) => {
            if (e.target !== e.currentTarget) return;
            onPanStart(e.clientX, e.clientY);
        }}>
            <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>

                {edges.map((edge: any, i: number) => {
                    if (!edge?.sourceX || !edge?.targetX) return null;

                    return (
                        <line
                            key={`${edge.source}-${edge.target}-${i}`}
                            x1={edge.sourceX}
                            y1={edge.sourceY}
                            x2={edge.targetX}
                            y2={edge.targetY}
                            stroke="#999"
                        />
                    );
                })}

                {nodes.map((node: any) => {
                    const colors = getNodeColors(node.group, isDark);

                    return (
                        <g
                            key={node.id}
                            transform={`translate(${node.x},${node.y})`}
                            onMouseDown={(e) =>
                                onNodeDragStart(node.id, e.clientX, e.clientY)
                            }
                            onClick={() => onNodeClick(node)}
                            onMouseEnter={() => onNodeHover(node.id)}
                            onMouseLeave={() => onNodeHover(null)}

                        >
                            <rect
                                width={node.width}
                                height={node.height}
                                x={-node.width / 2}
                                y={-node.height / 2}
                                fill={colors.bg}
                                stroke={colors.border}
                            />
                            <text textAnchor="middle">{node.label}</text>
                        </g>
                    );
                })}
            </g>
        </svg>
    );
}