import React from "react"
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
        <div className='relative top-24 h-[79vh] w-full'>
            <div className="backdrop-blur-md px-8 py-4 border-b-2 border-gray-300 rounded-t-4xl">
                <h1 className="text-2xl">Dashboard</h1>
            </div>

            <div className="backdrop-blur-xs h-full grid grid- gap-6 p-8 ">
                {/* Main Content Area */}
                <div className="flex flex-wrap gap-6">
                    <PortraitCard className="w-min bg-linear-to-br from-blue-600 to-indigo-800 text-white justify-between">
                        <div>
                            <h2 className="text-5xl font-extrabold mb-1 font-fascinate whitespace-nowrap">Good {getGreeting()},</h2>
                            <h3 className="text-3xl font-medium italic text-blue-100 m-1 whitespace-nowrap">{user.name}</h3>
                        </div>
                        <div className="mt-1.5 bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/20 h-full w-auto">
                            <p className="font-imperial-script text-3xl leading-relaxed whitespace-normal">
                                "The only bad workout is the one that didn't happen."
                            </p>
                        </div>
                    </PortraitCard>

                    <PortraitCard className="bg-white text-gray-800 flex flex-col justify-between w-xl">
                        <div>
                            <div>

                            </div>
                        </div>
                    </PortraitCard>

                </div>
            </div>
        </div>
    )
}

export default Dashboard