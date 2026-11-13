import { useRef, useState, useEffect } from 'react';
import api from '../api';
import { recordActivityNotification } from '../notifications';

// --- STATIC FALLBACK DATA FOR WEEKLY CHART ---
const fallbackWeeklyData = [
    { day: 'M', p: 70, c: 60, fb: 30, ft: 50 },
    { day: 'T', p: 85, c: 55, fb: 25, ft: 45 },
    { day: 'W', p: 90, c: 75, fb: 40, ft: 60 },
    { day: 'T', p: 60, c: 50, fb: 20, ft: 40 },
    { day: 'F', p: 75, c: 65, fb: 35, ft: 55 },
    { day: 'S', p: 80, c: 70, fb: 40, ft: 60 },
    { day: 'S', p: 95, c: 85, fb: 50, ft: 70 },
];

// --- REUSABLE COMPONENTS ---
const GoogleIcon = ({ name, className = '' }) => (
    <span className={`material-symbols-outlined ${className}`} style={{ fontSize: 'inherit' }}>
        {name}
    </span>
);

const GlassPanel = ({ children, className = '' }) => (
    <div className={`backdrop-blur-xl border border-white/20 shadow-xl rounded-2xl p-6 flex flex-col transition-all ${className}`}>
        {children}
    </div>
);

const getInitials = (name) => name ? name.charAt(0).toUpperCase() : '?';

export default function Diet({ user, today }) {
    const nextTempLogId = useRef(0);
    const [catalog, setCatalog] = useState([]);
    const [foodSearch, setFoodSearch] = useState('');
    const [isFoodFormOpen, setIsFoodFormOpen] = useState(false);
    const [isSavingFood, setIsSavingFood] = useState(false);
    const [foodFormError, setFoodFormError] = useState('');
    const [newFood, setNewFood] = useState({
        food_name: '',
        category: '',
        Kcal: '',
        protien: '',
        carbs: '',
        fat: '',
        fibre: '',
    });
    const [dailyLogs, setDailyLogs] = useState([]);
    const [weeklyStats, setWeeklyStats] = useState(fallbackWeeklyData);
    const [hydrationMl, setHydrationMl] = useState(0);
    const [waterStep, setWaterStep] = useState(250);
    const hydrationGoal = 3000;

    const targets = { cals: 2800, p: 180, c: 320, fb: 40, f: 100 };

    const currentUserId = user?.user_id || 1;
    const currentDate = today || new Date().toLocaleDateString('en-CA');

    useEffect(() => {
        const fetchDatabaseData = async () => {
            try {
                const [catalogRes, dailyLogsRes, hydrationRes, weeklyRes] = await Promise.allSettled([
                    api.get('/foods'),
                    api.get(`/nutrition/${currentUserId}/${currentDate}`),
                    api.get(`/hydration/${currentUserId}/${currentDate}`),
                    api.get(`/nutrition/weekly/${currentUserId}/${currentDate}`)
                ]);

                if (catalogRes.status === 'fulfilled' && Array.isArray(catalogRes.value.data)) {
                    setCatalog(catalogRes.value.data);
                }

                if (dailyLogsRes.status === 'fulfilled' && Array.isArray(dailyLogsRes.value.data)) {
                    const normalizedLogs = dailyLogsRes.value.data.map(log => ({
                        ...log,
                        logId: Number(log.logId ?? log.log_id),
                        food_id: Number(log.food_id),
                        qty: Number(log.qty ?? 1),
                        Kcal: Number(log.Kcal ?? 0),
                        protien: Number(log.protien ?? 0),
                        carbs: Number(log.carbs ?? 0),
                        fat: Number(log.fat ?? 0),
                        fibre: Number(log.fibre ?? 0),
                        name: log.name || 'Food',
                    }));
                    setDailyLogs(normalizedLogs);
                } else {
                    setDailyLogs([]);
                }

                if (hydrationRes.status === 'fulfilled') {
                    setHydrationMl(Number(hydrationRes.value?.data?.todays_water_ml || 0));
                }

                if (weeklyRes.status === 'fulfilled' && Array.isArray(weeklyRes.value.data) && weeklyRes.value.data.length > 0) {
                    setWeeklyStats(weeklyRes.value.data);
                }

            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchDatabaseData();
    }, [currentUserId, currentDate]);

    // --- COMPUTED MACROS ---
    const currentTotals = dailyLogs.reduce((acc, item) => {
        acc.cals += Number(item.Kcal || 0) * item.qty;
        acc.p += Number(item.protien || 0) * item.qty;
        acc.c += Number(item.carbs || 0) * item.qty;
        acc.f += Number(item.fat || 0) * item.qty;
        acc.fb += Number(item.fibre || 0) * item.qty; 
        return acc;
    }, { cals: 0, p: 0, c: 0, f: 0, fb: 0 });

    const getPercentage = (current, target) => Math.min(100, Math.round((current / target) * 100)) || 0;

    const dynamicMacroData = [
        { label: 'Carbs', target: `${Math.round(currentTotals.c)}g / ${targets.c}g`, percentage: getPercentage(currentTotals.c, targets.c), color: '#eab308' },
        { label: 'Fat', target: `${Math.round(currentTotals.f)}g / ${targets.f}g`, percentage: getPercentage(currentTotals.f, targets.f), color: '#ef4444' },
        { label: 'Protein', target: `${Math.round(currentTotals.p)}g / ${targets.p}g`, percentage: getPercentage(currentTotals.p, targets.p), color: '#3b82f6' },
        { label: 'Fibre', target: `${Math.round(currentTotals.fb)}g / ${targets.fb}g`, percentage: getPercentage(currentTotals.fb, targets.fb), color: '#f97316' }
    ];

    const filteredCatalog = catalog.filter((food) => {
        const query = foodSearch.trim().toLowerCase();
        return !query
            || food.food_name?.toLowerCase().includes(query)
            || food.category?.toLowerCase().includes(query);
    });

    // --- HANDLERS ---
    const handleCreateFood = async (event) => {
        event.preventDefault();
        setIsSavingFood(true);
        setFoodFormError('');

        try {
            const response = await api.post('/foods', {
                ...newFood,
                food_name: newFood.food_name.trim(),
                category: newFood.category.trim() || 'Food',
            });
            const createdFood = response.data;

            setCatalog(prev => [...prev, createdFood].sort((a, b) => a.food_name.localeCompare(b.food_name)));
            setFoodSearch(createdFood.food_name);
            setNewFood({ food_name: '', category: '', Kcal: '', protien: '', carbs: '', fat: '', fibre: '' });
            setIsFoodFormOpen(false);
            console.info('[NexTier] Database change saved', {
                resource: 'foods',
                operation: 'insert',
                food_id: createdFood.food_id,
                food_name: createdFood.food_name,
            });
            recordActivityNotification(currentUserId, 'Food added', `${createdFood.food_name} was added to the catalog.`);
        } catch (error) {
            setFoodFormError(error.response?.data?.error || 'Could not save this food. Please try again.');
        } finally {
            setIsSavingFood(false);
        }
    };

    const handleAddFood = async (food) => {
        const tempLogId = `pending-${++nextTempLogId.current}`;
        setDailyLogs(previous => [...previous, { ...food, qty: 1, logId: tempLogId }]);

        try {
            const response = await api.post('/nutrition', {
                user_id: currentUserId,
                food_id: food.food_id, 
                log_date: currentDate,
                servings_consumed: 1 
            });

            if (!response.data.log_id) throw new Error('The server did not return the saved food log ID.');
            setDailyLogs(prev => prev.map(log =>
                log.logId === tempLogId ? { ...log, logId: Number(response.data.log_id) } : log
            ));
            console.info('[NexTier] Database change saved', {
                resource: 'food_logs',
                operation: 'insert',
                log_id: response.data.log_id,
                food_id: food.food_id,
                food_name: food.food_name,
                log_date: currentDate,
            });
            recordActivityNotification(currentUserId, 'Food logged', `${food.food_name} was added to today’s food log.`);
        } catch (error) {
            console.error("Failed to add to DB", error);
            setDailyLogs(previous => previous.filter(log => log.logId !== tempLogId));
            alert(error.response?.data?.error || error.message || 'Database Error: Could not add food.');
        }
    };

    const handleRemoveFood = async (logId) => {
        const itemToRemove = dailyLogs.find(log => log.logId === logId);
        if (!itemToRemove) return;

        setDailyLogs(prev => prev.filter(log => log.logId !== logId));

        try {
            await api.delete(`/nutrition/${logId}`);
            console.info('[NexTier] Database change saved', {
                resource: 'food_logs',
                operation: 'delete',
                log_id: logId,
                food_name: itemToRemove.food_name || itemToRemove.name,
            });
            recordActivityNotification(currentUserId, 'Food entry removed', `${itemToRemove.food_name || itemToRemove.name} was removed from today’s log.`);
        } catch (error) {
            console.error('Failed to delete from DB', error);
            alert('Database Error: Could not delete food.');
            setDailyLogs(prev => [...prev, itemToRemove]);
        }
    };

    const handleHydration = async (amount) => {
        if (amount <= 0) {
            setHydrationMl(prev => Math.max(0, prev + amount));
            return;
        }

        const nextValue = Math.max(0, hydrationMl + amount);
        setHydrationMl(nextValue);

        try {
            await api.post('/hydration', {
                user_id: currentUserId,
                log_date: currentDate,
                amount_ml: amount,
            });
            recordActivityNotification(currentUserId, 'Water logged', `${amount} ml of water added to today’s hydration.`);
        } catch (error) {
            console.error('Failed to log hydration', error);
            setHydrationMl(hydrationMl);
        }
    };

    return (
        <div className="relative w-full pb-6 pt-24 font-sans text-slate-800">
            <div className="rounded-t-4xl border-b border-gray-200 bg-white/70 px-4 py-4 backdrop-blur-md sm:px-8 sm:py-5">
                <h1 className="text-xl font-bold tracking-wide text-slate-900 sm:text-2xl">Diet Dashboard</h1>
            </div>

            <div className="w-full bg-slate-50/50 p-3 sm:p-5 lg:p-8">
                <main className="relative z-10 grid min-w-0 grid-cols-1 gap-5 pb-4 md:grid-cols-2 xl:h-[680px] xl:grid-cols-12 xl:grid-rows-1 xl:gap-8">

                    {/* LEFT COLUMN */}
                    <div className="grid max-h-[600px] min-w-0 grid-rows-[minmax(0,1.15fr)_minmax(0,0.85fr)] gap-5 md:col-span-1 md:max-h-[680px] xl:col-span-4 xl:h-full xl:min-h-0 xl:max-h-[680px] xl:grid-rows-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                        {/* Diet Progress & Goals */}
                        <GlassPanel className="min-h-0 bg-white/90 p-4 sm:p-6">
                            <div className="mb-4 flex shrink-0 items-center justify-between">
                                <h2 className="text-lg font-bold text-slate-800">Diet Progress & Goals <span className="text-slate-500 text-sm font-normal">(Daily)</span></h2>
                                <GoogleIcon name="more_horiz" className="text-slate-400 text-xl cursor-pointer hover:text-slate-700" />
                            </div>

                            <div className="flex min-h-0 flex-1 flex-wrap items-center justify-center gap-5 lg:flex-nowrap lg:justify-between">
                                <div className="flex flex-col items-center">
                                    <div
                                        className="flex h-32 w-32 items-center justify-center rounded-full shadow-inner transition-all duration-500"
                                        style={{ background: `conic-gradient(#0ea5e9 ${getPercentage(currentTotals.cals, targets.cals)}%, #e2e8f0 0)` }}
                                    >
                                        <div className="w-[85%] h-[85%] bg-white rounded-full flex flex-col items-center justify-center shadow-sm">
                                            <span className="text-3xl font-black text-slate-800">{getPercentage(currentTotals.cals, targets.cals)}%</span>
                                        </div>
                                    </div>
                                    <p className="mt-3 text-center text-sm font-semibold text-slate-700">Daily Calorie Intake</p>
                                    <p className="text-xs font-medium text-blue-600">{Math.round(currentTotals.cals)} <span className="text-slate-400">/ {targets.cals} kcal</span></p>
                                </div>

                                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                    {dynamicMacroData.map((macro, idx) => (
                                        <div key={idx} className="flex flex-col items-center">
                                            <div
                                                className="flex h-14 w-14 items-center justify-center rounded-full transition-all duration-500"
                                                style={{ background: `conic-gradient(${macro.color} ${macro.percentage}%, #e2e8f0 0)` }}
                                            >
                                                <div className="w-[80%] h-[80%] bg-white rounded-full flex items-center justify-center text-xs font-bold text-slate-700">
                                                    {macro.percentage}%
                                                </div>
                                            </div>
                                            <p className="mt-1 text-xs font-semibold text-slate-700">{macro.label}</p>
                                            <p className="text-center text-[10px] text-slate-500">{macro.target}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </GlassPanel>

                        {/* Hydration */}
                        <GlassPanel className="relative min-h-0 bg-cyan-50/90 border-cyan-100">
                            <div className="flex justify-between items-start shrink-0">
                                <div>
                                    <h2 className="text-lg font-bold text-cyan-900">Hydration</h2>
                                    <p className="text-sm text-cyan-700">Daily Progress</p>
                                </div>
                                <GoogleIcon name="water_drop" className="text-cyan-500 text-2xl" />
                            </div>

                            <div className="flex-1 flex flex-col items-center justify-center mt-6 min-h-0">
                                <div className="relative w-48 h-24 border-[14px] border-cyan-200 border-b-0 rounded-t-full">
                                    <div
                                        className="absolute top-[-14px] left-[-14px] right-[-14px] bottom-0 border-[14px] border-cyan-500 border-b-0 rounded-t-full transition-all duration-500"
                                        style={{ clipPath: `inset(${100 - getPercentage(hydrationMl, hydrationGoal)}% 0 0 0)` }} 
                                    ></div>
                                    <div className="absolute inset-0 flex flex-col items-center justify-end pb-3">
                                        <span className="text-2xl font-black text-cyan-900">{getPercentage(hydrationMl, hydrationGoal)}%</span>
                                        <span className="text-xs font-semibold text-cyan-700">{hydrationMl / 1000}L / {hydrationGoal / 1000}L</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-1 left-0 right-0 flex justify-center items-center gap-5">
                                <button onClick={() => handleHydration(-waterStep)} className="w-10 h-10 rounded-full bg-cyan-200 text-cyan-800 flex items-center justify-center hover:bg-cyan-300 transition text-base shadow-sm"><GoogleIcon name="remove" /></button>
                                
                                <div className="flex items-center bg-white rounded-lg px-3 py-2 shadow-sm border border-cyan-100 mt-3">
                                    <input 
                                        type="number" 
                                        value={waterStep} 
                                        onChange={(e) => setWaterStep(Number(e.target.value) || 0)} 
                                        className="w-14 text-center text-sm font-bold text-cyan-900 outline-none bg-transparent"
                                    />
                                    <span className="text-xs text-cyan-600 font-semibold ml-1">ml</span>
                                </div>

                                <button onClick={() => handleHydration(waterStep)} className="w-10 h-10 rounded-full bg-cyan-500 text-white flex items-center justify-center hover:bg-cyan-600 transition text-base shadow-sm"><GoogleIcon name="add" /></button>
                            </div>
                        </GlassPanel>
                    </div>

                    {/* MIDDLE COLUMN */}
                    <div className="flex max-h-[600px] min-w-0 flex-col gap-5 md:col-span-1 xl:col-span-4 xl:h-full xl:min-h-0 xl:max-h-none">
                        {/* Daily Selected Food Items */}
                        <GlassPanel className="min-h-0 flex-[2] bg-white/90">
                            <div className="flex justify-between items-center mb-6 shrink-0">
                                <h2 className="text-lg font-bold text-slate-800">Daily Logged Foods</h2>
                                <span className="text-xs font-bold bg-blue-100 text-blue-700 px-3 py-1.5 rounded-md">{dailyLogs.length} Items</span>
                            </div>
                            
                            <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto [&::-webkit-scrollbar]:hidden pb-2 pr-1">
                                {dailyLogs.length === 0 ? (
                                    <div className="flex h-full items-center justify-center text-sm font-medium text-slate-400">No foods logged yet today.</div>
                                ) : dailyLogs.map(item => (
                                    <div key={item.logId} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition shadow-sm group shrink-0">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xl shadow-sm">
                                                {getInitials(item.food_name || item.name)}
                                            </div>
                                            <div>
                                                <p className="text-base font-bold text-slate-800">{item.food_name || item.name} <span className="text-sm text-blue-600 font-bold ml-1">x{item.qty}</span></p>
                                                <p className="text-xs font-semibold text-slate-500 mt-0.5">{item.category}</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleRemoveFood(item.logId)} 
                                            className="w-8 h-8 rounded bg-red-50 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-100 transition shadow-sm"
                                            title="Delete entry"
                                        >
                                            <GoogleIcon name="delete" className="text-[18px]" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </GlassPanel>

                        {/* Weekly Nutrient Progress */}
                        <GlassPanel className="min-h-0 flex-[3] bg-indigo-50/90 border-indigo-100">
                            <div className="flex justify-between items-center mb-8 shrink-0">
                                <div>
                                    <h2 className="text-lg font-bold text-indigo-900">Weekly Nutrient Progress</h2>
                                    <p className="text-sm text-indigo-700">Day-wise Bar Graph</p>
                                </div>
                                <span className="text-xs font-bold bg-white text-indigo-600 px-3 py-1.5 rounded-lg shadow-sm">Weekly Avg: 72%</span>
                            </div>

                            <div className="flex-1 flex items-end justify-between px-3 pb-8 border-b border-indigo-200 relative min-h-0 mt-4">
                                <div className="absolute top-1/4 left-0 right-0 border-t border-dashed border-indigo-200"></div>
                                <div className="absolute top-0 bottom-8 left-1/2 border-l border-dashed border-indigo-200 z-0"></div>

                                {weeklyStats.map((day, idx) => (
                                    <div key={idx} className="z-10 flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-3">
                                        <div className="flex h-full max-h-40 items-end gap-0.5 sm:gap-1 xl:gap-1.5">
                                            <div className="w-1 rounded-t-md bg-blue-500 transition-all duration-500 sm:w-1.5 xl:w-2.5" style={{ height: `${day.p}%` }}></div>
                                            <div className="w-1 rounded-t-md bg-yellow-400 transition-all duration-500 sm:w-1.5 xl:w-2.5" style={{ height: `${day.c}%` }}></div>
                                            <div className="w-1 rounded-t-md bg-orange-500 transition-all duration-500 sm:w-1.5 xl:w-2.5" style={{ height: `${day.fb}%` }}></div>
                                            <div className="w-1 rounded-t-md bg-red-500 transition-all duration-500 sm:w-1.5 xl:w-2.5" style={{ height: `${day.ft}%` }}></div>
                                        </div>
                                        <span className="text-sm font-bold text-indigo-800">{day.day}</span>
                                    </div>
                                ))}
                            </div>
                        </GlassPanel>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="flex max-h-[600px] min-w-0 flex-col md:col-span-2 md:min-h-[680px] xl:col-span-4 xl:h-full xl:min-h-0 xl:max-h-none">
                        {/* Food Database Catalog */}
                        <GlassPanel className="min-h-0 flex-1 bg-white/90">
                            <div className="flex justify-between items-center mb-6 shrink-0">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800">Food Database Catalog</h2>
                                    <p className="text-sm font-medium text-slate-500 mt-1">Click + to add to daily log</p>
                                </div>
                                <GoogleIcon name="database" className="text-slate-400 text-2xl" />
                            </div>

                            <div className="mb-4 flex shrink-0 items-center gap-2">
                                <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-500 transition focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                                    <GoogleIcon name="search" className="text-xl" />
                                    <input
                                        type="search"
                                        value={foodSearch}
                                        onChange={(event) => setFoodSearch(event.target.value)}
                                        placeholder="Search foods or categories"
                                        aria-label="Search food catalog"
                                        className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
                                    />
                                    {foodSearch && (
                                        <button
                                            type="button"
                                            onClick={() => setFoodSearch('')}
                                            aria-label="Clear food search"
                                            className="text-xs cursor-pointer font-semibold text-blue-600 hover:text-blue-800"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFoodFormError('');
                                        setIsFoodFormOpen(true);
                                    }}
                                    className="flex shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                                >
                                    <GoogleIcon name="add" className="text-lg" />
                                    <span>Add food</span>
                                </button>
                            </div>

                            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto [&::-webkit-scrollbar]:hidden pb-4 pr-1">
                                {filteredCatalog.length === 0 ? (
                                    <div className="flex flex-1 items-center justify-center text-center text-sm font-medium text-slate-400">
                                        {foodSearch ? `No foods match “${foodSearch}”.` : 'No foods available.'}
                                    </div>
                                ) : filteredCatalog.map(item => (
                                    <div key={item.food_id} className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex justify-between hover:bg-slate-100 transition group shadow-sm shrink-0">
                                        <div className="flex gap-4">
                                            <div className="flex flex-col justify-center">
                                                <p className="text-base font-bold text-slate-800">{item.food_name}</p>
                                                <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mt-0.5">{item.category || 'Food'}</p>
                                                <p className="text-sm font-semibold text-slate-600 mt-2">{item.Kcal} kcal</p>
                                                <p className="text-xs font-medium text-slate-500 mt-1">{item.protien}g P / {item.carbs}g C / {item.fat}g F</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleAddFood(item)}
                                            className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition self-center shadow-sm shrink-0"
                                        >
                                            <GoogleIcon name="add" className="text-xl font-bold" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </GlassPanel>
                    </div>
                </main>
            </div>
            {isFoodFormOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="add-food-title"
                        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
                    >
                        <div className="mb-5 flex items-start justify-between gap-4">
                            <div>
                                <h2 id="add-food-title" className="text-xl font-bold text-slate-900">Add food to catalog</h2>
                                <p className="mt-1 text-sm text-slate-500">Enter nutrition values for one serving.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsFoodFormOpen(false)}
                                aria-label="Close add food form"
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                            >
                                <GoogleIcon name="close" className="text-xl" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateFood} className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                                    Food name
                                    <input
                                        required
                                        maxLength={40}
                                        value={newFood.food_name}
                                        onChange={(event) => setNewFood(prev => ({ ...prev, food_name: event.target.value }))}
                                        className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 font-normal outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                    />
                                </label>
                                <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                                    Category
                                    <input
                                        maxLength={50}
                                        value={newFood.category}
                                        onChange={(event) => setNewFood(prev => ({ ...prev, category: event.target.value }))}
                                        placeholder="e.g. Protein Rich"
                                        className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 font-normal outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                    />
                                </label>
                                {[
                                    ['Kcal', 'Calories (kcal)'],
                                    ['protien', 'Protein (g)'],
                                    ['carbs', 'Carbs (g)'],
                                    ['fat', 'Fat (g)'],
                                    ['fibre', 'Fibre (g)'],
                                ].map(([field, label]) => (
                                    <label key={field} className="text-sm font-semibold text-slate-700">
                                        {label}
                                        <input
                                            required
                                            type="number"
                                            min="0"
                                            max="9999.99"
                                            step="0.01"
                                            value={newFood[field]}
                                            onChange={(event) => setNewFood(prev => ({ ...prev, [field]: event.target.value }))}
                                            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 font-normal outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                        />
                                    </label>
                                ))}
                            </div>

                            {foodFormError && <p role="alert" className="text-sm font-medium text-red-600">{foodFormError}</p>}

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsFoodFormOpen(false)}
                                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingFood}
                                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isSavingFood ? 'Saving…' : 'Save food'}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}
        </div>
    );
}