import React, { useState } from 'react';
import { GlassPanel } from './AuraLayout';
import { motion } from 'motion/react';
import { KeyRound, ShieldAlert, ArrowRight, Save, LayoutTemplate } from 'lucide-react';

interface SetupScreenProps {
  onSubmit?: (apiKey: string, secCode: string) => void;
  onSwitchApp?: () => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({ onSubmit, onSwitchApp }) => {
  const [apiKey, setApiKey] = useState('');
  const [secCode, setSecCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey && secCode && onSubmit) {
      onSubmit(apiKey, secCode);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="w-full max-w-2xl"
      >
        <GlassPanel className="flex flex-col gap-6 items-center text-center p-6 md:p-8">
        <div className="w-16 h-16 rounded-full bg-[#FAF9F6] flex items-center justify-center shadow-sm border border-[#E5E0D8] relative">
          <KeyRound className="w-8 h-8 text-[#5A5A40] relative z-10" />
        </div>
        
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-[#2D2A26] font-serif">需要配置地图 API 密钥</h1>
          <p className="text-[#8E8A82] text-sm max-w-[400px] leading-relaxed">
            此模块依赖于高德地图 API。为了启用定位、地点搜索和路线规划服务，请提供您的开发者凭证。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full max-w-md flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs font-bold text-[#8E8A82] uppercase tracking-wider pl-1">API Key</label>
            <input 
              type="text" 
              required
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="输入您的 GAODE_MAP_API_KEY"
              className="w-full px-4 py-3 rounded-xl border border-[#E5E0D8] focus:border-[#D4A373] focus:ring-1 focus:ring-[#D4A373] outline-none text-[#2D2A26] bg-[#FDFBF7] text-sm font-mono placeholder:font-sans transition-all"
            />
          </div>
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs font-bold text-[#8E8A82] uppercase tracking-wider pl-1">Security Code</label>
            <input 
              type="password" 
              required
              value={secCode}
              onChange={(e) => setSecCode(e.target.value)}
              placeholder="输入您的 GAODE_MAP_SECURITY_CODE"
              className="w-full px-4 py-3 rounded-xl border border-[#E5E0D8] focus:border-[#D4A373] focus:ring-1 focus:ring-[#D4A373] outline-none text-[#2D2A26] bg-[#FDFBF7] text-sm font-mono placeholder:font-sans transition-all"
            />
          </div>
          <button 
            type="submit"
            disabled={!apiKey || !secCode}
            className="mt-2 w-full flex items-center justify-center gap-2 bg-[#5A5A40] text-white py-3.5 rounded-xl font-bold transition-all hover:bg-[#4A4A35] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <Save className="w-4 h-4" />
            保存并开启探索
          </button>
        </form>

        {onSwitchApp && (
          <button 
            onClick={onSwitchApp}
            className="mt-6 flex items-center justify-center gap-2 text-[#5A5A40] font-bold text-sm tracking-wide transition-all hover:opacity-80 pb-1 border-b border-transparent hover:border-[#5A5A40]"
          >
            <LayoutTemplate className="w-4 h-4" />
            暂无地图密钥，直接进入「户型图规划」功能
          </button>
        )}

        <div className="w-full bg-[#FDFBF7] rounded-2xl p-5 border border-[#E5E0D8] flex flex-col gap-4 text-left mt-6">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-[#D4A373] mt-0.5 shrink-0" />
            <p className="text-sm text-[#4A453E] leading-relaxed">
              <strong>安全提示：</strong> 出于安全考虑且防止配额被滥用，此应用未内置开发者密钥。所有密钥仅存储在您的本地浏览器（localStorage）中，不会上传到任何服务器。
            </p>
          </div>
        </div>
      </GlassPanel>
    </motion.div>
    </div>
  );
};
