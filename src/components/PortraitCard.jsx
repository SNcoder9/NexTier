import React from "react"

function PortraitCard({ children, className = '' }){
    return (
        <div className={`relative flex flex-col h-96 rounded-3xl shadow-xl overflow-hidden p-6 ${className}`}>
            {children}
        </div>
    );
}

export default PortraitCard