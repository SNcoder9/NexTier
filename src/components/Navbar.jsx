import { Link, NavLink } from 'react-router-dom'; 

export default function Navbar({ logo, user }) {
  // Helper for active link styling
  const navLinkStyle = ({ isActive }) =>
    `px-4 py-2 rounded-3xl text-sm font-medium transition-colors ${
      isActive
        ? 'text-white bg-black transition delay-100 duration-300 ease-in-out hover:-translate-y-1 hover:scale-110'
        : 'text-slate-400 hover:text-white transition delay-100 duration-300 ease-in-out hover:-translate-y-1 hover:scale-110 hover:bg-gray-500'
    }`;

  return (
    <nav className="fixed top-0 z-50  w-full px-8 py-1.5">
      
      <div className="flex items-center justify-between border-[1] rounded-4xl px-6 py-2.5 backdrop-blur-md drop-shadow-lg ">
        <Link to='/'>
            {/* Left: Brand */}
            <div className="flex items-center gap-3">
                <img src={logo} alt="NexTier Logo" className="w-10 h-10 rounded-full" />
                <span className="text-xl font-bold tracking-tight text-white">
                NexTier
                </span>
            </div>
        </Link>  

        {/* Center: Navigation */}
        <div className="hidden md:flex items-center gap-2 ">
            <NavLink to="/" className={navLinkStyle}>Dashboard</NavLink>
            <NavLink to="/workout" className={navLinkStyle}>Workout</NavLink>
            <NavLink to="/diet" className={navLinkStyle}>Diet</NavLink>
            <NavLink to="/ai-coach" className={navLinkStyle}>AI Coach</NavLink>
        </div>

        {/* Right: User Actions */}
        <div className="flex items-center gap-5 bg-linear-to-r from-cyan-500 to-blue-500 px-2 py-2 rounded-4xl">
            <div className="flex items-center gap-3 pr-0.5 border-r border-slate-700">
            <button className="p-2 text-white hover:text-[#3B82F6] hover:bg-slate-800 rounded-full transition-colors">
                <span className="material-icons">notifications</span>
            </button>
            <button className="p-2 text-white hover:text-[#3B82F6] hover:bg-slate-800 rounded-full transition-colors">
                <span className="material-icons">settings</span>
            </button>
            </div>

            <div className="flex items-center gap-3 cursor-pointer group hover:scale-[1.05]">
              <div className="flex-col items-end hidden sm:flex">
                  <span className="text-sm font-medium text-white group-hover:color-[#3B82F6]transition-colors">
                  {user?.name}
                  </span>
              </div>
              <img
                  src={user?.pic}
                  alt="Profile"
                  className="w-10 h-10 border-2 rounded-full border-slate-700 group-hover:border-[#3B82F6] transition-colors object-cover"

              />
            </div>
        </div>
      </div>

    </nav>
  );
}