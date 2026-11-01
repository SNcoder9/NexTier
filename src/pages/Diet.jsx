import React from 'react';
import { Activity, Bell, Settings, Droplet, MoreHorizontal, Plus, Minus, Check, Trash2 } from 'lucide-react';

// --- DUMMY DATA ---
const macroData = [
    { label: 'Protein', target: '135g / 180g', percentage: 75, color: '#3b82f6' },
    { label: 'Carbs', target: '240g / 320g', percentage: 70, color: '#eab308' },
    { label: 'Fibre', target: '10g / 40g', percentage: 25, color: '#f97316' },
    { label: 'Fat', target: '60g / 100g', percentage: 60, color: '#ef4444' },
];

const selectedFoods = [
    { id: 1, name: 'Oatmeal & Eggs', cals: 450, protein: '25g', checked: false, img: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=100&h=100&fit=crop' },
    { id: 2, name: 'Chicken & Rice', cals: 650, protein: '50g', checked: true, img: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&h=100&fit=crop' },
    { id: 3, name: 'Protein Shake', cals: 250, protein: '30g', checked: null, img: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=100&h=100&fit=crop' },
];

const weeklyData = [
    { day: 'M', p: 70, c: 60, fb: 30, ft: 50 },
    { day: 'T', p: 85, c: 55, fb: 25, ft: 45 },
    { day: 'W', p: 90, c: 75, fb: 40, ft: 60 },
    { day: 'T', p: 60, c: 50, fb: 20, ft: 40 },
    { day: 'F', p: 75, c: 65, fb: 35, ft: 55 },
    { day: 'S', p: 80, c: 70, fb: 40, ft: 60 },
    { day: 'S', p: 95, c: 85, fb: 50, ft: 70 },
];

const foodLogs = [
    { id: 1, name: 'Oatmeal & Eggs', type: 'Breakfast', cals: 450, macros: '25g P / 45g C / 9g F', img: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=100&h=100&fit=crop' },
    { id: 2, name: 'Chicken & Rice', type: 'Lunch', cals: 650, macros: '45g P / 50g C / 12g F', img: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&h=100&fit=crop' },
    { id: 3, name: 'Protein Shake', type: 'Snack', cals: 250, macros: '30g P / 15g C / 3g F', img: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=100&h=100&fit=crop' },
    { id: 4, name: 'Salmon & Sweet Potato', type: 'Dinner', cals: 550, macros: '38g P / 40g C / 15g F', img: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=100&h=100&fit=crop' },
];

// --- REUSABLE COMPONENTS ---
const GlassPanel = ({ children, className = '' }) => (
    <div className={`bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-xl rounded-2xl p-5 flex flex-col ${className}`}>
        {children}
    </div>
);

const MacroRing = ({ label, target, percentage, color }) => (
    <div className="flex flex-col items-center">
        <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: `conic-gradient(${color} ${percentage}%, rgba(255,255,255,0.05) 0)` }}
        >
            <div className="w-[80%] h-[80%] bg-slate-950 rounded-full flex items-center justify-center text-xs font-semibold">
                {percentage}%
            </div>
        </div>
        <p className="text-xs mt-2">{label}</p>
        <p className="text-[10px] text-gray-400">{target}</p>
    </div>
);

export default function DietDashboard() {
    return (
        <div className='relative top-24 h-[79vh] w-full'>
            <div className="backdrop-blur-md px-8 py-4 border-b-2 border-gray-300 rounded-t-4xl">
                <h1 className="text-2xl"> Diet</h1>
            </div>

            <div className="backdrop-blur-xs h-full gap-6 p-8 min-h-screen w-full text-gray-100 font-sans flex flex-col overflow-hidden">

                {/* Main Grid */}
                <main className="relative z-10 flex-1 grid grid-cols-12 gap-5 px-8 pb-8 pt-4 min-h-0">

                    {/* LEFT COLUMN */}
                    <div className="col-span-4 flex flex-col gap-5 h-full">

                        {/* Diet Progress & Goals */}
                        <GlassPanel className="flex-[3]">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-semibold">Diet Progress & Goals <span className="text-gray-400 text-sm font-normal">(Daily Progress)</span></h2>
                                <MoreHorizontal className="text-gray-400" size={20} />
                            </div>

                            <div className="flex items-center justify-between mt-2">
                                <div className="flex flex-col items-center">
                                    <div
                                        className="w-40 h-40 rounded-full flex items-center justify-center"
                                        style={{ background: 'conic-gradient(#0ea5e9 75%, rgba(255,255,255,0.05) 0)' }}
                                    >
                                        <div className="w-[85%] h-[85%] bg-slate-950 rounded-full flex flex-col items-center justify-center">
                                            <span className="text-3xl font-bold">75%</span>
                                            <div className="flex gap-3 mt-2 text-xs bg-slate-800/80 rounded-full px-3 py-1">
                                                <button className="hover:text-blue-400"><Plus size={12} /></button>
                                                <button className="hover:text-blue-400"><Minus size={12} /></button>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="mt-4 text-sm text-gray-300">Daily Calorie Intake</p>
                                    <p className="text-xs text-gray-400">2,150 / 2,800 kcal</p>
                                </div>

                                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                    {macroData.map((macro, idx) => (
                                        <MacroRing key={idx} {...macro} />
                                    ))}
                                </div>
                            </div>
                        </GlassPanel>

                        {/* Hydration */}
                        <GlassPanel className="flex-[2] relative">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-lg font-semibold">Hydration</h2>
                                    <p className="text-sm text-gray-400">Daily Progress</p>
                                </div>
                                <Droplet className="text-blue-400" size={24} fill="currentColor" />
                            </div>

                            <div className="flex-1 flex flex-col items-center justify-center mt-4">
                                {/* Semi-circle progress */}
                                <div className="relative w-40 h-20 border-[12px] border-white/10 border-b-0 rounded-t-full">
                                    <div
                                        className="absolute top-[-12px] left-[-12px] right-[-12px] bottom-0 border-[12px] border-blue-500 border-b-0 rounded-t-full"
                                        style={{ clipPath: 'polygon(0 0, 70% 0, 70% 100%, 0 100%)' }}
                                    ></div>
                                    <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
                                        <span className="text-2xl font-bold">70%</span>
                                        <span className="text-xs text-gray-400">2.1L / 3.0L</span>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-400 mt-2">or 7 of 10 glasses</p>
                            </div>

                            <button className="absolute bottom-5 left-5 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition"><Minus size={16} /></button>
                            <button className="absolute bottom-5 right-5 w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center hover:bg-blue-500/40 transition"><Plus size={16} /></button>
                        </GlassPanel>
                    </div>

                    {/* MIDDLE COLUMN */}
                    <div className="col-span-4 flex flex-col gap-5 h-full">

                        {/* Daily Selected Food Items */}
                        <GlassPanel className="flex-[2]">
                            <h2 className="text-lg font-semibold mb-4">Daily Selected Food Items</h2>
                            <div className="flex flex-col gap-3 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                                {selectedFoods.map(item => (
                                    <div key={item.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition">
                                        <div className="flex items-center gap-3">
                                            <img src={item.img} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />
                                            <div>
                                                <p className="text-sm font-medium">{item.name}</p>
                                                <p className="text-xs text-gray-400">{item.cals} kcal / {item.protein} P</p>
                                            </div>
                                        </div>
                                        {item.checked === true ? (
                                            <div className="w-5 h-5 border border-blue-400 bg-blue-500/20 rounded flex items-center justify-center text-blue-400 cursor-pointer"><Check size={12} /></div>
                                        ) : item.checked === false ? (
                                            <div className="w-5 h-5 border border-gray-500 rounded flex items-center justify-center cursor-pointer hover:border-gray-300"></div>
                                        ) : (
                                            <div className="w-5 h-5 border border-gray-500 rounded flex items-center justify-center text-gray-400 hover:text-white cursor-pointer"><Plus size={12} /></div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-gray-400 mt-2 border-t border-white/10 pt-2 truncate">Quick-add Food Items / F80 kcal / 1...</p>
                        </GlassPanel>

                        {/* Weekly Nutrient Progress */}
                        <GlassPanel className="flex-[3]">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-lg font-semibold">Weekly Nutrient Progress</h2>
                                    <p className="text-sm text-gray-400">Day-wise Bar Graph</p>
                                </div>
                                <span className="text-xs bg-white/10 px-3 py-1 rounded-lg">Weekly Avg: 72%</span>
                            </div>

                            <div className="flex-1 flex items-end justify-between px-2 pb-6 border-b border-white/10 relative">
                                <div className="absolute top-1/4 left-0 right-0 border-t border-dashed border-white/20"></div>

                                {weeklyData.map((day, idx) => (
                                    <div key={idx} className="flex flex-col items-center gap-2 z-10">
                                        <div className="flex items-end gap-1 h-32">
                                            <div className="w-2 bg-blue-500 rounded-t-sm" style={{ height: `${day.p}%` }}></div>
                                            <div className="w-2 bg-yellow-500 rounded-t-sm" style={{ height: `${day.c}%` }}></div>
                                            <div className="w-2 bg-orange-500 rounded-t-sm" style={{ height: `${day.fb}%` }}></div>
                                            <div className="w-2 bg-red-500 rounded-t-sm" style={{ height: `${day.ft}%` }}></div>
                                        </div>
                                        <span className="text-xs text-gray-400">{day.day}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center gap-4 mt-4 text-[10px] text-gray-300">
                                <div className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500 rounded-sm"></div> Protein</div>
                                <div className="flex items-center gap-1"><div className="w-2 h-2 bg-yellow-500 rounded-sm"></div> Carbs</div>
                                <div className="flex items-center gap-1"><div className="w-2 h-2 bg-orange-500 rounded-sm"></div> Fibre</div>
                                <div className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500 rounded-sm"></div> Fat</div>
                            </div>
                        </GlassPanel>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="col-span-4 flex flex-col h-full">

                        {/* Food Items & Logs */}
                        <GlassPanel className="h-full">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-semibold">Food Items & Logs</h2>
                                <MoreHorizontal className="text-gray-400" size={20} />
                            </div>

                            <div className="flex-1 flex flex-col gap-3 overflow-y-auto [&::-webkit-scrollbar]:hidden pb-4">
                                {foodLogs.map(item => (
                                    <div key={item.id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex justify-between hover:bg-white/10 transition group">
                                        <div className="flex gap-3">
                                            <img src={item.img} alt={item.name} className="w-16 h-16 rounded-lg object-cover" />
                                            <div className="flex flex-col justify-center">
                                                <p className="text-sm font-semibold">{item.name}</p>
                                                <p className="text-[10px] text-gray-400">{item.type}</p>
                                                <p className="text-xs mt-1">{item.cals} kcal</p>
                                                <p className="text-[10px] text-gray-400">{item.macros}</p>
                                            </div>
                                        </div>
                                        <button className="text-gray-500 hover:text-red-400 transition opacity-0 group-hover:opacity-100">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <button className="mt-2 w-full py-3 bg-white/10 hover:bg-white/20 transition rounded-xl font-medium text-sm flex items-center justify-center gap-2 border border-white/10">
                                <Plus size={16} /> Add Item
                            </button>
                        </GlassPanel>

                    </div>
                </main>
            </div>
        </div>    
            );
}