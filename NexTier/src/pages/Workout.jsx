import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import { recordActivityNotification } from '../notifications';

const Panel = ({ children, className = '' }) => (
    <section className={`flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/30 bg-white/90 p-4 shadow-xl backdrop-blur-xl sm:p-6 ${className}`}>
        {children}
    </section>
);

const localDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getDateKey = (value) => {
    const dateValue = String(value ?? '');
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue;
    const parsedDate = new Date(dateValue);
    return Number.isNaN(parsedDate.getTime()) ? dateValue.slice(0, 10) : localDateString(parsedDate);
};

const formatCalories = (value) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 1 });

export default function Workout({ user, today }) {
    const [catalog, setCatalog] = useState([]);
    const [logs, setLogs] = useState([]);
    const [weeklyRows, setWeeklyRows] = useState([]);
    const [search, setSearch] = useState('');
    const [repsByWorkout, setRepsByWorkout] = useState({});
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    const [savingWorkout, setSavingWorkout] = useState(false);
    const [formError, setFormError] = useState('');
    const [newWorkout, setNewWorkout] = useState({ workout_name: '', kcal: '' });

    const currentUserId = user?.user_id || 1;
    const currentDate = today || localDateString(new Date());

    useEffect(() => {
        let isCurrent = true;
        const fetchData = async () => {
            setLoading(true);
            setPageError('');

            const results = await Promise.allSettled([
                api.get('/workouts'),
                api.get(`/workout-logs/${currentUserId}/${currentDate}`),
                api.get(`/workout-logs/weekly/${currentUserId}/${currentDate}`),
            ]);

            if (!isCurrent) return;

            const [catalogResult, logsResult, weeklyResult] = results;
            if (catalogResult.status === 'fulfilled' && Array.isArray(catalogResult.value.data)) {
                setCatalog(catalogResult.value.data);
            } else {
                setPageError('Could not load the workout catalog. Check that the backend is running.');
            }

            if (logsResult.status === 'fulfilled' && Array.isArray(logsResult.value.data)) {
                setLogs(logsResult.value.data.map(log => ({
                    ...log,
                    log_id: Number(log.log_id),
                    workout_id: Number(log.workout_id),
                    reps_completed: Number(log.reps_completed),
                    total_calories_burned: Number(log.total_calories_burned),
                    calories_per_rep: Number(log.calories_per_rep),
                })));
            } else {
                setLogs([]);
                setPageError('Could not load today’s workout entries.');
            }

            if (weeklyResult.status === 'fulfilled' && Array.isArray(weeklyResult.value.data)) {
                setWeeklyRows(weeklyResult.value.data);
            }
            setLoading(false);
        };

        fetchData();
        return () => { isCurrent = false; };
    }, [currentUserId, currentDate]);

    const filteredWorkouts = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return catalog;
        return catalog.filter(workout => workout.workout_name?.toLowerCase().includes(query));
    }, [catalog, search]);

    const totalCalories = logs.reduce((total, log) => total + Number(log.total_calories_burned || 0), 0);
    const totalReps = logs.reduce((total, log) => total + Number(log.reps_completed || 0), 0);

    const week = useMemo(() => {
        const end = new Date(`${currentDate}T12:00:00`);
        const days = Array.from({ length: 7 }, (_, index) => {
            const date = new Date(end);
            date.setDate(end.getDate() - (6 - index));
            const key = localDateString(date);
            const row = weeklyRows.find(item => getDateKey(item.log_date) === key);
            return {
                key,
                label: date.toLocaleDateString(undefined, { weekday: 'short' }),
                calories: Number(row?.calories_burned || 0),
                count: Number(row?.workout_count || 0),
            };
        });
        return days;
    }, [currentDate, weeklyRows]);

    const maxWeeklyCalories = Math.max(...week.map(day => day.calories), 1);

    const handleLogWorkout = async (workout) => {
        const reps = Number(repsByWorkout[workout.workout_id] || 0);
        if (!Number.isInteger(reps) || reps <= 0 || reps > 100000) return;

        try {
            const response = await api.post('/workout-logs', {
                user_id: currentUserId,
                workout_id: workout.workout_id,
                log_date: currentDate,
                reps_completed: reps,
            });
            setLogs(previous => [{
                log_id: response.data.log_id,
                workout_id: Number(workout.workout_id),
                workout_name: workout.workout_name,
                calories_per_rep: Number(workout.kcal),
                reps_completed: reps,
                total_calories_burned: Number(workout.kcal) * reps,
            }, ...previous]);
            setRepsByWorkout(previous => ({ ...previous, [workout.workout_id]: '' }));
            const todayRow = weeklyRows.find(row => getDateKey(row.log_date) === currentDate);
            setWeeklyRows(previous => [
                ...previous.filter(row => getDateKey(row.log_date) !== currentDate),
                {
                    log_date: currentDate,
                    workout_count: Number(todayRow?.workout_count || 0) + 1,
                    calories_burned: Number(todayRow?.calories_burned || 0) + Number(workout.kcal) * reps,
                },
            ]);
            console.info('[NexTier] Database change saved', {
                resource: 'workout_logs',
                operation: 'insert',
                log_id: response.data.log_id,
                workout_id: workout.workout_id,
                workout_name: workout.workout_name,
                reps_completed: reps,
                log_date: currentDate,
            });
            recordActivityNotification(currentUserId, 'Workout logged', `${workout.workout_name}: ${reps} reps/units, ${formatCalories(Number(workout.kcal) * reps)} kcal.`);
        } catch (error) {
            setPageError(error.response?.data?.error || 'Could not log this workout. Please try again.');
        }
    };

    const handleDeleteLog = async (logId) => {
        const deletedLog = logs.find(log => log.log_id === logId);
        if (!deletedLog) return;
        setLogs(previous => previous.filter(log => log.log_id !== logId));

        try {
            await api.delete(`/workout-logs/${logId}`);
            console.info('[NexTier] Database change saved', {
                resource: 'workout_logs',
                operation: 'delete',
                log_id: logId,
                workout_name: deletedLog.workout_name,
            });
            setWeeklyRows(previous => previous.map(row => (
                getDateKey(row.log_date) === currentDate
                    ? {
                        ...row,
                        workout_count: Math.max(0, Number(row.workout_count || 0) - 1),
                        calories_burned: Math.max(0, Number(row.calories_burned || 0) - Number(deletedLog.total_calories_burned || 0)),
                    }
                    : row
            )));
            recordActivityNotification(currentUserId, 'Workout removed', `${deletedLog.workout_name} was removed from today’s workout log.`);
        } catch (error) {
            setLogs(previous => [deletedLog, ...previous]);
            setPageError(error.response?.data?.error || 'Could not delete the workout entry.');
        }
    };

    const handleCreateWorkout = async (event) => {
        event.preventDefault();
        setSavingWorkout(true);
        setFormError('');

        try {
            const response = await api.post('/workouts', {
                workout_name: newWorkout.workout_name.trim(),
                kcal: newWorkout.kcal,
            });
            const created = response.data;
            setCatalog(previous => [...previous, created].sort((a, b) => a.workout_name.localeCompare(b.workout_name)));
            setSearch(created.workout_name);
            setNewWorkout({ workout_name: '', kcal: '' });
            setFormOpen(false);
            console.info('[NexTier] Database change saved', {
                resource: 'workout',
                operation: 'insert',
                workout_id: created.workout_id,
                workout_name: created.workout_name,
            });
            recordActivityNotification(currentUserId, 'Exercise added', `${created.workout_name} was added to the workout catalog.`);
        } catch (error) {
            setFormError(error.response?.data?.error || 'Could not save this workout. Please try again.');
        } finally {
            setSavingWorkout(false);
        }
    };

    return (
        <div className="relative w-full pb-6 pt-24 font-sans text-slate-800">
            <header className="rounded-t-4xl border-b border-gray-200 bg-white/70 px-4 py-4 backdrop-blur-md sm:px-8 sm:py-5">
                <h1 className="text-xl font-bold tracking-wide text-slate-900 sm:text-2xl">Workout Dashboard</h1>
                <p className="mt-1 text-sm text-slate-500">Log training, track calories, and build your exercise catalog.</p>
            </header>

            <div className="w-full bg-slate-50/50 p-3 sm:p-5 lg:p-8">
                <main className="grid min-w-0 grid-cols-1 items-stretch gap-5 pb-4 md:grid-cols-2 xl:h-[680px] xl:grid-cols-12 xl:grid-rows-1 xl:gap-8">
                    <div className="grid min-h-[560px] min-w-0 grid-rows-[0.8fr_1.2fr] gap-5 md:col-span-1 md:min-h-[620px] xl:col-span-4 xl:h-full xl:min-h-0 xl:grid-rows-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                        <Panel className="min-h-0 bg-amber-50/90">
                            <div className="mb-4 flex items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-bold text-amber-950">Today’s Activity</h2>
                                    <p className="text-sm text-amber-800">Session progress</p>
                                </div>
                                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                                    {logs.length} {logs.length === 1 ? 'entry' : 'entries'}
                                </span>
                            </div>
                            <div className="flex flex-1 flex-col items-center justify-center">
                                <div
                                    className="flex h-40 w-40 items-center justify-center rounded-full shadow-inner"
                                    style={{ background: `conic-gradient(#f59e0b ${Math.min(100, Math.round(totalCalories / 5))}%, #fde68a 0)` }}
                                >
                                    <div className="flex h-[84%] w-[84%] flex-col items-center justify-center rounded-full bg-white shadow-sm">
                                        <span className="text-3xl font-black text-slate-800">{formatCalories(totalCalories)}</span>
                                        <span className="text-xs font-semibold text-slate-500">kcal burned</span>
                                    </div>
                                </div>
                                <div className="mt-5 grid w-full grid-cols-2 gap-3">
                                    <div className="rounded-xl bg-white/80 p-3 text-center">
                                        <p className="text-xl font-bold text-slate-800">{totalReps}</p>
                                        <p className="text-xs font-medium text-slate-500">reps / units</p>
                                    </div>
                                    <div className="rounded-xl bg-white/80 p-3 text-center">
                                        <p className="text-xl font-bold text-slate-800">{new Set(logs.map(log => log.workout_id)).size}</p>
                                        <p className="text-xs font-medium text-slate-500">exercises</p>
                                    </div>
                                </div>
                            </div>
                        </Panel>

                        <Panel className="min-h-0 bg-indigo-50/90">
                            <div className="mb-5">
                                <h2 className="text-lg font-bold text-indigo-950">Weekly Progress</h2>
                                <p className="text-sm text-indigo-700">Calories burned per day</p>
                            </div>
                            <div className="flex min-h-0 flex-1 items-end justify-between gap-2 border-b border-indigo-200 px-1 pb-3">
                                {week.map(day => (
                                    <div key={day.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                                        <span className="text-[10px] font-semibold text-indigo-700">
                                            {day.calories ? formatCalories(day.calories) : ''}
                                        </span>
                                        <div className="flex h-[70%] w-full max-w-8 items-end rounded-t-md bg-indigo-100">
                                            <div
                                                className="w-full rounded-t-md bg-indigo-500 transition-all"
                                                style={{ height: `${day.calories ? Math.max(8, day.calories / maxWeeklyCalories * 100) : 0}%` }}
                                                title={`${day.calories} kcal, ${day.count} entries`}
                                            />
                                        </div>
                                        <span className="text-xs font-bold text-indigo-800">{day.label}</span>
                                    </div>
                                ))}
                            </div>
                        </Panel>
                    </div>

                    <Panel className="min-h-[560px] min-w-0 md:col-span-1 md:min-h-[620px] xl:col-span-4 xl:h-full xl:min-h-0">
                        <div className="mb-5 flex shrink-0 items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">Today’s Workouts</h2>
                                <p className="mt-1 text-sm text-slate-500">Your completed exercises</p>
                            </div>
                            <span className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800">{logs.length} Logged</span>
                        </div>
                        {pageError && <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{pageError}</p>}
                        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
                            {loading ? (
                                <p className="m-auto text-sm font-medium text-slate-400">Loading workouts…</p>
                            ) : logs.length === 0 ? (
                                <p className="m-auto text-center text-sm font-medium text-slate-400">No workouts logged yet today. Choose an exercise from the catalog.</p>
                            ) : logs.map(log => (
                                <article key={log.log_id} className="flex shrink-0 items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 shadow-sm">
                                    <div className="min-w-0">
                                        <h3 className="truncate font-bold text-slate-800">{log.workout_name}</h3>
                                        <p className="mt-1 text-xs font-medium text-slate-500">
                                            {log.reps_completed} reps / units · {formatCalories(log.total_calories_burned)} kcal
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteLog(log.log_id)}
                                        aria-label={`Delete ${log.workout_name} log`}
                                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500 transition hover:bg-red-100"
                                    >
                                        <span className="material-symbols-outlined">delete</span>
                                    </button>
                                </article>
                            ))}
                        </div>
                    </Panel>

                    <Panel className="min-h-[560px] min-w-0 md:col-span-2 md:min-h-[620px] xl:col-span-4 xl:h-full xl:min-h-0">
                        <div className="mb-5 flex shrink-0 items-start justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">Workout Database Catalog</h2>
                                <p className="mt-1 text-sm text-slate-500">Choose an exercise to log your reps or units</p>
                            </div>
                            <span className="material-symbols-outlined text-2xl text-slate-400">database</span>
                        </div>

                        <div className="mb-4 flex shrink-0 items-center gap-2">
                            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-500 transition focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100">
                                <span className="material-symbols-outlined">search</span>
                                <input
                                    type="search"
                                    value={search}
                                    onChange={event => setSearch(event.target.value)}
                                    placeholder="Search exercises"
                                    aria-label="Search workout catalog"
                                    className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
                                />
                                {search && (
                                    <button type="button" onClick={() => setSearch('')} className="text-xs font-semibold text-amber-700">
                                        Clear
                                    </button>
                                )}
                            </label>
                            <button
                                type="button"
                                onClick={() => { setFormError(''); setFormOpen(true); }}
                                className="flex shrink-0 items-center gap-1 rounded-xl bg-amber-500 px-3 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-amber-600"
                            >
                                <span className="material-symbols-outlined text-lg">add</span>
                                Add exercise
                            </button>
                        </div>

                        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
                            {loading ? (
                                <p className="m-auto text-sm font-medium text-slate-400">Loading catalog…</p>
                            ) : filteredWorkouts.length === 0 ? (
                                <p className="m-auto text-center text-sm font-medium text-slate-400">
                                    {search ? `No exercises match “${search}”.` : 'No exercises in the catalog.'}
                                </p>
                            ) : filteredWorkouts.map(workout => (
                                <article key={workout.workout_id} className="flex shrink-0 items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 shadow-sm transition hover:bg-slate-100">
                                    <div className="min-w-0">
                                        <h3 className="truncate font-bold text-slate-800">{workout.workout_name}</h3>
                                        <p className="mt-1 text-xs font-semibold text-amber-700">{formatCalories(workout.kcal)} kcal / rep or unit</p>
                                    </div>
                                    <form
                                        className="flex shrink-0 items-center gap-2"
                                        onSubmit={event => { event.preventDefault(); handleLogWorkout(workout); }}
                                    >
                                        <input
                                            type="number"
                                            min="1"
                                            max="100000"
                                            step="1"
                                            required
                                            value={repsByWorkout[workout.workout_id] ?? ''}
                                            onChange={event => setRepsByWorkout(previous => ({ ...previous, [workout.workout_id]: event.target.value }))}
                                            aria-label={`Reps or units for ${workout.workout_name}`}
                                            placeholder="Reps"
                                            className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-2 text-center text-sm outline-none focus:border-amber-400"
                                        />
                                        <button
                                            type="submit"
                                            aria-label={`Log ${workout.workout_name}`}
                                            className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700 transition hover:bg-amber-500 hover:text-white"
                                        >
                                            <span className="material-symbols-outlined">add</span>
                                        </button>
                                    </form>
                                </article>
                            ))}
                        </div>
                    </Panel>
                </main>
            </div>

            {formOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
                    <section role="dialog" aria-modal="true" aria-labelledby="add-workout-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="mb-5 flex items-start justify-between gap-4">
                            <div>
                                <h2 id="add-workout-title" className="text-xl font-bold text-slate-900">Add exercise</h2>
                                <p className="mt-1 text-sm text-slate-500">Set the calories burned per rep or unit.</p>
                            </div>
                            <button type="button" onClick={() => setFormOpen(false)} aria-label="Close add workout form" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleCreateWorkout} className="space-y-4">
                            <label className="block text-sm font-semibold text-slate-700">
                                Exercise name
                                <input
                                    required
                                    maxLength={40}
                                    value={newWorkout.workout_name}
                                    onChange={event => setNewWorkout(previous => ({ ...previous, workout_name: event.target.value }))}
                                    className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 font-normal outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                                />
                            </label>
                            <label className="block text-sm font-semibold text-slate-700">
                                Calories per rep / unit
                                <input
                                    required
                                    type="number"
                                    min="0"
                                    max="9999.99"
                                    step="0.01"
                                    value={newWorkout.kcal}
                                    onChange={event => setNewWorkout(previous => ({ ...previous, kcal: event.target.value }))}
                                    className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 font-normal outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                                />
                            </label>
                            {formError && <p role="alert" className="text-sm font-medium text-red-600">{formError}</p>}
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                                    Cancel
                                </button>
                                <button type="submit" disabled={savingWorkout} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60">
                                    {savingWorkout ? 'Saving…' : 'Save exercise'}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}
        </div>
    );
}
