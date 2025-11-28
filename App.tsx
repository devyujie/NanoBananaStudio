
import React, { useState } from 'react';
import { TextGenerator } from './components/TextGenerator';
import { Banana, Languages } from 'lucide-react';
import { LanguageProvider, useLanguage } from './components/LanguageContext';
import { Button } from './components/ui/Button';

const AppContent: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'zh' ? 'en' : 'zh');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/20 via-zinc-950 to-zinc-950">
      {/* Navbar */}
      <nav className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Banana className="text-white w-5 h-5" />
              </div>
              <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
                {t('navTitle')}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={toggleLanguage}
                className="text-zinc-400 hover:text-white"
              >
                <Languages className="w-4 h-4 mr-2" />
                {language === 'zh' ? 'English' : '中文'}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-6">
        
        {/* Header Section */}
        <div className="text-center mb-14 space-y-2">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-12">
            {t('heroTitle')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">{t('heroTitleHighlight')}</span>
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            {t('heroDesc')}
          </p>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            {t('heroSubDesc')}
          </p>
        </div>

        {/* View Container */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <TextGenerator />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 mt-auto py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-zinc-600 text-sm flex flex-col items-center gap-2">
          <p>
            © {new Date().getFullYear()} {t('footer')}
          </p>
          <p className="text-xs text-zinc-500">
             {t('authorBy')} <a href="https://bianyujie.cn/" target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-white underline decoration-zinc-700 underline-offset-4 transition-colors">边玉杰</a>
          </p>
        </div>
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
};

export default App;
