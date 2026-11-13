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
