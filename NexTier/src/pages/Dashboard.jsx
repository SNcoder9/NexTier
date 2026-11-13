import PortraitCard from "../components/PortraitCard"

function getGreeting() {
  const currentHour = new Date().getHours();

  if (currentHour >= 5 && currentHour < 12) {
    return "Morning";
  } else if (currentHour >= 12 && currentHour < 17) {
    return "Afternoon";
  } else if (currentHour >= 17 && currentHour < 21) {
    return "Evening";
  } else {
    return "Night";
  }
}

function Dashboard({user}){
    return (
        <div className="relative w-full pb-6 pt-24">
            <div className="rounded-t-4xl border-b-2 border-gray-300 bg-white/70 px-4 py-4 backdrop-blur-md sm:px-8 sm:py-5">
                <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Dashboard</h1>
            </div>

            <div className="min-h-[calc(100vh-11rem)] bg-slate-50/50 p-3 backdrop-blur-xs sm:p-5 lg:p-8">
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
                    <PortraitCard className="h-auto min-h-72 w-full min-w-0 justify-between bg-linear-to-br from-blue-600 to-indigo-800 text-white sm:min-h-96">
                        <div>
                            <h2 className="mb-1 text-3xl font-extrabold leading-tight font-fascinate sm:text-5xl">Good {getGreeting()},</h2>
                            <h3 className="m-1 break-words text-2xl font-medium italic text-blue-100 sm:text-3xl">{user?.user_name}</h3>
                        </div>
                        <div className="mt-5 min-h-24 rounded-2xl border border-white/20 bg-white/20 p-4 backdrop-blur-md sm:mt-8 sm:min-h-32">
                            <p className="text-2xl leading-relaxed font-imperial-script sm:text-3xl">
                                "The only bad workout is the one that didn't happen."
                            </p>
                        </div>
                    </PortraitCard>

                    <PortraitCard className="h-auto min-h-72 w-full min-w-0 justify-between bg-white text-gray-800 sm:min-h-96">
                        <div>
                            <h2 className="text-xl font-bold sm:text-2xl">Your training, your pace</h2>
                            <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
                                Build consistent habits by tracking your workouts, nutrition, and hydration in one place.
                            </p>
                        </div>
                        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl bg-blue-50 p-4">
                                <p className="font-semibold text-blue-900">Workout</p>
                                <p className="mt-1 text-sm text-blue-700">Log exercises and track your progress.</p>
                            </div>
                            <div className="rounded-2xl bg-cyan-50 p-4">
                                <p className="font-semibold text-cyan-900">Diet</p>
                                <p className="mt-1 text-sm text-cyan-700">Keep an eye on food and hydration.</p>
                            </div>
                        </div>
                    </PortraitCard>
                </div>
            </div>
        </div>
    )
}

export default Dashboard