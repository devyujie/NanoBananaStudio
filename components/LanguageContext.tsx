
import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'zh' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  zh: {
    appTitle: "Nano Banana Studio",
    navTitle: "Nano Banana Studio",
    heroTitle: "光速创造",
    heroTitleHighlight: "艺术",
    heroDesc: "体验下一代 AI 图像生成技术，基于 Gemini 3 Pro + Nano Banana Pro 构建。",
    heroSubDesc: "支持配置分辨率、宽高比，本地存储历史生成记录，支持局部微调改图。",
    footer: "Nano Banana Studio.",
    authorBy: "Power by",
    lastUpdated: "最近更新：",
    
    // Text Generator
    promptTitle: "提示词输入",
    promptPlaceholder: "输入你的提示词...",
    generateBtn: "生成图像",
    generating: "生成中...",
    resultTitle: "生成结果",
    loadingState: "正在编织像素...",
    emptyState: "你的作品将显示在这里",
    download: "下载",
    downloadSuccess: "下载成功",
    genSuccess: "图像生成成功！",
    editSuccess: "修改成功！",
    errorGen: "生成失败，请重试。",
    genErrorToast: "出错啦，请尝试重新生成。",
    fileTooLarge: "图片大小不能超过 10MB",
    uploadTitle: "参考图片 (最多2张)",
    uploadPlaceholder: "点击或拖拽上传图片",
    uploadLimitText: "最大 10MB",
    wfUpload: "上传",
    removeImage: "移除图片",
    resolutionTitle: "分辨率 / 画质",
    aspectRatioTitle: "宽高比",
    res1k: "1K 分辨率",
    res2k: "2K 分辨率",
    res4k: "4K 分辨率",
    serverBusy: "马上就好，稍等一会哦~",
    notAvailableIn4K: "4K 模式下不支持参考图",
    
    fullscreen: "全屏",
    exitFullscreen: "退出全屏",
    
    // Edit Mode
    edit: "修改",
    editTitle: "图片微调",
    editPromptPlaceholder: "描述你想如何修改这张图片...",
    startEdit: "开始修改",
    editing: "修改中...",
    originalImage: "原图",
    
    // History
    historyTitle: "最近生成记录",
    historyDesc: "保留最近 10 张生成结果",
    viewHistory: "查看",
    clearHistory: "清除记录",
    confirmClear: "确定要清除所有历史记录吗？",
    historyCleared: "历史记录已清除",
    deleteRecordTitle: "删除记录",
    confirmDeleteRecord: "确定要删除此历史记录吗？",
    
    // Dialog
    cancel: "取消",
    confirm: "确认",
  },
  en: {
    appTitle: "Nano Banana Studio",
    navTitle: "Nano Banana Studio",
    heroTitle: "Create Art at the Speed of",
    heroTitleHighlight: "Light",
    heroDesc: "Experience the next generation of AI image generation. Powered by Gemini 3 Pro + Nano Banana Pro.",
    heroSubDesc: "Supports resolution & aspect ratio config, local history storage, and local fine-tuning.",
    footer: "Nano Banana Studio.",
    authorBy: "Power by",
    lastUpdated: "Last Updated: ",
    
    // Text Generator
    promptTitle: "Prompt Input",
    promptPlaceholder: "Enter your prompt...",
    generateBtn: "Generate Image",
    generating: "Generating...",
    resultTitle: "Result",
    loadingState: "Dreaming pixels...",
    emptyState: "Your creation will appear here",
    download: "Download",
    downloadSuccess: "Download Successful",
    genSuccess: "Image generated successfully!",
    editSuccess: "Modification Successful!",
    errorGen: "Failed to generate image. Please try again.",
    genErrorToast: "Something went wrong. Please try again.",
    fileTooLarge: "Image size cannot exceed 10MB",
    uploadTitle: "Reference Images (Max 2)",
    uploadPlaceholder: "Click or drag to upload image",
    uploadLimitText: "Max 10MB",
    wfUpload: "Upload",
    removeImage: "Remove Image",
    resolutionTitle: "Resolution / Quality",
    aspectRatioTitle: "Aspect Ratio",
    res1k: "1K Resolution",
    res2k: "2K Resolution",
    res4k: "4K Resolution",
    serverBusy: "Almost done, just a moment...",
    notAvailableIn4K: "Ref images not supported in 4K",

    fullscreen: "Fullscreen",
    exitFullscreen: "Exit Fullscreen",
    
    // Edit Mode
    edit: "Modify",
    editTitle: "Fine-tune Image",
    editPromptPlaceholder: "Describe how you want to modify this image...",
    startEdit: "Start Modifying",
    editing: "Modifying...",
    originalImage: "Original",
    
    // History
    historyTitle: "Recent History",
    historyDesc: "Last 10 generations kept locally",
    viewHistory: "View",
    clearHistory: "Clear History",
    confirmClear: "Are you sure you want to clear all history?",
    historyCleared: "History cleared",
    deleteRecordTitle: "Delete Record",
    confirmDeleteRecord: "Are you sure you want to delete this history record?",

    // Dialog
    cancel: "Cancel",
    confirm: "Confirm",
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('zh');

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
