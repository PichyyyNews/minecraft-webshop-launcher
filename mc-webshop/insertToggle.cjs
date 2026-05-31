const fs = require('fs');
const filePath = 'd:/mcwebshop2/mc-webshop/app/admin/launcher/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

const anchor = '{config.configFileUrl && <p className="mt-2 text-xs text-gray-500">{config.configFileUrl}</p>}';
const endDiv = '                                  </div>';

const targetIdx = code.indexOf(anchor);
if (targetIdx !== -1) {
  const insertIdx = code.indexOf(endDiv, targetIdx) + endDiv.length;
  
  const insertStr = `

                                  <div className="pt-4 border-t border-white/5 mt-4">
                                      <label className="flex items-center gap-3 cursor-pointer group">
                                          <div className="relative">
                                              <input
                                                  type="checkbox"
                                                  checked={config.overwriteSettingsOnLaunch}
                                                  onChange={(e) => setConfig(prev => ({ ...prev, overwriteSettingsOnLaunch: e.target.checked }))}
                                                  className="sr-only"
                                              />
                                              <div className={\`block w-10 h-6 rounded-full transition-colors \${config.overwriteSettingsOnLaunch ? 'bg-[var(--primary)]' : 'bg-white/10 group-hover:bg-white/20'}\`}></div>
                                              <div className={\`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform \${config.overwriteSettingsOnLaunch ? 'translate-x-4' : 'translate-x-0'}\`}></div>
                                          </div>
                                          <div>
                                              <div className="text-sm font-medium text-white">เขียนทับ Config / Options ทุกครั้งที่เข้าเกม</div>
                                              <div className="text-xs text-gray-400 mt-0.5">
                                                  {config.overwriteSettingsOnLaunch 
                                                      ? 'เปิด: เขียนทับทุกครั้ง (ผู้เล่นตั้งค่าเองไม่ได้)' 
                                                      : 'ปิด: เขียนแค่ครั้งแรกครั้งเดียว (ผู้เล่นแก้ไขตั้งค่าได้เอง)'}
                                              </div>
                                          </div>
                                      </label>
                                  </div>`;

  code = code.substring(0, insertIdx) + insertStr + code.substring(insertIdx);
  fs.writeFileSync(filePath, code, 'utf8');
  console.log('Success');
} else {
  console.log('Anchor not found');
}
