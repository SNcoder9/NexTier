import React, { useState } from 'react';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

function Workout() {
    // ----------------- RIGHT PANEL: PLANNED WORKOUTS -----------------
    const [workouts, setWorkouts] = useState([
        { id: 1, text: '4x6 Barbell Deadlift (160 kg)', completed: false },
        { id: 2, text: '3x8 Pendlay Barbell Rows', completed: true },
        { id: 3, text: '3x10 Lat Pulldowns', completed: false },
    ]);
    const [inputValue, setInputValue] = useState('');

    const handleAddWorkout = (e) => {
        e.preventDefault();
        if (inputValue.trim() === '') return;
        setWorkouts([
            ...workouts,
            { id: Date.now(), text: inputValue.trim(), completed: false }
        ]);
        setInputValue('');
    };

    const toggleWorkout = (id) => {
        setWorkouts(workouts.map(w => w.id === id ? { ...w, completed: !w.completed } : w));
    };

    const deleteWorkout = (id) => {
        setWorkouts(workouts.filter(w => w.id !== id));
    };

    // ----------------- SECTION 1: TODAY'S CALORIE BURN STATE -----------------
    const [todayActivities, setTodayActivities] = useState([
        { id: 1, name: 'Deadlift', cal: 240 },
        { id: 2, name: 'Treadmill Sprints', cal: 180 },
        { id: 3, name: 'Lat Pulldowns', cal: 110 },
    ]);
    const [actName, setActName] = useState('');
    const [actCal, setActCal] = useState('');

    const handleAddActivity = (e) => {
        e.preventDefault();
        if (!actName.trim() || !actCal || Number(actCal) <= 0) return;
        setTodayActivities([
            ...todayActivities,
            { id: Date.now(), name: actName.trim(), cal: Number(actCal) }
        ]);
        setActName('');
        setActCal('');
    };

    const handleDeleteActivity = (id) => {
        setTodayActivities(todayActivities.filter(a => a.id !== id));
    };

    const totalBurned = todayActivities.reduce((acc, curr) => acc + curr.cal, 0);

    // ----------------- SECTION 1 CHARTS DATA -----------------
    // Left: Activity Breakdown (Donut)
    const activityData = {
        labels: ['Strength', 'Cardio', 'Mobility', 'Rest'],
        datasets: [{
            data: [45, 30, 15, 10],
            backgroundColor: ['#3b82f6', '#06b6d4', '#6366f1', '#c084fc'],
            borderWidth: 0,
            hoverOffset: 6,
        }],
    };

    const doughnutOptions = {
        cutout: '72%',
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(10, 15, 29, 0.85)',
                padding: 12,
                cornerRadius: 10,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.1)',
            },
        },
    };

    // Right: Today Calories Burned (Bar Chart)
    const caloriesBarData = {
        labels: todayActivities.map(a => a.name),
        datasets: [{
            label: 'Calories Burned',
            data: todayActivities.map(a => a.cal),
            backgroundColor: '#f59e0b',
            borderRadius: 8,
            borderSkipped: false,
            barThickness: 28,
        }],
    };

    const caloriesBarOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(10, 15, 29, 0.85)',
                padding: 12,
                cornerRadius: 10,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.1)',
                callbacks: {
                    label: (context) => ` ${context.parsed.y} kcal burned`,
                },
            },
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: '#e2e8f0', font: { size: 12, weight: '500' } },
                border: { display: false },
            },
            y: {
                grid: { color: 'rgba(255, 255, 255, 0.08)' },
                ticks: { color: '#94a3b8', font: { size: 11 } },
                border: { display: false },
            },
        },
    };

    // ----------------- SECTION 2 CHARTS DATA -----------------
    const weeklyBarData = {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
            label: 'Workout Mins',
            data: [65, 50, 75, 45, 80, 60, 30],
            backgroundColor: '#06b6d4',
            borderRadius: 6,
            borderSkipped: false,
            barThickness: 18,
        }],
    };

    const weeklyBarOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(10, 15, 29, 0.85)',
                padding: 10,
                cornerRadius: 8,
                callbacks: { label: (ctx) => ` ${ctx.parsed.y} mins` },
            },
        },
        scales: {
            x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } }, border: { display: false } },
            y: { grid: { color: 'rgba(255, 255, 255, 0.06)' }, ticks: { color: '#64748b', font: { size: 10 } }, border: { display: false } },
        },
    };

    return (
        <div className='relative top-20 min-h-[calc(100vh-100px)] w-full flex flex-col'>
            {/* Header */}
            <div className="backdrop-blur-md px-8 py-4 border-b border-white/10 rounded-t-3xl shrink-0 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl text-white font-bold tracking-wide">Workout Dashboard</h1>
                    <p className="text-xs text-gray-400 mt-0.5">Real-time training analytics & session execution</p>
                </div>
            </div>

            {/* Main Content Area */}
            <div className='backdrop-blur-sm flex-1 p-6 md:p-8 overflow-hidden'>
                {/* 2-Column Split: 55% Left (Analytics) / 45% Right (Execution) */}
                <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-8 h-full">

                    {/* ===================== LEFT COLUMN ===================== */}
                    <div className="flex flex-col gap-8 h-full overflow-y-auto pb-10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

                        {/* SECTION 1: EXPANDED & PROMINENT GRAPHS WITH DIVIDER */}
                        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-7 shadow-xl shrink-0">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

                                {/* Left Half: Activity Breakdown (Enlarged) */}
                                <div className="md:border-r border-white/20 md:pr-8 flex flex-col justify-between h-full">
                                    <div>
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="text-xl font-bold text-white tracking-wide">Activity Breakdown</h3>
                                            <span className="text-xs font-semibold px-2.5 py-1 bg-cyan-500/20 text-cyan-300 rounded-full border border-cyan-500/30">
                                                This Week
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-300 mb-5">Distribution across key movement disciplines</p>
                                        
                                        {/* Significantly Enlarged Chart Canvas */}
                                        <div className="w-full h-64 relative flex justify-center items-center">
                                            <Doughnut data={activityData} options={doughnutOptions} />
                                        </div>
                                    </div>

                                    {/* Prominent Legend */}
                                    <div className="mt-6 grid grid-cols-2 gap-3 text-xs text-gray-200 bg-black/20 p-3.5 rounded-2xl border border-white/5">
                                        <div className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full bg-blue-500"></span> 
                                            <span>Strength (45%)</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full bg-cyan-400"></span> 
                                            <span>Cardio (30%)</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full bg-indigo-500"></span> 
                                            <span>Mobility (15%)</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full bg-purple-400"></span> 
                                            <span>Rest (10%)</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Half: Today's Burned Calories (Enlarged & Detailed) */}
                                <div className="flex flex-col justify-between h-full">
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <h3 className="text-xl font-bold text-white tracking-wide">Today's Calorie Burn</h3>
                                            <span className="text-sm text-amber-400 font-bold bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
                                                {totalBurned} kcal
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-300 mb-4">Live expenditure per exercise performed today</p>

                                        {/* Enlarged Bar Chart Canvas */}
                                        <div className="w-full h-56 relative mb-4">
                                            {todayActivities.length === 0 ? (
                                                <div className="h-full flex items-center justify-center text-gray-400 text-sm italic">
                                                    No exercises logged today yet.
                                                </div>
                                            ) : (
                                                <Bar data={caloriesBarData} options={caloriesBarOptions} />
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        {/* Input Controller */}
                                        <form onSubmit={handleAddActivity} className="flex gap-2 mb-3">
                                            <input
                                                type="text"
                                                value={actName}
                                                onChange={(e) => setActName(e.target.value)}
                                                placeholder="Exercise name (e.g. Squat)"
                                                className="flex-1 bg-black/25 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-amber-400"
                                            />
                                            <input
                                                type="number"
                                                value={actCal}
                                                onChange={(e) => setActCal(e.target.value)}
                                                placeholder="kcal"
                                                className="w-20 bg-black/25 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-amber-400"
                                            />
                                            <button
                                                type="submit"
                                                className="bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer"
                                            >
                                                + Add
                                            </button>
                                        </form>

                                        {/* Manageable List Items */}
                                        <div className="max-h-28 overflow-y-auto flex flex-col gap-1.5 pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                            {todayActivities.map((act) => (
                                                <div
                                                    key={act.id}
                                                    className="flex justify-between items-center bg-black/20 px-3 py-2 rounded-xl border border-white/5 text-xs hover:border-white/20 transition-colors"
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                                                        <span className="text-gray-100 font-medium">{act.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-amber-400 font-semibold">{act.cal} kcal</span>
                                                        <button
                                                            onClick={() => handleDeleteActivity(act.id)}
                                                            className="text-gray-400 hover:text-red-400 font-bold text-sm px-1 transition-colors cursor-pointer"
                                                            title="Delete"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* SECTION 2: COMPACT PERSONAL METRICS, WEEKLY PROGRESS & PRs */}
                        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 shadow-lg flex flex-col gap-6 shrink-0">
                            {/* Personal Metrics */}
                            <div>
                                <h3 className="text-base font-bold text-white mb-3">Personal Metrics</h3>
                                <div className="grid grid-cols-5 gap-2.5">
                                    <div className="bg-black/20 p-2.5 rounded-xl border border-white/5 flex flex-col items-center">
                                        <span className="text-[10px] uppercase tracking-wider text-gray-400">Age</span>
                                        <span className="text-sm font-bold text-white mt-0.5">22</span>
                                    </div>
                                    <div className="bg-black/20 p-2.5 rounded-xl border border-white/5 flex flex-col items-center">
                                        <span className="text-[10px] uppercase tracking-wider text-gray-400">Weight</span>
                                        <span className="text-sm font-bold text-cyan-400 mt-0.5">74 kg</span>
                                    </div>
                                    <div className="bg-black/20 p-2.5 rounded-xl border border-white/5 flex flex-col items-center">
                                        <span className="text-[10px] uppercase tracking-wider text-gray-400">Height</span>
                                        <span className="text-sm font-bold text-white mt-0.5">178 cm</span>
                                    </div>
                                    <div className="bg-black/20 p-2.5 rounded-xl border border-white/5 flex flex-col items-center">
                                        <span className="text-[10px] uppercase tracking-wider text-gray-400">BMI</span>
                                        <span className="text-sm font-bold text-emerald-400 mt-0.5">23.4</span>
                                    </div>
                                </div>
                            </div>

                            {/* Weekly Progress Bar Chart */}
                            <div className="border-t border-white/10 pt-4">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-base font-bold text-white">Weekly Training Volume</h3>
                                    <span className="text-xs text-cyan-400 font-medium">Avg: 57 min/session</span>
                                </div>
                                <div className="w-full h-32 relative">
                                    <Bar data={weeklyBarData} options={weeklyBarOptions} />
                                </div>
                            </div>

                            {/* Personal Records Cards */}
                            <div className="border-t border-white/10 pt-4">
                                <h3 className="text-base font-bold text-white mb-3">Personal Records</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-black/20 p-3 rounded-xl border border-white/5 flex flex-col items-center">
                                        <span className="text-xs text-gray-400">Deadlift</span>
                                        <span className="text-cyan-400 font-bold text-lg mt-0.5">180 kg</span>
                                    </div>
                                    <div className="bg-black/20 p-3 rounded-xl border border-white/5 flex flex-col items-center">
                                        <span className="text-xs text-gray-400">Squat</span>
                                        <span className="text-cyan-400 font-bold text-lg mt-0.5">140 kg</span>
                                    </div>
                                    <div className="bg-black/20 p-3 rounded-xl border border-white/5 flex flex-col items-center">
                                        <span className="text-xs text-gray-400">Bench</span>
                                        <span className="text-cyan-400 font-bold text-lg mt-0.5">100 kg</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* ===================== RIGHT COLUMN: PLANNED WORKOUTS ===================== */}
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-7 shadow-xl flex flex-col h-full overflow-hidden">
                        <div className="flex justify-between items-center mb-4 shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-wide">Planned Workouts</h3>
                                <p className="text-xs text-gray-400 mt-0.5">Today's target movement checklist</p>
                            </div>
                            <span className="text-xs text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded-full border border-cyan-400/20 font-medium">
                                {workouts.filter(w => w.completed).length} / {workouts.length} Done
                            </span>
                        </div>

                        <form onSubmit={handleAddWorkout} className="flex gap-3 mb-6 shrink-0">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Add movement (e.g. 3x12 Incline Dumbbell Press)"
                                className="flex-1 bg-black/25 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-colors"
                            />
                            <button
                                type="submit"
                                className="bg-cyan-500 hover:bg-cyan-400 text-black px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg hover:shadow-cyan-500/20 cursor-pointer"
                            >
                                Add
                            </button>
                        </form>

                        <div className="flex flex-col gap-3 overflow-y-auto pb-4 flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            {workouts.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                                    <p className="text-base font-medium">No exercises queued up.</p>
                                    <p className="text-xs text-gray-500 mt-1">Use the bar above to plan your training session.</p>
                                </div>
                            ) : (
                                workouts.map((workout) => (
                                    <div
                                        key={workout.id}
                                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                                            workout.completed
                                                ? 'bg-white/5 border-white/10 opacity-55'
                                                : 'bg-black/20 border-white/15 hover:border-cyan-400/40'
                                        }`}
                                    >
                                        <div className="flex items-center gap-4 flex-1 min-w-0 pr-3">
                                            <input
                                                type="checkbox"
                                                checked={workout.completed}
                                                onChange={() => toggleWorkout(workout.id)}
                                                className="w-5 h-5 accent-cyan-500 cursor-pointer rounded-md shrink-0"
                                            />
                                            <span className={`text-white text-base truncate ${workout.completed ? 'line-through text-gray-400' : ''}`}>
                                                {workout.text}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => deleteWorkout(workout.id)}
                                            className="text-gray-400 hover:text-red-400 p-1 transition-colors cursor-pointer text-sm font-semibold"
                                            title="Remove workout"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default Workout;
