
import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { generateImage, editImage, Resolution, AspectRatio } from '../services/geminiService';
import { GeneratedImage } from '../types';
import { Button } from './ui/Button';
import { RainbowButton } from './ui/RainbowButton';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Download, Sparkles, Image as ImageIcon, Plus, X, Settings2, Ratio, ZoomIn, CheckCircle2, Clock, Ban, AlertCircle, History, Eye, Pencil, ChevronRight, Trash2 } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { cn } from '../lib/utils';
import { AlertDialog } from './ui/AlertDialog';

// --- Image Compression Helper ---
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        const MAX_DIMENSION = 1536;
        
        if (width > height) {
          if (width > MAX_DIMENSION) {
            height *= MAX_DIMENSION / width;
            width = MAX_DIMENSION;
          }
        } else {
          if (height > MAX_DIMENSION) {
            width *= MAX_DIMENSION / height;
            height = MAX_DIMENSION;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Canvas context failed"));
          return;
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      };
      img.onerror = (e) => reject(e);
    };
    reader.onerror = (e) => reject(e);
  });
};

// --- IndexedDB Helpers ---
const IDB_NAME = 'NanoBananaDB';
const IDB_STORE = 'history';
const IDB_VERSION = 3; 

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
  });
};

const getHistoryFromDB = async (): Promise<GeneratedImage[]> => {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get('recent');
      req.onsuccess = () => {
        const result = req.result || [];
        if (Array.isArray(result) && result.length > 0 && typeof result[0] === 'string') {
           const migrated = result.map((url: string) => ({
             url,
             prompt: 'Legacy Image',
             timestamp: Date.now()
           }));
           resolve(migrated);
        } else {
           resolve(result);
        }
      };
      req.onerror = (e) => {
        console.warn("IDB Read Failed", e);
        resolve([]);
      };
    });
  } catch (e) {
    return [];
  }
};

const saveHistoryToDB = async (items: GeneratedImage[]) => {
  try {
    const db = await initDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(items, 'recent');
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(tx.error);
    });
  } catch (e) {
    console.warn("IDB Save Critical Error", e);
  }
};

interface UploadedImage {
  url: string;
  size: string;
}

// --- MEMOIZED COMPONENTS (Performance Optimization) ---

// 1. Result Display Component
const ResultDisplay = memo(({ 
  image, 
  loading, 
  t, 
  onPreview, 
  onDownload
}: { 
  image: GeneratedImage | null, 
  loading: boolean, 
  t: (k:string)=>string, 
  onPreview: (img: GeneratedImage)=>void, 
  onDownload: (e:any, url:string)=>void
}) => {
  const acrylicBtn = "relative flex items-center gap-2 bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/10 text-white font-medium transition-all duration-200 shadow-sm whitespace-nowrap min-w-fit";

  return (
    <CardContent className="flex-1 flex items-center justify-center p-6 relative min-h-[200px]">
      {loading ? (
        <div className="flex flex-col items-center justify-center w-full min-h-[400px]">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-zinc-400 animate-pulse">{t('loadingState')}</p>
        </div>
      ) : image ? (
        <div 
          className="relative group w-full h-full flex items-center justify-center cursor-zoom-in rounded-lg overflow-hidden"
          onClick={() => onPreview(image)}
        >
            <img 
              src={image.url} 
              alt={image.prompt} 
              decoding="async"
              className="max-w-full max-h-[600px] rounded-lg shadow-2xl object-contain z-0 transform-gpu transition-transform duration-300"
            />
            
            <div className="absolute top-4 right-4 hidden md:group-hover:flex gap-2 z-20" onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={(e) => onDownload(e, image.url)} 
                className={cn(acrylicBtn, "px-5 py-2 rounded-full")}
              >
                <Download className="w-4 h-4" />
                <span className="text-sm font-medium">{t('download')}</span>
              </button>
            </div>
            
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <ZoomIn className="w-12 h-12 text-white opacity-0 md:group-hover:opacity-100 transition-all duration-150 drop-shadow-2xl transform scale-50 group-hover:scale-100" />
            </div>
        </div>
      ) : (
        <div className="text-center text-zinc-600">
          <div className="w-20 h-20 mx-auto mb-4 border-2 border-dashed border-zinc-800 rounded-full flex items-center justify-center">
            <Sparkles className="w-8 h-8 opacity-20" />
          </div>
          <p>{t('emptyState')}</p>
        </div>
      )}
    </CardContent>
  );
});

// 2. History List Component
const HistoryList = memo(({ 
  history, 
  t, 
  onPreview, 
  onDownload,
  onEdit,
  onClear,
  onDelete
}: { 
  history: GeneratedImage[], 
  t: (k:string)=>string, 
  onPreview: (img: GeneratedImage)=>void, 
  onDownload: (e:any, url:string)=>void,
  onEdit: (e:any, img:GeneratedImage)=>void,
  onClear: () => void,
  onDelete: (e:any, img:GeneratedImage)=>void
}) => {
  if (history.length === 0) return null;

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString(undefined, {
       year: 'numeric', month: '2-digit', day: '2-digit',
       hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 will-change-[opacity,transform]">
      <div className="flex items-center gap-2 mb-4 px-1">
        <History className="w-5 h-5 text-zinc-400" />
        <h3 className="text-lg font-medium text-zinc-200">{t('historyTitle')}</h3>
        <span className="text-xs text-zinc-500 ml-2 border-l border-zinc-700 pl-3">{t('historyDesc')}</span>
        
        <button 
          onClick={onClear}
          className="ml-auto p-2 hover:bg-red-900/20 text-zinc-500 hover:text-red-400 rounded-full transition-colors"
          title={t('clearHistory')}
        >
           <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {history.map((histImg, index) => (
          <div 
            key={index} 
            className="group relative aspect-square rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900 cursor-pointer hover:border-zinc-600 transition-colors"
            onClick={() => onPreview(histImg)}
          >
              <img 
                src={histImg.url} 
                alt={histImg.prompt} 
                loading="lazy" 
                decoding="async"
                className="w-full h-full object-cover" 
              />
              
              {/* Delete Button (Top Right) */}
              <button 
                onClick={(e) => onDelete(e, histImg)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500/80 text-white opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-red-600 transition-all z-20 shadow-sm backdrop-blur-sm"
                title={t('deleteRecordTitle')}
              >
                <Trash2 className="w-3 h-3" />
              </button>
              
              {/* Bottom bar: Timestamp (Left) and Actions (Right) */}
              <div className="absolute bottom-0 right-0 left-0 bg-gradient-to-t from-black via-black/80 to-transparent p-2 pt-6 flex items-end justify-between">
                 <span className="text-[10px] text-zinc-300 font-mono tracking-tighter font-bold drop-shadow-md">
                    {formatDate(histImg.timestamp)}
                 </span>

                 <div className="flex items-center gap-1">
                    {/* Edit Button: Always visible */}
                    <button 
                        className="p-1.5 rounded-full bg-black/40 text-zinc-200 hover:bg-black/70 hover:text-white border border-transparent hover:border-zinc-700 transition-all"
                        onClick={(e) => onEdit(e, histImg)}
                        title={t('edit')}
                    >
                        <Pencil className="w-3 h-3" />
                    </button>
                    {/* Download Button: Desktop Only */}
                    <button 
                        className="p-1.5 rounded-full bg-black/40 text-zinc-200 hover:bg-black/70 hover:text-white border border-transparent hover:border-zinc-700 transition-all hidden md:flex"
                        onClick={(e) => onDownload(e, histImg.url)}
                        title={t('download')}
                    >
                        <Download className="w-3 h-3" />
                    </button>
                 </div>
              </div>
          </div>
        ))}
      </div>
    </div>
  );
});

// 3. Upload List Component
const UploadList = memo(({
  images,
  t,
  onRemove,
  onUploadClick,
  fileInputRef
}: {
  images: UploadedImage[],
  t: (k:string)=>string,
  onRemove: (idx:number)=>void,
  onUploadClick: ()=>void,
  fileInputRef: React.RefObject<HTMLInputElement | null>
}) => {
  return (
    <div className="flex gap-2 flex-wrap">
        {images.map((img, idx) => (
        <div key={idx} className="relative w-20 h-20 group border border-zinc-800 rounded bg-zinc-950">
            <img src={img.url} alt={`Reference ${idx}`} className="w-full h-full object-cover rounded" decoding="async" />
            <button 
            onClick={() => onRemove(idx)}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
            >
            <X className="w-3 h-3" />
            </button>
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-[1px] text-[8px] text-zinc-200 text-center py-0.5 rounded-b">
              {img.size}
            </div>
        </div>
        ))}
        
        {images.length < 2 && (
        <div 
            className="w-20 h-20 border border-dashed border-zinc-700 rounded bg-zinc-950/50 flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-900 transition-colors text-zinc-500 hover:text-zinc-300"
            onClick={onUploadClick}
        >
            <Plus className="w-5 h-5 mb-1" />
            <span className="text-[9px]">{t('wfUpload')}</span>
            <span className="text-[8px] mt-0.5 text-zinc-600">{t('uploadLimitText')}</span>
        </div>
        )}
    </div>
  );
});


// --- MAIN COMPONENT ---
export const TextGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  // 'image' is the current result being shown
  const [image, setImage] = useState<GeneratedImage | null>(null);
  
  // 'previewImage' is for the fullscreen modal
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null);
  
  const [history, setHistory] = useState<GeneratedImage[]>([]);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  
  const [resolution, setResolution] = useState<Resolution>('1K');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Edit Mode States
  const [isEditSidebarOpen, setIsEditSidebarOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<GeneratedImage | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  // Dialog State
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<GeneratedImage | null>(null);
  
  const [showToast, setShowToast] = useState(false);
  const [showGenSuccessToast, setShowGenSuccessToast] = useState(false);
  const [showEditSuccessToast, setShowEditSuccessToast] = useState(false);
  const [showWarningToast, setShowWarningToast] = useState(false);
  const [warningMsg, setWarningMsg] = useState('');
  const [showErrorToast, setShowErrorToast] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  // Optimized Scroll Lock including Sidebar and Dialog
  useEffect(() => {
    if (previewImage || isEditSidebarOpen || showClearDialog || showDeleteDialog) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [previewImage, isEditSidebarOpen, showClearDialog, showDeleteDialog]);

  const attemptCloseSidebar = useCallback(() => {
    if (isEditing) {
      setWarningMsg(t('waitEditCompletion'));
      setShowWarningToast(true);
      setTimeout(() => {
          setShowWarningToast(false);
          setWarningMsg('');
      }, 5000);
    } else {
      setIsEditSidebarOpen(false);
    }
  }, [isEditing, t]);

  // Handle ESC key to close sidebar/modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditSidebarOpen) {
            attemptCloseSidebar();
        }
        else if (previewImage) setPreviewImage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditSidebarOpen, previewImage, attemptCloseSidebar]);

  useEffect(() => {
    try {
      if (localStorage.getItem('history') || localStorage.getItem('recent')) {
        localStorage.removeItem('history');
        localStorage.removeItem('recent');
      }
    } catch (e) {}

    const load = async () => {
      const savedItems = await getHistoryFromDB();
      if (savedItems && savedItems.length > 0) {
        setHistory(savedItems.slice(0, 10));
      }
      setIsHistoryLoaded(true);
    };
    load();
  }, []);

  useEffect(() => {
    if (isHistoryLoaded) {
      saveHistoryToDB(history);
    }
  }, [history, isHistoryLoaded]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (loading) {
      timer = setTimeout(() => {
        setShowWarningToast(true);
        setTimeout(() => setShowWarningToast(false), 5000);
      }, 30000);
    } else {
      setShowWarningToast(false);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setShowErrorToast(false);
    
    try {
      const imagesToUse = uploadedImages.map(img => img.url);
      const url = await generateImage(prompt, imagesToUse, resolution, aspectRatio);
      
      const newImage: GeneratedImage = {
        url,
        prompt,
        timestamp: Date.now()
      };

      setImage(newImage);
      
      setHistory(prev => {
        const newHistory = [newImage, ...prev];
        return newHistory.slice(0, 10);
      });

      setShowGenSuccessToast(true);
      setTimeout(() => setShowGenSuccessToast(false), 5000);

    } catch (err: any) {
      const errorMessage = err.message || t('errorGen');
      setError(errorMessage);
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 5000);
    } finally {
      setLoading(false);
    }
  };

  const executeEdit = async () => {
    if (!editPrompt.trim() || !editingImage) return;

    setIsEditing(true); 
    setError(null);
    
    try {
      const newImageUrl = await editImage(editPrompt, editingImage.url);
      
      const newImage: GeneratedImage = {
        url: newImageUrl,
        prompt: `Edit: ${editPrompt}`,
        timestamp: Date.now()
      };

      // 1. Reset Main Page State (Inputs and Result)
      setPrompt('');
      setResolution('1K');
      setAspectRatio('1:1');
      setUploadedImages([]);
      setImage(null); 
      // Clear edit prompt after success
      setEditPrompt('');

      // 2. Update History
      setHistory(prev => [newImage, ...prev].slice(0, 10));
      
      // 3. Update Edit Sidebar to show new image as target for continuous editing
      setEditingImage(newImage);
      
      // 4. Update Fullscreen Preview if it happens to be open on the image we just edited
      if (previewImage) {
        setPreviewImage(newImage);
      }

      setShowEditSuccessToast(true);
      setTimeout(() => setShowEditSuccessToast(false), 5000);

    } catch (err: any) {
      const errorMessage = err.message || t('errorGen');
      setError(errorMessage);
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 5000);
    } finally {
      setIsEditing(false);
    }
  };

  // Keyboard Shortcuts: Ctrl+Enter (Cmd+Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (isEditSidebarOpen) {
           if (editPrompt.trim() && editingImage && !isEditing) {
             executeEdit();
           }
        } else {
           if (prompt.trim() && !loading) {
             handleGenerate();
           }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditSidebarOpen, prompt, editPrompt, editingImage, isEditing, loading, resolution, aspectRatio, uploadedImages]);


  const handleEdit = useCallback((e: React.MouseEvent, img: GeneratedImage) => {
    e.stopPropagation();
    setEditingImage(img);
    setEditPrompt(''); // Clear edit prompt every time
    setIsEditSidebarOpen(true);
  }, []);

  const handleDownload = useCallback((e: React.MouseEvent, imgUrl?: string) => {
    e.stopPropagation();
    const urlToDownload = imgUrl || previewImage?.url || image?.url;
    if (urlToDownload) {
      const link = document.createElement('a');
      link.href = urlToDownload;
      link.download = `nano-banana-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    }
  }, [previewImage, image]);

  const handlePreview = useCallback((img: GeneratedImage) => {
    setPreviewImage(img);
  }, []);

  const handleRemoveImage = useCallback((index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Open Dialog
  const handleClearClick = () => {
    setShowClearDialog(true);
  };

  // Perform Clear
  const confirmClearHistory = async () => {
      setHistory([]);
      try {
        const db = await initDB();
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).clear();
      } catch (e) {
        console.error("Failed to clear DB", e);
      }
  };
  
  // Single Deletion Logic
  const handleDeleteClick = useCallback((e: React.MouseEvent, img: GeneratedImage) => {
      e.stopPropagation();
      setImageToDelete(img);
      setShowDeleteDialog(true);
  }, []);

  const confirmDelete = async () => {
      if (!imageToDelete) return;
      setHistory(prev => prev.filter(item => item.timestamp !== imageToDelete.timestamp));
      setImageToDelete(null);
      // DB sync happens in useEffect automatically
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (uploadedImages.length >= 2) return;

    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    const remainingSlots = 2 - uploadedImages.length;
    const filesToProcess = files.slice(0, remainingSlots);
    
    const processedResults: UploadedImage[] = [];

    for (const file of filesToProcess) {
      if (file.size > 10 * 1024 * 1024) {
        setError(t('fileTooLarge'));
        setShowErrorToast(true);
        setTimeout(() => setShowErrorToast(false), 5000);
        continue;
      }

      try {
        const compressedDataUrl = await compressImage(file);
        
        const base64Content = compressedDataUrl.split(',')[1];
        const binaryString = atob(base64Content);
        const sizeBytes = binaryString.length;

        processedResults.push({
          url: compressedDataUrl,
          size: formatSize(sizeBytes)
        });
      } catch (err) {
        console.error("Image compression error", err);
        setError("Image processing failed");
        setShowErrorToast(true);
        setTimeout(() => setShowErrorToast(false), 5000);
      }
    }

    if (processedResults.length > 0) {
      setUploadedImages(prev => {
         const combined = [...prev, ...processedResults];
         return combined.slice(0, 2);
      });
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const ratios: { value: AspectRatio; label: string; class: string }[] = [
    { value: '1:1', label: '1:1', class: 'w-4 h-4' },
    { value: '3:4', label: '3:4', class: 'w-3 h-4' },
    { value: '4:3', label: '4:3', class: 'w-4 h-3' },
    { value: '9:16', label: '9:16', class: 'w-[9px] h-4' },
    { value: '16:9', label: '16:9', class: 'w-4 h-[9px]' },
    { value: '21:9', label: '21:9', class: 'w-5 h-[9px]' },
  ];

  const acrylicBtn = "relative flex items-center gap-2 bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/10 text-white font-medium transition-all duration-200 shadow-sm whitespace-nowrap min-w-fit";

  return (
    <div className="flex flex-col gap-8 pb-12 relative">
      {/* Custom Alert Dialog for Clear All */}
      <AlertDialog 
        open={showClearDialog} 
        onOpenChange={setShowClearDialog}
        onConfirm={confirmClearHistory}
        title={t('clearHistory')}
        description={t('confirmClear')}
        cancelText={t('cancel')}
        confirmText={t('confirm')}
      />
      
      {/* Custom Alert Dialog for Delete Single */}
      <AlertDialog 
        open={showDeleteDialog} 
        onOpenChange={setShowDeleteDialog}
        onConfirm={confirmDelete}
        title={t('deleteRecordTitle')}
        description={t('confirmDeleteRecord')}
        cancelText={t('cancel')}
        confirmText={t('confirm')}
      />

      {/* Sidebar for Editing */}
      <div 
        className={cn(
          "fixed inset-y-0 right-0 bg-zinc-950 border-l border-zinc-800 shadow-2xl z-[200] transform transition-transform duration-300 ease-in-out flex flex-col",
          isEditSidebarOpen ? "translate-x-0" : "translate-x-full",
          "w-full sm:w-96 md:w-[420px]"
        )}
      >
        <div className="flex items-center justify-between p-6 pb-4 shrink-0">
            <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-purple-400" />
                {t('editTitle')}
            </h2>
            <button 
                onClick={attemptCloseSidebar}
                className="p-4 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"
                aria-label="Close"
            >
                <X className="w-5 h-5" />
            </button>
        </div>
        
        {editingImage && (
            <div className="flex flex-col gap-6 flex-1 overflow-y-auto p-6 pt-0">
                <div className="relative w-full max-w-[220px] mx-auto aspect-square rounded-lg overflow-hidden border border-zinc-800 shrink-0">
                    <img src={editingImage.url} alt="Target" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="bg-black/60 px-3 py-1 rounded-full text-xs text-white backdrop-blur-md border border-white/10">{t('originalImage')}</span>
                    </div>
                </div>
                
                <div className="space-y-2 md:flex-1 flex flex-col">
                    <label className="text-sm font-medium text-zinc-300">{t('promptTitle')}</label>
                    <textarea 
                        value={editPrompt}
                        onChange={(e) => setEditPrompt(e.target.value)}
                        placeholder={t('editPromptPlaceholder')}
                        className="w-full h-24 md:h-full p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-base md:text-sm focus:ring-1 focus:ring-purple-500 resize-none"
                        autoFocus={false}
                    />
                </div>
                
                <Button 
                    variant="magic" 
                    className="w-full shrink-0 mb-4"
                    onClick={executeEdit}
                    disabled={!editPrompt.trim()}
                    isLoading={isEditing}
                    loadingText={t('editing')}
                >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {t('startEdit')}
                </Button>
            </div>
        )}
      </div>

      {/* Sidebar Backdrop - Close on click */}
      {isEditSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[190] animate-in fade-in duration-300"
            onClick={attemptCloseSidebar}
          />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Toasts - z-index updated to 300 to be above sidebar */}
        {showToast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] bg-zinc-800 text-white px-4 py-2 rounded-full shadow-lg border border-zinc-700 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">{t('downloadSuccess')}</span>
          </div>
        )}

        {showGenSuccessToast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] bg-zinc-800 text-white px-4 py-2 rounded-full shadow-lg border border-green-500/50 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-sm font-medium text-green-100">{t('genSuccess')}</span>
          </div>
        )}
        
        {showEditSuccessToast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] bg-zinc-800 text-white px-4 py-2 rounded-full shadow-lg border border-green-500/50 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-sm font-medium text-green-100">{t('editSuccess')}</span>
          </div>
        )}

        {showErrorToast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] bg-zinc-800 text-white px-4 py-2 rounded-full shadow-lg border border-red-500/50 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium text-red-100">{error || t('genErrorToast')}</span>
          </div>
        )}

        {showWarningToast && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[300] bg-zinc-800 text-white px-4 py-2 rounded-full shadow-lg border border-yellow-500/50 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <Clock className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-yellow-100">{warningMsg || t('serverBusy')}</span>
          </div>
        )}

        {/* Full Screen Preview Modal */}
        {previewImage && (
          <div 
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-100 will-change-opacity"
            onClick={() => {
                if(!isEditSidebarOpen) setPreviewImage(null);
            }}
          >
            <div className="relative max-w-full max-h-full flex flex-col items-center">
              <img 
                src={previewImage.url} 
                alt="Full Preview" 
                decoding="async"
                className="max-w-full max-h-[85vh] object-contain rounded-lg z-0 transition-all duration-700"
                onClick={(e) => e.stopPropagation()}
              />
              
              {!isEditSidebarOpen && (
                <button 
                    onClick={() => setPreviewImage(null)}
                    className="absolute top-4 right-4 text-zinc-400 hover:text-white bg-black/50 hover:bg-black/80 border border-white/5 p-2.5 rounded-full transition-colors z-20"
                >
                    <X className="w-6 h-6" />
                </button>
              )}
              
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4">
                {/* Edit Button: Bottom Center */}
                <button 
                    onClick={(e) => handleEdit(e, previewImage)} 
                    className={cn(acrylicBtn, "px-6 py-2.5 md:px-8 md:py-3 rounded-full hover:bg-purple-900/40 hover:border-purple-500/50")}
                    disabled={isEditing || isEditSidebarOpen}
                >
                    <Pencil className="w-4 h-4 md:w-5 md:h-5" />
                    <span className="font-medium tracking-wide text-sm md:text-base">{t('edit')}</span>
                </button>

                {/* Download Button: Hidden on mobile */}
                <button 
                  onClick={(e) => handleDownload(e, previewImage.url)} 
                  className={cn(acrylicBtn, "px-6 py-2.5 md:px-8 md:py-3 rounded-full hidden md:flex")}
                >
                  <Download className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="font-medium tracking-wide text-sm md:text-base">{t('download')}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6 h-full flex flex-col">
          {/* Input Card */}
          <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur flex-1 flex flex-col">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                {t('promptTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t('promptPlaceholder')}
                className="w-full min-h-[120px] p-4 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:ring-0 focus:border-zinc-700 resize-none transition-colors"
              />

              <div className="flex flex-col gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                      <label className="text-xs font-medium flex items-center gap-2 text-zinc-400">
                          <ImageIcon className="w-3 h-3" /> {t('uploadTitle')}
                      </label>
                  </div>
                  
                  <UploadList 
                    images={uploadedImages} 
                    t={t} 
                    onRemove={handleRemoveImage} 
                    onUploadClick={handleUploadClick}
                    fileInputRef={fileInputRef}
                  />
                  
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    multiple
                    onChange={handleFileChange} 
                  />
                </div>

                <div className="h-px bg-zinc-800 w-full" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400 flex items-center gap-2">
                      <Settings2 className="w-3 h-3" /> {t('resolutionTitle')}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {['1K', '2K', '4K'].map((res) => {
                        return (
                        <button
                          key={res}
                          onClick={() => setResolution(res as Resolution)}
                          className={cn(
                            "py-2 px-1 rounded text-xs font-medium border transition-colors",
                            resolution === res 
                              ? "bg-zinc-800 border-primary text-white shadow-sm" 
                              : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:bg-zinc-900"
                          )}
                        >
                          {res}
                        </button>
                      )})}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400 flex items-center gap-2">
                      <Ratio className="w-3 h-3" /> {t('aspectRatioTitle')}
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {ratios.map((r) => (
                        <button
                          key={r.value}
                          onClick={() => setAspectRatio(r.value)}
                          className={cn(
                            "flex flex-col items-center justify-center gap-1 p-1.5 rounded transition-colors aspect-square",
                            aspectRatio === r.value 
                              ? "bg-zinc-800 text-white ring-1 ring-primary" 
                              : "bg-zinc-950 border border-zinc-800 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-900"
                          )}
                          title={r.label}
                        >
                          <div className={cn("border border-current rounded-[1px]", r.class)} />
                          <span className="text-[8px] font-medium leading-none">{r.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="pt-2">
                  <RainbowButton 
                    onClick={handleGenerate} 
                    isLoading={loading}
                    loadingText={t('generating')}
                    disabled={!prompt.trim() || loading}
                    className="w-full h-12 rounded-xl"
                  >
                    {t('generateBtn')}
                  </RainbowButton>
                </div>
              </div>

              {error && (
                <div className="p-3 text-sm text-red-400 bg-red-900/20 border border-red-900/50 rounded mt-2 break-words">
                  {error}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="h-full">
          <Card className="h-full border-zinc-800 bg-zinc-900/50 backdrop-blur flex flex-col">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-blue-400" />
                {t('resultTitle')}
              </CardTitle>
            </CardHeader>
            {/* Memoized Result Display */}
            <ResultDisplay 
              image={image} 
              loading={loading} 
              t={t} 
              onPreview={handlePreview} 
              onDownload={handleDownload}
            />
          </Card>
        </div>
      </div>

      {/* History Section - Memoized */}
      <HistoryList 
        history={history} 
        t={t} 
        onPreview={handlePreview} 
        onDownload={handleDownload}
        onEdit={handleEdit}
        onClear={handleClearClick}
        onDelete={handleDeleteClick}
      />
    </div>
  );
};
