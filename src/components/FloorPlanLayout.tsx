import React, { useState, useRef, useEffect } from "react";
import { GlassPanel } from "./AuraLayout";
import { Stage, Layer, Rect, Text as KonvaText, Group, Line } from "react-konva";
import { ChevronDown, Upload, Loader2, ImagePlus, Square, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Room } from "./floorplan/types";
import { FloorPlanSidebar } from "./floorplan/FloorPlanSidebar";

export const FloorPlanLayout: React.FC<{
  onSwitchApp: () => void;
}> = ({ onSwitchApp }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [stageScale, setStageScale] = useState(0.4);
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });
  const [editingDimension, setEditingDimension] = useState<{
    roomId: string;
    dimension: 'width' | 'height';
    value: string;
  } | null>(null);
  const [editingName, setEditingName] = useState<{
    roomId: string;
    value: string;
  } | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const direction = e.evt.deltaY < 0 ? 1 : -1;
    const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

    setStageScale(newScale);
    setStagePosition({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  };

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    try {
      const base64 = await toBase64(file);
      const res = await fetch("/api/extract-floor-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          imageBase64: base64.split(',')[1],
          mimeType: file.type 
        }),
      });

      const data = await res.json();
      if (data.rooms && Array.isArray(data.rooms)) {
        // Layout them nicely roughly in center
        let currentY = 50;
        let currentX = 50;
        const newRooms: Room[] = data.rooms.map((r: any) => {
          const room = {
            id: Math.random().toString(36).substr(2, 9),
            name: r.name || "房间",
            width: r.widthPixels || 200,
            height: r.heightPixels || 200,
            x: currentX,
            y: currentY,
            color: getRandomPastelColor(),
          };
          currentX += room.width + 20;
          if (currentX > stageSize.width - 200) {
            currentX = 50;
            currentY += Math.max(room.height, 200) + 20;
          }
          return room;
        });
        setRooms(prev => [...prev, ...newRooms]);
      }
    } catch (err) {
      console.error(err);
      alert("识别失败，请重试");
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const toBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const addRoom = () => {
    const defaultWidth = 1000;
    const defaultHeight = 1000;
    
    // Calculate the center of the current view port in stage coordinates
    const centerX = (stageSize.width / 2 - stagePosition.x) / stageScale;
    const centerY = (stageSize.height / 2 - stagePosition.y) / stageScale;

    setRooms([
      ...rooms,
      {
        id: Math.random().toString(36).substr(2, 9),
        name: "新房间 " + (rooms.length + 1),
        x: centerX - defaultWidth / 2,
        y: centerY - defaultHeight / 2,
        width: defaultWidth,
        height: defaultHeight,
        color: getRandomPastelColor(),
      }
    ]);
  };

  const updateRoom = (id: string, attrs: Partial<Room>) => {
    setRooms(prevRooms => prevRooms.map(r => r.id === id ? { ...r, ...attrs } : r));
  };

  const getRandomPastelColor = () => {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 85%)`;
  };

  const submitEditingDimension = () => {
    if (!editingDimension) return;
    const value = parseFloat(editingDimension.value);
    if (!isNaN(value) && value > 0) {
      const cmValue = value * 100;
      updateRoom(editingDimension.roomId, {
        [editingDimension.dimension]: cmValue
      });
    }
    setEditingDimension(null);
  };

  const renderDimensionInput = () => {
    if (!editingDimension) return null;
    const room = rooms.find(r => r.id === editingDimension.roomId);
    if (!room) return null;

    let left = 0;
    let top = 0;
    const inputWidth = 60;
    
    if (editingDimension.dimension === 'width') {
      left = stagePosition.x + (room.x + room.width / 2) * stageScale - inputWidth / 2;
      top = stagePosition.y + (room.y + room.height) * stageScale + 5;
    } else {
      left = stagePosition.x + room.x * stageScale - 5 - inputWidth;
      top = stagePosition.y + (room.y + room.height / 2) * stageScale - 10;
    }

    return (
      <input
        autoFocus
        type="text"
        className="absolute z-20 text-center bg-white border border-[#3E45C4] rounded outline-none shadow-md text-[#2D2A26] font-inter"
        style={{
          left: `${left}px`,
          top: `${top}px`,
          width: `${inputWidth}px`,
          fontSize: '12px',
          padding: '2px 4px',
        }}
        value={editingDimension.value}
        onChange={(e) => setEditingDimension({ ...editingDimension, value: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            submitEditingDimension();
          } else if (e.key === 'Escape') {
            setEditingDimension(null);
          }
        }}
        onBlur={submitEditingDimension}
      />
    );
  };

  const submitEditingName = () => {
    if (!editingName) return;
    if (editingName.value.trim().length > 0) {
      updateRoom(editingName.roomId, {
        name: editingName.value.trim()
      });
    }
    setEditingName(null);
  };

  const renderNameInput = () => {
    if (!editingName) return null;
    const room = rooms.find(r => r.id === editingName.roomId);
    if (!room) return null;

    const inputWidth = 120;
    const left = stagePosition.x + (room.x + room.width / 2) * stageScale - inputWidth / 2;
    const top = stagePosition.y + (room.y + room.height / 2) * stageScale - 14;

    return (
      <input
        autoFocus
        type="text"
        className="absolute z-20 text-center bg-white border border-[#3E45C4] rounded outline-none shadow-md text-[#2D2A26] font-inter font-bold"
        style={{
          left: `${left}px`,
          top: `${top}px`,
          width: `${inputWidth}px`,
          fontSize: '16px',
          padding: '2px 4px',
        }}
        value={editingName.value}
        onChange={(e) => setEditingName({ ...editingName, value: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            submitEditingName();
          } else if (e.key === 'Escape') {
            setEditingName(null);
          }
        }}
        onBlur={submitEditingName}
      />
    );
  };

  const getFusedGroups = () => {
    const groups: Room[][] = [];
    const visited = new Set<string>();

    const isIntersecting = (r1: Room, r2: Room) => {
      // Use math to check if two rects intersect
      // They interact if they genuinely overlap
      return !(
        r1.x >= r2.x + r2.width ||
        r1.x + r1.width <= r2.x ||
        r1.y >= r2.y + r2.height ||
        r1.y + r1.height <= r2.y
      );
    };

    rooms.forEach(room => {
      if (visited.has(room.id)) return;
      if (room.id === activeRoomId) return; // exclude active room from background graph

      const currentGroup: Room[] = [];
      const queue = [room];
      visited.add(room.id);

      while (queue.length > 0) {
        const curr = queue.shift()!;
        currentGroup.push(curr);

        rooms.forEach(other => {
          if (!visited.has(other.id) && other.id !== activeRoomId) {
            if (isIntersecting(curr, other)) {
              visited.add(other.id);
              queue.push(other);
            }
          }
        });
      }
      groups.push(currentGroup);
    });

    return groups;
  };

  const fusedGroups = getFusedGroups();

  return (
    <div className="absolute inset-0 flex flex-col md:flex-row w-full bg-[#FDFBF7]">
      <FloorPlanSidebar
        rooms={rooms}
        isExtracting={isExtracting}
        onSwitchApp={onSwitchApp}
        addRoom={addRoom}
        handleImageUpload={handleImageUpload}
        updateRoom={updateRoom}
        setRooms={setRooms}
        fileInputRef={fileInputRef}
      />

      {/* Right Canvas */}
      <div className="flex-1 min-h-0 w-full relative z-10 bg-[#eaeaeb] overflow-hidden" ref={containerRef}>
        {/* Draw a subtle grid background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
            backgroundImage: "radial-gradient(#2D2A26 1px, transparent 1px)",
            backgroundSize: "20px 20px"
        }} />

        {renderDimensionInput()}
        {renderNameInput()}
        {stageSize.width > 0 && stageSize.height > 0 && (
          <Stage 
            width={stageSize.width} 
            height={stageSize.height}
            scaleX={stageScale}
            scaleY={stageScale}
            x={stagePosition.x}
            y={stagePosition.y}
            onWheel={handleWheel}
            draggable
            onMouseDown={(e) => {
              if (e.target === e.target.getStage()) {
                if (editingDimension) setEditingDimension(null);
                if (editingName) setEditingName(null);
              }
            }}
            onDragEnd={(e) => {
              if (e.target === e.target.getStage()) {
                setStagePosition({
                  x: e.target.x(),
                  y: e.target.y()
                });
              }
            }}
          >
            <Layer>
              {/* Background Fused Graph */}
              <Group listening={false}>
                {/* Layer 1: Shadows */}
                {fusedGroups.map((group, idx) => (
                  <Group key={`shadows-${idx}`}>
                    {group.map(room => (
                      <Rect
                        key={room.id}
                        x={room.x}
                        y={room.y}
                        width={room.width}
                        height={room.height}
                        cornerRadius={4}
                        fill="#FFFFFF"
                        shadowColor="rgba(0,0,0,0.1)"
                        shadowBlur={10}
                        shadowOffset={{ x: 0, y: 5 }}
                      />
                    ))}
                  </Group>
                ))}
                {/* Layer 2: Strokes */}
                {fusedGroups.map((group, idx) => (
                  <Group key={`strokes-${idx}`}>
                    {group.map(room => (
                      <Rect
                        key={room.id}
                        x={room.x}
                        y={room.y}
                        width={room.width}
                        height={room.height}
                        cornerRadius={4}
                        stroke="#2D2A26"
                        strokeWidth={4}
                      />
                    ))}
                  </Group>
                ))}
                {/* Layer 3: Fills */}
                {fusedGroups.map((group, idx) => {
                  const mainRoom = group.reduce((p, c) => (p.width * p.height > c.width * c.height) ? p : c);
                  return (
                    <Group key={`fills-${idx}`}>
                      {group.map(room => (
                        <Rect
                          key={room.id}
                          x={room.x}
                          y={room.y}
                          width={room.width}
                          height={room.height}
                          cornerRadius={4}
                          fill={mainRoom.color}
                        />
                      ))}
                    </Group>
                  );
                })}
              </Group>

              {/* Foreground Rooms (Bodies) */}
              {rooms.map((room) => (
              <Group
                key={`body-${room.id}`}
                x={room.x}
                y={room.y}
                draggable
                onDragStart={(e) => {
                  e.cancelBubble = true;
                  setActiveRoomId(room.id);
                }}
                onDragMove={(e) => {
                  e.cancelBubble = true;
                  const node = e.target;
                  let newX = node.x();
                  let newY = node.y();

                  const snapThresholdX = room.width * 0.05;
                  const snapThresholdY = room.height * 0.05;

                  let snappedX = newX;
                  let minDiffX = snapThresholdX;

                  let snappedY = newY;
                  let minDiffY = snapThresholdY;

                  rooms.forEach(otherRoom => {
                    if (otherRoom.id === room.id) return;

                    const left = newX;
                    const right = newX + room.width;
                    const top = newY;
                    const bottom = newY + room.height;

                    const oLeft = otherRoom.x;
                    const oRight = otherRoom.x + otherRoom.width;
                    const oTop = otherRoom.y;
                    const oBottom = otherRoom.y + otherRoom.height;

                    [ { draggedX: left,   offset: 0 },
                      { draggedX: right,  offset: -room.width }
                    ].forEach(({ draggedX, offset }) => {
                       [ oLeft, oRight ].forEach(targetX => {
                          const diff = Math.abs(draggedX - targetX);
                          if (diff < minDiffX) {
                             minDiffX = diff;
                             snappedX = targetX + offset;
                          }
                       });
                    });

                    [ { draggedY: top,    offset: 0 },
                      { draggedY: bottom, offset: -room.height }
                    ].forEach(({ draggedY, offset }) => {
                       [ oTop, oBottom ].forEach(targetY => {
                          const diff = Math.abs(draggedY - targetY);
                          if (diff < minDiffY) {
                             minDiffY = diff;
                             snappedY = targetY + offset;
                          }
                       });
                    });
                  });

                  node.x(snappedX);
                  node.y(snappedY);
                  // Update room state during drag so text/handles follow along perfectly
                  updateRoom(room.id, {
                    x: snappedX,
                    y: snappedY
                  });
                }}
                onDragEnd={(e) => {
                  e.cancelBubble = true;
                  updateRoom(room.id, {
                    x: e.target.x(),
                    y: e.target.y()
                  });
                  setActiveRoomId(null);
                }}
              >
                <Rect
                  width={room.width}
                  height={room.height}
                  fill={room.id === activeRoomId ? room.color : "transparent"}
                  stroke={room.id === activeRoomId ? "#2D2A26" : "transparent"}
                  strokeWidth={2}
                  cornerRadius={4}
                  shadowColor={room.id === activeRoomId ? "rgba(0,0,0,0.1)" : "transparent"}
                  shadowBlur={10}
                  shadowOffset={{ x: 0, y: 5 }}
                />
                
                {(!editingName || editingName.roomId !== room.id) && (
                  <KonvaText
                    text={room.name}
                    width={room.width}
                    height={room.height}
                    align="center"
                    verticalAlign="middle"
                    fontSize={16 / stageScale}
                    fontFamily="Inter, sans-serif"
                    fontStyle="bold"
                    fill="#2D2A26"
                    onClick={(e) => {
                      e.cancelBubble = true;
                      setEditingName({ roomId: room.id, value: '' });
                    }}
                    onTap={(e) => {
                      e.cancelBubble = true;
                      setEditingName({ roomId: room.id, value: '' });
                    }}
                  />
                )}
                
                {/* Dimensions labels */}
                {(!editingDimension || editingDimension.roomId !== room.id || editingDimension.dimension !== 'width') && (
                  <KonvaText
                    text={`${(room.width / 100).toFixed(1)}m`}
                    x={0}
                    y={room.height + 5 / stageScale}
                    width={room.width}
                    align="center"
                    fontSize={12 / stageScale}
                    fontFamily="Inter, sans-serif"
                    fill="#8E8A82"
                    onClick={(e) => {
                      e.cancelBubble = true;
                      setEditingDimension({ roomId: room.id, dimension: 'width', value: '' });
                    }}
                    onTap={(e) => {
                      e.cancelBubble = true;
                      setEditingDimension({ roomId: room.id, dimension: 'width', value: '' });
                    }}
                  />
                )}
                {(!editingDimension || editingDimension.roomId !== room.id || editingDimension.dimension !== 'height') && (
                  <KonvaText
                    text={`${(room.height / 100).toFixed(1)}m`}
                    x={-(100 / stageScale)}
                    y={room.height / 2 - (6 / stageScale)}
                    width={95 / stageScale}
                    align="right"
                    fontSize={12 / stageScale}
                    fontFamily="Inter, sans-serif"
                    fill="#8E8A82"
                    onClick={(e) => {
                      e.cancelBubble = true;
                      setEditingDimension({ roomId: room.id, dimension: 'height', value: '' });
                    }}
                    onTap={(e) => {
                      e.cancelBubble = true;
                      setEditingDimension({ roomId: room.id, dimension: 'height', value: '' });
                    }}
                  />
                )}

              </Group>
             ))}

             {/* Foreground Decorations (Resize Handles) */}
             {rooms.map((room) => (
              <Group
                key={`decos-${room.id}`}
                x={room.x}
                y={room.y}
              >
                {/* Resize Handle (bottom right) */}
                <Rect
                  x={room.width - 15 / stageScale}
                  y={room.height - 15 / stageScale}
                  width={15 / stageScale}
                  height={15 / stageScale}
                  fill="rgba(0,0,0,0.1)"
                  draggable
                  onDragStart={(e) => {
                    e.cancelBubble = true;
                    setActiveRoomId(room.id);
                  }}
                  onDragMove={(e) => {
                    e.cancelBubble = true;
                    const handleSize = 15 / stageScale;
                    let newWidth = Math.max(50, e.target.x() + handleSize);
                    let newHeight = Math.max(50, e.target.y() + handleSize);

                    const snapThresholdX = Math.max(10 / stageScale, newWidth * 0.05);
                    const snapThresholdY = Math.max(10 / stageScale, newHeight * 0.05);

                    let snappedWidth = newWidth;
                    let minDiffX = snapThresholdX;

                    let snappedHeight = newHeight;
                    let minDiffY = snapThresholdY;

                    const rightEdge = room.x + newWidth;
                    const bottomEdge = room.y + newHeight;

                    rooms.forEach(otherRoom => {
                      if (otherRoom.id === room.id) return;
                      
                      const oLeft = otherRoom.x;
                      const oRight = otherRoom.x + otherRoom.width;
                      const oTop = otherRoom.y;
                      const oBottom = otherRoom.y + otherRoom.height;

                      [oLeft, oRight].forEach(targetX => {
                        const diff = Math.abs(rightEdge - targetX);
                        if (diff < minDiffX) {
                          minDiffX = diff;
                          snappedWidth = targetX - room.x;
                        }
                      });

                      [oTop, oBottom].forEach(targetY => {
                        const diff = Math.abs(bottomEdge - targetY);
                        if (diff < minDiffY) {
                          minDiffY = diff;
                          snappedHeight = targetY - room.y;
                        }
                      });
                    });

                    snappedWidth = Math.max(50, snappedWidth);
                    snappedHeight = Math.max(50, snappedHeight);

                    updateRoom(room.id, {
                      width: snappedWidth,
                      height: snappedHeight
                    });

                    // Lock handle to bottom right
                    e.target.position({ x: snappedWidth - handleSize, y: snappedHeight - handleSize });
                  }}
                  onDragEnd={(e) => {
                    e.cancelBubble = true;
                    setActiveRoomId(null);
                  }}
                />
              </Group>
            ))}
            </Layer>
          </Stage>
        )}

        {rooms.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-[#8E8A82] font-medium opacity-60">请在左侧上传或添加房间模块以开始规划布置</p>
          </div>
        )}
      </div>
    </div>
  );
};
