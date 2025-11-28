import React, { useCallback, useState, useRef, useEffect } from 'react';
import ReactFlow, {
  addEdge,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  Handle,
  Position,
  NodeProps,
  ReactFlowInstance,
} from 'reactflow';
import { generateImage, Resolution, AspectRatio } from '../services/geminiService';
import { Button } from './ui/Button';
import { Download, Play, Zap, AlertCircle, X, Plus, Wand2, ZoomIn, CheckCircle2, Clock } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { clsx } from 'clsx';

// --- Custom Node Components ---

const PromptNode: React.FC<NodeProps> = ({ data }) => {
  const { t } = useLanguage();
  return (
    <div className="bg-zinc-900 border-2 border-yellow-600/50 rounded-lg shadow-xl min-w-[250px]">
      <div className="bg-zinc-800 p-2 rounded-t-lg border-b border-zinc-700 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-yellow-500" />
        <span className="text-sm font-bold text-zinc-200">{t('wfPromptNode')}</span>
      </div>
      <div className="p-4">
        <textarea
          className="w-full bg-zinc-950 text-zinc-200 text-xs p-2 rounded border border-zinc-700 resize-none h-20 nodrag"
          placeholder={t('wfPromptPlaceholder')}
          value={data.prompt}
          onChange={(evt) => data.onChange(evt.target.value)}
        />
      </div>
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-yellow-500" />
    </div>
  );
};

const ImageNode: React.FC<NodeProps> = ({ data }) => {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const images = data.images || []; 

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Replace with new image (Single Limit)
        const newImages = [reader.result as string];
        data.onChange(newImages);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
     const newImages = images.filter((_: string, i: number) => i !== index);
     data.onChange(newImages);
  };

  return (
    <div className="bg-zinc-900 border-2 border-green-600/50 rounded-lg shadow-xl min-w-[200px]">
       <div className="bg-zinc-800 p-2 rounded-t-lg border-b border-zinc-700 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-green-500" />
        <span className="text-sm font-bold text-zinc-200">{t('wfImageNode')}</span>
      </div>
      <div className="p-3 flex flex-wrap gap-2 justify-center">
        {images.map((img: string, idx: number) => (
            <div key={idx} className="relative w-16 h-16 group border border-zinc-800 rounded bg-zinc-950 shrink-0">
                <img src={img} alt={`Ref ${idx}`} className="w-full h-full object-cover rounded" />
                <button 
                    onClick={() => removeImage(idx)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                >
                    <X className="w-3 h-3" />
                </button>
            </div>
        ))}

        {images.length < 1 && (
            <div 
                className="w-16 h-16 border border-dashed border-zinc-700 rounded bg-zinc-950/50 flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-900 transition-colors shrink-0"
                onClick={() => fileInputRef.current?.click()}
            >
                <Plus className="w-5 h-5 text-zinc-500" />
                <span className="text-[9px] mt-1">{t('wfUpload')}</span>
            </div>
        )}
        
        <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileChange} 
        />
      </div>
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-green-500" />
    </div>
  );
};

const RefineNode: React.FC<NodeProps> = ({ data, id }) => {
  const { t } = useLanguage();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (data.loading) {
      timer = setTimeout(() => {
         if (data.onWarning) data.onWarning();
      }, 30000);
    }
    return () => clearTimeout(timer);
  }, [data.loading, data.onWarning]);

  return (
    <div className={clsx(
        "bg-zinc-900 border-2 rounded-lg shadow-xl w-[320px] transition-colors animate-in zoom-in duration-300",
        data.error ? "border-red-500" : "border-teal-600/50"
      )}>
      {/* Input from OutputNode (Top) */}
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-blue-500" id="image-in" />
      
      <div className="bg-zinc-800 p-2 rounded-t-lg border-b border-zinc-700 flex items-center gap-2">
        <Wand2 className="w-4 h-4 text-teal-400" />
        <span className="text-sm font-bold text-zinc-200">{t('wfRefineNode')}</span>
      </div>
      
      <div className="p-4 flex flex-col gap-3">
        {data.outputImage && (
             <div 
                className="w-full h-64 rounded bg-black/50 border border-zinc-800 mb-2 overflow-hidden group relative cursor-zoom-in"
                onClick={() => data.onPreview && data.onPreview(data.outputImage)}
             >
                <img src={data.outputImage} className="w-full h-full object-contain" alt="Refined" />
                <div className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-md hover:bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => data.onDownload(data.outputImage)}
                      className="block"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                </div>
                 <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                    <ZoomIn className="w-6 h-6 text-white drop-shadow-md" />
                </div>
             </div>
        )}
        
        <textarea
          className="w-full bg-zinc-950 text-zinc-200 text-xs p-2 rounded border border-zinc-700 resize-none h-16 nodrag"
          placeholder={t('wfRefinePlaceholder')}
          value={data.prompt}
          onChange={(evt) => data.onChange(evt.target.value)}
        />

        {data.error && (
          <div className="text-[10px] text-red-300 bg-red-950/50 p-2 rounded border border-red-900/50 flex items-start gap-1">
             <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
             <span className="break-words w-full font-mono">{data.error}</span>
          </div>
        )}

        <Button 
          variant="magic" 
          size="sm" 
          className="w-full mt-1" 
          onClick={() => data.onRunRefine(id)}
          isLoading={data.loading}
        >
          <Play className="w-3 h-3 mr-1" /> {t('wfRun')}
        </Button>
      </div>
    </div>
  );
};

const GeneratorNode: React.FC<NodeProps> = ({ data }) => {
  const { t } = useLanguage();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (data.loading) {
      timer = setTimeout(() => {
         if (data.onWarning) data.onWarning();
      }, 30000);
    }
    return () => clearTimeout(timer);
  }, [data.loading, data.onWarning]);

  const ratios: { value: AspectRatio; label: string; class: string }[] = [
    { value: '1:1', label: '1:1', class: 'w-3 h-3' },
    { value: '2:3', label: '2:3', class: 'w-2 h-3' },
    { value: '3:4', label: '3:4', class: 'w-2.5 h-3' },
    { value: '4:3', label: '4:3', class: 'w-3 h-2.5' },
    { value: '9:16', label: '9:16', class: 'w-2 h-3.5' },
    { value: '16:9', label: '16:9', class: 'w-3.5 h-2' },
  ];

  return (
    <div className={clsx(
      "bg-zinc-900 border-2 rounded-lg shadow-xl min-w-[260px] transition-colors",
      data.error ? "border-red-500" : "border-purple-600/50"
    )}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-yellow-500" style={{ top: '20%' }} id="prompt-in" />
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-green-500" style={{ top: '50%' }} id="image-in" />
      
      <div className={clsx(
        "p-2 rounded-t-lg border-b border-zinc-700 flex items-center gap-2",
        data.error ? "bg-red-900/30" : "bg-zinc-800"
      )}>
        <Zap className={clsx("w-4 h-4", data.error ? "text-red-400" : "text-purple-500")} />
        <span className="text-sm font-bold text-zinc-200">{t('wfEngineNode')}</span>
      </div>
      <div className="p-4 flex flex-col gap-3">
        <p className="text-[10px] text-zinc-400 uppercase tracking-wider">{t('wfModelLabel')}</p>
        
        <select 
          value={data.resolution} 
          onChange={(e) => data.onResolutionChange(e.target.value)}
          className="w-full p-1.5 text-xs bg-zinc-950 border border-zinc-700 rounded text-zinc-300 nodrag focus:ring-1 focus:ring-purple-500 outline-none"
        >
          <option value="1K">{t('res1k')}</option>
          <option value="2K">{t('res2k')}</option>
          <option value="4K">{t('res4k')}</option>
        </select>

        <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded border border-zinc-700 nodrag">
          {ratios.map((r) => (
            <button
              key={r.value}
              onClick={() => data.onAspectRatioChange(r.value)}
              className={clsx(
                "flex flex-col items-center justify-center p-1 rounded transition-all",
                data.aspectRatio === r.value 
                  ? "bg-zinc-800 text-white ring-1 ring-purple-500" 
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
              )}
              title={r.label}
            >
              <div className={clsx("border border-current rounded-[1px]", r.class)} />
              <span className="text-[8px] mt-0.5">{r.label}</span>
            </button>
          ))}
        </div>
        
        {data.error && (
          <div className="text-[10px] text-red-300 bg-red-950/50 p-2 rounded border border-red-900/50 flex items-start gap-1">
             <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
             <span className="break-words w-full font-mono">{data.error}</span>
          </div>
        )}

        <Button 
          variant="magic" 
          size="sm" 
          className="w-full mt-1" 
          onClick={data.onRun}
          isLoading={data.loading}
        >
          <Play className="w-3 h-3 mr-1" /> {t('wfRun')}
        </Button>
      </div>
      
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-purple-500" style={{ top: '50%' }} id="gen-out-main" />
    </div>
  );
};

const OutputNode: React.FC<NodeProps> = ({ data }) => {
  const { t } = useLanguage();
  
  return (
    <div className={clsx("bg-zinc-900 border-2 border-blue-600/50 rounded-lg shadow-xl w-[320px] animate-in zoom-in duration-300")}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-purple-500" id="in" />
      
      <div className="bg-zinc-800 p-2 rounded-t-lg border-b border-zinc-700 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-blue-500" />
        <span className="text-sm font-bold text-zinc-200">{t('wfOutputNode')}</span>
      </div>
      <div className="p-3 flex items-center justify-center min-h-[200px]">
        {data.image ? (
          <div 
            className="relative group w-full h-64 bg-black/50 rounded overflow-hidden border border-zinc-800 cursor-zoom-in"
            onClick={() => data.onPreview && data.onPreview(data.image)}
          >
            <img src={data.image} alt="Generated" className="w-full h-full object-contain" />
            <div className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-md hover:bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={(e) => e.stopPropagation()}>
                <button 
                  onClick={() => data.onDownload(data.image)}
                  className="block"
                >
                  <Download className="w-4 h-4" />
                </button>
            </div>
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 pointer-events-none">
                <ZoomIn className="w-8 h-8 text-white drop-shadow-lg" />
            </div>
          </div>
        ) : (
          <span className="text-xs text-zinc-500 italic">{t('wfWaiting')}</span>
        )}
      </div>
      
      {/* Source Handle for Refine Node (Bottom) */}
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500" id="out" />
    </div>
  );
};

const nodeTypes = {
  promptNode: PromptNode,
  imageNode: ImageNode,
  generatorNode: GeneratorNode,
  refineNode: RefineNode,
  outputNode: OutputNode,
};

// --- Main Workflow Component ---

interface WorkflowEditorProps {
  isVisible: boolean;
}

export const WorkflowEditor: React.FC<WorkflowEditorProps> = ({ isVisible }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([
    { 
      id: '1', 
      type: 'promptNode', 
      position: { x: 50, y: 150 }, 
      data: { prompt: '', onChange: (v: string) => updateNodeData('1', { prompt: v }) } 
    },
    { 
      id: 'img-1', 
      type: 'imageNode', 
      position: { x: 50, y: 400 }, 
      data: { images: [], onChange: (v: string[]) => updateNodeData('img-1', { images: v }) } 
    },
    { 
      id: '2', 
      type: 'generatorNode', 
      position: { x: 400, y: 250 }, 
      data: { 
        loading: false, 
        resolution: '1K', 
        aspectRatio: '1:1', 
        error: null,
      } 
    },
    { 
      id: '3', 
      type: 'outputNode', 
      position: { x: 750, y: 100 }, 
      data: { image: null } 
    },
  ]);

  const [edges, setEdges, onEdgesChange] = useEdgesState([
    { id: 'e1-2', source: '1', target: '2', targetHandle: 'prompt-in', animated: true, style: { stroke: '#eab308' } },
    { id: 'eImg-2', source: 'img-1', target: '2', targetHandle: 'image-in', animated: true, style: { stroke: '#22c55e' } },
    { id: 'e2-3', source: '2', target: '3', sourceHandle: 'gen-out-main', targetHandle: 'in', animated: true, style: { stroke: '#a855f7' } },
  ]);

  const { t } = useLanguage();
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [opacity, setOpacity] = useState(0);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [warningToast, setWarningToast] = useState(false);

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);

  // Scroll Lock Effect
  useEffect(() => {
    if (previewImage) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [previewImage]);

  // Enhanced fitView logic
  useEffect(() => {
    if (isVisible && rfInstance) {
      requestAnimationFrame(() => {
        rfInstance.fitView({ padding: 0.1, duration: 0 });
        requestAnimationFrame(() => {
             rfInstance.fitView({ padding: 0.1, duration: 0 });
             setOpacity(1);
        });
      });
    } else {
      setOpacity(0);
    }
  }, [isVisible, rfInstance]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const updateNodeData = (id: string, newData: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, ...newData } };
        }
        return node;
      })
    );
  };

  const handlePreview = (url: string) => {
    setPreviewImage(url);
  };

  const handleDownload = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `workflow-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  }

  const handleWarning = useCallback(() => {
    setWarningToast(true);
    setTimeout(() => setWarningToast(false), 4000);
  }, []);

  const runGenerator = async () => {
    const currentNodes = nodesRef.current;
    const currentEdges = edgesRef.current;

    const generatorNode = currentNodes.find((n: Node) => n.type === 'generatorNode');
    if (!generatorNode) return;

    const connectedEdges = currentEdges.filter((e: Edge) => e.target === generatorNode.id);
    
    let prompt = "";
    let inputImages: string[] = [];

    connectedEdges.forEach((edge: Edge) => {
        const sourceNode = currentNodes.find((n: Node) => n.id === edge.source);
        if (!sourceNode) return;
        
        if (sourceNode.type === 'promptNode') {
            prompt = sourceNode.data.prompt;
        } else if (sourceNode.type === 'imageNode' && sourceNode.data.images) {
            inputImages = [...inputImages, ...sourceNode.data.images];
        }
    });

    if (!prompt) {
        updateNodeData(generatorNode.id, { error: "No prompt provided" });
        return;
    }

    updateNodeData(generatorNode.id, { loading: true, error: null });

    try {
      const { resolution, aspectRatio } = generatorNode.data;
      // Limit images to 1 (only take the first one)
      const limitedImages = inputImages.slice(0, 1);
      
      const result = await generateImage(prompt, limitedImages, resolution as Resolution, aspectRatio as AspectRatio);
      
      // Update main output
      const outputEdges = currentEdges.filter((e: Edge) => e.source === generatorNode.id);
      outputEdges.forEach((edge: Edge) => {
          const targetNode = currentNodes.find((n: Node) => n.id === edge.target);
          if (targetNode) {
               if(targetNode.type === 'outputNode') {
                   // Save settings for Refine Node
                   updateNodeData(targetNode.id, { image: result, resolution, aspectRatio });
               }
          }
      });
      
      updateNodeData(generatorNode.id, { outputImage: result });

      // Create Refine Node if it doesn't exist
      const refineNodeExists = currentNodes.some((n: Node) => n.id === 'refine-1');
      if (!refineNodeExists) {
         const newRefineNode = {
            id: 'refine-1',
            type: 'refineNode',
            // Position below the Output Node
            position: { x: 750, y: 550 }, 
            data: {
                prompt: '',
                loading: false,
                error: null,
                outputImage: null,
                onChange: (v: string) => updateNodeData('refine-1', { prompt: v }),
                onRunRefine: runRefineLogic,
                onPreview: handlePreview,
                onDownload: handleDownload,
                onWarning: handleWarning
            }
         };

         // Connect Output Node (Source) to Refine Node (Target)
         const newEdge1 = { id: 'e3-refine', source: '3', target: 'refine-1', sourceHandle: 'out', targetHandle: 'image-in', animated: true, style: { stroke: '#3b82f6' } };

         setNodes((nds) => [...nds, newRefineNode]);
         setEdges((eds) => [...eds, newEdge1]);
      }

    } catch (error: any) {
      updateNodeData(generatorNode.id, { error: error.message || "Generation failed" });
    } finally {
      updateNodeData(generatorNode.id, { loading: false });
    }
  };

  const runRefineLogic = async (nodeId: string) => {
      const currentNodes = nodesRef.current;
      const currentEdges = edgesRef.current;
      
      updateNodeData(nodeId, { loading: true, error: null });

      try {
          const node = currentNodes.find((n: Node) => n.id === nodeId);
          if (!node) return;

          const prompt = node.data.prompt;
          if (!prompt) throw new Error("Prompt required");

          // Find input connected to Refine Node (should be OutputNode)
          const inputEdge = currentEdges.find((e: Edge) => e.target === nodeId);
          if (!inputEdge) throw new Error("No input image connected");

          const sourceNode = currentNodes.find((n: Node) => n.id === inputEdge.source);
          if (!sourceNode) throw new Error("Source node not found");

          let inputImageBase64: string | null = null;
          let inheritedResolution: Resolution = '1K';
          let inheritedAspectRatio: AspectRatio = '1:1';
          
          if (sourceNode.type === 'outputNode') {
              inputImageBase64 = sourceNode.data.image;
              if (sourceNode.data.resolution) inheritedResolution = sourceNode.data.resolution;
              if (sourceNode.data.aspectRatio) inheritedAspectRatio = sourceNode.data.aspectRatio;
          }

          if (!inputImageBase64) throw new Error("No image data from source. Run generator first.");

          const result = await generateImage(prompt, [inputImageBase64], inheritedResolution, inheritedAspectRatio);

          updateNodeData(nodeId, { outputImage: result });

      } catch (error: any) {
          updateNodeData(nodeId, { error: error.message });
      } finally {
          updateNodeData(nodeId, { loading: false });
      }
  };

  useEffect(() => {
    setNodes(nds => nds.map(n => {
        if(n.type === 'generatorNode') {
            return { ...n, data: { ...n.data, onRun: runGenerator, onWarning: handleWarning, onResolutionChange: (v:string)=>updateNodeData(n.id, {resolution:v}), onAspectRatioChange: (v:string)=>updateNodeData(n.id, {aspectRatio:v}) } }
        }
        if(n.type === 'refineNode') {
            return { ...n, data: { ...n.data, onRunRefine: runRefineLogic, onWarning: handleWarning, onChange: (v:string)=>updateNodeData(n.id, {prompt:v}), onPreview: handlePreview, onDownload: handleDownload } }
        }
        if(n.type === 'outputNode') {
            return { ...n, data: { ...n.data, onPreview: handlePreview, onDownload: handleDownload } }
        }
        return n;
    }));
  }, [nodes.length, handleWarning]); 

  return (
    <div className="h-[650px] w-full border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950 relative">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[150] bg-zinc-800 text-white px-4 py-2 rounded-full shadow-lg border border-zinc-700 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium">{t('downloadSuccess')}</span>
        </div>
      )}

      {/* Warning Toast */}
      {warningToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[150] bg-zinc-800 text-white px-4 py-2 rounded-full shadow-lg border border-yellow-500/50 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium text-yellow-100">{t('serverBusy')}</span>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onInit={setRfInstance}
        proOptions={{ hideAttribution: true }}
        className={clsx("bg-zinc-950 transition-opacity duration-500", opacity === 1 ? "opacity-100" : "opacity-0")}
      >
        <Background color="#333" gap={16} />
        <Controls />
        <MiniMap 
            className="bg-zinc-900 border-zinc-800" 
            style={{ height: 50, width: 70 }}
            nodeColor={(n) => {
                if (n.type === 'promptNode') return '#eab308';
                if (n.type === 'imageNode') return '#22c55e';
                if (n.type === 'generatorNode') return '#a855f7';
                if (n.type === 'refineNode') return '#0d9488';
                return '#3b82f6';
        }} />
        
        <div className="absolute top-4 left-4 z-10 bg-zinc-900/80 backdrop-blur p-3 rounded border border-zinc-800">
            <h3 className="text-sm font-bold text-zinc-200">{t('wfModeTitle')}</h3>
            <p className="text-xs text-zinc-500">{t('wfModeDesc')}</p>
        </div>
      </ReactFlow>

      {/* Workflow Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-full max-h-full flex flex-col items-center">
            <img 
              src={previewImage} 
              alt="Workflow Preview" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" 
              onClick={(e) => e.stopPropagation()}
            />
            <button 
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-2 bg-black/20 hover:bg-black/50 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(previewImage);
                }}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white px-6 py-3 rounded-full transition-all shadow-xl hover:scale-105 active:scale-95"
              >
                 <Download className="w-5 h-5" />
                 <span className="font-medium">{t('download')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};