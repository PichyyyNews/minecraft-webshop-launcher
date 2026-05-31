const fs = require('fs');
let code = fs.readFileSync('d:/mcwebshop2/launcher/src/App.tsx', 'utf8');
const startIdx = code.indexOf('  if (updateAvailable) {');
const endIdx = code.indexOf('  const settingsCategories');
if (startIdx !== -1 && endIdx !== -1) {
  const newCode = `  if (updateAvailable) {
    return (
      <div
        className="min-h-screen text-white font-sans overflow-hidden bg-cover bg-center flex flex-col justify-center items-center relative"
        style={{ ...shellStyle, backgroundImage: \`url('\${resolveAssetUrl(config.backgroundUrl) || "default-bg.jpg"}')\` }}
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-lg z-0 transition-all duration-700"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 z-0"></div>
        
        <div className="relative z-10 max-w-md w-full mx-4 transform transition-all duration-500 hover:scale-[1.01]">
          {/* Glowing accent orb behind the card */}
          <div className="absolute -inset-1 bg-gradient-to-r from-[var(--launcher-primary)] to-[var(--launcher-primary)]/30 rounded-[2rem] blur-xl opacity-30 animate-pulse"></div>
          
          <div className="relative bg-black/40 backdrop-blur-xl rounded-[2rem] border border-white/10 p-10 shadow-2xl overflow-hidden group">
            {/* Glossy overlay effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

            <div className="flex flex-col items-center text-center">
              <div className="relative mb-8">
                <div className="w-24 h-24 bg-gradient-to-tr from-[var(--launcher-primary)] to-white rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(var(--launcher-primary-rgb),0.5)] animate-[spin_4s_linear_infinite] p-1">
                   <div className="w-full h-full bg-black/80 rounded-full flex items-center justify-center backdrop-blur-md">
                     <Download className="w-10 h-10 text-[var(--launcher-primary)] animate-pulse" />
                   </div>
                </div>
              </div>
              
              <h1 className="text-4xl font-extrabold mb-3 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                อัปเดตเวอร์ชันใหม่!
              </h1>
              <p className="text-gray-300 mb-8 text-sm leading-relaxed px-4">
                พบ Launcher เวอร์ชันใหม่ <span className="text-[var(--launcher-primary)] font-bold px-1">{config.latestLauncherVersion}</span> 
                <br/>จำเป็นต้องอัปเดตเพื่อเข้าเล่นเกมและรับฟีเจอร์ล่าสุด
              </p>
              
              {config.launcherUpdateNotes && (
                <div className="w-full bg-black/50 rounded-2xl p-5 mb-8 text-left border border-white/10 shadow-inner">
                  <h3 className="text-[var(--launcher-primary)] font-bold text-xs mb-3 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--launcher-primary)] animate-ping"></span>
                    Patch Notes
                  </h3>
                  <div className="text-gray-300 text-sm whitespace-pre-wrap max-h-32 overflow-y-auto pr-2 custom-scrollbar font-medium">
                    {config.launcherUpdateNotes}
                  </div>
                </div>
              )}

              <button
                onClick={handleUpdate}
                disabled={updateState === "downloading"}
                className="group relative w-full h-16 overflow-hidden bg-white/5 hover:bg-white/10 text-white font-bold text-lg rounded-2xl border border-white/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {/* Button dynamic background fill */}
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--launcher-primary)] to-[var(--launcher-primary)]/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0"></div>
                
                <span className="relative z-10 flex items-center gap-3 text-white">
                  {updateState === "downloading" ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin text-[var(--launcher-primary)]" />
                      <span className="tracking-wide">กำลังดาวน์โหลด...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-6 h-6 transition-transform group-hover:-translate-y-1 group-hover:scale-110 duration-300" />
                      <span className="tracking-wide text-shadow-sm">อัปเดตทันที</span>
                    </>
                  )}
                </span>
              </button>
              
              {updateState === "error" && (
                <p className="text-red-400 mt-5 text-sm bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/20">
                  อัปเดตล้มเหลว กรุณาลองใหม่อีกครั้ง
                </p>
              )}
              
              <div className="text-gray-500 text-xs mt-8 font-medium uppercase tracking-widest">
                Current Version: {status.version}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

`;
  code = code.substring(0, startIdx) + newCode + code.substring(endIdx);
  fs.writeFileSync('d:/mcwebshop2/launcher/src/App.tsx', code, 'utf8');
  console.log('Success');
} else {
  console.log('Could not find boundaries');
}
