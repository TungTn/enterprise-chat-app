'use client';

import React from 'react';
import { useChatStore } from '@/stores/useChatStore';
import { Phone, PhoneOff, Video } from 'lucide-react';

export default function IncomingCallModal() {
  const { incomingCall, acceptIncomingCall, rejectIncomingCall } = useChatStore();

  if (!incomingCall) return null;

  const isVideo = incomingCall.callType === 'video';

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[100] flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden p-6 text-center relative flex flex-col items-center">
        {/* Pulsing Ring Background Effect */}
        <div className="relative mb-5 mt-2">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping duration-1000" />
          <div className="absolute -inset-2 rounded-full bg-emerald-500/10 animate-pulse duration-700" />
          
          {incomingCall.callerAvatar ? (
            <img
              src={incomingCall.callerAvatar}
              alt={incomingCall.callerName}
              className="w-24 h-24 rounded-full object-cover border-2 border-emerald-500 shadow-xl relative z-10"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white text-3xl font-bold border-2 border-emerald-400 shadow-xl relative z-10 uppercase">
              {incomingCall.callerName ? incomingCall.callerName.charAt(0) : 'U'}
            </div>
          )}
        </div>

        {/* Caller Info */}
        <h3 className="font-bold text-xl text-white mb-1 tracking-tight truncate max-w-full px-2">
          {incomingCall.callerName}
        </h3>
        <p className="text-sm text-emerald-400 font-medium mb-8 flex items-center gap-1.5">
          {isVideo ? (
            <>
              <Video className="w-4 h-4 animate-bounce" />
              Cuộc gọi video đến...
            </>
          ) : (
            <>
              <Phone className="w-4 h-4 animate-bounce" />
              Cuộc gọi thoại đến...
            </>
          )}
        </p>

        {/* Action Buttons: Reject & Accept */}
        <div className="flex items-center justify-center gap-8 w-full">
          {/* Reject Button */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={rejectIncomingCall}
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-600/30 transition-transform active:scale-95"
              title="Từ chối"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
            <span className="text-xs text-slate-400 font-medium">Từ chối</span>
          </div>

          {/* Accept Button */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={acceptIncomingCall}
              className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/40 transition-transform active:scale-95 animate-pulse"
              title="Trả lời"
            >
              <Phone className="w-7 h-7" />
            </button>
            <span className="text-xs text-emerald-400 font-medium">Trả lời</span>
          </div>
        </div>
      </div>
    </div>
  );
}
