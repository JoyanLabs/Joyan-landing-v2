"use client";
import { useState, useEffect, useRef } from "react";
import { ArrowRight, Link, FlaskConical, LayoutTemplate, Cpu, TrendingUp, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TimelineItem {
  id: number;
  title: string;
  subtitle: string;
  content: string;
  category: string;
  icon: React.ElementType;
  relatedIds: number[];
  gradientFrom: string;
  gradientTo: string;
}

interface RadialOrbitalTimelineProps {
  timelineData?: TimelineItem[];
}

const defaultTimelineData: TimelineItem[] = [
  {
    id: 1,
    title: "Joyan Labs",
    subtitle: "Innovation & R&D Foundry",
    content: "Donde nace el futuro. Investigación y desarrollo de agentes de IA, métricas personalizadas y tecnología experimental.",
    category: "Innovation",
    icon: FlaskConical,
    relatedIds: [2, 3],
    gradientFrom: '#00F0FF',
    gradientTo: '#0091EA',
  },
  {
    id: 2,
    title: "Joyan EXP",
    subtitle: "Enterprise Experience",
    content: "El motor de tu eficiencia operativa. ERPs, CRMs, automatización de procesos y software a medida.",
    category: "Software",
    icon: LayoutTemplate,
    relatedIds: [1, 4],
    gradientFrom: '#6200EA',
    gradientTo: '#B388FF',
  },
  {
    id: 3,
    title: "Joyan IoT",
    subtitle: "Internet of Things",
    content: "Conectando tu realidad física al mundo digital. IIoT, sensorización avanzada y control de edificios inteligentes.",
    category: "Hardware",
    icon: Cpu,
    relatedIds: [1, 5],
    gradientFrom: '#FFB700',
    gradientTo: '#FFEA00',
  },
  {
    id: 4,
    title: "Joyan MKT",
    subtitle: "Digital Growth",
    content: "Marketing impulsado por datos. Estrategias B2B/B2C, analítica avanzada y minería de datos.",
    category: "Growth",
    icon: TrendingUp,
    relatedIds: [2],
    gradientFrom: '#FF0080',
    gradientTo: '#FF80AB',
  },
  {
    id: 5,
    title: "Joyan Sec",
    subtitle: "Cybersecurity",
    content: "Infraestructura resiliente. Ciberseguridad ofensiva/defensiva, redes seguras y gestión de vulnerabilidades.",
    category: "Security",
    icon: ShieldCheck,
    relatedIds: [3],
    gradientFrom: '#00FF94',
    gradientTo: '#00BFA5',
  },
];

export default function RadialOrbitalTimeline({
  timelineData = defaultTimelineData,
}: RadialOrbitalTimelineProps) {
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>(
    {}
  );
  const [viewMode, _setViewMode] = useState<"orbital">("orbital");
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);

  const [centerOffset, _setCenterOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === containerRef.current || e.target === orbitRef.current) {
      setExpandedItems({});
      setActiveNodeId(null);

      setAutoRotate(true);
    }
  };

  const toggleItem = (id: number) => {
    setExpandedItems((prev) => {
      const newState = { ...prev };
      Object.keys(newState).forEach((key) => {
        if (parseInt(key) !== id) {
          newState[parseInt(key)] = false;
        }
      });

      newState[id] = !prev[id];

      if (!prev[id]) {
        setActiveNodeId(id);
        setAutoRotate(false);



        centerViewOnNode(id);
      } else {
        setActiveNodeId(null);
        setAutoRotate(true);
      }

      return newState;
    });
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let animationFrameId: number;

    const animate = () => {
      setRotationAngle((prev) => {
        const newAngle = (prev + 0.1) % 360; // Even smoother rotation
        return Number(newAngle.toFixed(3));
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    if (autoRotate && viewMode === "orbital" && isVisible) {
      animationFrameId = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [autoRotate, viewMode, isVisible]);

  const centerViewOnNode = (nodeId: number) => {
    if (viewMode !== "orbital" || !nodeRefs.current[nodeId]) return;

    const nodeIndex = timelineData.findIndex((item) => item.id === nodeId);
    const totalNodes = timelineData.length;
    const targetAngle = (nodeIndex / totalNodes) * 360;

    setRotationAngle(270 - targetAngle);
  };

  const calculateNodePosition = (index: number, total: number) => {
    const angle = ((index / total) * 360 + rotationAngle) % 360;
    const radius = 250; // Increased radius
    const radian = (angle * Math.PI) / 180;

    const x = radius * Math.cos(radian) + centerOffset.x;
    const y = radius * Math.sin(radian) + centerOffset.y;

    const zIndex = Math.round(100 + 50 * Math.cos(radian));
    const opacity = Math.max(
      0.4,
      Math.min(1, 0.4 + 0.6 * ((1 + Math.sin(radian)) / 2))
    );

    return { x, y, angle, zIndex, opacity };
  };

  const getRelatedItems = (itemId: number): number[] => {
    const currentItem = timelineData.find((item) => item.id === itemId);
    return currentItem ? currentItem.relatedIds : [];
  };

  const isRelatedToActive = (itemId: number): boolean => {
    if (!activeNodeId) return false;
    const relatedItems = getRelatedItems(activeNodeId);
    return relatedItems.includes(itemId);
  };

  return (
    <div
      className="w-full h-[800px] flex flex-col items-center justify-center bg-transparent overflow-hidden relative"
      ref={containerRef}
      onClick={handleContainerClick}
    >
      <div className="relative w-full max-w-4xl h-full flex items-center justify-center">
        <div
          className="absolute w-full h-full flex items-center justify-center"
          ref={orbitRef}
          style={{
            perspective: "1000px",
            transform: `translate(${centerOffset.x}px, ${centerOffset.y}px)`,
          }}
        >
          {/* Central Hub */}
          <div className="absolute w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 via-cyan-500 to-purple-600 animate-pulse flex items-center justify-center z-10 shadow-[0_0_50px_rgba(59,130,246,0.5)]">
            <div className="absolute w-32 h-32 rounded-full border border-white/20 animate-ping opacity-30"></div>
            <div className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center">
               <span className="font-bold text-black text-xs">JOYAN</span>
            </div>
          </div>

          <div className="absolute w-[500px] h-[500px] rounded-full border border-white/5"></div>
          <div className="absolute w-[700px] h-[700px] rounded-full border border-white/5 border-dashed opacity-30"></div>

          {timelineData.map((item, index) => {
            const position = calculateNodePosition(index, timelineData.length);
            const isExpanded = expandedItems[item.id];
            const isRelated = isRelatedToActive(item.id);

            const Icon = item.icon;

            const nodeStyle = {
              transform: `translate(${position.x}px, ${position.y}px)`,
              zIndex: isExpanded ? 200 : position.zIndex,
              opacity: isExpanded ? 1 : position.opacity,
            };

            return (
              <div
                key={item.id}
                ref={(el) => {
                  if (el) nodeRefs.current[item.id] = el;
                }}
                className="absolute transition-all duration-700 cursor-pointer"
                style={nodeStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleItem(item.id);
                }}
              >
                {/* Node Glow Effect (Selected) */}
                {isExpanded && (
                  <div 
                    className="absolute inset-0 rounded-full blur-xl opacity-70 z-[-1]"
                    style={{
                      background: `linear-gradient(135deg, ${item.gradientFrom}, ${item.gradientTo})`,
                      transform: 'scale(1.5)'
                    }}
                  />
                )}

                {/* Node Icon */}
                <div
                  className={`
                  w-16 h-16 rounded-full flex items-center justify-center
                  ${
                    isExpanded
                      ? "text-white scale-125 shadow-[0_0_30px_rgba(255,255,255,0.8)]"
                      : isRelated
                      ? "bg-cyan-900/80 text-cyan-100 border-cyan-400 animate-pulse"
                      : "bg-transparent text-white backdrop-blur-md"
                  }
                  border-2 
                  ${
                    isExpanded
                      ? "border-white"
                      : isRelated
                      ? "border-cyan-400"
                      : "border-white/20 hover:border-white/60"
                  }
                  transition-all duration-500 transform
                  ${!isExpanded && "hover:scale-110 hover:brightness-125"}
                `}
                style={isExpanded ? {
                    background: `linear-gradient(135deg, ${item.gradientFrom}, ${item.gradientTo})`,
                    boxShadow: `0 0 30px ${item.gradientFrom}60`
                } : {}}
                >
                  <Icon size={24} />
                </div>

                {/* Label */}
                <div
                  className={`
                  absolute top-20 left-1/2 -translate-x-1/2 whitespace-nowrap
                  text-sm font-bold tracking-wider uppercase
                  transition-all duration-300
                  ${isExpanded ? "text-white scale-110" : "text-white/60"}
                `}
                >
                  {item.title}
                </div>

                {/* Expanded Card - Simplified Style */}
                {isExpanded && (
                  <div className="absolute top-28 left-1/2 -translate-x-1/2 w-[320px] h-[400px] z-50 group rounded-xl overflow-hidden backdrop-blur-xl bg-white/5 border border-white/10 shadow-2xl">
                    {/* Content */}
                    <div className="relative z-20 left-0 p-[20px_40px] text-white h-full flex flex-col justify-center">
                      <h3 className="text-2xl font-bold mb-4" style={{ color: item.gradientFrom }}>{item.title}</h3>
                      <p className="text-base leading-relaxed mb-6 text-gray-200">{item.content}</p>

                      {item.relatedIds.length > 0 && (
                        <div className="mt-auto pt-3 border-t border-white/10">
                          <div className="flex items-center mb-2">
                            <Link size={12} className="text-white/70 mr-1" />
                            <h4 className="text-xs uppercase tracking-wider font-medium text-white/70">
                              Sinergias
                            </h4>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {item.relatedIds.map((relatedId) => {
                              const relatedItem = timelineData.find(
                                (i) => i.id === relatedId
                              );
                              return (
                                <Button
                                  key={relatedId}
                                  variant="outline"
                                  size="sm"
                                  className="flex items-center h-6 px-2 py-0 text-xs rounded-md border-white/20 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleItem(relatedId);
                                  }}
                                >
                                  {relatedItem?.title}
                                  <ArrowRight
                                    size={10}
                                    className="ml-1 text-white/60"
                                  />
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
